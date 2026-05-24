// src/app/app.module.ts
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  I18nValidationPipe,
  QueryResolver,
} from 'nestjs-i18n';
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

import { PayPalModule } from '../paypal/paypal.module';

// ✅ Mailer singleton (provided & exported by MailerModule)
import { MailerModule } from '../mailer/mailer.module';

// ✅ Dev-only test endpoints (email test etc.)
import { DevModule } from '../dev/dev.module';

// ✅ E2E/Test-only seed endpoints (e.g., /test/seed-order)
import { TestModule } from '../test/test.module';

// 🔒 Rate limit (toggleable per request via env)
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// 🛰️ Global exception filter (Sentry capture + safe response shape)
import { SentryFilter } from '../sentry.filter';

const devOnlyModules = process.env.NODE_ENV === 'production' ? [] : [DevModule];
const testRoutesModules =
  process.env.ENABLE_TEST_ROUTES === '1' || process.env.NODE_ENV === 'test'
    ? [TestModule]
    : [];

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // i18n
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [
        { use: QueryResolver, options: ['lang', 'locale'] },
        { use: HeaderResolver, options: ['x-lang', 'accept-language'] },
        AcceptLanguageResolver,
      ],
    }),

    // Core/feature modules
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

    // Integrations
    MailerModule, // if marked @Global(), import is harmless; otherwise required
    PayPalModule,

    // Dev / Test (conditional)
    ...devOnlyModules,
    ...testRoutesModules,
  ],
  controllers: [ImageProxyController, HealthController],
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
    // 🛰️ Global exception filter — captures to Sentry and returns safe response
    { provide: APP_FILTER, useClass: SentryFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // ⏱️ Per-IP limiter for payment-creation endpoints. Tighter cap because
    // each call costs an outbound PayPal API request.
    // Enabled by default in production; toggleable via RATE_LIMIT_ENABLED.
    const enabled =
      process.env.RATE_LIMIT_ENABLED === '1' ||
      process.env.NODE_ENV === 'production';
    const paymentsLimiter = rateLimit({
      windowMs: 60_000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      // ipKeyGenerator handles IPv6 safely; required by express-rate-limit v7
      keyGenerator: (req: any) => (req.ip ? ipKeyGenerator(req.ip) : 'unknown'),
      skip: () => !enabled,
    });

    consumer
      .apply(paymentsLimiter)
      .forRoutes(
        { path: 'orders/create-paypal-order', method: RequestMethod.POST },
        { path: 'orders/capture-paypal-order', method: RequestMethod.POST },
      );
  }
}
