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
  // Keep rawBody so req.rawBody is available if you ever need it
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

  // Global prefix (e.g. /api)
  app.setGlobalPrefix(apiPrefix);

  // 🔒 Stripe webhook must receive the raw request body.
  // Route-scoped raw parser wins over the default JSON parser for this path.
  app.use(
    `/${apiPrefix}/orders/webhook`,
    bodyParser.raw({ type: 'application/json' }),
  );

  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

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
              ],
              frameSrc: ["'self'", 'https://js.stripe.com'],
              imgSrc: [
                "'self'",
                'data:',
                'blob:',
                'https://*.stripe.com',
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
        : false,
    }),
  );

  app.enableCors({
    origin: frontendOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept-Language',
      'x-lang',
      'Stripe-Signature',
    ],
  });

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
