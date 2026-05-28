import {
  Body,
  Controller,
  Get,
  Inject,
  Optional,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PayPalPaymentsService } from '../orders/services/paypal-payments.service';

interface PayPalSettings {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
}

@Controller('settings')
export class SettingsController {
  constructor(
    @Inject(Firestore) private readonly db: Firestore,
    @Optional() private readonly paypal?: PayPalPaymentsService,
  ) {}

  private paypalDoc() {
    return this.db.collection('settings').doc('paypal');
  }

  /** Public — frontend needs the client ID to initialise PayPal SDK */
  @Get('paypal-client-id')
  async getPayPalClientId() {
    const snap = await this.paypalDoc().get();
    const clientId =
      (snap.exists && (snap.data() as PayPalSettings)?.clientId) ||
      process.env.PAYPAL_CLIENT_ID ||
      '';
    const sandbox = snap.exists
      ? !!(snap.data() as PayPalSettings)?.sandbox
      : (process.env.PAYPAL_SANDBOX ?? 'true') !== 'false';
    return { clientId, sandbox };
  }

  /** Admin only — save PayPal credentials to Firestore */
  @Patch('paypal')
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  async savePayPalSettings(@Body() dto: Partial<PayPalSettings>) {
    await this.paypalDoc().set(dto, { merge: true });
    this.paypal?.invalidateCredentials();
    return { ok: true };
  }
}
