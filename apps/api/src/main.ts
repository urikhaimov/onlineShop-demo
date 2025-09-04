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
  // Keep a copy of the original raw body for all requests
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

  // --- Stripe webhook raw body (must run BEFORE any JSON/urlencoded parser on those paths) ---
  const stripeRaw = bodyParser.raw({
    type: 'application/json',
    limit: '2mb', // avoid huge payloads
  });

  // If only req.body is set as Buffer (route-level raw), mirror it to req.rawBody for Stripe SDK
  const ensureRawBody = (req: any, _res: any, next: any) => {
    if (!req.rawBody && Buffer.isBuffer(req.body)) req.rawBody = req.body;
    next();
  };

  const webhookPaths = [
    `/${apiPrefix}/orders/webhook`,
    `/${apiPrefix}/payments/webhooks/stripe`,
  ];
  webhookPaths.forEach((p) => app.use(p, stripeRaw, ensureRawBody));
  // ------------------------------------------------------------------------------------------

  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // transformOptions: { enableImplicitConversion: true }, // enable if you want implicit DTO number coercion
    }),
  );

  // Helmet CSP (prod hardened, dev relaxed)
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // Stripe iframes
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
                // add Unsplash if you render product images from there
                'https://images.unsplash.com',
                'https://source.unsplash.com',
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
                'https://images.unsplash.com',
                'https://source.unsplash.com',
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
    origin: frontendOrigin, // in prod, set to your exact domain or an array of allowed origins
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept-Language',
      'x-lang',
      'stripe-signature', // use lowercase; header names are case-insensitive but some libs match lower
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
