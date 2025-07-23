import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { User } from 'firebase/auth';
import { MSCommands } from './msCommands.type';

@Injectable()
export class AuthClientService implements OnModuleDestroy {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 4002,
      },
    });
  }

  // Example method to call auth microservice
  setUserRole(payload: { user: User }) {
    return this.client.send({ cmd: MSCommands.AUTH_SET_USER_ROLE }, payload);
  }

  async onModuleDestroy() {
    await this.client.close();
  }
}
