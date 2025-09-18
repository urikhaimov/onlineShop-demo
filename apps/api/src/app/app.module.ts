// src/app/app.module.ts
import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { I18nModule, I18nValidationPipe } from 'nestjs-i18n';
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

// 🔒 Rate limit (toggleable per request via env)
import rateLimit from 'express-rate-limit';

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
  providers: [
    // 🌍 Global validation pipe (i18n-aware)
    {
      provide: APP_PIPE,
      useFactory: () =>
        new I18nValidationPipe({
          whitelist: true,
          transform: true,
          forbidNonWhitelisted: true,
          validationError: { target: false, value: false },
        }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // ⏱️ Apply a 10 req/min/IP limiter to create-intent.
    // Enabled only when RATE_LIMIT_ENABLED=1 (useful for e2e that assert 429).
    const createIntentLimiter = rateLimit({
      windowMs: 60_000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: any) => req.ip ?? 'unknown',
      skip: () => process.env.RATE_LIMIT_ENABLED !== '1',
    });

    consumer.apply(createIntentLimiter).forRoutes({
      path: 'payments/create-payment-intent',
      method: RequestMethod.POST,
    });
  }
}
