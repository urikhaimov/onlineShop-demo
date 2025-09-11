import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Controller('_health')
export class HealthController {
  private stripe?: Stripe;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    if (key) {
      this.stripe = new Stripe(key, {
        apiVersion: '2024-06-20' as any,
        timeout: 5000,
      });
    }
  }

  @Get()
  ok() {
    return { ok: true, ts: Date.now() };
  }

  @Get('stripe')
  async stripePing() {
    try {
      if (!this.stripe) return { ok: false, error: 'no_key' };
      // lightweight call; balance is fine here
      await this.stripe.balance.retrieve();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'err' };
    }
  }
}
