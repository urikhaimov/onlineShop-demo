import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import Stripe from 'stripe';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('stripe')
@UseGuards(FirebaseAuthGuard)
export class StripeController {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-07-30.basil',
    });
  }

  @Get('payment-intent/:id')
  async getPaymentIntent(@Param('id') id: string) {
    return await this.stripe.paymentIntents.retrieve(id);
  }
}
