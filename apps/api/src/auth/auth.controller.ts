import {
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { User } from 'firebase/auth';
import { ApiAuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class ApiAuthController {
  constructor(private readonly authService: ApiAuthService) {}

  @UseGuards(AuthGuard)
  @Post('set-role')
  async setUserRole(
    @Req() req: Request & { user: User },
  ): Promise<{ message: string }> {
    const { user } = req;

    if (!user) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      return await this.authService.setUserRole(user);
    } catch (error) {
      throw new UnauthorizedException('Unable to set user role', error);
    }
  }
}
