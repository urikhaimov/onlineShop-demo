import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { OrdersService } from './orders.service';

@Controller('orders/public') // -> /api/orders/public/*
export class OrdersPublicController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Get(':piId')
  getByPaymentIntent(@Param('piId') piId: string) {
    return this.ordersService.getPublicStatusByPaymentIntent(piId);
  }
}
