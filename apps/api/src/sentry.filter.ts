// src/sentry.filter.ts
import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only ping Sentry for unhandled / 5xx — 4xx are caller errors, not bugs.
    if (!isHttp || status >= 500) {
      try {
        Sentry.captureException(exception);
      } catch {
        // ignore Sentry failures
      }
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (host.getType() !== 'http') return;

    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    // For HttpException, forward NestJS's own response shape so clients get
    // the original validation/i18n messages. For everything else, send a
    // generic 500 without leaking implementation details.
    if (isHttp) {
      const payload = exception.getResponse();
      const body =
        typeof payload === 'string'
          ? { statusCode: status, message: payload }
          : payload;
      return res.status(status).json(body);
    }

    return res
      .status(status)
      .json({ statusCode: status, message: 'Internal server error' });
  }
}
