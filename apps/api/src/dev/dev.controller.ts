// src/dev/dev.controller.ts
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsUrl } from 'class-validator';
import type { Request } from 'express';
import { MailerService } from '../mailer/mailer.service';

class ToDto {
  @IsEmail()
  to!: string;
}

class OrderTestDto extends ToDto {
  @IsOptional()
  @IsUrl()
  invoiceUrl?: string;
}

// ── tiny per-minute rate limit (dev only) ─────────────────────────────────────
const RATE_LIMIT_PER_MIN = 5;
const buckets = new Map<string, { count: number; windowStart: number }>();
function ip(req: Request) {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  return xff.split(',')[0]?.trim() || (req.socket?.remoteAddress ?? 'unknown');
}
function throttled(addr: string) {
  const now = Date.now();
  const b = buckets.get(addr);
  if (!b || now - b.windowStart >= 60_000) {
    buckets.set(addr, { count: 1, windowStart: now });
    return false;
  }
  if (b.count >= RATE_LIMIT_PER_MIN) return true;
  b.count++;
  return false;
}

@Controller('dev')
export class DevController {
  private readonly logger = new Logger(DevController.name);
  private readonly enabled =
    (process.env.NODE_ENV || '').toLowerCase() !== 'production';

  constructor(private readonly mailer: MailerService) {}

  @Post('test-email/order')
  @HttpCode(200)
  async sendOrder(@Body() dto: OrderTestDto, @Req() req: Request) {
    if (!this.enabled) throw new ForbiddenException('Disabled in production');
    if (throttled(ip(req))) throw new ForbiddenException('Rate limited');

    const payload = {
      orderId: 'demo-123',
      amount: 12900, // ₪129.00 (minor units)
      currency: 'ils',
      paymentIntentId: 'pi_demo_123',
      created: true,
      invoiceUrl: dto.invoiceUrl, // optional
    };

    const res = await this.mailer.sendOrderConfirmation(dto.to, payload);
    if (!res.ok) throw new InternalServerErrorException('Send failed');

    return {
      ok: true,
      messageId: res.id,
      provider: process.env.EMAIL_PROVIDER || 'smtp/json',
      sandbox: String(process.env.SENDGRID_SANDBOX || 'false'),
    };
  }

  @Post('test-email/refund')
  @HttpCode(200)
  async sendRefund(@Body() dto: ToDto, @Req() req: Request) {
    if (!this.enabled) throw new ForbiddenException('Disabled in production');
    if (throttled(ip(req))) throw new ForbiddenException('Rate limited');

    const payload = {
      orderId: 'demo-123',
      amount: 4900, // ₪49.00
      currency: 'ils',
      chargeId: 'ch_demo_456',
      full: false,
      refundIds: ['re_demo_001'],
    };

    const res = await this.mailer.sendRefundEmail(dto.to, payload);
    if (!res.ok) throw new InternalServerErrorException('Send failed');

    return {
      ok: true,
      messageId: res.id,
      provider: process.env.EMAIL_PROVIDER || 'smtp/json',
      sandbox: String(process.env.SENDGRID_SANDBOX || 'false'),
    };
  }
}
