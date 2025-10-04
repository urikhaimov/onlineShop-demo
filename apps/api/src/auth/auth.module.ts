// apps/api/src/auth/auth.module.ts (or wherever you keep auth)
import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [Reflector, FirebaseAuthGuard, RolesGuard],
  exports: [FirebaseAuthGuard, RolesGuard],
})
export class AuthModule {}
