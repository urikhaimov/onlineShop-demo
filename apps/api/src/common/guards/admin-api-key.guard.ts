// src/common/guards/admin-api-key.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const got = req.headers['x-admin-key'];
    if (!process.env.ADMIN_API_KEY || got !== process.env.ADMIN_API_KEY) {
      throw new UnauthorizedException('Invalid admin key');
    }
    return true;
  }
}
