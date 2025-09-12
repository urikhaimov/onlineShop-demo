import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { IsEmail } from 'class-validator';
// Update the import path below to the correct relative path if needed
import { MailerService } from '../mailer/mailer.service';

class ToDto {
  @IsEmail()
  to!: string;
}

@Controller('dev')
export class DevController {
  constructor(private readonly mailer: MailerService) {}

  @Post('test-email/order')
  async sendOrder(@Body() dto: ToDto) {
    const payload = {
      orderId: 'demo-123',
      amount: 12900, // ₪129.00
      currency: 'ils',
      paymentIntentId: 'pi_demo_123',
      created: true,
    };

    const res = await this.mailer.sendOrderConfirmation(dto.to, payload);
    if (!res.ok) throw new InternalServerErrorException('Send failed');
    return { ok: true, messageId: res.id };
  }

  @Post('test-email/refund')
  async sendRefund(@Body() dto: ToDto) {
    const payload = {
      orderId: 'demo-123',
      amount: 4900, // ₪49.00
      currency: 'ils',
      chargeId: 'ch_demo_456',
      full: false,
      refundIds: ['re_demo_001'],
    };

    const res = await this.mailer.sendRefundEmail(dto.to, payload);
    if (!res.ok) throw new InternalServerErrorException('Send failed');
    return { ok: true, messageId: res.id };
  }
}
