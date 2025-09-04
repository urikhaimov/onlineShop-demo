import * as admin from 'firebase-admin';

export function nowTs() {
  return admin.firestore.Timestamp.now();
}
