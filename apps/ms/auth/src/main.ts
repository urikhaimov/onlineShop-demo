import { NestFactory } from '@nestjs/core';
import { AuthModule } from './app/auth.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { logger } from '@common/utils';

async function bootstrap() {
  const host = process.env.AUTH_MS_HOST ?? '127.0.0.1';
  const port = Number(process.env.AUTH_MS_PORT ?? 4002);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    {
      transport: Transport.TCP,
      options: { host, port },
    },
  );

  // Graceful shutdown for signals (works for microservices too)
  app.enableShutdownHooks();

  await app.listen();
  logger.info(`AuthMS listening on tcp://${host}:${port}`);
}

bootstrap()
  .then(() => {
    logger.info('AuthMS Bootstrap completed successfully');
  })
  .catch((err) => {
    logger.error(
      `AuthMS Bootstrap failed: ${err?.stack || err?.message || err}`,
    );
    process.exit(1);
  });

// Safety nets
process.on('unhandledRejection', (reason) => {
  logger.error(
    `UnhandledRejection: ${reason instanceof Error ? reason.stack : String(reason)}`,
  );
});
process.on('uncaughtException', (err) => {
  logger.error(`UncaughtException: ${err.stack || err.message || String(err)}`);
});
