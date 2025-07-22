import * as admin from 'firebase-admin';
import serviceAccount from './service-account.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  storageBucket: 'onlinestoretemplate-59d3e.firebasestorage.app', // ✅ IMPORTANT!
});

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth, admin }; // ✅ export all necessary members
