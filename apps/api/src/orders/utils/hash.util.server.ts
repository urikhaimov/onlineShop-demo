// apps/api/src/orders/utils/hash.util.server.ts
import { createHash } from 'crypto';
export function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
