import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import { join } from 'path';

import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { ImageProxyController } from '../image-proxy/image-proxy.controller';
import { ThemeSettingsModule } from '../theme/theme-settings.module';
import { LandingPageModule } from '../landing-page/landing-page.module';
import { SecurityLogsModule } from '../security-logs/security-logs.module';
import { AuthClientModule } from 'auth-client';
import { ApiAuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { HealthController } from '../health.controller';
import { StripeModule } from '../stripe/stripe.module'; // 👈 add this

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        // Make sure this path points to a folder that exists at runtime (dist/prod too)
        path: join(__dirname, 'i18n'),
        watch: process.env.NODE_ENV !== 'production',
      },
    }),

    AuthClientModule,
    ApiAuthModule,
    ProductsModule,
    OrdersModule,
    UsersModule,
    CategoriesModule,
    LandingPageModule,
    ThemeSettingsModule,
    SecurityLogsModule,
    SearchModule,

    StripeModule, // 👈 import the feature module
  ],
  controllers: [
    ImageProxyController,
    HealthController, // keep this
  ],
})
export class AppModule {}
