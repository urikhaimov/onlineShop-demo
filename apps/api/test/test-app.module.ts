import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import { join } from 'path';

import { PaymentsModule } from '../src/payments/payments.module';

@Module({
  imports: [
    // keep config global so ConfigService works in the controller ctor
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // minimal i18n so the library doesn't blow up; watch OFF for tests
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: join(__dirname, '../src/app/i18n'),
        watch: false,
      },
    }),

    // only the feature we are testing
    PaymentsModule,
  ],
})
export class TestAppModule {}
