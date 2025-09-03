import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { OrdersController } from './orders.controller';
import { OrdersPublicController } from './orders.public.controller'; // ✅ add this
import { OrdersService } from './orders.service';

@Module({
  imports: [
    // If ConfigModule is already global in AppModule, this import is harmless.
    ConfigModule,
  ],
  controllers: [
    OrdersController,
    OrdersPublicController, // ✅ register the public controller
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
