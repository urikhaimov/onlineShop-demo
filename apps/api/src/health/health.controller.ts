import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Controller('_health')
export class HealthController {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  @Get()
  ok() {
    return { ok: true, ts: Date.now() };
  }

  @Get('paypal')
  async paypalPing() {
    const clientId = this.config.get<string>('PAYPAL_CLIENT_ID') ?? '';
    const secret = this.config.get<string>('PAYPAL_CLIENT_SECRET') ?? '';
    if (!clientId || !secret) return { ok: false, error: 'no_credentials' };

    const sandbox = this.config.get<string>('PAYPAL_SANDBOX') !== 'false';
    const base = sandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';

    try {
      await axios.post(
        `${base}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          auth: { username: clientId, password: secret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000,
        },
      );
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'err' };
    }
  }
}
