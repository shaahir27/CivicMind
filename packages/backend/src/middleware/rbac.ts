/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Per api_specification.md §1:
 *   "Authorization: Role-based (citizen/authority/admin) plus jurisdiction/department
 *    scoping for authority role, enforced server-side on every request —
 *    never trust a client-supplied department/jurisdiction claim."
 */

import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './authenticate.js';
import { UserRole } from '@civicmind/shared';
import { ForbiddenError } from '../middleware/errorHandler.js';

/**
 * Middleware factory: requires the request user to have one of the specified roles.
 * Must be used AFTER the authenticate middleware.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'Not authenticated.' },
      });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_SCOPE',
          message: `This action requires one of the following roles: ${roles.join(', ')}. Your role is: ${user.role}.`,
        },
      });
      return;
    }

    next();
  };
}

/** Convenience: only citizens (or guests) */
export const requireCitizen = requireRole(UserRole.Citizen);

/** Convenience: only authority staff */
export const requireAuthority = requireRole(UserRole.Authority);

/** Convenience: only admins */
export const requireAdmin = requireRole(UserRole.Admin);

/** Convenience: authority or admin (for endpoints that both can access) */
export const requireAuthorityOrAdmin = requireRole(UserRole.Authority, UserRole.Admin);

/**
 * Middleware: validates that an authority user is within their jurisdiction scope
 * for a given ward/area.
 *
 * Per api_specification.md §1 and BR-8.2:
 *   "Authority users can only act on issues routed to their own department/jurisdiction"
 *
 * Usage: requireJurisdictionScope('ward_or_area_id' param name)
 */
export function requireJurisdictionScope(wardParamOrBody: 'param' | 'body' = 'param', key = 'ward_or_area_id') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    // Admins bypass jurisdiction scoping
    if (user.role === UserRole.Admin) {
      next();
      return;
    }

    if (user.role !== UserRole.Authority) {
      next(); // citizen routes don't need jurisdiction check
      return;
    }

    const wardId: string | undefined =
      wardParamOrBody === 'param'
        ? req.params[key]
        : (req.body as Record<string, unknown>)?.[key] as string | undefined;

    if (!wardId) {
      // No ward specified — let the route handler do a full department-scoped filter
      next();
      return;
    }

    const scope = user.jurisdictionScope ?? [];
    if (scope.length === 0 || scope.includes(wardId)) {
      next();
      return;
    }

    res.status(403).json({
      error: {
        code: 'FORBIDDEN_SCOPE',
        message: `You do not have access to ward/area: ${wardId}. Your jurisdiction scope: [${scope.join(', ')}]`,
      },
    });
  };
}

/**
 * Throws ForbiddenError if the authority user's jurisdictionScope is non-empty
 * and does not include the given ward. Call this from inside a route handler
 * after fetching the issue, once you know its ward_or_area_id.
 * Admins bypass this check entirely.
 */
export function assertWithinJurisdiction(
  user: { role: UserRole; jurisdictionScope?: string[] },
  wardOrAreaId: string | null | undefined
): void {
  if (user.role === UserRole.Admin) return;
  if (user.role !== UserRole.Authority) return;
  if (!wardOrAreaId) return; // issue has no ward assigned — can't scope-check it

  const scope = user.jurisdictionScope ?? [];
  if (scope.length === 0) return; // no scope configured = full department access (current behavior, unchanged)
  if (scope.includes(wardOrAreaId)) return;

  throw new ForbiddenError(
    `You do not have jurisdiction over ward/area: ${wardOrAreaId}.`
  );
}
