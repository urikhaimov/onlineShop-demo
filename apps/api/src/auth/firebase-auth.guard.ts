import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import admin from 'firebase-admin';
import { IS_PUBLIC_KEY } from './public.decorator';

export type Role =
  | 'viewer'
  | 'editor'
  | 'admin'
  | 'superadmin'
  | 'user'
  | string;

export interface FirebaseUser {
  uid: string;
  email?: string | null;
  role: Role;
}

export interface FirebaseRequest extends Request {
  /** Nest commonly sets this */
  user?: { uid: string; role: Role; email?: string | null };
  /** Your app-specific convenience */
  firebaseUser?: FirebaseUser;
}

function getBearerToken(req: Request) {
  const raw = (req.headers['authorization'] ?? req.headers['Authorization']) as
    | string
    | string[]
    | undefined;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (typeof header !== 'string') return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1].trim() : null;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Public routes bypass
    const isPublic =
      this.reflector?.getAllAndOverride?.<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<FirebaseRequest>();

    // Allow preflight / head
    const method = (req.method || '').toUpperCase();
    if (method === 'OPTIONS' || method === 'HEAD') return true;

    const token = getBearerToken(req);
    if (!token) {
      throw new UnauthorizedException('Missing Authorization: Bearer <token>');
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      const email = decoded.email ?? null;
      const roleFromClaims =
        (decoded as any).role ||
        (decoded as any)['https://hasura.io/jwt/claims']?.[
          'x-hasura-default-role'
        ] ||
        'user';

      // Populate both shapes so the rest of the app can use either
      req.user = { uid: decoded.uid, role: roleFromClaims, email };
      req.firebaseUser = { uid: decoded.uid, email, role: roleFromClaims };

      // Optional hardening:
      // if (decoded.email && decoded.email_verified === false) {
      //   throw new UnauthorizedException('Email not verified');
      // }

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
