import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../firebase/admin';

export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const h = req.header('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'missing_bearer_token' });

  try {
    const decoded = await adminAuth.verifyIdToken(m[1], /*checkRevoked*/ false);
    (req as any).firebaseUser = decoded; // uid, email, claims, etc.
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
