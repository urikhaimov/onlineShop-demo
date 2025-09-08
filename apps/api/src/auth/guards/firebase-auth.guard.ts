import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Auth } from 'firebase-admin/auth';
import { FIREBASE_ADMIN_AUTH } from '../../firebase/admin.provider';

export interface FirebaseRequest extends Request {
  firebaseUser?: any;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(@Inject(FIREBASE_ADMIN_AUTH) private readonly adminAuth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FirebaseRequest>();
    const h = req.header('authorization') || req.header('Authorization') || '';
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) throw new UnauthorizedException('missing_bearer_token');

    try {
      const decoded = await this.adminAuth.verifyIdToken(m[1], false);
      req.firebaseUser = decoded; // contains uid, email, custom claims, etc.
      return true;
    } catch {
      throw new UnauthorizedException('invalid_token');
    }
  }
}
