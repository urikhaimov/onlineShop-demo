// src/main.ts
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

// Sentry must be initialized BEFORE the app module is loaded so it can
// instrument http/postgres/etc.
import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    release: process.env.SENTRY_RELEASE,
  });
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getEnv, isProd, logger } from '@common/utils';
import { setupSwagger } from './swagger';
import helmet from 'helmet';
import compression from 'compression';
import { I18nValidationPipe } from 'nestjs-i18n';
import * as bodyParser from 'body-parser';

function parseOrigins(v?: string): (string | RegExp)[] {
  if (!v) return [];
  if (v.trim() === '*') return [/^.*$/];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  // Keep a copy of the original raw body (needed for webhooks)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const appPort = Number(
    getEnv('APP_PORT', { defaultValue: 3000, env: process.env }),
  );
  const apiPrefix = process.env.API_PREFIX ?? 'api';
  const frontendOrigin = String(
    getEnv('FRONTEND_ORIGIN', {
      defaultValue: 'http://localhost:5173',
      env: process.env,
    }),
  );
  const wsFrontendOrigin = frontendOrigin.startsWith('https://')
    ? frontendOrigin.replace('https://', 'wss://')
    : frontendOrigin.replace('http://', 'ws://');
  const extraOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);

  app.setGlobalPrefix(apiPrefix);

  // If behind a proxy (Heroku/Render/Nginx/etc.)
  app.getHttpAdapter().getInstance().set?.('trust proxy', 1);

  // ── Request ID + structured access log ─────────────────────────────────────
  // Assign or accept an X-Request-Id, log {requestId, method, url, status, ms}
  // on every response. Webhook noise (raw bodies, large payloads) is excluded
  // from the body of the log to keep the line size small.
  app.use((req: any, res, next) => {
    const incoming = (req.headers['x-request-id'] as string) || '';
    const requestId =
      incoming ||
      `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const line = `${req.method} ${req.originalUrl ?? req.url} ${res.statusCode} ${ms}ms id=${requestId}`;
      if (res.statusCode >= 500) logger.error(line);
      else if (res.statusCode >= 400) logger.warn(line);
      else logger.info(line);
    });
    next();
  });

  // ── Enforce HTTPS in production (respects X-Forwarded-Proto) ────────────────
  app.use((req, res, next) => {
    if (isProd()) {
      const xfp = (req.headers['x-forwarded-proto'] as string) || '';
      const secure =
        (req as any).secure || xfp.split(',')[0]?.trim()?.includes('https');
      if (!secure) return res.status(403).send('HTTPS required');
    }
    next();
  });

  // --- Webhook raw body (must be BEFORE any JSON/urlencoded parser for those paths) ---
  const webhookRaw = bodyParser.raw({ type: '*/*', limit: '2mb' });
  const ensureRawBody = (req: any, _res: any, next: any) => {
    if (!req.rawBody && Buffer.isBuffer(req.body)) req.rawBody = req.body;
    next();
  };

  const webhookPaths = [
    `/${apiPrefix}/orders/webhook`,
    `/${apiPrefix}/webhooks/paypal`,
    // partners
    `/${apiPrefix}/webhooks/wolt`,
  ];
  webhookPaths.forEach((p) => app.use(p, webhookRaw, ensureRawBody));
  // -------------------------------------------------------------------------------------

  // Gzip/deflate compression for non-webhook responses.
  // Skips small bodies (<1 KB) and already-compressed types automatically.
  app.use(compression());

  // Standard parsers for the rest of the app (mounted AFTER raw webhook parsers)
  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

  // Class-validator (via i18n pipe)
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // ── Helmet applied ONCE here (avoid duplicates anywhere else) ──────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      hsts: isProd()
        ? { maxAge: 31536000, includeSubDomains: true, preload: false }
        : false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://firebasestorage.googleapis.com',
            'https://storage.googleapis.com',
            'https://*.googleusercontent.com',
          ],
          connectSrc: [
            "'self'",
            frontendOrigin,
            wsFrontendOrigin,
            'http://localhost:5173',
            'ws://localhost:5173',
            'http://127.0.0.1:5173',
            'ws://127.0.0.1:5173',
            'https://firebasestorage.googleapis.com',
            'https://storage.googleapis.com',
            'https://*.googleapis.com',
            'https://*.googleusercontent.com',
            // PayPal
            'https://api-m.paypal.com',
            'https://api-m.sandbox.paypal.com',
            'https://*.paypal.com',
          ],
          // In dev, Vite's HMR runtime needs unsafe-inline + unsafe-eval.
          // In prod, the built bundle does not — drop both for a tighter
          // CSP (mitigates XSS that injects <script> or eval()).
          scriptSrc: isProd()
            ? [
                "'self'",
                'https://www.paypal.com',
                'https://www.paypalobjects.com',
                'https://apis.google.com',
                'https://accounts.google.com',
                'https://www.gstatic.com',
              ]
            : [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                'https://www.paypal.com',
                'https://www.paypalobjects.com',
                'https://apis.google.com',
                'https://accounts.google.com',
                'https://www.gstatic.com',
              ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:', 'https://www.paypalobjects.com'],
          frameSrc: [
            'https://www.paypal.com',
            'https://www.sandbox.paypal.com',
            'https://accounts.google.com',
            'https://online-shop-75482.firebaseapp.com',
          ],
          // (helmet useDefaults already sets these, but keeping explicit is fine)
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          scriptSrcAttr: ["'none'"],
          upgradeInsecureRequests: isProd() ? [] : null,
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  // ───────────────────────────────────────────────────────────────────────────

  // CORS for your client (browser); webhooks are server-to-server
  app.enableCors({
    origin: [
      frontendOrigin,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...extraOrigins,
    ],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept-Language',
      'x-lang',
      'paypal-auth-algo',
      'paypal-cert-url',
      'paypal-transmission-id',
      'paypal-transmission-sig',
      'paypal-transmission-time',
      'x-signature',
      'X-Signature',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Total', 'X-Total-Results'],
    maxAge: 600,
  });

  if (!isProd()) {
    setupSwagger(app, {
      serverUrl: `http://localhost:${appPort}/${apiPrefix}`,
    });
  }

  // Allow SIGTERM/SIGINT to drain in-flight requests, close DB connections,
  // and fire Nest module onModuleDestroy / beforeApplicationShutdown hooks.
  app.enableShutdownHooks();

  logger.info('Bootstrapping API (starting Nest HTTP server)...');
  await app.listen(appPort);
  logger.info(`🚀 Server running:  http://localhost:${appPort}/${apiPrefix}`);
  if (!isProd())
    logger.info(`📚 Swagger:         http://localhost:${appPort}/docs`);
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
