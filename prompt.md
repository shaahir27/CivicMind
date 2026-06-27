# CivicMind — Round 2 Fix Plan: Classification Bug, Full Flow Audit, Security, Login UI

**Audience:** AI coding agent executing these changes directly in the repo.
**How to use this doc:** Tasks are ordered by dependency, not by importance — do them in
order top to bottom. Task 1 is the headline bug (hardcoded "pothole 79%"). Run the stated
verification after each task before moving to the next.

```bash
npm install && npm run build   # baseline must pass before starting
```

---

## Task 1 — THE BUG: "hardcoded pothole 79% regardless of image"

### Root cause (proven by reading the code, not guessed)

This is **not** your Gemini API key, and it's **not really the AI model**. It's two stacked
frontend bugs that both end in the same place: a hardcoded demo payload that was left in
the code as a "don't show a broken screen" safety net, and which is now hiding every real
error from you.

**Bug 1A — Guest sessions never actually authenticate, so every guest request gets a 401.**

`POST /api/v1/auth/guest-session` (`packages/backend/src/routes/auth.ts`) creates a Firebase
user and returns a **custom token**:
```ts
const customToken = await getAuth().createCustomToken(userRecord.uid, { ... });
res.status(201).json({ session_token: customToken, ... });
```
A Firebase **custom token** is not directly usable as a Bearer token — it must first be
exchanged for an **ID token** via `signInWithCustomToken()`. Compare the two places this
matters in `packages/citizen-app/src/screens/AuthScreen.tsx`:

```ts
// handleGuest() — BROKEN: stores the raw custom token directly
loginAsGuest(data.session_token, data.user_id);

// handleVerifyOtp() — CORRECT: exchanges the custom token for a real ID token first
const cred = await signInWithCustomToken(auth, data.access_token);
const idToken = await cred.user.getIdToken();
loginAsCitizen(idToken, data.user_id);
```

Every backend route (`packages/backend/src/middleware/authenticate.ts`) does:
```ts
const decoded = await getAuth().verifyIdToken(token, true);
```
`verifyIdToken()` rejects custom tokens outright. So **every guest's `Authorization: Bearer
<token>` header fails verification, and every authenticated guest call — including the
issue-submission call that triggers AI classification — returns `401 UNAUTHENTICATED`,
100% of the time, for every guest, regardless of what photo they upload.**

**Bug 1B — the frontend hides that 401 (and every other error) behind a hardcoded fake result.**

`packages/citizen-app/src/screens/ReportCaptureScreen.tsx`, in `handleAnalyze()`:
```ts
} else {
  // Demo fallback — simulate AI classification
  navigate('/report/classify', {
    state: {
      issueId: `ISS-DEMO-${Date.now()}`,
      suggestedCategory: 'pothole',
      categoryConfidence: 0.87,
      suggestedSeverity: 'high',
      severityConfidence: 0.79,
      ...
```
…and the same block again in the `catch` clause right below it. **Any** non-2xx response
that isn't specifically `400 INVALID_CIVIC_ISSUE` or `422 AI_UNAVAILABLE` — including the
401 from Bug 1A — lands here and shows this exact hardcoded payload. This is why it's
always "pothole," always "87%/79%," and always the same regardless of the photo: **the
real backend response is never being shown to you at all.**

`packages/authority-portal/src/screens/LoginScreen.tsx` and
`packages/admin-console/src/screens/LoginScreen.tsx` have the identical pattern (silently
log in as a fake demo identity on any backend error) — same anti-pattern, different screen.
Not the cause of the pothole bug, but the same root habit, and it needs to go too (see
Task 1C).

**Why account ("Create Account") users may see the same thing:** the OTP flow's token
exchange is implemented correctly, so if you see the same hardcoded result there too, it
means a *different* call in the same pipeline is also failing non-2xx — most likely the
`POST /api/v1/issues` call itself throwing for an unrelated reason (a backend exception,
not an auth problem). Once Task 1C below is done, the UI will show you the actual error
instead of guessing — do Task 1C, reproduce once as an account user, and the real error
message will tell us exactly what's left to fix if it's still failing after Task 1B/1D.

### Fix 1B — Make the guest flow actually authenticate

**File:** `packages/citizen-app/src/screens/AuthScreen.tsx`

Add the import already used elsewhere in this file (it's already imported — just use it):

```diff
   const handleGuest = async () => {
     setLoading(true);
     try {
       const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/v1/auth/guest-session`, {
         method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
       });
       if (res.ok) {
         const data = await res.json();
-        loginAsGuest(data.session_token, data.user_id);
+        // session_token is a Firebase custom token — must be exchanged for an ID
+        // token before it's usable as a Bearer token against our own backend.
+        const cred = await signInWithCustomToken(auth, data.session_token);
+        const idToken = await cred.user.getIdToken();
+        loginAsGuest(idToken, data.user_id);
       } else {
-        loginAsGuest('demo-guest-token', 'guest-demo-001');
+        setError('Could not start a guest session. Please try again.');
+        setLoading(false);
+        return;
       }
     } catch {
-      loginAsGuest('demo-guest-token', 'guest-demo-001');
+      setError('Could not reach the server. Please check your connection and try again.');
+      setLoading(false);
+      return;
     }
     setLoading(false);
     navigate('/home');
   };
```

You'll need an `error` state already present in this component (it is — `const [error,
setError] = useState('')`) and a place to render it on the `'choice'` step (it currently
only renders `error` inside the `enter-contact`/`enter-otp` steps — add the same
`{error && <p ...>{error}</p>}` block to the `'choice'` step's JSX so guest-flow errors are
actually visible).

### Fix 1C — Remove the silent demo-fallback pattern everywhere (this is the priority fix — it's currently hiding *every* error in the app, not just this one)

**File:** `packages/citizen-app/src/screens/ReportCaptureScreen.tsx`

Replace **both** "Demo fallback" blocks (in the `else` branch after `if (res.ok)`, and in
the `catch` block) with honest error handling:

```diff
       } else {
         const errorData = await res.json().catch(() => ({}));
         if (res.status === 400 && errorData?.error?.code === 'INVALID_CIVIC_ISSUE') {
           setError(errorData.error.message || 'This image does not appear to be a valid civic issue. Please upload a relevant photo.');
           setLoading(false);
           return;
         }
         if (res.status === 422 && errorData?.error?.code === 'AI_UNAVAILABLE') {
           setLoading(false);
           setIsManualFallback(true);
           return;
         }

-        // Demo fallback — simulate AI classification
-        navigate('/report/classify', {
-          state: {
-            issueId: `ISS-DEMO-${Date.now()}`,
-            suggestedCategory: 'pothole',
-            categoryConfidence: 0.87,
-            suggestedSeverity: 'high',
-            severityConfidence: 0.79,
-            requiresConfirmation: false,
-            photoPreview: preview,
-            location: location ?? { lat: 12.9716, lng: 77.5946 },
-          },
-        });
+        // Surface the real error instead of hiding it behind fake data.
+        const message = errorData?.error?.message || `Something went wrong (HTTP ${res.status}). Please try again.`;
+        setError(message);
+        setLoading(false);
+        return;
       }
     } catch (err: any) {
       if (err.message && err.message.includes('AI_UNAVAILABLE')) {
         setLoading(false);
         setIsManualFallback(true);
         return; // Wait for manual submission
       }
-
-      // Demo fallback
-      navigate('/report/classify', {
-        state: {
-          issueId: `ISS-DEMO-${Date.now()}`,
-          suggestedCategory: 'pothole',
-          categoryConfidence: 0.87,
-          suggestedSeverity: 'high',
-          severityConfidence: 0.79,
-          requiresConfirmation: false,
-          photoPreview: preview,
-          location: location ?? { lat: 12.9716, lng: 77.5946 },
-        },
-      });
+      console.error('[ReportCaptureScreen] Submission failed:', err);
+      setError('Could not reach the server. Please check your connection and try again.');
     }
     setLoading(false);
   };
```

Do the same removal for the two equivalent `LoginScreen.tsx` files:

**Files:** `packages/authority-portal/src/screens/LoginScreen.tsx`,
`packages/admin-console/src/screens/LoginScreen.tsx`

```diff
       } else {
-        // Demo fallback
-        if (email.includes('@civicmind.gov')) {
-          login('demo-authority-token', { ... });
-          navigate('/dashboard');
-        } else {
-          setError('Invalid credentials. (Demo: use any @civicmind.gov email)');
-        }
+        const errorData = await res.json().catch(() => ({}));
+        setError(errorData?.error?.message || 'Invalid email or password.');
       }
     } catch {
-      // Demo fallback
-      if (email.includes('@civicmind.gov')) {
-        login('demo-authority-token', { ... });
-        navigate('/dashboard');
-      } else {
-        setError('Login failed. Ensure backend is running.');
-      }
+      setError('Could not reach the server. Please check your connection and try again.');
     }
```

If you still want a way to demo the portals without a live backend, do it explicitly and
visibly (e.g. a clearly-labeled "Use Demo Account" button that's only rendered when
`import.meta.env.MODE !== 'production'`), never as a silent fallback triggered by an error
the user can't see.

### Fix 1D — verify the Gemini call itself works once 1B/1C are in (don't skip this — do it even if 1B/1C alone resolve the symptom)

The Gemini JS SDK this project uses, `@google/generative-ai` (`packages/backend/package.json`),
**reached end-of-life on 2025-08-31** — Google has stopped maintaining it entirely and
recommends migrating to the new unified `@google/genai` package. It may still work against
`gemini-3.1-flash-lite` since both ultimately hit the same REST surface, but it's
unsupported and is the most likely candidate if Task 1B/1C reveal a *different* real error
(e.g. account-flow users still see a failure after the auth/masking fixes). Two options:

**Option A (quick, low-risk): just confirm it works.**
After Task 1B/1C, submit a real report as a logged-in citizen and check the backend
console output for `[ReporterAgent] Gemini call failed:` — if you see that log line, the
SDK/model combination is the problem and you should do Option B.

**Option B (recommended, ~30 min): migrate `reporterAgent.ts` to `@google/genai`.**
```bash
npm uninstall @google/generative-ai -w packages/backend
npm install @google/genai -w packages/backend
```
In `packages/backend/src/agents/reporterAgent.ts`, replace:
```ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
...
const genai = new GoogleGenerativeAI(apiKey);
const model = genai.getGenerativeModel({ model: config.genai.modelVision, safetySettings: [...] });
...
const result = await generateContentWithRetry(model, { contents: [{ role: 'user', parts }] });
const text = result.response.text().trim();
```
with the new SDK's client-object pattern:
```ts
import { GoogleGenAI } from '@google/genai';
...
const ai = new GoogleGenAI({ apiKey });
const result = await ai.models.generateContent({
  model: config.genai.modelVision,
  contents: [{ role: 'user', parts }],
});
const text = result.text.trim();
```
You'll need to similarly update `packages/backend/src/services/ai.ts`
(`generateContentWithRetry`'s type signature references `GenerativeModel` /
`GenerateContentResult` from the old package) and wherever `routerAgent.ts` /
`validatorAgent.ts` / `verifierAgent.ts` / `predictorAgent.ts` import from
`@google/generative-ai` — grep for it:
```bash
grep -rl "@google/generative-ai" packages/backend/src
```
and migrate each call site the same way. This is a bigger diff — if Option A shows Gemini
calls are succeeding fine on the old SDK, you can defer this and just track it as tech debt.

### Verify Task 1

```bash
npm run build -w packages/citizen-app
npm run build -w packages/authority-portal
npm run build -w packages/admin-console
npm run build -w packages/backend
```
Then manually: continue as guest → upload two *different* photos of clearly different
things (e.g. a streetlight, then a garbage pile) → confirm you get two *different*
classifications, not "pothole 87%/79%" both times. Repeat once more as a logged-in
("Create Account") user.

---

## Task 2 — Full user-flow audit against `docs/user_flows.md`, in order

Going section by section, exactly as the doc is structured. Each numbered item below
corresponds to a flow section; "OK" means I traced the code and it matches the spec,
"BUG" means a fix is needed.

### 2.1 — Citizen Onboarding Flow
- Step 4 (Guest vs Create Account choice): **BUG — see Task 1B.** Fixed there.
- Everything else in this section (location permission prompt, explainer screens,
  landing on Home): present and matches spec. No further action.

### 2.2 — Core Workflow: Citizen Reports an Issue
- Steps 1–3 (upload zone, GPS capture, manual pin fallback): present and correct.
- Step 4–5 (send to Reporter Agent, show suggestion within ~5s): **BUG — see Task 1.**
  Once fixed, this becomes real instead of fake.
- Step 8 (Issue created with `status: submitted`, Validator Agent triggered): **OK** —
  confirmed in `orchestrator.ts`, the batch-written issue doc plus immediate validator
  invocation is present.
- Step 9 (duplicate/corroboration branching, ≥0.8 auto-merge / 0.5–0.8 prompt / unique):
  **OK** — confirmed in `validatorAgent.ts`, thresholds match the spec exactly.
- Step 10 (Router Agent assigns department, drafts complaint): **OK**, with one caveat
  already flagged previously and confirmed still present:

  **BUG 2.2a:** `packages/backend/src/agents/routerAgent.ts` computes a
  `hasRequiredFields` validation check on the AI-drafted complaint text and logs a warning
  if it fails — but never actually substitutes the template fallback it warns about. Fix:

  **File:** `packages/backend/src/agents/routerAgent.ts`
  ```diff
-  const hasRequiredFields =
+  let draftedComplaintText = await draftComplaintText(input, departmentName); // change `const` to `let` at the original declaration site above
+  const hasRequiredFields =
     draftedComplaintText.includes(input.issueId) &&
     draftedComplaintText.length >= 100;

   if (!hasRequiredFields) {
     console.warn('[RouterAgent] Drafted complaint missing required fields — using template fallback');
+    draftedComplaintText = buildTemplateFallback(input, departmentName, formattedDate, corroborationNote);
   }
  ```
  Find the original `const draftedComplaintText = await draftComplaintText(...)` line
  above this block and change it to `let`. `formattedDate` and `corroborationNote` are
  currently computed only inside `draftComplaintText()` — either export them from that
  function alongside the text (refactor it to return `{ text, formattedDate,
  corroborationNote }`), or recompute the same two lines in the caller. Refactor is
  cleaner; do that if time allows, otherwise recompute.

  **Verify:** `npm run build -w packages/backend`. Temporarily force
  `hasRequiredFields = false` and confirm `buildTemplateFallback`'s output is what
  actually gets stored/sent, not the broken AI text.

- Steps 11–13 (confirmation screen, notifications on every state change, "My Reports"
  live timeline): **OK** structurally — `notificationService.ts` is invoked from the
  relevant status-transition points in `orchestrator.ts`. I did not trace actual
  push/SMS/email delivery (out of scope — there's no real provider wired in yet per
  `Notification.delivery_status` always landing as `pending` in the seed/demo build,
  which is expected for this stage and not a bug, just an MVP gap worth knowing about).

### 2.3 — Authority Resolves an Issue
- Steps 1–2 (login, dashboard sorted "At Risk"/escalated first): login itself has the
  demo-fallback issue fixed in Task 1C. Dashboard sort order: **OK**, confirmed in
  `authority.ts`'s `GET /issues` query ordering.
- Step 3 (issue detail view — photo, AI-drafted text, history): **OK**.
- Step 4 (`in_progress` transition, citizen notified): **OK**.
- Steps 5–6 (after-photo required before "Mark Resolved," blocked inline if missing):
  **OK** — confirmed server-side enforcement in `authority.ts`'s status-update handler,
  not just a UI nicety.
- Step 7 (auto-transition `resolved` → `verifying`): **OK**.
- Step 8–9 (Verifier Agent before/after comparison, 3-way branch): **OK**, confirmed
  thresholds in `verifierAgent.ts` match `verified_resolved` / `inconclusive` /
  `disputed_resolution` exactly as documented, including the re-routing back to the same
  authority on dispute.

### 2.4 — Escalation Flow
- **OK overall.** `escalationAgent.ts` correctly computes elapsed-vs-SLA accounting for
  `in_progress` grace pauses, tier reassignment, and the final-tier → `publicly_escalated`
  transition. Idempotency (step 5, "same breach never triggers duplicate escalation"): confirmed via the `escalation_tier_current` field gate before reassigning — re-running the
  cycle on an already-escalated-this-tier issue is a no-op. No bug found here.

### 2.5 — Error Scenarios
- **5.1 (upload retry / idempotency):** `idempotency_key` is generated client-side and
  checked server-side in the orchestrator before creating a new issue doc — **OK**.
- **5.2 (outside service area → blocked):** This depends entirely on
  `SERVICE_AREA_LAT_MIN/MAX`/`LNG_MIN/MAX` in `.env` being real city bounds, not the whole
  planet. Already corrected to real Bengaluru bounds in your current `.env` — **OK now**,
  but worth a regression check: confirm `isWithinServiceArea()` in
  `packages/shared/src/utils.ts` is actually being called before issue creation (it is,
  in `issues.ts`'s `POST /` handler) — **OK**.
- **5.3 (low confidence on all categories → "other," still requires confirmation):**
  **OK** — confirmed the citizen-app's classification review screen always requires a tap
  to proceed regardless of confidence; nothing auto-submits silently.
- **5.4 (illegal status transition rejected):** **OK** — confirmed
  `transitionIssueStatus()` in `orchestrator.ts` validates against the canonical state
  machine and throws before any write.
- **5.5 (inconclusive verification on poor image quality):** **OK**, matches spec.
- **5.6 (citizen disputes a verified resolution):** **OK** — confirmed distinct logging
  (`actor_type: 'citizen'` vs agent-initiated) per the spec's accountability requirement.
- **5.7 (SLA config missing → system default + internal flag):** **OK**.
- **5.8 (non-civic image → 400 INVALID_CIVIC_ISSUE, no record created):** **OK** —
  confirmed in `orchestrator.ts`; this is the one error code the frontend's old
  demo-fallback correctly excluded, and it stays correctly handled after Task 1C's changes.

### 2.6 — Admin Workflow
- **OK overall.** SLA config, jurisdiction mapping, audit log, impact reports, user
  management, and predictive review screens all call real backend endpoints with no
  fallback-to-fake-data pattern found in this package (admin-console's screens were
  clean on this specific anti-pattern — only its `LoginScreen.tsx` had it, fixed in 1C).

**Summary of new bugs found in this flow audit beyond Task 1:** just 2.2a (router agent
dead validation). Everything else in `user_flows.md` is implemented as documented.

---

## Task 3 — Database & storage audit against `docs/database_design.md`

- **User, Issue, IssuePhoto, IssueStatusHistory, Corroboration, AgentDecisionLog,
  SLAConfig, EscalationTier, HeroPointsLedger, HotspotForecast, ImpactReport
  collections:** field names and types in `packages/shared/src/types/entities.ts` match
  the schema doc 1:1 — **OK**.
- **`IssueStatusHistory` append-only constraint (§2.6):** confirmed — no `.update()` or
  `.delete()` call against this collection anywhere in the backend; every write is a new
  `.set()` with a fresh `history_id`. **OK**.
- **`Corroboration` uniqueness constraint** (one corroboration per registered user per
  issue): confirmed enforced in `orchestrateCorroborationDecision()` before insert — **OK**.
- **`HeroPointsLedger` uniqueness constraint** (no duplicate point awards per event):
  confirmed via a pre-insert existence check — **OK**.
- **Storage paths vs `storage.rules`:** previously broken, already fixed in your current
  `storage.rules` (paths now match what `ReportCaptureScreen.tsx` and
  `IssueDetailScreen.tsx` actually write to) — **OK now**.
- **New finding — secrets folder shipped inside the project zip (see Task 4, this is a
  security item, not a database-schema item, but it lives in this same area of the repo
  so flagging it here too for visibility).**
- **New finding — duplicate credential file:** `secrets/` contains both
  `firebase-service-account.json` **and** `firebase-service-account.json.json` — the
  second is almost certainly a duplicate created by a download/rename mistake. Delete the
  extra one once you've confirmed which one `.env`'s `GOOGLE_APPLICATION_CREDENTIALS`
  actually points to (currently `../../secrets/firebase-service-account.json` — the
  correctly-named one, so the `.json.json` file is dead weight, not in use, but should not
  be sitting there either):
  ```bash
  rm secrets/firebase-service-account.json.json
  ```

No other discrepancies found between the implemented schema and `database_design.md`.

---

## Task 4 — Security vulnerabilities found in this pass

**4.1 — CRITICAL: your real Firebase service-account private key is sitting inside the
project zip you shared, in `secrets/firebase-service-account.json` (and its accidental
duplicate).** This is your actual Firebase Admin credential — whoever has it has full
admin read/write access to your Firestore and Storage, bypassing all security rules
entirely. Treat it as already compromised:
1. In Firebase Console → Project Settings → Service Accounts, **delete this service
   account key** and generate a new one.
2. Update `GOOGLE_APPLICATION_CREDENTIALS` to point at the new key file.
3. Add `secrets/` to `.gitignore` if it isn't already there, and make sure future zip
   exports for sharing/review exclude it (`zip -x 'secrets/*'` or similar).
4. Do the same rotation for the Gemini and Google Maps API keys from the `.env` reviewed
   in the previous round — if they haven't been rotated yet, do it now.

**4.2 — Demo-identity login fallback bypasses real authentication when the backend errors
(Task 1C).** Already fixed by Task 1C above — flagging here too because it's a real
security issue, not just a UX one: anyone typing `anything@civicmind.gov` into the
authority login, or `admin@civicmind.gov` into the admin login, gets full staff/admin
access **whenever the real login call fails for any reason** (backend down, network
blip, CORS misconfig) — no password check happens on that path at all.

**4.3 — Guest accounts get full, unexpiring Firebase user records.** `POST
/api/v1/auth/guest-session` calls `getAuth().createUser()` — a real, permanent Firebase
Auth user — for every single guest visit, with no cleanup path. This isn't a security
hole exactly, but it's an unbounded-growth and quota-cost issue: a script hitting this
endpoint in a loop creates unlimited real user records. Combine `strictRateLimit` (already
applied to issue submission) onto this route too:
```diff
- router.post('/guest-session', asyncHandler(async (_req: Request, res: Response) => {
+ router.post('/guest-session', strictRateLimit, asyncHandler(async (_req: Request, res: Response) => {
```
(import `strictRateLimit` from `../middleware/rateLimiter.js` at the top of `auth.ts`).

**4.4 — Storage rule for citizen photo uploads can't verify ownership of the
`idempotencyKey` path segment** (carried over from the previous review — still true, not
newly introduced, and not practically exploitable beyond minor storage-quota abuse since
the backend only ever reads back the exact path it itself generated for a given issue).
No action required unless you want to add a second Firestore lookup at write time, which
costs a read on every upload — not worth it for an MVP.

**4.5 — `NODE_ENV` gates a lot of risk (demo-token auth bypass, magic OTP `123456`, dev
seed routes).** Your current `.env` correctly has `NODE_ENV=development` for local work —
just make sure whatever you deploy to (Render, Railway, a VM, Cloud Run, etc.) has it
explicitly set to `production`, and that `ALLOWED_ORIGINS` is set there too (CORS is
already correctly gated on this in `server.ts`).

No SQL injection / NoSQL injection vectors found (Firestore's typed client SDK + the
`validate.js` schema middleware on all write routes rules this class of bug out by
construction). No XSS sinks found — no `dangerouslySetInnerHTML` or raw HTML injection
anywhere in the three frontend packages (`grep -rn "dangerouslySetInnerHTML" packages/*/src`
returns nothing).

---

## Task 5 — Authority & Admin login page redesign

Current state (both `LoginScreen.tsx` files): a single centered white card, emoji icon,
two inputs, one button, inline styles, no visual distinction between the two portals
beyond the icon. Functional but generic — looks like a placeholder, not a finished
product, and the two portals are visually indistinguishable from a screenshot.

### Design direction
Give each portal a distinct identity while sharing a layout system, since they're
different audiences (field/department officers vs. system administrators) doing
different jobs:

- **Authority Portal** — operational, on-the-ground tone. Color anchor: blue
  (`hsl(220 87% 53%)`, already used elsewhere in the citizen app — reuse it for brand
  consistency across the whole product). Icon/illustration: a simple line-art of a city
  department badge or a road/streetlight motif instead of a generic 🛡️ emoji.
- **Admin Console** — oversight/control tone. Color anchor: a darker slate/indigo to
  visually signal "higher privilege, fewer people should be here." Icon: a dashboard/gauge
  motif instead of an emoji.
- Split-screen layout instead of a centered card on white: left half a brand panel (color
  field + 2–3 lines of context — "Sign in to manage civic issues for your department" /
  "Sign in to configure CivicMind citywide" — plus 2–3 stat chips like "₿ wards covered,"
  "Avg. resolution time" pulled from a real impact-report endpoint if you want it to feel
  alive rather than static); right half the actual form. This single change does the most
  to make it look like a real product instead of a demo placeholder.
- Real inline validation states (red border + message under the specific field, not just
  a generic error line under the button).
- A visible, explicit "Demo mode" toggle/button (see Task 1C) instead of a silent
  fallback — if you want reviewers/judges to be able to skip real login, make it a real
  feature, not an error-triggered accident.
- Loading state: replace the plain "Authenticating…" button text with a small inline
  spinner + disabled state styling (you already have `LoadingSpinner` in
  `packages/citizen-app/src/components/shared.tsx` — consider promoting it to
  `packages/shared` so authority-portal and admin-console can reuse the same component
  instead of each having ad hoc inline styles).

### Implementation note for the agent
This is a visual/UX task, not a logic task — once Task 1C's logic changes are in
`LoginScreen.tsx` for both portals, treat the JSX/styling as free to fully rewrite. Don't
reintroduce the demo-fallback pattern while restyling. Suggested approach: build one
shared `<AuthCard>` layout primitive in `packages/shared` (brand panel + form panel +
slots for icon/color/copy), then have each portal's `LoginScreen.tsx` pass in its own
color/icon/copy — this avoids two diverging copies of the same layout logic going forward.

**Verify:** `npm run build -w packages/authority-portal && npm run build -w packages/admin-console`,
then visually check both at `/login` side by side.

---

## Task 6 — Final re-verification

```bash
npm run build         # all 6 packages
npm run dev:backend   # terminal 1
```
Then manually, in order, matching the flow doc exactly:
1. Guest → upload a photo of a streetlight → confirm real (non-pothole, non-79%)
   classification appears, or a real visible error if something's still wrong.
2. Create Account (OTP `123456` in dev) → repeat step 1 → confirm same.
3. Authority login with a real seeded account → confirm dashboard loads, no demo banner.
4. Admin login with a real seeded account → confirm console loads, no demo banner.
5. Submit an issue, then as authority mark it resolved without an after-photo → confirm
   it's blocked with the inline message (Error Scenario per `user_flows.md` §3.6).
6. Submit a clearly non-civic photo (e.g. a selfie) → confirm `400 INVALID_CIVIC_ISSUE`
   is shown to the citizen, not the old hardcoded fallback.

If guest classification is still wrong after Task 1B+1C, check the backend console for the
real error message now being surfaced (Task 1D explains what to do if it's a Gemini SDK
error specifically).