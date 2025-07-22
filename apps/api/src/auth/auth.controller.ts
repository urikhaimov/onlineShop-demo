import {
  Controller,
  InternalServerErrorException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { getEnv, logger } from '@common/utils';
import { User } from 'firebase/auth';
import { EUserRole } from '@common/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard)
  @Post('set-role')
  async setUserRole(
    @Req() req: Request & { user: User },
  ): Promise<{ message: string }> {
    const { user } = req;

    if (!user) {
      throw new UnauthorizedException('Missing token');
    }

    const admins = (getEnv('ADMINS_LIST') as string)
      .split(',')
      .map((email) => email.trim());

    const role = admins.includes(user.email)
      ? EUserRole.ADMIN
      : EUserRole.VIEWER;

    try {
      const existingRole = await this.authService.getUserRole(user.uid);

      if (existingRole) {
        logger.info(`User already has role: ${existingRole}`);
        return { message: 'User already has role' };
      }

      await this.authService.setUserRole(user.uid, role);
      logger.info(`After setting role ${role} for UID: ${user.uid}`);

      return { message: `Role is set for UID: ${user.uid}` };
    } catch (error) {
      logger.error(error);
      throw new InternalServerErrorException('Unable to set user role', error);
    }
  }
}
