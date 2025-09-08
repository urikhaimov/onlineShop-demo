// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { firebaseAdminAuthProvider } from '../firebase/admin.provider';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    firebaseAdminAuthProvider,
    Reflector,
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
  ],
  exports: [firebaseAdminAuthProvider],
})
export class AuthModule {}
