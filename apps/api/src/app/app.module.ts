import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import { join } from 'path';

import { DatabaseModule } from '../database/database.module';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { ImageProxyController } from '../image-proxy/image-proxy.controller';
import { ThemeSettingsModule } from '../theme/theme-settings.module';
import { LandingPageModule } from '../landing-page/landing-page.module';
import { SecurityLogsModule } from '../security-logs/security-logs.module';
import { AuthClientModule } from 'auth-client';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { HealthController } from '../health/health.controller';
import { StripeWebhookController } from '../payments/stripe-webhook.controller';
import { StripeModule } from '../stripe/stripe.module';
import { PaymentsModule } from '../payments/payments.module';

// ✅ Mailer
import { MailerModule } from '../mailer/mailer.module';

// ✅ Dev-only test endpoints (email test etc.)
import { DevModule } from '../dev/dev.module';

// ✅ E2E/Test-only seed endpoints (e.g., /test/seed-order)
import { TestModule } from '../test/test.module';

const devOnlyModules = process.env.NODE_ENV === 'production' ? [] : [DevModule];

const testRoutesModules =
  process.env.ENABLE_TEST_ROUTES === '1' || process.env.NODE_ENV === 'test'
    ? [TestModule]
    : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: process.env.NODE_ENV !== 'production',
      },
    }),

    DatabaseModule,

    AuthClientModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    UsersModule,
    CategoriesModule,
    LandingPageModule,
    ThemeSettingsModule,
    SecurityLogsModule,
    SearchModule,

    // infra / integrations
    MailerModule,
    StripeModule,
    PaymentsModule, // /payments/* routes

    // 🚧 loaded only in non-prod
    ...devOnlyModules,

    // 🧪 loaded only when explicitly enabled or in NODE_ENV=test
    ...testRoutesModules,
  ],
  controllers: [
    ImageProxyController,
    HealthController,
    StripeWebhookController,
  ],
})
export class AppModule {}
