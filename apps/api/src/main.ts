import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getEnv, isProd, logger } from '@common/utils';
import { setupSwagger } from './swagger';
import helmet from 'helmet';

// ⬇️ i18n validation pipe
import { I18nValidationPipe } from 'nestjs-i18n';

dotenv.config();

/**
 * Bootstraps the NestJS application with the main AppModule.
 * Sets up global prefix, validation pipes, and enables CORS for the frontend.
 * Retrieves the application port from environment variables (default: 3000).
 * Starts the server and logs the running URL.
 */
async function appBootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const appPort = getEnv('APP_PORT', { defaultValue: 3000, env: process.env });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // ✅ Use I18nValidationPipe instead of plain ValidationPipe
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // optional: stopAtFirstError: true,
      // optional: exceptionFactory: (errors) => new BadRequestException(errors),
    }) as unknown as ValidationPipe, // keep type compatibility if needed
  );

  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://firebasestorage.googleapis.com',
          'https://storage.googleapis.com',
          'https://picsum.photos',
        ],
      },
    }),
  );

  // ✅ Enable CORS (+ language headers)
  app.enableCors({
    origin: 'http://localhost:5173', // 👈 Frontend URL
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,Accept-Language,x-lang',
  });

  await app.listen(appPort);
  logger.info(
    `🚀 Server running at http://localhost:${appPort}/${globalPrefix}`,
  );
}

/**
 * Bootstraps the NestJS application and Swagger documentation server.
 */
async function swaggerBootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const swaggerPort = getEnv('SWAGGER_PORT', {
    defaultValue: 3001,
    env: process.env,
  });
  const globalPrefix = 'api/v1';

  // Use same validation pipe here (useful if you hit any DTO endpoints on this instance)
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }) as unknown as ValidationPipe,
  );

  if (!isProd()) {
    setupSwagger(app, {
      serverUrl: `http://localhost:${swaggerPort}/${globalPrefix}`,
    });
  }

  await app.listen(swaggerPort);
}

appBootstrap().then(() => {
  logger.info('API Bootstrap completed successfully');
});

swaggerBootstrap().then(() => {
  logger.info('API Swagger bootstrap completed successfully');
});
