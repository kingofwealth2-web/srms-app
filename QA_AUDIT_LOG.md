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
| 6 | Users, Roles & Access | 🔎 audited — 2 findings (F-008 security, F-009) |
| 7 | Settings & Year Rollover | not started |
| 8 | Parent Portal | not started |
| 9 | Ministry Console | not started |
| 10 | Cross-cutting | not started |

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

### [F-007] Re-enrolling an archived student bypasses the plan student limit — 🔵 Low (vendor policy) — open
- **Stage / area:** 5 — Students & Classes
- **File(s):** `src/modules/pages/Students.jsx:87-94` (`unarchive`) vs `:133` (`save` checks `atStudentLimit`)
- **What's wrong:** Adding a new student is blocked at the plan's student cap, but `unarchive` (re-enrol) sets `archived:false` with no limit check — a school at its cap can push active students past it by re-enrolling archived pupils.
- **Failure scenario:** School on a 100-student plan, 100 active + archived → re-enrol an archived pupil → 101 active, over the paid cap.
- **Fix (needs a call):** add the same `atStudentLimit` guard to `unarchive`. Product decision: re-enrolling a genuine former pupil is legitimate, so you may prefer to allow it — your call as the vendor.
- **Note:** Rest of Stage 5 is clean — atomic student-ID RPC, FK-safe delete (23503 → archive instead), class delete blocked when students/subjects exist (+ teacher unassigned), single & bulk promotion both write enrolment history (upsert, no dupes), track per-student failures, and guard against students added mid-wizard.
- **Verified:** Not yet fixed.

### [F-008] User RPCs don't validate the role — a school superadmin can grant `ministry_admin` (cross-school access) — 🟠 High (security / tenant isolation) — open
- **Stage / area:** 6 — Users, Roles & Access
- **File(s):** `database/srms_migration.sql` `create_auth_user` (449) & `update_auth_user` (521) — both check caller = superadmin + same school, but never validate `p_role`; `is_ministry_admin()` (326) just checks `role='ministry_admin'`.
- **What's wrong:** A school superadmin can call `supabase.rpc('create_auth_user', {p_role:'ministry_admin', ...})` (or `update_auth_user`) directly — not offered in the UI, but trivial via the API. The resulting profile passes `is_ministry_admin()`, which the RLS policies treat as vendor-level access to **every** school's data. A per-school superadmin can thus escalate to all-schools access, breaking tenant isolation.
- **Fix:** in both RPCs, reject any `p_role` not in the school-role set: `IF p_role NOT IN ('superadmin','admin','classteacher','teacher','parent') THEN RAISE EXCEPTION 'Not authorised'; END IF;`. SQL migration.
- **Verified:** exploit path confirmed by reading the functions (caller=superadmin + same school → inserts profile with unchecked `p_role`). Not yet fixed.

### [F-009] Admin user-management UI vs superadmin-only RPCs — admins get "Not authorised" — 🟡 Medium — open
- **Stage / area:** 6 — Users, Roles & Access
- **File(s):** UI `src/modules/pages/Users.jsx:199` (`canEdit` lets admins edit non-privileged users), `:279-280` (admin role dropdown) + admin has `users` in `NAV_ITEMS`; backend `create_auth_user`/`update_auth_user`/`reset_user_password` all require caller = superadmin.
- **What's wrong:** The UI gives admins the Users page, an Edit button on teachers/parents, and a create role dropdown — but every user RPC is superadmin-only, so an admin's create/edit fails with "Not authorised." Affordance and backend disagree.
- **Fix (needs a policy call):** either (a) let admins manage lower-role users — loosen the RPC guard to allow admin for non-privileged target roles (and never for superadmin/admin/ministry_admin); or (b) superadmin-only — hide user-management affordances from admins in the UI. (a) matches the UI's apparent intent.
- **Verified:** Not yet fixed.
