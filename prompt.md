# CivicSense — Image Upload & AI Processing Pipeline: Root Cause Analysis & Fix

**Audited by:** Senior Software Engineer (code review pass)
**Scope:** `packages/citizen-app` (React/Vite) + `packages/backend` (Express/Node)
**Bug:** Every citizen report submission with a real captured photo silently fails to complete, regardless of login method (guest / OTP / Google).

---

## 1. Root Cause (the actual bug)

**The bug is entirely client-side, in `packages/citizen-app/src/screens/ReportCaptureScreen.tsx`, and has nothing to do with auth, Express body limits, or the AI agents themselves** (those were all audited — see §4, "Ruled Out").

### The mechanism, step by step

1. `handleFile()` builds the on-screen photo preview with `FileReader.readAsDataURL(file)`. This encodes the **original, uncompressed** photo (up to the allowed 10MB) as a base64 `data:` URL string. Base64 inflates size by ~33%, so a typical 3–8MB phone photo becomes a **4–11MB string**.
2. After a successful `POST /api/v1/issues`, the app calls:
   ```ts
   navigate('/report/classify', { state: { ..., photoPreview: preview, ... } });
   ```
   React Router persists `state` via `window.history.pushState(state, "", url)`.
3. **Browsers hard-limit the serialized size of `pushState` state.** Firefox throws `NS_ERROR_ILLEGAL_VALUE` above **640KB** (documented on MDN). Chromium-based browsers have their own, similarly small practical ceiling and are known to fail/behave unreliably with multi‑MB state payloads. A multi-megabyte base64 photo blows past this on effectively every real device photo.
4. React Router's internal history implementation (`node_modules/@remix-run/router/dist/router.js`, `push()`) **catches this exception**, but only re-throws it for `DataCloneError`. A "state too large" error is a different `DOMException`, so the catch block falls through to:
   ```ts
   window.location.assign(url);
   ```
   This performs a **hard, full-page navigation** — completely losing the `state` payload (`issueId`, AI classification, etc.). No JS exception ever reaches `ReportCaptureScreen`'s own `try/catch`, so nothing visibly "crashes" — the page just reloads.
5. The freshly-loaded `ClassificationReviewScreen.tsx` reads `useLocation().state`, finds it `null` (because of the hard reload), and falls back to **hardcoded demo data**:
   ```ts
   const locationState = state ?? {
     issueId: 'ISS-DEMO-001',
     suggestedCategory: 'pothole',
     ...
   };
   ```
6. The citizen now unknowingly reviews/confirms a **fake placeholder issue**, not their real submission. When they tap "Submit Report", the app calls `POST /api/v1/issues/ISS-DEMO-001/confirm`, which 404s on the real backend (no such issue exists) — and `ClassificationReviewScreen`'s `handleSubmit` **silently treats any non-OK response as success** ("Demo fallback" comment) and routes to the confirmation screen anyway.
7. **Net effect:** The real Issue record *was* created successfully by the backend (Reporter Agent ran, classified the photo, wrote to Firestore) — but it is permanently stuck at `status: submitted`. It is never confirmed, never validated, never routed to a department. The citizen sees what looks like a normal "Reported!" confirmation screen and has no idea anything went wrong.

### Why this matches every symptom in the report

| Symptom | Explanation |
|---|---|
| "Every single time" | Virtually all real phone-camera photos exceed the size that survives `pushState`. A tiny test image (e.g., an already-compressed <300KB screenshot) would *not* trigger it — which is almost certainly why the team's own QA notes claimed the photo pipeline was "fully operational." |
| "Regardless of how they logged in" | The bug fires entirely in client-side navigation code, after authentication is already complete. Guest / OTP / Google sessions all hit the identical `navigate()` call. |
| "Upload/processing flow breaks or fails to complete" | Literally true: the upload *and* the AI classification both complete successfully on the backend. It's the *result* that never makes it back to the UI, and the issue's lifecycle stalls forever in `submitted`. |

---

## 2. Files Requiring Changes

| # | File | Change |
|---|---|---|
| 1 | `packages/citizen-app/src/screens/ReportCaptureScreen.tsx` | **Primary fix.** Stop building the preview with `FileReader.readAsDataURL`; use `URL.createObjectURL` instead (tiny string, no size limit). Also fix a relative-URL bug in `submitManualFallback`. |
| 2 | `packages/citizen-app/src/screens/ClassificationReviewScreen.tsx` | **Hardening fix.** Stop silently treating failed `/confirm` calls as success. |
| 3 | `packages/backend/src/middleware/validate.ts` | **Secondary fix.** `confirmIssueSchema` is missing the `description` field, so Zod silently strips it from every confirm request before the route handler ever sees it. |

---

## 3. Exact Fixes

### Fix 1 (PRIMARY) — `packages/citizen-app/src/screens/ReportCaptureScreen.tsx`

**Problem:** `handleFile` base64-encodes the full-resolution original photo for the on-screen preview, and that string is later carried through `navigate(..., { state })`, which is subject to the browser's `pushState` size limit.

**Before:**
```tsx
const handleFile = (file: File) => {
  setError('');
  // Client-side validation per feature_specifications.md Feature 1
  if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
  if (file.size > MAX_PHOTO_SIZE_BYTES) { setError(`File must be under 10MB. Selected: ${(file.size / 1024 / 1024).toFixed(1)}MB`); return; }
  setPhotoFile(file);
  const reader = new FileReader();
  reader.onload = (e) => setPreview(e.target?.result as string);
  reader.readAsDataURL(file);
};
```

**After:**
```tsx
const handleFile = (file: File) => {
  setError('');
  // Client-side validation per feature_specifications.md Feature 1
  if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
  if (file.size > MAX_PHOTO_SIZE_BYTES) { setError(`File must be under 10MB. Selected: ${(file.size / 1024 / 1024).toFixed(1)}MB`); return; }
  setPhotoFile(file);
  // IMPORTANT: do NOT use FileReader.readAsDataURL here. A base64 data: URL of
  // a full-resolution phone photo is several MB and is later passed through
  // navigate(path, { state }), which serializes via window.history.pushState.
  // Browsers hard-limit pushState state size (Firefox: 640KB, throws
  // NS_ERROR_ILLEGAL_VALUE; Chromium browsers are similarly unreliable above
  // a few hundred KB). Exceeding it makes react-router silently fall back to
  // a hard window.location.assign() reload, wiping out the navigation state
  // and breaking the entire report flow. URL.createObjectURL produces a tiny
  // string reference instead and has no such limit.
  if (preview) URL.revokeObjectURL(preview);
  setPreview(URL.createObjectURL(file));
};
```

Also add a cleanup effect so blob URLs are released when the component unmounts or a new photo replaces an old one (prevents a memory leak introduced by `createObjectURL`):

```tsx
useEffect(() => {
  return () => {
    if (preview) URL.revokeObjectURL(preview);
  };
}, [preview]);
```//* place this alongside the existing geolocation `useEffect` near the top of the component */

**Problem 2 in the same file — `submitManualFallback` calls the API with a relative URL:**

**Before:**
```tsx
const res = await fetch('/api/v1/issues', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify({ ... }),
});
```

**After** (match the pattern already used in `handleAnalyze`):
```tsx
const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const res = await fetch(`${base}/api/v1/issues`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify({ ... }),
});
```
*(Without this, the AI-unavailable manual-fallback submission path 404s whenever the frontend dev server and backend run on different ports/origins — `/api/v1/issues` resolves against the Vite dev server, not the Express API.)*

---

### Fix 2 (HARDENING) — `packages/citizen-app/src/screens/ClassificationReviewScreen.tsx`

**Problem:** `handleSubmit` treats *any* non-OK response from `/confirm` (404, 409, 422, 500 — anything) as a silent success and still navigates to the confirmation screen. This is what let step 6 of the root-cause chain go completely unnoticed by the citizen. Even after Fix 1 eliminates the main trigger, this should be hardened so any *other* failure mode doesn't hide itself the same way.

**Before:**
```tsx
if (res.ok) {
  const data = await res.json();
  if (data.duplicate_candidate) {
    navigate('/report/duplicate', { state: { ... } });
  } else {
    navigate('/report/confirmation', { state: { ... } });
  }
} else {
  // Demo fallback
  navigate('/report/confirmation', {
    state: { issueId: locationState.issueId, category, severity, photoPreview: locationState.photoPreview },
  });
}
```

**After:**
```tsx
if (res.ok) {
  const data = await res.json();
  if (data.duplicate_candidate) {
    navigate('/report/duplicate', { state: { ... } });
  } else {
    navigate('/report/confirmation', { state: { ... } });
  }
} else {
  const errorData = await res.json().catch(() => ({}));
  if (res.status === 401) {
    setError('Session expired. Please log in again.');
    localStorage.removeItem('civicmind_citizen_auth');
    setTimeout(() => navigate('/auth'), 2000);
  } else {
    setError(errorData?.error?.message || 'Could not confirm your report. Please try again.');
  }
  setLoading(false);
  return;
}
```
*(Apply the same change to the `catch` block below it — show `setError(...)` instead of silently navigating to the confirmation screen.)*

---

### Fix 3 (SECONDARY) — `packages/backend/src/middleware/validate.ts`

**Problem:** `ReportCaptureScreen.submitManualFallback` and the general confirm flow send an optional `description` field to `POST /issues/:id/confirm`, and the route handler (`routes/issues.ts`) reads it and tries to persist it:
```ts
if (description !== undefined && description !== null && description.trim().length > 0) {
  await db.collection(COLLECTIONS.ISSUES).doc(issue_id).update({ description: description.trim().slice(0, 500), ... });
}
```
But `validate(confirmIssueSchema)` runs *before* the handler and replaces `req.body` with the Zod-parsed object (`req.body = result.data`). Zod object schemas strip unrecognized keys by default, and `confirmIssueSchema` does not declare a `description` field — so `description` is always `undefined` by the time the handler runs. The citizen's optional description text entered at the classification step is silently discarded on every submission.

**Before:**
```ts
export const confirmIssueSchema = z.object({
  confirmed_category: z.enum(Object.values(IssueCategory) as [string, ...string[]], {
    required_error: 'confirmed_category is required',
    invalid_type_error: 'confirmed_category must be a valid IssueCategory',
  }),
  confirmed_severity: z.enum(Object.values(IssueSeverity) as [string, ...string[]], {
    required_error: 'confirmed_severity is required',
    invalid_type_error: 'confirmed_severity must be a valid IssueSeverity',
  }),
});
```

**After:**
```ts
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
```

No changes are needed in `routes/issues.ts` — its handler already reads and persists `description` correctly; it was only ever receiving `undefined` because of the schema gap above.

---

## 4. Ruled Out (audited, found correct)

Per the request, these were specifically inspected and are **not** the cause:

- **`routerAgent.ts`, `verifierAgent.ts`, `validatorAgent.ts`, `reporterAgent.ts`** — every Gemini call is wrapped in `try/catch` with a deterministic template/neutral-score fallback (`buildFallback`, `buildTemplateFallback`, inconclusive defaults). None of these can throw an unhandled exception that escapes the agent function.
- **Express body size limits** — `express.json({ limit: '10mb' })` in `server.ts` is irrelevant here: photos are uploaded directly to Firebase Storage from the browser via `uploadBytes`, never as base64 inside a JSON request body to Express. The actual base64-size problem is the browser's `history.pushState`, not Express (see §1).
- **Firebase Storage permissions** — `storage.rules` correctly allows authenticated writes to `photos/{idempotencyKey}/{photoFile}` under 10MB with an `image/.*` content type, which matches what `ReportCaptureScreen` uploads (`new File([blob], 'compressed.jpg', { type: 'image/jpeg' })`).
- **Auth / RBAC** — `authenticate.ts` and `rbac.ts` correctly derive `role: citizen` for all three citizen login paths (guest, OTP, Google) via the claims passed into `createCustomToken`; `requireCitizen` passes for all of them identically.
- **`INVALID_CIVIC_ISSUE` / `AI_UNAVAILABLE` error codes** — the orchestrator (`orchestrator.ts`) and `ReportCaptureScreen.handleAnalyze`'s status-code checks (`400`/`422`) are consistent with each other end-to-end.

---

## 5. Verification Steps

1. Apply Fix 1, 2, and 3 above.
2. In `packages/citizen-app`, run the app and submit a report using a **real, unedited phone-camera photo** (3MB+) — previously this is the exact condition that triggered the bug; a small test image would not have reproduced it.
3. Confirm the URL bar shows a normal client-side route transition to `/report/classify` (no full-page flash/reload).
4. Confirm `ClassificationReviewScreen` shows the *actual* AI-suggested category/severity for the photo you uploaded, not `pothole / 87% / 79%` (the hardcoded demo fallback values).
5. Submit the report and confirm in Firestore that the Issue document progresses past `submitted` (`validating` → `routing` → `routed`), rather than staying stuck.
6. Optionally, simulate a backend failure (stop the backend) and confirm `ClassificationReviewScreen` now surfaces a visible error instead of silently proceeding to the confirmation screen.

---

## 6. Minor Notes (not blocking, FYI only)

- `packages/shared/package.json` points `main`/`exports`/`types` at `./dist/*`, but `dist/` is not committed (correctly gitignored). The frontends bypass this via a Vite alias straight to `shared/src`, but the **backend** (plain Node/`tsx`, no alias) will fail to resolve `@civicmind/shared` until `npm run build -w packages/shared` has been run at least once. Worth adding as a `postinstall`/`prepare` script so a fresh clone doesn't appear broken before the first build.
- `feature_specifications.md` Feature 1 says "up to 3 images"; `reportIssueSchema` in `validate.ts` allows up to 5. Cosmetic mismatch only — the citizen app only ever uploads one photo per report today.