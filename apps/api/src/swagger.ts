import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { logger } from '@common/utils';

type TSwaggerProps = {
  serverUrl: string;
};

export const buildSwagger = (
  app: NestExpressApplication,
  opts: TSwaggerProps,
) => {
  logger.info(`🚀 Swagger is enabled: ${opts.serverUrl}`);
  const config = new DocumentBuilder()
    .setTitle('The API Swagger documentation')
    .setDescription('The API Swagger documentation')
    // TODO (teamco): Make an ability to work on different environments
    // .addServer(opts.serverUrl, 'Local environment')
    .setVersion('1.0')
    .addBearerAuth(
      {
        // I was also testing it without the prefix 'Bearer' before the JWT
        description:
          'Copy JWT Token (without Bearer prefix) from the login response and paste it here',
        name: 'Authorization',
        bearerFormat: 'Bearer', // I've tested not to use this field, but the result was the same
        scheme: 'Bearer',
        type: 'http', // I`ve attempted type: 'apiKey' too
        in: 'Header',
      },
      'access-token',
    )
    .build();

  return SwaggerModule.createDocument(app, config);
};

export const setupSwagger = (
  app: NestExpressApplication,
  opts: TSwaggerProps,
) => {
  const document = buildSwagger(app, opts);
  SwaggerModule.setup('api/v1', app, document);
};
