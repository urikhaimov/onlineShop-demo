// apps/api/src/orders/utils/request.util.ts
import type { Request } from 'express';

/** Request shape when Nest is created with { rawBody: true } or route uses bodyParser.raw() */
export type NestRawRequest = Request & { rawBody?: Buffer };

/** Safely grab the raw Buffer that Stripe needs for signature verification. */
export function getStripeRawBody(req: NestRawRequest): Buffer | undefined {
  if (!req) return undefined;

  // Preferred: NestFactory.create(..., { rawBody: true })
  if (req.rawBody && Buffer.isBuffer(req.rawBody)) return req.rawBody;

  // Route-level bodyParser.raw() puts a Buffer at req.body
  const body = (req as any).body;
  if (Buffer.isBuffer(body)) return body;

  // If the JSON parser already ran, we can't reconstruct it reliably.
  return undefined;
}
