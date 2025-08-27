// apps/server/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  // Respond to /api/ping
  @Get('ping')
  ping() {
    return { ok: true, ts: Date.now() };
  }

  // Respond to /api/health (and a couple of aliases)
  @Get(['health', 'status', 'ready'])
  health() {
    return {
      ok: true,
      ts: Date.now(),
      uptime: process.uptime(),
      pid: process.pid,
      env: process.env.NODE_ENV ?? 'development',
    };
  }
}
