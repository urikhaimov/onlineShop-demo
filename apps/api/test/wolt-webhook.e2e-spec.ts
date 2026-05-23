import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { WoltWebhookController } from '../src/wolt-webhook/wolt-webhook.controller';

describe('WoltWebhookController (e2e)', () => {
  let app: INestApplication;
  const secret = 'wolt_test_secret';

  beforeAll(async () => {
    const cfg = new Map<string, any>([['WOLT_WEBHOOK_SECRET', secret]]);
    const configMock: Pick<ConfigService, 'get'> = {
      get: (k: string) => cfg.get(k),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [WoltWebhookController],
      providers: [{ provide: ConfigService, useValue: configMock }],
    }).compile();

    const apiPrefix = process.env.API_PREFIX ?? 'api';

    // rawBody must be enabled so bodyParser.raw can attach req.rawBody
    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix(apiPrefix);

    // Mount raw-body ONLY for this route, BEFORE JSON (helper is defined in setupFiles)
    (global as any).applyWebhookRaw(app, `/${apiPrefix}/webhooks/wolt`);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function sign(raw: string) {
    return createHmac('sha256', secret).update(Buffer.from(raw)).digest('hex');
  }

  it('accepts lowercase x-signature header', async () => {
    const payload = { type: 'order.created', data: { id: 'w1' } };
    const raw = JSON.stringify(payload);
    const sig = sign(raw);

    await request(app.getHttpServer())
      .post('/api/webhooks/wolt')
      .set('x-signature', sig)
      .set('Content-Type', 'application/json')
      .send(raw)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ ok: true });
      });
  });

  it('accepts title-case X-Signature header with t=...,v1=... format', async () => {
    const payload = { type: 'order.updated', data: { id: 'w2' } };
    const raw = JSON.stringify(payload);
    const sig = sign(raw);
    const header = `t=${Math.floor(Date.now() / 1000)},v1=${sig}`;

    await request(app.getHttpServer())
      .post('/api/webhooks/wolt')
      .set('X-Signature', header)
      .set('Content-Type', 'application/json')
      .send(raw)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ ok: true });
      });
  });

  it('rejects bad signature', async () => {
    const payload = { type: 'order.created', data: { id: 'w3' } };
    const raw = JSON.stringify(payload);

    await request(app.getHttpServer())
      .post('/api/webhooks/wolt')
      .set('x-signature', 'deadbeef') // invalid
      .set('Content-Type', 'application/json')
      .send(raw)
      .expect(400);
  });
});
