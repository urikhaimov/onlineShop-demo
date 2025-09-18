import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StripeService } from './stripe.service';

type CreateIntentBody = {
  items: Array<{ id: string; qty: number }>;
  currency?: string;
};

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeSvc: StripeService) {}

  @Post('payment-intent')
  async createPaymentIntent(@Body() body: CreateIntentBody) {
    const items = Array.isArray(body.items) ? body.items : [];
    const currency = (body.currency || 'ils').toLowerCase();
    const pi = await this.stripeSvc.createPaymentIntentFromItems({
      items,
      currency,
    });
    return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
  }

  @Get('payment-intent/:id')
  async getPaymentIntent(@Param('id') id: string) {
    const pi = await this.stripeSvc.retrievePaymentIntent(id);
    return { id: pi.id, amount: pi.amount, status: pi.status };
  }
}
