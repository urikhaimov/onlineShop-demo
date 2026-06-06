import { Controller, Get, HttpCode, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Public } from '../auth/public.decorator';
import { adminDb } from '@common/firebase';

@Controller('_health')
export class HealthController {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  /** Backwards-compatible default check. */
  @Public()
  @Get()
  ok() {
    return { ok: true, ts: Date.now() };
  }

  /**
   * Liveness probe — "is the process alive?" Fast, no external deps.
   * Suitable for k8s livenessProbe / Render health check.
   */
  @Public()
  @Get('live')
  @HttpCode(200)
  live() {
    return { ok: true };
  }

  /**
   * Readiness probe — "can this instance serve traffic?" Cheap Firestore
   * round-trip so the orchestrator stops routing traffic if the DB is
   * unreachable.
   */
  @Public()
  @Get('ready')
  async ready() {
    try {
      await adminDb.collection('_health').limit(1).get();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'firestore_unreachable' };
    }
  }

  @Public()
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
