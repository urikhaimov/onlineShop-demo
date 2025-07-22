import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { auth, firestore } from 'firebase-admin';
import { Request } from 'express';
import { AppError, ECommonErrors, getEnv, logger } from '@common/utils';

interface AuthenticatedUser {
  uid: string;
  email: string;
  role: string;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new AppError(ECommonErrors.MISSING_AUTHORIZATION_HEADER);
      logger.error(`[FirebaseAuthGuard] ${err.message}`);
      throw new UnauthorizedException(err.message);
    }

    const token = authHeader.split(' ')[1];

    try {
      const decodedToken = await auth().verifyIdToken(token);

      // 🔍 Fetch a user role from Firestore
      const userDoc = await firestore()
        .collection('users')
        .doc(decodedToken.uid)
        .get();

      const role = userDoc.exists ? userDoc.data()?.role || 'user' : 'user';

      // ✅ Attach user to request (ensure Express typing is extended elsewhere)
      (request as Request & { user?: AuthenticatedUser }).user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        role,
      };

      const isProd =
        getEnv('NODE_ENV', { defaultValue: 'development' }) === 'production';
      if (!isProd) {
        logger.info('[FirebaseAuthGuard] Authenticated user', request.user);
      }

      return true;
    } catch (error: any) {
      logger.error(
        `[FirebaseAuthGuard] Token verification failed: ${error.message || error}`,
      );
      const err = new AppError(
        ECommonErrors.FIREBASE_TOKEN_VERIFICATION_FAILED,
      );
      throw new UnauthorizedException(err.message);
    }
  }
}
