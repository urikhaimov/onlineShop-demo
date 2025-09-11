// src/sentry.filter.ts
import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    try {
      Sentry.captureException(exception);
    } catch {
      // do nothing
    }
    if (host.getType() === 'http') {
      const ctx = host.switchToHttp();
      const res = ctx.getResponse();
      const status =
        exception instanceof HttpException ? exception.getStatus() : 500;
      res
        .status(status)
        .json({ statusCode: status, error: 'Internal Server Error' });
    }
  }
}
