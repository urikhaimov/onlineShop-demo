import { Injectable, Logger } from '@nestjs/common';
import { adminDb } from '@common/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export type SecurityLogType =
  | 'AUTH_ROLE_ASSIGNED'
  | 'AUTH_ROLE_CHANGED'
  | 'USER_PROFILE_UPDATED'
  | 'USER_AVATAR_DELETED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'PRODUCT_REORDERED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_UPDATED';

export interface SecurityLog {
  id: string;
  timestamp: string;
  email?: string;
  uid?: string;
  type: SecurityLogType | string;
  details: string;
  collection: string;
  affectedDocId: string;
}

export interface SecurityLogInput {
  /** What happened. */
  type: SecurityLogType | string;
  /** Free-text description for the audit reader. */
  details: string;
  /** Firestore collection touched. */
  collection: string;
  /** Affected document id. */
  affectedDocId: string;
  /** Actor identity (admin performing the action). */
  actor?: { uid?: string | null; email?: string | null };
}

const COLLECTION = 'security_logs';
/** Hard cap on a single `getAll` page — prevents pulling huge result sets. */
const MAX_PAGE = 200;

@Injectable()
export class SecurityLogsService {
  private readonly logger = new Logger(SecurityLogsService.name);

  /**
   * Persist an audit entry. Errors are logged but never rethrown — audit
   * logging must not break the user-facing operation it is recording.
   */
  async log(input: SecurityLogInput): Promise<void> {
    try {
      await adminDb.collection(COLLECTION).add({
        type: input.type,
        details: input.details,
        collection: input.collection,
        affectedDocId: input.affectedDocId,
        email: input.actor?.email ?? null,
        uid: input.actor?.uid ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      this.logger.warn(
        `audit log write failed for ${input.type}/${input.affectedDocId}: ${
          (err as Error)?.message ?? err
        }`,
      );
    }
  }

  /** List most-recent first, capped at MAX_PAGE entries. */
  async list(limit = 100): Promise<SecurityLog[]> {
    const capped = Math.min(Math.max(1, Math.floor(limit)), MAX_PAGE);
    const snap = await adminDb
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(capped)
      .get();

    return snap.docs.map((doc) => {
      const d = doc.data();
      const ts = d.createdAt;
      const iso =
        ts && typeof ts.toDate === 'function'
          ? ts.toDate().toISOString()
          : new Date().toISOString();
      return {
        id: doc.id,
        timestamp: iso,
        email: d.email ?? undefined,
        uid: d.uid ?? undefined,
        type: d.type,
        details: d.details,
        collection: d.collection,
        affectedDocId: d.affectedDocId,
      };
    });
  }
}
