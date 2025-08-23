import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule /*, I18nJsonLoader */ } from 'nestjs-i18n';
import { join } from 'path';

import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { CategoriesModule } from '../categories/categories.module';
import { ImageProxyController } from '../image-proxy/image-proxy.controller';
import { StripeController } from '../stripe/stripe.controller';
import { ThemeSettingsModule } from '../theme/theme-settings.module';
import { LandingPageModule } from '../landing-page/landing-page.module';
import { SecurityLogsModule } from '../security-logs/security-logs.module';
import { AuthClientModule } from 'auth-client';
import { ApiAuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 🔤 i18n (new API uses loaderOptions)
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      // loader: I18nJsonLoader, // optional; JSON is default
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: process.env.NODE_ENV !== 'production',
      },
      // typesOutputPath: join(__dirname, 'i18n.generated.d.ts'), // optional
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
  ],
  controllers: [ImageProxyController, StripeController],
})
export class AppModule {}
