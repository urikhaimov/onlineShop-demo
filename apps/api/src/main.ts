// src/main.ts
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getEnv, isProd, logger } from '@common/utils';
import { setupSwagger } from './swagger';
import helmet from 'helmet';
import { I18nValidationPipe } from 'nestjs-i18n';
import * as bodyParser from 'body-parser';

dotenv.config();

async function bootstrap() {
  // rawBody: true lets Nest keep a copy of the original raw body (when using its own json parser)
  // We ALSO mount bodyParser.raw() on the webhook paths to hand Stripe an actual Buffer.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const appPort = Number(
    getEnv('APP_PORT', { defaultValue: 3000, env: process.env }),
  );
  const apiPrefix = String(
    getEnv('API_PREFIX', { defaultValue: 'api', env: process.env }),
  );
  const frontendOrigin = String(
    getEnv('FRONTEND_ORIGIN', {
      defaultValue: 'http://localhost:5173',
      env: process.env,
    }),
  );

  app.setGlobalPrefix(apiPrefix);

  // --- Stripe webhook raw body (MUST be before any json/urlencoded on those paths) ---
  const stripeRaw = bodyParser.raw({ type: 'application/json' });

  // Ensure both req.body (Buffer) and req.rawBody (Buffer) are set for Stripe SDK
  const ensureRawBody = (req: any, _res: any, next: any) => {
    if (!req.rawBody && req.body && Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
    }
    next();
  };

  // If you have more than one webhook path, register all of them:
  const webhookPaths = [
    `/${apiPrefix}/orders/webhook`,
    `/${apiPrefix}/payments/webhooks/stripe`,
  ];

  webhookPaths.forEach((p) => app.use(p, stripeRaw, ensureRawBody));
  // -------------------------------------------------------------------------------

  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Helmet CSP (prod hardened, dev relaxed)
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: isProd()
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", 'https://js.stripe.com'],
              connectSrc: [
                "'self'",
                'https://api.stripe.com',
                'https://m.stripe.network',
                'https://q.stripe.com',
                'https://r.stripe.com',
                'https://hooks.stripe.com',
              ],
              frameSrc: ["'self'", 'https://js.stripe.com'],
              imgSrc: [
                "'self'",
                'data:',
                'blob:',
                'https://*.stripe.com',
                'https://r.stripe.com',
                'https://firebasestorage.googleapis.com',
                'https://storage.googleapis.com',
                'https://picsum.photos',
              ],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://fonts.googleapis.com',
              ],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            },
          }
        : {
            useDefaults: true,
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-eval'", 'https://js.stripe.com'],
              connectSrc: [
                "'self'",
                frontendOrigin,
                'ws://localhost:*',
                'http://localhost:*',
                'https://api.stripe.com',
                'https://m.stripe.network',
                'https://q.stripe.com',
                'https://r.stripe.com',
                'https://hooks.stripe.com',
              ],
              frameSrc: ["'self'", 'https://js.stripe.com'],
              imgSrc: [
                "'self'",
                'data:',
                'blob:',
                'https://*.stripe.com',
                'https://r.stripe.com',
                'https://firebasestorage.googleapis.com',
                'https://storage.googleapis.com',
                'https://picsum.photos',
              ],
              styleSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://fonts.googleapis.com',
              ],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            },
          },
    }),
  );

  app.enableCors({
    origin: frontendOrigin, // tighten to exact prod domain in production
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept-Language',
      'x-lang',
      'Stripe-Signature', // required for Stripe signature verify
    ],
  });

  // If behind a proxy/load balancer (Heroku, Render, Nginx, etc.)
  (app as any).set?.('trust proxy', 1);

  if (!isProd()) {
    setupSwagger(app, {
      serverUrl: `http://localhost:${appPort}/${apiPrefix}`,
    });
  }

  await app.listen(appPort);
  logger.info(`🚀 Server running:  http://localhost:${appPort}/${apiPrefix}`);
  if (!isProd())
    logger.info(`📚 Swagger:         http://localhost:${appPort}/docs`);
}

bootstrap().catch((e) => {
  console.error(e);
  process.exit(1);
});
