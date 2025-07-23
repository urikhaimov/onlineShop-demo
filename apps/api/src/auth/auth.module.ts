import { Module } from '@nestjs/common';
import { ApiAuthService } from './auth.service';
import { ApiAuthController } from './auth.controller';
import { AuthClientModule } from 'auth-client';

@Module({
  imports: [AuthClientModule],
  controllers: [ApiAuthController],
  providers: [ApiAuthService], // optional for now
})
export class ApiAuthModule {}
