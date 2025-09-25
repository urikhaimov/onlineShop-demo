// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { OrdersPublicController } from './orders.public.controller';
import { OrdersService } from './orders.service';
import { MailerModule } from '../mailer/mailer.module';
import { InvoiceService } from '../invoice/invoice.service';

@Module({
  imports: [ConfigModule, MailerModule],
  controllers: [OrdersController, OrdersPublicController],
  providers: [
    OrdersService,
    InvoiceService, // keep here unless you also make an InvoiceModule
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
