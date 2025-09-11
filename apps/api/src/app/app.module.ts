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
import { HealthController } from '../health.controller';
import { StripeModule } from '../stripe/stripe.module';
import { PaymentsModule } from '../payments/payments.module'; // ✅ NEW

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
    StripeModule,
    PaymentsModule, // ✅ add here so /payments/* routes are registered
  ],
  controllers: [ImageProxyController, HealthController],
})
export class AppModule {}
