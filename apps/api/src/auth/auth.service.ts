import { Injectable } from '@nestjs/common';
import { AuthClientService } from 'auth-client';
import { User } from 'firebase/auth';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ApiAuthService {
  constructor(private readonly authClient: AuthClientService) {}

  async setUserRole(user: User) {
    return await lastValueFrom(this.authClient.setUserRole({ user }));
  }
}
