import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getEnv, isProd, logger } from '@common/utils';
import { setupSwagger } from './swagger';

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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ Enable CORS
  app.enableCors({
    origin: 'http://localhost:5173', // 👈 Frontend URL
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  await app.listen(appPort);
  logger.info(
    `🚀 Server running at http://localhost:${appPort}/${globalPrefix}`,
  );
}

/**
 * Bootstraps the NestJS application and Swagger documentation server.
 *
 * Loads environment variables, sets up global validation, CORS, and API prefix.
 * Starts the main API server and, in non-production environments, initializes Swagger UI
 * for API documentation on a separate port.
 *
 * Logs server status and startup events using the internal logger.
 */
async function swaggerBootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const swaggerPort = getEnv('SWAGGER_PORT', {
    defaultValue: 3001,
    env: process.env,
  });
  const globalPrefix = 'api/v1';

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
