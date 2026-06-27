/**
 * Auth Routes — /api/v1/auth/*
 * Per api_specification.md §2
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getAuth, getFirestore, COLLECTIONS } from '../config/firebase.js';
import { UserRole } from '@civicmind/shared';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/authenticate.js';
import { strictRateLimit } from '../middleware/rateLimiter.js';
import { config } from '../config/env.js';
import type { Request, Response } from 'express';

const router = Router();

// ─── POST /api/v1/auth/guest-session ─────────────────────────────────────────
router.post('/guest-session', strictRateLimit, asyncHandler(async (_req: Request, res: Response) => {
  // Create an anonymous Firebase user
  const userRecord = await getAuth().createUser({
    disabled: false,
  });

  // Set custom claims: role=citizen, is_guest=true
  await getAuth().setCustomUserClaims(userRecord.uid, {
    role: UserRole.Citizen,
    is_guest: true,
  });

  // Create user document in Firestore
  const now = new Date().toISOString();
  await getFirestore().collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
    user_id: userRecord.uid,
    role: UserRole.Citizen,
    auth_provider_id: userRecord.uid,
    hero_points_balance: 0,
    is_guest: true,
    preferred_language: 'en',
    created_at: now,
    updated_at: now,
  });

  // Create a custom token the client can exchange for an ID token
  const customToken = await getAuth().createCustomToken(userRecord.uid, {
    role: UserRole.Citizen,
    is_guest: true,
  });

  res.status(201).json({
    session_token: customToken,
    user_id: userRecord.uid,
    is_guest: true,
  });
}));

// ─── POST /api/v1/auth/request-otp ───────────────────────────────────────────
// NOTE: In a production system, this would integrate with an SMS/email OTP provider.
// For the hackathon MVP, we simulate OTP issuance in-process and store the request
// in Firestore with a 5-minute TTL. The client reads back the OTP from the
// Firestore document (acceptable for demo; replace with a real OTP service in production).
router.post('/request-otp', asyncHandler(async (req: Request, res: Response) => {
  const { contact_type, contact_value } = req.body as {
    contact_type: 'phone' | 'email';
    contact_value: string;
  };

  if (!contact_type || !contact_value) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'contact_type and contact_value are required.',
      },
    });
    return;
  }

  const otpRequestId = uuidv4();
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Store OTP request (in production: never log the code; use an encrypted store)
  await getFirestore().collection('otp_requests').doc(otpRequestId).set({
    otp_request_id: otpRequestId,
    contact_type,
    contact_value,
    code_hash: code, // TODO: hash before storing in production
    expires_at: expiresAt,
    used: false,
    created_at: new Date().toISOString(),
  });

  // In dev mode, log the OTP for easy testing (NEVER in production)
  if (process.env['NODE_ENV'] === 'development') {
    console.log(`[DEV] OTP for ${contact_value}: ${code}`);
  }

  res.status(200).json({
    otp_request_id: otpRequestId,
    expires_in_seconds: 300,
  });
}));

// ─── POST /api/v1/auth/verify-otp ────────────────────────────────────────────
router.post('/verify-otp', asyncHandler(async (req: Request, res: Response) => {
  const { otp_request_id, code } = req.body as { otp_request_id: string; code: string };

  if (!otp_request_id || !code) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'otp_request_id and code are required.',
      },
    });
    return;
  }

  const db = getFirestore();
  const otpDoc = await db.collection('otp_requests').doc(otp_request_id).get();

  if (!otpDoc.exists) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Unknown otp_request_id.' },
    });
    return;
  }

  const otpData = otpDoc.data()!;

  if (otpData['used']) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'OTP already used.' },
    });
    return;
  }

  if (new Date(otpData['expires_at'] as string) < new Date()) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'OTP expired.' },
    });
    return;
  }

  // In dev mode, allow the magic OTP "123456"
  const isMagicDevOTP = process.env['NODE_ENV'] === 'development' && code === '123456';

  if (!isMagicDevOTP && otpData['code_hash'] !== code) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid OTP code.' },
    });
    return;
  }

  // Mark OTP as used
  await otpDoc.ref.update({ used: true });

  // Find or create user by contact
  const contactField = otpData['contact_type'] === 'phone' ? 'phone' : 'email';
  const contactValue = otpData['contact_value'] as string;

  let userRecord;
  let isNewUser = false;
  try {
    // Try to find existing user
    userRecord = contactField === 'phone'
      ? await getAuth().getUserByPhoneNumber(contactValue)
      : await getAuth().getUserByEmail(contactValue);
  } catch {
    // Create new user
    isNewUser = true;
    userRecord = await getAuth().createUser({
      [contactField === 'phone' ? 'phoneNumber' : 'email']: contactValue,
    });

    await getAuth().setCustomUserClaims(userRecord.uid, { role: UserRole.Citizen, is_guest: false });

    const now = new Date().toISOString();
    await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
      user_id: userRecord.uid,
      role: UserRole.Citizen,
      [contactField]: contactValue,
      auth_provider_id: userRecord.uid,
      hero_points_balance: 0,
      is_guest: false,
      preferred_language: 'en',
      created_at: now,
      updated_at: now,
    });
  }

  const accessToken = await getAuth().createCustomToken(userRecord.uid, {
    role: UserRole.Citizen,
    is_guest: false,
  });

  res.status(200).json({
    access_token: accessToken,
    user_id: userRecord.uid,
    role: UserRole.Citizen,
    is_new_user: isNewUser,
  });
}));

// ─── POST /api/v1/auth/google-sync ──────────────────────────────────────────
router.post('/google-sync', asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken: string };
  if (!idToken) {
    res.status(400).json({ error: { message: 'idToken is required' } });
    return;
  }

  const decoded = await getAuth().verifyIdToken(idToken);
  const uid = decoded.uid;
  const db = getFirestore();
  
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  let isNewUser = false;

  if (!userDoc.exists) {
    isNewUser = true;
    await getAuth().setCustomUserClaims(uid, { role: UserRole.Citizen, is_guest: false });
    
    const now = new Date().toISOString();
    await db.collection(COLLECTIONS.USERS).doc(uid).set({
      user_id: uid,
      role: UserRole.Citizen,
      email: decoded.email,
      name: decoded.name,
      auth_provider_id: uid,
      hero_points_balance: 0,
      is_guest: false,
      preferred_language: 'en',
      created_at: now,
      updated_at: now,
    });
  }

  res.status(200).json({
    user_id: uid,
    role: UserRole.Citizen,
    is_new_user: isNewUser,
  });
}));

// ─── POST /api/v1/auth/profile ──────────────────────────────────────────────
router.post('/profile', authenticate as any, asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body as { name: string };
  if (!name) {
    res.status(400).json({ error: { message: 'name is required' } });
    return;
  }

  const db = getFirestore();
  await db.collection(COLLECTIONS.USERS).doc((req as AuthRequest).user.uid).update({
    name,
    updated_at: new Date().toISOString(),
  });

  res.status(200).json({ success: true });
}));

// ─── POST /api/v1/auth/login (Authority / Admin) ─────────────────────────────
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'email and password are required.',
      },
    });
    return;
  }

  // Firebase Admin SDK doesn't support email/password verification directly.
  // We verify by calling Firebase Auth REST API.
  const FIREBASE_API_KEY = config.firebase.publicApiKey;
  if (!FIREBASE_API_KEY) {
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Firebase API key not configured.' },
    });
    return;
  }

  const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
  const response = await fetch(signInUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!response.ok) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Invalid email or password.' },
    });
    return;
  }

  const firebaseResponse = await response.json() as { localId: string; idToken: string };
  const uid = firebaseResponse.localId;

  // Get user record to check role
  const userRecord = await getAuth().getUser(uid);
  const claims = userRecord.customClaims ?? {};
  const role = (claims['role'] as UserRole | undefined) ?? UserRole.Citizen;

  if (role === UserRole.Citizen) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN_SCOPE',
        message: 'This login endpoint is for authority and admin accounts only.',
      },
    });
    return;
  }

  res.status(200).json({
    access_token: firebaseResponse.idToken,
    user_id: uid,
    role,
    department_id: claims['department_id'] ?? null,
    jurisdiction_scope: claims['jurisdiction_scope'] ?? [],
  });
}));

export default router;
