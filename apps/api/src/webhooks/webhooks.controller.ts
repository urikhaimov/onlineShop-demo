// apps/api/src/webhooks/webhooks.controller.ts
import { Controller, Post, HttpCode } from '@nestjs/common';

@Controller('webhooks')
export class WebhooksController {
  @Post('noop')
  @HttpCode(200)
  noop() {
    return { ok: true };
  }
}
