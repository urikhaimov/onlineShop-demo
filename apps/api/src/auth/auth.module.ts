import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { firebaseAdminAuthProvider } from '../firebase/admin.provider';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [firebaseAdminAuthProvider, FirebaseAuthGuard],
})
export class AuthModule {}
