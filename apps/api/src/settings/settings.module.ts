import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { DatabaseModule } from '../database/database.module';
import { PayPalModule } from '../paypal/paypal.module';

@Module({
  imports: [DatabaseModule, PayPalModule],
  controllers: [SettingsController],
})
export class SettingsModule {}
