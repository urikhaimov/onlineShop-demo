import { NestFactory } from '@nestjs/core';
import { AuthModule } from './app/auth.module';
import { Transport } from '@nestjs/microservices';
import { logger } from '@common/utils';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AuthModule, {
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 4002,
    },
  });

  await app.listen();
}

bootstrap().then(() => {
  logger.info('AuthMS Bootstrap completed successfully');
});
