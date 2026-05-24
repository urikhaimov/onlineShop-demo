import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

export interface SecurityLog {
  id: string;
  timestamp: string; // ISO string
  email?: string;
  uid?: string;
  type: string;
  details: string;
  collection: string;
  affectedDocId: string;
}

/**
 * TODO: Replace the in-memory store with a Firestore-backed
 * SecurityLogsService that mutators call from auth/users/products/orders
 * controllers (role changes, user deletes, status changes, etc.).
 * Tracked in the audit follow-ups.
 */
@Controller('admin/security-logs')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class SecurityLogsController {
  @Get()
  getSecurityLogs(): SecurityLog[] {
    return [];
  }
}
