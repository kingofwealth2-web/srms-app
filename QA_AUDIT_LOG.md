# SRMS QA / Bug Audit — Running Log

<<<<<<< Updated upstream
Staged, feature-by-feature quality audit. Per feature: static code review + dynamic testing.
Cadence: audit → user triages → fix → verify, one stage at a time.

- **Dynamic-test target:** dev server (`npm run dev`) → test project `nnptet…`. Never a prod build.
- **Login:** superadmin4@staging-srms.test / admin12345 (session drops on server restart).
- **Severity:** 🔴 Critical · 🟠 High (wrong results) · 🟡 Medium · 🔵 Low.
=======
A staged, feature-by-feature quality audit. Two-pronged per feature: **static code review**
(logic + edge cases) and **dynamic testing** (dev server, browser). Cadence: audit → triage →
fix → verify, one stage at a time.

- **Dynamic-test target:** dev server (`npm run dev`) → test/dev Supabase project `nnptet…`.
  Never run a production build during the audit (that points at prod `kfcqk…`).
- **Severity:** 🔴 Critical (data loss / money / security) · 🟠 High (wrong results) ·
  🟡 Medium (edge case / UX) · 🔵 Low (polish).
- **Status:** `open` → `triaged` → `fixing` → `fixed` / `wontfix`.
>>>>>>> Stashed changes

---

## Stage status

<<<<<<< Updated upstream
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
| 9 | Ministry Console | not started |
| 10 | Cross-cutting | not started |

Fixed in stages 1–3 (all shipped): F-001 fee-credit masking, F-002 bulk-collect misallocation,
F-003 hardcoded pass mark, F-004 grade-weight guard, F-005 academic CSV misalignment.
=======
| # | Stage | Status | Findings (open / total) |
|---|-------|--------|--------------------------|
| 0 | Setup & guardrails | ✅ done | — |
| 1 | Fees | ✅ done (2 fixed) | 2 / 2 |
| 2 | Grades | ✅ done (2 fixed) | 0 open / 2 total |
| 3 | Reports & Report Cards | ✅ audited (F-005 fixed; per-period attendance built, needs migration) | 0 open / 1 + 1 feat |
| 4 | Attendance | not started | — |
| 5 | Students & Classes | not started | — |
| 6 | Users, Roles & Access | not started | — |
| 7 | Settings & Year Rollover | not started | — |
| 8 | Parent Portal | not started | — |
| 9 | Ministry Console | not started | — |
| 10 | Cross-cutting | not started | — |
>>>>>>> Stashed changes

---

## Findings

<<<<<<< Updated upstream
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

### [F-008] User RPCs don't validate the role — a school superadmin can grant `ministry_admin` (cross-school access) — 🟠 High (security) — ✅ fixed & verified (staging)
- **Stage / area:** 6 — Users, Roles & Access
- **File(s):** `database/srms_migration.sql` `create_auth_user` (449) & `update_auth_user` (521) — both check caller = superadmin + same school, but never validate `p_role`; `is_ministry_admin()` (326) just checks `role='ministry_admin'`.
- **What's wrong:** A school superadmin can call `supabase.rpc('create_auth_user', {p_role:'ministry_admin', ...})` (or `update_auth_user`) directly — not offered in the UI, but trivial via the API. The resulting profile passes `is_ministry_admin()`, which the RLS policies treat as vendor-level access to **every** school's data. A per-school superadmin can thus escalate to all-schools access, breaking tenant isolation.
- **Fix (DONE):** `database/validate_user_role.sql` re-declares `create_auth_user` & `update_auth_user` with a `p_role IN ('superadmin','admin','classteacher','teacher','parent')` whitelist. Run on staging ✓ (prod pending).
- **Verified (live, staging):** as superadmin, `create_auth_user(role:'ministry_admin')` → **"Not authorised"** (no account created); with a valid role (`teacher`) + existing email → **"already exists"** (whitelist lets valid roles through). No regression.

### [F-009] Admin user-management UI vs superadmin-only RPCs — admins get "Not authorised" — 🟡 Medium — open
- **Stage / area:** 6 — Users, Roles & Access
- **File(s):** UI `src/modules/pages/Users.jsx:199` (`canEdit` lets admins edit non-privileged users), `:279-280` (admin role dropdown) + admin has `users` in `NAV_ITEMS`; backend `create_auth_user`/`update_auth_user`/`reset_user_password` all require caller = superadmin.
- **What's wrong:** The UI gives admins the Users page, an Edit button on teachers/parents, and a create role dropdown — but every user RPC is superadmin-only, so an admin's create/edit fails with "Not authorised." Affordance and backend disagree.
- **Fix (needs a policy call):** either (a) let admins manage lower-role users — loosen the RPC guard to allow admin for non-privileged target roles (and never for superadmin/admin/ministry_admin); or (b) superadmin-only — hide user-management affordances from admins in the UI. (a) matches the UI's apparent intent.
- **Verified:** Not yet fixed.

### [F-010] `rollover_academic_year` is directly callable by any authenticated user — 🔴 Critical (security) — ✅ fixed & verified (staging)
- **Stage / area:** 7 — Settings & Year Rollover
- **File(s):** `database/srms_migration.sql:664` (`rollover_academic_year`, SECURITY DEFINER, **no auth guard, no REVOKE**); intended caller `supabase/functions/start-new-year/index.ts` (verifies superadmin + same school, then calls it with the **service role**).
- **What's wrong:** The normal path (client → `start-new-year` edge function → RPC) is properly secured. But the SQL function itself has no internal caller check and execute is never revoked, so by Postgres default any `authenticated` (likely `anon` too) role can call `supabase.rpc('rollover_academic_year', {p_school_id:<ANY school>, p_old_year, p_new_year})` **directly**, bypassing the edge function. `p_school_id` is client-supplied → a user of school A can force a destructive year rollover on school B (moves the year pointer, generates arrears, mutates settings). No elevated role needed.
- **Fix (DONE):** `database/lock_rollover_function.sql` — `revoke execute ... from public, anon, authenticated; grant execute ... to service_role`. Run on staging ✓ (prod pending).
- **Verified (live, staging):** direct `supabase.rpc('rollover_academic_year', …)` as superadmin → **"permission denied for function rollover_academic_year"** (blocked; tested with equal years so nothing could execute). Edge-function path unaffected (service role keeps execute).

### [F-011] Unpaid arrears stop carrying forward after one rollover — 🟡 Medium (design question) — open
- **Stage / area:** 7 — Year Rollover (arrears carry)
- **File(s):** `database/srms_migration.sql:697-721` (arrears INSERT, line 709 `AND NOT COALESCE(f.is_arrear, false)`).
- **What's wrong:** The carry excludes fees already marked `is_arrear`, so a debt carried from year X into X+1 as an arrears fee is NOT carried again into X+2 if still unpaid — the outstanding balance drops off the active ledger after one year. The original fee remains in the archived year, but a multi-year debtor stops showing as owing.
- **Fix (design call):** decide whether unpaid arrears should keep rolling forward (carry `is_arrear` fees too, guarding against label chains) or intentionally stop after one year to avoid "arrears of arrears" clutter. Currently the latter, undocumented.
- **Verified:** Not yet fixed.

### [F-012] Parent Portal "Fee Balance" masked by overpayment credits (same as F-001) — 🟡 Medium — ✅ fixed & verified
- **Stage / area:** 8 — Parent Portal
- **File(s):** `src/modules/pages/ParentPortal.jsx:126-132` (`feeSummary`), shown as the "Fee Balance" KPI at `:280`.
- **What's wrong:** `totalPaid = Σ effectivePaid` (uncapped) and `balance = totalCharged − totalPaid`, so an overpayment on one of a child's fees cancels out arrears on another — the parent sees an understated balance. Same class as F-001, which was never extended to the parent portal.
- **Fix (DONE — extends the decided F-001 approach):** cap `totalPaid` at each fee's amount (`Math.min(amount, effectivePaid)`); `balance = charged − paid` then resolves to `Σ max(0, per-fee outstanding)` and the three figures stay arithmetically consistent.
- **Verified:** ParentPortal.jsx compiles clean (esbuild); logic checked (overpaid 150 on a 100 fee + unpaid 100 fee → balance 100, not the masked 50). Full parent-login walkthrough not done (test account is a school superadmin, not a parent).
- **Note:** Parent-portal SECURITY is excellent — RLS scopes every table to `parent_students WHERE parent_id = auth.uid()`, and `grades_parent_select` enforces release-gating server-side (`EXISTS grade_releases …`), so a parent can't read unreleased grades even via a direct API call.
=======
> Format per finding:
> ### [ID] Title — SEVERITY — status
> - **Stage / area:**
> - **File(s):** `path:line`
> - **What's wrong:**
> - **Repro / failure scenario:**
> - **Fix:**
> - **Verified:**

### [F-001] "Outstanding" KPI & Collection Rate net overpayment credits against real receivables — 🟠 High — ✅ fixed & verified
- **Stage / area:** 1 — Fees (also affects Dashboard "Fee Collection" tile and Reports fee KPIs)
- **File(s):** `src/modules/pages/Fees.jsx:468-472` (`totalOwed`/`totalPaid`/`collectionRate`); same pattern in `src/modules/pages/Dashboard.jsx:34-38` and `src/modules/pages/Reports.jsx` fee KPIs.
- **What's wrong:** `Outstanding = totalOwed − Σ effectivePaid`. `effectivePaid` can exceed a fee's amount (overpaid fees carry a negative balance / credit). Summing it nets those credits against genuine unpaid balances, so the headline "Outstanding" and "Collection Rate" understate what's owed.
- **Repro / failure scenario:** Live test school (Bibiani Saviour Academy): Outstanding KPI shows **₵9.00**, but 16 fees are in Outstanding status summing to **₵100** (plus uncounted Partial balances). ~₵91 of overpayment credits on other fees mask the real receivable. A school reads "fully collected" when ₵100+ is owed across 16 pupils.
- **Fix (DECIDED with user):** `outstanding = Σ max(0, balance)`; `collected = Σ min(amount, effectivePaid)`; `rate = collected / totalOwed`. Apply identically in Fees, Dashboard "Fee Collection" tile, and Reports fee KPIs so every screen agrees. Overpayment credits never count toward another fee's collection.
- **Verified:** ✅ Fixed in `Fees.jsx`, `Dashboard.jsx`, `Reports.jsx`. Live on test school: Outstanding ₵9→₵99 (true gross), Collected ₵18,632→₵18,542 (credits excluded), reconciles to Total Owed ₵18,641. No console errors.

### [F-002] Bulk Collect Payment can misallocate when a student has duplicate fee rows (same type+period) — 🟡 Medium (low likelihood) — ✅ fixed (safe cap)
- **Stage / area:** 1 — Fees (Bulk Collect Payment)
- **File(s):** `src/modules/pages/Fees.jsx:1133-1150` (`buildBcpRows`), `:1211-1245` (`confirmBcp`)
- **What's wrong:** `buildBcpRows` sets the row's `balance` to the SUM across all of a student's matching fees, but `feeId = studentFees[0]?.id` — the payment (and the overpay guard) target only the first fee. If a student has ≥2 fees with the same type+period+year, a full-balance collection overpays fee[0] and leaves fee[1] outstanding, silently.
- **Repro / failure scenario:** Requires duplicate fee rows for one student sharing type+period+year. The single/bulk-add duplicate guards prevent this within one mechanism, so it's only reachable via legacy data or a cross-mechanism naming collision (a one-time fee named identically to a recurring template + matching period label). Low likelihood, but silent money misallocation when it hits.
- **Fix (DONE — option a, safe cap):** `buildBcpRows` now targets the first fee row still owing and caps the collectable amount to *that row's own balance*, never the cross-row sum. Behaviour-identical in the normal single-fee case.
- **Verified:** No console errors after HMR; app healthy, KPIs still correct. Full BCP end-to-end dynamic test not run — test school has only recurring-template fees, so BCP (one-time fees only) has nothing to collect. Residual: exercise BCP end-to-end after seeding a one-time fee.

### [F-003] Dashboard pass-rate KPIs hardcode ≥50 instead of the school's configured pass mark — 🟠 High — ✅ fixed & verified
- **Stage / area:** 2 — Grades (Dashboard KPIs)
- **File(s):** `src/modules/pages/Dashboard.jsx:66` (`calcStats` → `perStudent.filter(v=>v>=50)`); correct pattern is `isPassing(score, scale)` in `helpers.js:177`, already used throughout `Reports.jsx` (142, 207, 481, 855, 942…).
- **What's wrong:** Dashboard's school-wide Pass Rate and class-teacher Pass Rate use a hardcoded 50 threshold. Reports computes the same metric via the school's configured scale (`isPassing`). Any school whose pass mark ≠ 50 (e.g. Number system fails below 35) gets a wrong pass rate on the Dashboard while Reports shows the right one.
- **Repro / failure scenario:** Live test school shows "Pass rate: 0%" on the Dashboard. A school with, say, a 40 pass mark and pupils scoring 40–49 would be counted as failing on the Dashboard but passing in Reports — two screens, two answers.
- **Fix (DONE):** imported `isPassing` into `Dashboard.jsx`; `calcStats` now uses `isPassing(v, scale)` instead of `v>=50`. Matches Reports.
- **Verified:** No console errors; Dashboard renders a valid Pass rate (0% for this uniformly low-scoring test data — legitimately unchanged here, but now scale-aware and consistent with Reports).
- **Related (lower priority, cosmetic):** hardcoded `>=50/60/80` *colour* thresholds in `ParentPortal.jsx:373,410`, `Students.jsx:248`, `Reports.jsx:1086` — scale-unaware grade colouring; not wrong numbers, just colour buckets. Log for later.

### [F-004] Active grade-component weights ≠100 only soft-warn → silent, systemic grade corruption — 🟠 High — ✅ fixed & verified
- **Stage / area:** 2 — Grades / Settings
- **File(s):** `src/modules/pages/Settings.jsx:83-86` (guard is warn-only, then `doSave` runs); `src/modules/lib/helpers.js:158-167` (`calcTotal` doesn't normalize by Σ active weight)
- **What's wrong:** `calcTotal` = `Σ (raw/maxRaw)*weight` over enabled components, assuming they total 100. If a school disables a component (or edits weights) so active weights sum to ≠100, every total is scaled to the wrong maximum. Save only shows a 4-second amber toast ("Settings saved anyway") — it does NOT block. Result: all letter grades, pass rates, class rankings-vs-scale, and report-card totals skew, silently.
- **Repro / failure scenario:** Settings → disable "Exam" (weight 70) leaving Class Score (30), ignore the toast, Save. Every student's max possible total is now 30 → nearly all fail. Reverse case (weights >100) inflates. Current test school is unaffected (active weights = 100%), so latent, not live here.
- **Fix (DONE — option b, user's choice):** `Settings.jsx` `save()` now pops a blocking confirm ("Weights don't total 100% … Save anyway?") when active weights ≠100 instead of a fire-and-forget toast; continuation deferred a tick so it doesn't clobber the prefix-migration confirm. Refactored the post-weight logic into `proceedSave()`. Also made the amber banner **persistent** (driven by the live weight total, not a 4s flag) and removed the dead `weightWarning` state.
- **Verified (live):** Set active weight to 80 → persistent banner shows "…add up to 80%…"; Save → blocking confirm appears with consequence text + "Save anyway"; Cancel aborts without writing (DB untouched); restored to 100 → banner clears. No console errors from the change.
- **Note (separate, 🔵 Low):** `Field.jsx:21` `<select>` mixes `padding` shorthand with `paddingRight`, firing a React warning on every render. Pre-existing, cosmetic. Log for a later cleanup pass.

### [F-005] Academic all-students CSV export has misaligned columns — 🟡 Medium — ✅ fixed & verified
- **Stage / area:** 3 — Reports (Academic tab → Export, no student selected, component grade source)
- **File(s):** `src/modules/pages/Reports.jsx:262-276` (`exportExcel`, `rtype==='academic'` else-branch)
- **What's wrong:** The header emits, per subject, BOTH a bare subject-name column (line 262) AND per-subject×component columns (264-266). Each data row (270-273) emits ONLY the component values — no value for the bare subject columns. So every row is shifted left by N (subject count): component values land under subject headers, and Total/Average/Grade/Remark/Status land under component headers. Whole sheet skewed.
- **Repro / failure scenario:** Reports → Academic tab, no student selected, grade source = components, class with ≥1 subject → Export CSV. Header has N more columns than each row. Opens misaligned in Excel.
- **Note:** single-student academic export (254-259) and the reportcards broadsheet export (244-249) are both correctly aligned — only this path is broken.
- **Fix (DONE — option a):** rows now emit each subject's total (`calcTotal`) under its subject-name header column, then the component columns, matching the header order. Subject grades looked up once per student.
- **Verified (live):** Captured the exported Blob on Reports → Academic → All Students. Header = 98 cols, every data row = 98 cols (was header 98 / rows 53 before). Export runs clean, 381 lines.

### [FEAT-A] Per-period (term/semester) attendance — ⭐ enhancement (user-requested) — ✅ done, migration run on staging+prod, verified
- **Stage / area:** 3 — Reports/Attendance (arose from the Stage-3 observation that report-card attendance was year-scoped)
- **Why:** grades & fees are stored per period; attendance was per academic-year only, so every term's report card showed the same whole-year attendance. User: "it has to be per period… same as grades and fees."
- **Changes:**
  - `database/add_attendance_period.sql` (NEW) — `alter table attendance add column period text` + one-time backfill of existing rows to `'Term 3'` (Saviour is the only client and is in Term 3). Future clients unaffected: they onboard after this runs and stamp their own term at marking time, so their rows are never null. **User runs this on staging, then prod.**
  - `Attendance.jsx` — persisted **term/semester selector** with **no automatic default** (each school explicitly picks its current term once, then it persists per device — a silent default would push a brand-new school toward the wrong term); `period` stamped on every saved record; save blocked (red-bordered selector) until a term is chosen; period added to audit log, History table, and CSV export.
  - `Reports.jsx` — report-card `getAttendance` filters daily records by `rcPeriod`; Reports → Attendance tab filters by `fp` and now shows the period selector on that tab; opening balances (no period) excluded from period-filtered views to avoid multi-counting.
- **⚠ Deploy ordering:** the migration MUST run before this code is used — otherwise the attendance upsert fails (unknown `period` column) and period views read zero.
- **Verified (live, migration applied to staging + prod):** saving a class under Term 3 succeeds (new column write OK); History shows the records stamped `Term 3`; Reports → Attendance reads **Term 1 = 0%**, **Term 3 = 76%**, **All Periods = 89%** — period filtering works. No console errors.
- **⚠ Surfaced by verification — opening balances (needs a decision):** Saviour DOES use opening balances (pre-SRMS attendance). They carry no term, so they're excluded from period views by design → Term 3 reads 76% (daily records only) while All Periods reads 89% (incl. opening balances). So **term report cards will show lower attendance than the year view** for schools that use opening balances. Options: (a) accept it (term cards = daily records only); (b) add a term selector to the opening-balance form so those figures land on a specific term's cards. Awaiting user call.
- **Follow-up noted:** Dashboard attendance tile kept year-to-date (whole-school glance).
>>>>>>> Stashed changes
