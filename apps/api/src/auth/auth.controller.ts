import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Auth } from 'firebase-admin/auth';
import { FIREBASE_ADMIN_AUTH } from '../firebase/admin.provider';
import {
  FirebaseAuthGuard,
  FirebaseRequest,
} from './guards/firebase-auth.guard';

function computeRoleForEmail(email?: string | null) {
  const adminsCsv = (process.env.ADMINS_LIST || '').toLowerCase();
  const admins = adminsCsv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (email && admins.includes(email.toLowerCase())) return 'admin';
  return 'viewer'; // default for everyone else
}

@Controller('auth') // final path => /api/auth/* because of your global prefix
export class AuthController {
  constructor(@Inject(FIREBASE_ADMIN_AUTH) private readonly adminAuth: Auth) {}

  @Post('set-role')
  @UseGuards(FirebaseAuthGuard)
  async setRole(@Req() req: FirebaseRequest) {
    const { uid, email, role: currentRole } = req.firebaseUser || {};

    // if already has a valid role, don't change it
    if (
      currentRole &&
      ['admin', 'editor', 'viewer', 'superadmin'].includes(currentRole)
    ) {
      return { role: currentRole, from: 'claims' };
    }

    const role = computeRoleForEmail(email);
    await this.adminAuth.setCustomUserClaims(uid, { role });

    // client should refresh ID token after this call
    return { role, from: 'set' };
  }
}
