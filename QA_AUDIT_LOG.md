# SRMS QA / Bug Audit — Running Log

Staged, feature-by-feature quality audit. Per feature: static code review + dynamic testing.
Cadence: audit → user triages → fix → verify, one stage at a time.

- **Dynamic-test target:** dev server (`npm run dev`) → test project `nnptet…`. Never a prod build.
- **Login:** superadmin4@staging-srms.test / admin12345 (session drops on server restart).
- **Severity:** 🔴 Critical · 🟠 High (wrong results) · 🟡 Medium · 🔵 Low.

---

## Stage status

| # | Stage | Status |
|---|-------|--------|
| 0 | Setup & guardrails | ✅ done |
| 1 | Fees | ✅ done — F-001, F-002 fixed |
| 2 | Grades | ✅ done — F-003, F-004 fixed |
| 3 | Reports & Report Cards | ✅ done — F-005 fixed; per-period attendance built |
| 4 | Attendance | ✅ done — F-006 fixed |
| 5 | Students & Classes | ✅ audited — 1 finding (F-007) |
| 6 | Users, Roles & Access | ✅ audited — F-008 fixed; F-009 open (policy) |
| 7 | Settings & Year Rollover | ✅ audited — F-010 fixed; F-011 open (design) |
| 8 | Parent Portal | ✅ done — security clean; F-012 fixed |
| 9 | Ministry Console | ✅ audited — impersonation secure; F-013 fixed (repo drift) |
| 10 | Cross-cutting | ✅ audited — locked=server-enforced; F-014 (UI-only gating) |

Fixed in stages 1–3 (all shipped): F-001 fee-credit masking, F-002 bulk-collect misallocation,
F-003 hardcoded pass mark, F-004 grade-weight guard, F-005 academic CSV misalignment.

---

## Findings

### [F-006] Attendance % excludes "Late" but the report card counts it as present — 🟠 High — open
- **Stage / area:** 4 — Attendance (rate math)
- **File(s):** `src/modules/lib/helpers.js:111,116` (`calcAttendanceRate`); vs `src/modules/pages/Reports.jsx:1227` (report card uses `att.present + att.late`).
- **What's wrong:** `calcAttendanceRate` sets `present = Present-count (+ opening balance)` and `rate = present/total`, so **Late is in `total` but not `present`** → it lowers the percentage. But the report card shows days-present as `present + late`, and What's New 2.5 states "A day marked Late counts as present." So the card and the policy count Late as present; the rate (Dashboard tile, Reports "AVG ATTENDANCE", CSV rate column, Parent Portal) does not.
- **Failure scenario:** A pupil with Late days: report card shows e.g. 53/56 (≈95%), but the Reports/Dashboard attendance % reads lower (present/total, Late excluded). Two screens, two numbers.
- **Fix (needs a quick policy confirm):** make `rate = (present + late) / total` in `calcAttendanceRate` (keep the `present` field as Present-only so the report card's `present + late` isn't double-counted). This honors the stated "Late counts as present" policy and makes every screen agree.
- **Fix (DONE — user confirmed):** `calcAttendanceRate` now uses `rate = (present + late) / total`. `present` field left Present-only so the report card's `present + late` doesn't double-count. Excused kept as-is (stays in denominator, lowers rate — user's choice).
- **Verified (live, via the actual helper):** Present+Late+Absent → 67%; all-Late → 100%; Present×2+Excused → 67%; with opening balance 8/10 → 82%; `present` field stays Present-only. Every attendance-% screen now matches the report card.

### [F-007] Re-enrolling an archived student bypasses the plan student limit — 🔵 Low (vendor policy) — ✅ fixed
- **Stage / area:** 5 — Students & Classes
- **File(s):** `src/modules/pages/Students.jsx:87-94` (`unarchive`) vs `:133` (`save` checks `atStudentLimit`)
- **What's wrong:** Adding a new student is blocked at the plan's student cap, but `unarchive` (re-enrol) sets `archived:false` with no limit check — a school at its cap can push active students past it by re-enrolling archived pupils.
- **Failure scenario:** School on a 100-student plan, 100 active + archived → re-enrol an archived pupil → 101 active, over the paid cap.
- **Fix (DONE — user chose to enforce):** added the same `atStudentLimit` guard to `unarchive` (`Students.jsx:87-94`), with a re-enrol-specific message. Re-enrolling now respects the plan cap like adding a new student.
- **Verified:** Students.jsx compiles clean (esbuild); guard mirrors the existing `openAdd`/`save` check (same `atStudentLimit`/`studentLimit`). Live cap test impractical (test school is on Pro).
- **Note:** Rest of Stage 5 is clean — atomic student-ID RPC, FK-safe delete (23503 → archive instead), class delete blocked when students/subjects exist (+ teacher unassigned), single & bulk promotion both write enrolment history (upsert, no dupes), track per-student failures, and guard against students added mid-wizard.

### [F-008] User RPCs don't validate the role — a school superadmin can grant `ministry_admin` (cross-school access) — 🟠 High (security) — ✅ fixed & verified (staging)
- **Stage / area:** 6 — Users, Roles & Access
- **File(s):** `database/srms_migration.sql` `create_auth_user` (449) & `update_auth_user` (521) — both check caller = superadmin + same school, but never validate `p_role`; `is_ministry_admin()` (326) just checks `role='ministry_admin'`.
- **What's wrong:** A school superadmin can call `supabase.rpc('create_auth_user', {p_role:'ministry_admin', ...})` (or `update_auth_user`) directly — not offered in the UI, but trivial via the API. The resulting profile passes `is_ministry_admin()`, which the RLS policies treat as vendor-level access to **every** school's data. A per-school superadmin can thus escalate to all-schools access, breaking tenant isolation.
- **Fix (DONE):** `database/validate_user_role.sql` re-declares `create_auth_user` & `update_auth_user` with a `p_role IN ('superadmin','admin','classteacher','teacher','parent')` whitelist. Run on staging ✓ (prod pending).
- **Verified (live, staging):** as superadmin, `create_auth_user(role:'ministry_admin')` → **"Not authorised"** (no account created); with a valid role (`teacher`) + existing email → **"already exists"** (whitelist lets valid roles through). No regression.

### [F-009] Admin user-management UI vs superadmin-only RPCs — admins get "Not authorised" — 🟡 Medium — ✅ fixed
- **Stage / area:** 6 — Users, Roles & Access
- **File(s):** UI `src/modules/pages/Users.jsx:199` (`canEdit` lets admins edit non-privileged users), `:279-280` (admin role dropdown) + admin has `users` in `NAV_ITEMS`; backend `create_auth_user`/`update_auth_user`/`reset_user_password` all require caller = superadmin.
- **What's wrong:** The UI gives admins the Users page, an Edit button on teachers/parents, and a create role dropdown — but every user RPC is superadmin-only, so an admin's create/edit fails with "Not authorised." Affordance and backend disagree.
- **Fix (DONE — user chose superadmin-only):** `Users.jsx` — Add User button and Edit action are now gated to `profile.role==='superadmin'` (Reset PW already was; Lock left as a moderation action for admins). Admins no longer see the affordances that hit the RPCs, so no "Not authorised". Superadmin experience unchanged.
- **Verified:** Users.jsx compiles clean (esbuild); gate is a plain role check (superadmin → shown, admin → hidden). Admin-hidden case not click-tested (no admin login available).

### [F-010] `rollover_academic_year` is directly callable by any authenticated user — 🔴 Critical (security) — ✅ fixed & verified (staging)
- **Stage / area:** 7 — Settings & Year Rollover
- **File(s):** `database/srms_migration.sql:664` (`rollover_academic_year`, SECURITY DEFINER, **no auth guard, no REVOKE**); intended caller `supabase/functions/start-new-year/index.ts` (verifies superadmin + same school, then calls it with the **service role**).
- **What's wrong:** The normal path (client → `start-new-year` edge function → RPC) is properly secured. But the SQL function itself has no internal caller check and execute is never revoked, so by Postgres default any `authenticated` (likely `anon` too) role can call `supabase.rpc('rollover_academic_year', {p_school_id:<ANY school>, p_old_year, p_new_year})` **directly**, bypassing the edge function. `p_school_id` is client-supplied → a user of school A can force a destructive year rollover on school B (moves the year pointer, generates arrears, mutates settings). No elevated role needed.
- **Fix (DONE):** `database/lock_rollover_function.sql` — `revoke execute ... from public, anon, authenticated; grant execute ... to service_role`. Run on staging ✓ (prod pending).
- **Verified (live, staging):** direct `supabase.rpc('rollover_academic_year', …)` as superadmin → **"permission denied for function rollover_academic_year"** (blocked; tested with equal years so nothing could execute). Edge-function path unaffected (service role keeps execute).

### [F-011] Unpaid arrears stop carrying forward after one rollover — 🟡 Medium (design question) — ✅ fixed (needs migration run)
- **Stage / area:** 7 — Year Rollover (arrears carry)
- **File(s):** `database/srms_migration.sql:697-721` (arrears INSERT, line 709 `AND NOT COALESCE(f.is_arrear, false)`).
- **What's wrong:** The carry excludes fees already marked `is_arrear`, so a debt carried from year X into X+1 as an arrears fee is NOT carried again into X+2 if still unpaid — the outstanding balance drops off the active ledger after one year. The original fee remains in the archived year, but a multi-year debtor stops showing as owing.
- **Fix (DONE — user chose keep-carrying):** `rollover_academic_year` now carries `is_arrear` fees forward too. An already-arrear fee keeps its ORIGINAL `fee_type`/`arrear_from_year` (CASE, no chaining), carries only its remaining unpaid balance (`amount − effectivePaid`), and the dup-guard matches on the final label + origin year so re-runs don't duplicate. Updated in `srms_migration.sql`; migration `database/arrears_carry_forward.sql` (`CREATE OR REPLACE` + re-asserts the F-010 revoke). **User runs it on staging + prod.**
- **Verified:** logic review + `diff` confirms the migration's function is identical to the reviewed `srms_migration.sql` version (only comments differ). Not live-tested — running the rollover is destructive (and F-010 blocks direct calls).

### [F-012] Parent Portal "Fee Balance" masked by overpayment credits (same as F-001) — 🟡 Medium — ✅ fixed & verified
- **Stage / area:** 8 — Parent Portal
- **File(s):** `src/modules/pages/ParentPortal.jsx:126-132` (`feeSummary`), shown as the "Fee Balance" KPI at `:280`.
- **What's wrong:** `totalPaid = Σ effectivePaid` (uncapped) and `balance = totalCharged − totalPaid`, so an overpayment on one of a child's fees cancels out arrears on another — the parent sees an understated balance. Same class as F-001, which was never extended to the parent portal.
- **Fix (DONE — extends the decided F-001 approach):** cap `totalPaid` at each fee's amount (`Math.min(amount, effectivePaid)`); `balance = charged − paid` then resolves to `Σ max(0, per-fee outstanding)` and the three figures stay arithmetically consistent.
- **Verified:** ParentPortal.jsx compiles clean (esbuild); logic checked (overpaid 150 on a 100 fee + unpaid 100 fee → balance 100, not the masked 50). Full parent-login walkthrough not done (test account is a school superadmin, not a parent).
- **Note:** Parent-portal SECURITY is excellent — RLS scopes every table to `parent_students WHERE parent_id = auth.uid()`, and `grades_parent_select` enforces release-gating server-side (`EXISTS grade_releases …`), so a parent can't read unreleased grades even via a direct API call.

### [F-013] Ministry-console RLS policies missing from the repo migrations (drift) — 🟡 Medium (repo/DR hygiene) — ✅ resolved (confirmed drift; policies added to repo)
- **Stage / area:** 9 — Ministry Console
- **File(s):** `database/srms_migration.sql` — `settings` has only school-scoped policies (790-793), **no `is_ministry_admin()` policy**; same for `students` (and likely `grades`/`attendance`/`behaviour`/`announcements`/`subjects`). But `AdminConsole.jsx:96` reads all schools' `settings`, `:101` reads all `students`, and the Activate/Suspend/Extend modals UPDATE `settings`.
- **What's wrong:** Under the policies as written, a `ministry_admin` can't read other schools' `settings`/`students`, and their settings UPDATEs are RLS-filtered to 0 rows. Since your live console works, those policies exist in the live DB but were never captured in `srms_migration.sql`. Risks: (1) re-provisioning from the repo (new env / disaster recovery) yields a broken console; (2) security-relevant policies aren't version-controlled/reviewable; (3) the Activate/Suspend/Extend modals only check `error`, not rows-affected — so if the policy is ever absent, plan changes **silently appear to succeed** (toast + audit row) while nothing changes.
- **Confirmed (live pg_policies query):** the live DB HAS `Ministry admins manage all settings` (ALL, `is_ministry_admin()`) and `Ministry admins read all students` (SELECT, `is_ministry_admin()`) — so it's pure repo drift, the console works, NOT a live bug. Only settings & students were missing (grades/attendance/etc. have no ministry policy live either — the console doesn't read them directly).
- **Fix (DONE):** added both policies to `database/srms_migration.sql` (after the settings and students policy blocks) so a fresh provision reproduces prod. **No DB change needed** — the live DBs already have them; do NOT re-run srms_migration.sql on an existing DB (it's a fresh-install script). Residual (optional): make the plan modals assert rows-affected > 0 as defence-in-depth.
- **Note:** Impersonation ("view as user") edge function is SECURE — verifies caller is a real `ministry_admin` server-side, refuses to impersonate another ministry admin, checks target has a school + not locked, logs every impersonation. Plan-activation logic (expiry math, downgrade detection, audit trails) is sound.
- **Verified:** static only (no ministry_admin login available to test the console live).

### [F-014] Past-year read-only and plan gating are UI-only (not server-enforced) — 🔵 Low (within-tenant) — open
- **Stage / area:** 10 — Cross-cutting
- **What's wrong:** (a) Viewing an archived year shows a read-only banner and disables save buttons, but nothing server-side stops a write to a past `academic_year` — a user could insert/edit archived-year data via a direct API call. (b) Plan features (`planHook.can(...)`) and student/user limits are enforced only in the client, so a technical user could bypass PRO gating or the student cap via the API.
- **Impact:** both are confined to the user's OWN school (not a cross-tenant breach). (a) is a data-integrity/audit concern; (b) is a revenue concern for the vendor.
- **Fix (optional, if it matters):** (a) a DB trigger/policy rejecting writes whose `academic_year` ≠ the school's current `settings.academic_year`; (b) enforce plan limits in RLS/RPCs. Both are non-trivial; common SaaS accepts client-side gating.
- **Note:** locked-account enforcement IS server-side (`is_active_user()` in 47 policies) — good.

### [F-015] `srms_migration.sql` can't run fresh — `students` CREATE TABLE has duplicate columns — 🟡 Medium (repo/DR) — ✅ fixed
- **Stage / area:** 9/10 — repo hygiene (found while fixing F-013)
- **What's wrong:** The `students` CREATE TABLE listed 7 columns twice (`archived`, `graduation_year`, `leaving_reason`, `leaving_notes`, `entry_year`, `middle_name`, `school_id`) — a bad merge duplicated a block. Postgres rejects a `CREATE TABLE` with a column named twice, so the whole migration aborts on a fresh project. Compounds F-013: the repo couldn't reproduce prod.
- **Fix (DONE):** removed the duplicate block (kept the first occurrence of each) and the trailing comma. Re-scanned every `CREATE TABLE` — no other table affected. `students` now has 22 distinct columns.
- **Verified:** duplicate-column scan across all tables is now empty.

**Fixed & shipped:** F-001 (fee-credit masking), F-002 (bulk-collect misallocation), F-003 (hardcoded pass mark), F-004 (grade-weight guard), F-005 (academic CSV misalignment), F-006 (Late in attendance rate), F-008 (ministry_admin escalation — SQL), F-010 (rollover lockdown — SQL), F-012 (parent-portal fee masking).

**Also resolved:** F-013 (ministry RLS drift — confirmed drift via live pg_policies; the two missing policies added to `srms_migration.sql`, no DB change needed) · F-015 (duplicate columns in `students` broke `srms_migration.sql` for fresh installs — removed).

**Open / parked (decisions or optional):** F-007 (re-enrol vs student limit — policy), F-009 (admin user-mgmt — policy), F-011 (multi-year arrears carry — design), F-014 (UI-only gating — optional).

**Security posture:** parent portal RLS excellent (release-gating server-side); locked accounts server-enforced; impersonation properly gated; the two real security holes (F-008, F-010) are fixed. F-013 needs a live check + repo capture.
