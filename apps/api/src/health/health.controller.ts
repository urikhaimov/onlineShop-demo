// apps/api/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { adminDb } from '@common/firebase';

@Controller('health')
export class HealthController {
  @Get('live') live() {
    return { ok: true };
  }

  @Get('ready') async ready() {
    try {
      // cheap Firestore read to ensure creds/connectivity
      await adminDb.collection('__meta').limit(1).get();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
}
