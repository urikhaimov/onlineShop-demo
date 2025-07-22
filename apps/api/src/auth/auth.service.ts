import { BadRequestException, Injectable } from '@nestjs/common';
import { adminAuth } from '@common/firebase';
import { logger } from '@common/utils';
import { IAuthPayload } from '@common/types';

@Injectable()
export class AuthService {
  async setUserRole(uid: IAuthPayload['uid'], role: IAuthPayload['role']) {
    try {
      logger.info(`Setting role ${role} for UID ${uid}`);
      await adminAuth.setCustomUserClaims(uid, { role });
      logger.info(`Role ${role} set successfully for UID ${uid}`);
    } catch (error) {
      const msg = `Failed to set role ${role} for UID ${uid}`;
      logger.error(msg);

      throw new BadRequestException(error);
    }
  }

  async getUserRole(
    uid: IAuthPayload['uid'],
  ): Promise<IAuthPayload['role'] | null> {
    try {
      const user = await adminAuth.getUser(uid);
      const customClaims = user.customClaims;

      if (customClaims?.role) {
        logger.info(`User role for UID ${uid}: ${customClaims.role}`);
        return customClaims.role as IAuthPayload['role'];
      } else {
        logger.warn(`No role found for UID ${uid}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error fetching user role for UID ${uid}:`, error);
      throw new BadRequestException(error);
    }
  }
}
