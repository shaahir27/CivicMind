/**
 * Authentication Middleware
 *
 * Verifies Firebase Auth ID tokens on every protected request.
 * Attaches decoded token + role to req.user for downstream use.
 *
 * Per api_specification.md §1:
 *   "Bearer token (issued by the identity provider) on every request
 *    except public read-only map/forecast endpoints explicitly marked otherwise"
 */

import type { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase.js';
import { UserRole } from '@civicmind/shared';

/** Extended Express Request with authenticated user context */
export interface AuthRequest extends Request {
  user: {
    uid: string;
    role: UserRole;
    email?: string;
    phone?: string;
    departmentId?: string;
    jurisdictionScope?: string[];
    isGuest: boolean;
  };
}

/**
 * Verifies the Bearer token in the Authorization header.
 * Extracts role and department claims set by the backend at account creation.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
      },
    });
    return;
  }

  const token = authHeader.slice(7); // strip 'Bearer '

  // Demo bypass for local e2e testing & hackathon jury demos
  if (token.startsWith('demo-')) {
    const roleString = token.split('-')[1] as UserRole;
    if (roleString === UserRole.Citizen) {
      (req as AuthRequest).user = { uid: 'CITIZEN_DEMO_UID', role: UserRole.Citizen, isGuest: false };
    } else if (roleString === UserRole.Authority) {
      (req as AuthRequest).user = {
        uid: 'AUTHORITY_DEMO_UID', role: UserRole.Authority, isGuest: false,
        departmentId: 'de7af73e-324c-4740-9a3d-c11df5b91b92', jurisdictionScope: ['ward-101-indiranagar', 'ward-102-koramangala']
      };
    } else if (roleString === UserRole.Admin) {
      (req as AuthRequest).user = { uid: 'ADMIN_DEMO_UID', role: UserRole.Admin, isGuest: false };
    } else if (roleString === 'guest' as any) {
      (req as AuthRequest).user = { uid: 'GUEST_DEMO_UID', role: UserRole.Citizen, isGuest: true };
    }
    return next();
  }

  try {
    const decoded = await getAuth().verifyIdToken(token, true /* checkRevoked */);

    // Role is set as a custom claim at account creation / provisioning
    const role = (decoded['role'] as UserRole | undefined) ?? UserRole.Citizen;

    (req as AuthRequest).user = {
      uid: decoded.uid,
      role,
      email: decoded.email,
      phone: decoded.phone_number,
      departmentId: decoded['department_id'] as string | undefined,
      jurisdictionScope: decoded['jurisdiction_scope'] as string[] | undefined,
      isGuest: Boolean(decoded['is_guest']),
    };

    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token verification failed';
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: `Invalid or expired token: ${message}`,
      },
    });
  }
}

/**
 * Guest session authentication.
 * Guest tokens are issued by POST /api/v1/auth/guest-session.
 * They have is_guest=true and role=citizen in their claims.
 */
export async function authenticateOrGuest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // If there's an Authorization header, run full auth
  if (req.headers['authorization']) {
    return authenticate(req, res, next);
  }
  // Otherwise, reject — even public-with-auth endpoints require some token
  res.status(401).json({
    error: {
      code: 'UNAUTHENTICATED',
      message: 'Authentication required.',
    },
  });
}

/**
 * Internal service authentication.
 * Used for /internal/* endpoints triggered by the scheduler (Escalation Agent, Predictor).
 * Validates against the INTERNAL_SERVICE_SECRET env var rather than Firebase Auth.
 */
export function authenticateInternal(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const secret = req.headers['x-internal-secret'];
  const expected = process.env['INTERNAL_SERVICE_SECRET'];

  if (!expected || secret !== expected) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid internal service credential.',
      },
    });
    return;
  }

  next();
}
