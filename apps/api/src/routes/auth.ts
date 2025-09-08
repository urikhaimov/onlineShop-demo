import { Router } from 'express';
import { adminAuth } from '../firebase/admin';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';

const router = Router();

function computeRoleForEmail(email?: string | null) {
  const adminsCsv = (process.env.ADMINS_LIST || '').toLowerCase();
  const admins = adminsCsv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (email && admins.includes(email.toLowerCase())) return 'admin';
  return 'viewer'; // default
}

router.post('/set-role', verifyFirebaseToken, async (req, res) => {
  const { uid, email, role: currentRole } = (req as any).firebaseUser || {};

  try {
    // if the token already has a valid role, just return it
    if (
      currentRole &&
      ['admin', 'editor', 'viewer', 'superadmin'].includes(currentRole)
    ) {
      return res.json({ role: currentRole, from: 'claims' });
    }

    const newRole = computeRoleForEmail(email);
    await adminAuth.setCustomUserClaims(uid, { role: newRole });

    // Ask client to refresh its ID token afterwards; we also return the role
    return res.json({ role: newRole, from: 'set' });
  } catch (e) {
    // don’t leak details
    return res.status(500).json({ error: 'set_role_failed' });
  }
});

export default router;
