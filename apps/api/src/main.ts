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
  // Keep a copy of the original raw body (needed for Stripe webhooks)
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

  // --- Stripe webhook raw body (must be BEFORE any JSON/urlencoded parser for those paths) ---
  const stripeRaw = bodyParser.raw({ type: 'application/json', limit: '2mb' });
  const ensureRawBody = (req: any, _res: any, next: any) => {
    if (!req.rawBody && Buffer.isBuffer(req.body)) req.rawBody = req.body;
    next();
  };
  const webhookPaths = [
    `/${apiPrefix}/orders/webhook`,
    `/${apiPrefix}/payments/webhooks/stripe`,
  ];
  webhookPaths.forEach((p) => app.use(p, stripeRaw, ensureRawBody));
  // --------------------------------------------------------------------------------------------

  // Standard parsers for the rest of the app (increase limits if you need)
  app.use(bodyParser.json({ limit: '1mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

  // Class-validator (via i18n pipe) — strict by default
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // honors @Type(() => Number) etc. in your DTOs
      // transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Helmet + CSP (adjusted for Firebase Storage & Stripe)
  app.use(
    helmet({
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
            'http://localhost:5173',
            'ws://localhost:5173',
            'http://127.0.0.1:5173',
            'ws://127.0.0.1:5173',
            'https://firebasestorage.googleapis.com',
            'https://storage.googleapis.com',
            'https://*.googleapis.com',
            'https://*.googleusercontent.com',
          ],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
        },
      },
    }),
  );

  // CORS for your client
  app.enableCors({
    origin: frontendOrigin, // set to your exact domain(s) in prod
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept-Language',
      'x-lang',
      'stripe-signature', // keep lowercase
    ],
  });

  // If behind a proxy (Heroku/Render/Nginx/etc.)
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
