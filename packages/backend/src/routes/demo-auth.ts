/**
 * Demo Auth Routes — /api/v1/auth/demo-token
 * Bypasses Firebase Auth for e2e testing.
 * Only active when NODE_ENV=development or demo.
 */
import { Router } from 'express';
import { getAuth } from '../config/firebase.js';
import { UserRole } from '@civicmind/shared';
import type { Request, Response } from 'express';

const router = Router();

router.post('/demo-token', async (req: Request, res: Response) => {
  const { role } = req.query as { role?: string };
  
  // Only allow this route in development mode!
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: { message: 'Not available in production' } });
    return;
  }

  try {
    let uid = '';
    let additionalClaims = {};

    if (role === 'citizen') {
      uid = 'CITIZEN_DEMO_UID';
      additionalClaims = { role: UserRole.Citizen, is_guest: false };
    } else if (role === 'authority') {
      uid = 'AUTHORITY_DEMO_UID';
      additionalClaims = { 
        role: UserRole.Authority, 
        is_guest: false,
        department_id: 'de7af73e-324c-4740-9a3d-c11df5b91b92', // BESCOM from seed
        jurisdiction_scope: ['ward-101-indiranagar', 'ward-102-koramangala']
      };
    } else if (role === 'admin') {
      uid = 'ADMIN_DEMO_UID';
      additionalClaims = { role: UserRole.Admin, is_guest: false };
    } else {
      res.status(400).json({ error: { message: 'Invalid role' } });
      return;
    }

    // Generate a custom token (requires service account, which we have in backend)
    const customToken = await getAuth().createCustomToken(uid, additionalClaims);
    
    // We return the custom token. The client (or e2e test) can exchange this 
    // for an ID token using Firebase Client SDK, or if our middleware supports custom tokens.
    // Actually, our middleware `authenticate.ts` verifies *ID Tokens* using `verifyIdToken`.
    // It cannot directly verify a custom token.
    // For e2e tests, the test script can hit the Google Identity Toolkit API to exchange 
    // this custom token for an ID token.
    
    res.status(200).json({ customToken });
  } catch (error) {
    res.status(500).json({ error: { message: 'Failed to create demo token' } });
  }
});

export default router;
