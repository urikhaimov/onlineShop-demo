import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { firebaseAdminAuthProvider } from '../firebase/admin.provider';
import { FirebaseAuthGuard } from './firebase-auth.guard'; // <- unified path

@Module({
  controllers: [AuthController],
  providers: [firebaseAdminAuthProvider, FirebaseAuthGuard],
  exports: [FirebaseAuthGuard], // optional, but fine to export
})
export class AuthModule {}
