import {
  Controller,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { getEnv, logger } from '@common/utils';
import { EUserRole } from '@common/types';
import { User } from 'firebase/auth';
import { MSCommands } from 'auth-client';

@Controller()
export class AuthController {
  constructor(private readonly authClientService: AuthService) {}

  @MessagePattern({ cmd: MSCommands.AUTH_SET_USER_ROLE })
  async setUserRole(data: { user: User }) {
    if (!data.user) {
      throw new UnauthorizedException('Missing token');
    }

    const admins = (getEnv('ADMINS_LIST') as string)
      .split(',')
      .map((email) => email.trim());

    const role = admins.includes(data.user.email)
      ? EUserRole.ADMIN
      : EUserRole.VIEWER;

    try {
      const existingRole = await this.authClientService.getUserRole(
        data.user.uid,
      );

      if (existingRole) {
        logger.info(`User already has role: ${existingRole}`);
        return { message: 'User already has role' };
      }

      await this.authClientService.setUserRole(data.user.uid, role);
      logger.info(`After setting role ${role} for UID: ${data.user.uid}`);

      return { message: `Role is set for UID: ${data.user.uid}` };
    } catch (error) {
      logger.error(error);
      throw new InternalServerErrorException('Unable to set user role', error);
    }
  }
}
