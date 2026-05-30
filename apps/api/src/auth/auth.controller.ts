import {
  Controller,
  Post,
  Req,
  UseGuards,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { Auth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { FIREBASE_ADMIN_AUTH } from '../firebase/admin.provider';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import type { FirebaseRequest } from './firebase-auth.guard';
import { SecurityLogsService } from '../security-logs/security-logs.service';

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
  constructor(
    @Inject(FIREBASE_ADMIN_AUTH) private readonly adminAuth: Auth,
    @Inject(SecurityLogsService)
    private readonly auditLog: SecurityLogsService,
  ) {}

  @Post('ensure-role')
  @UseGuards(FirebaseAuthGuard)
  async ensureRole(@Req() req: FirebaseRequest) {
    const { uid, email, role: currentRole } = req.firebaseUser || {};

    if (!uid) {
      // Extremely unlikely if guard passed, but safer to check
      throw new UnauthorizedException('No UID found on request');
    }

    const role = computeRoleForEmail(email);

    // If already has the correct role, nothing to do
    if (currentRole === role) {
      return { role: currentRole, from: 'claims' };
    }

    await this.adminAuth.setCustomUserClaims(uid, { role });

    // Keep Firestore user document in sync
    try {
      await getFirestore()
        .collection('users')
        .doc(uid)
        .set({ role }, { merge: true });
    } catch {
      // non-fatal — JWT claim is the source of truth
    }

    void this.auditLog.log({
      type: 'AUTH_ROLE_ASSIGNED',
      details: `Initial role '${role}' assigned to ${email ?? uid}`,
      collection: 'users',
      affectedDocId: uid,
      actor: { uid, email },
    });

    // Client should refresh ID token after this call
    return { role, from: 'set' };
  }
}
