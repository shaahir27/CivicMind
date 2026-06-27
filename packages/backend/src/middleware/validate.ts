/**
 * Input Validation Middleware — Zod schemas for all POST/PUT request bodies.
 *
 * Usage:
 *   router.post('/issues', validate(reportIssueSchema), handler)
 *
 * On validation failure returns HTTP 422 with code VALIDATION_ERROR and a
 * human-readable list of field errors (never a raw Zod message to the client).
 */

import { z, ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { IssueCategory, IssueSeverity } from '@civicmind/shared';

// ─── Validation error response helper ────────────────────────────────────────

function validationErrorResponse(errors: z.ZodIssue[]) {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request body failed validation.',
      fields: errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    },
  };
}

/** Express middleware factory — validates req.body against a Zod schema. */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json(validationErrorResponse(result.error.issues));
      return;
    }
    // Replace body with parsed/coerced value so downstream handlers get clean data
    req.body = result.data;
    next();
  };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** POST /api/v1/issues — Report a new civic issue */
export const reportIssueSchema = z.object({
  idempotency_key: z
    .string({ required_error: 'idempotency_key is required' })
    .uuid('idempotency_key must be a valid UUID v4')
    .max(36),
  location: z.object(
    {
      lat: z.number({ required_error: 'location.lat is required' })
        .min(-90, 'latitude out of range')
        .max(90, 'latitude out of range'),
      lng: z.number({ required_error: 'location.lng is required' })
        .min(-180, 'longitude out of range')
        .max(180, 'longitude out of range'),
    },
    { required_error: 'location is required' }
  ),
  description: z
    .string()
    .max(2000, 'description must be 2000 characters or fewer')
    .optional()
    .nullable(),
  photo_refs: z
    .array(z.string().max(2048))
    .min(1, 'At least one photo_ref is required (BR-1.1)')
    .max(5, 'Maximum 5 photos per submission')
    .optional(),
  manual_category_override: z.string().optional().nullable(),
  manual_severity_override: z.string().optional().nullable(),
});

/** POST /api/v1/issues/:id/confirm — Citizen confirms AI suggestions */
export const confirmIssueSchema = z.object({
  confirmed_category: z.enum(Object.values(IssueCategory) as [string, ...string[]], {
    required_error: 'confirmed_category is required',
    invalid_type_error: 'confirmed_category must be a valid IssueCategory',
  }),
  confirmed_severity: z.enum(Object.values(IssueSeverity) as [string, ...string[]], {
    required_error: 'confirmed_severity is required',
    invalid_type_error: 'confirmed_severity must be a valid IssueSeverity',
  }),
  description: z
    .string()
    .max(2000, 'description must be 2000 characters or fewer')
    .optional()
    .nullable(),
});

/** POST /api/v1/authority/issues/:id/status — Authority status update */
export const authorityStatusUpdateSchema = z.object({
  new_status: z.enum(['in_progress', 'resolved'], {
    required_error: 'new_status is required',
    invalid_type_error: 'new_status must be "in_progress" or "resolved"',
  }),
  after_photo_ref: z
    .string()
    .max(2048)
    .optional()
    .nullable(),
}).refine(
  (data) => data.new_status !== 'resolved' || !!data.after_photo_ref,
  {
    message: 'after_photo_ref is required when new_status is "resolved" (BR-5.1)',
    path: ['after_photo_ref'],
  }
);

/** POST /api/v1/authority/issues/:id/reassign — Authority reassigns department */
export const authorityReassignSchema = z.object({
  new_department_id: z
    .string({ required_error: 'new_department_id is required' })
    .uuid('new_department_id must be a valid UUID'),
  reason: z
    .string({ required_error: 'reason is required (BR-3.3)' })
    .min(10, 'reason must be at least 10 characters')
    .max(500, 'reason must be 500 characters or fewer'),
});

/** POST /api/v1/issues/:id/corroborate — Citizen corroborates existing issue */
export const corroborateIssueSchema = z.object({
  idempotency_key: z
    .string({ required_error: 'idempotency_key is required' })
    .uuid('idempotency_key must be a valid UUID v4'),
  photo_refs: z
    .array(z.string())
    .max(3)
    .optional(),
  confirm_same_issue: z
    .boolean({ required_error: 'confirm_same_issue is required' }),
});

/** POST /api/v1/issues/:id/dispute — Citizen disputes resolution */
export const disputeResolutionSchema = z.object({
  reason: z
    .string({ required_error: 'reason is required' })
    .min(10, 'reason must be at least 10 characters')
    .max(1000),
});

/** POST /api/v1/admin/sla-config — Admin updates SLA configuration */
export const adminSlaConfigSchema = z.object({
  category: z.enum(Object.values(IssueCategory) as [string, ...string[]], {
    required_error: 'category is required',
  }),
  severity: z.enum(Object.values(IssueSeverity) as [string, ...string[]], {
    required_error: 'severity is required',
  }),
  sla_hours: z
    .number({ required_error: 'sla_hours is required' })
    .int('sla_hours must be an integer')
    .min(1, 'sla_hours must be at least 1')
    .max(720, 'sla_hours must be 720 or fewer (30 days)'),
});
