import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import * as admin from 'firebase-admin';
import { IS_PUBLIC_KEY } from './public.decorator';

type AuthedUser = { uid: string; role?: string };

function getBearerToken(req: Request): string | null {
  const header =
    (req.headers['authorization'] as string) ||
    (req.headers['Authorization'] as string);
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow @Public() routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthedUser }>();

    if (req.method === 'OPTIONS') return true; // CORS preflight

    const token = getBearerToken(req);
    if (!token)
      throw new UnauthorizedException('Missing Authorization: Bearer <token>');

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      const roleFromClaims =
        (decoded as any).role ||
        (decoded as any)['https://hasura.io/jwt/claims']?.[
          'x-hasura-default-role'
        ] ||
        'user';
      req.user = { uid: decoded.uid, role: roleFromClaims };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
