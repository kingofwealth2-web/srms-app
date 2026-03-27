import { useState, useEffect, useRef } from 'react'
import { PLANS, TRIAL_DAYS, OVERAGE_GRACE_DAYS, CANCELLATION_GRACE_DAYS } from './constants'

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ── Count-up animation for numbers ─────────────────────────────
// Usage: const displayed = useCountUp(value, { duration: 1000 })
export function useCountUp(target, options = {}) {
  const { duration = 900, decimals = 0, delay = 0 } = options
  const [current, setCurrent] = useState(0)
  const rafRef  = useRef(null)
  const prevRef = useRef(0)

  useEffect(() => {
    const numTarget = Number(target) || 0
    const startVal  = prevRef.current
    let startTime   = null

    const easeOut = t => 1 - Math.pow(1 - t, 3)

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const elapsed  = timestamp - startTime - delay
      if (elapsed < 0) { rafRef.current = requestAnimationFrame(animate); return }
      const progress = Math.min(elapsed / duration, 1)
      const value    = startVal + (numTarget - startVal) * easeOut(progress)
      setCurrent(decimals > 0 ? Math.round(value * 10 ** decimals) / 10 ** decimals : Math.round(value))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
      else prevRef.current = numTarget
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, delay, decimals])

  return current
}

// ── Pagination ──────────────────────────────────────────────────
// Usage: const { paged, page, setPage, totalPages } = usePagination(items, 50)
export function usePagination(items, pageSize = 50) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  // Reset to page 1 whenever the dataset changes length
  useEffect(() => { setPage(1) }, [items.length])
  const clampedPage = Math.min(page, totalPages)
  const paged = items.slice((clampedPage - 1) * pageSize, clampedPage * pageSize)
  return { paged, page: clampedPage, setPage, totalPages }
}
// ── Plan / subscription status ──────────────────────────────────
// Usage: const { plan, status, can, isTrialing, isExpired } = usePlan(settings)
//
// status values:
//   'active_trial'       — within 14-day trial
//   'trial_expired'      — trial ended, no paid plan
//   'active'             — paid plan, within expiry
//   'expired'            — paid plan lapsed
//   'overage_grace'      — over student/user limit, 7-day grace
//   'cancelled_grace'    — cancelled, within 30-day read-only window
//   'cancelled_archived' — cancelled, past 30 days
//
// can(feature) returns true if the current plan includes that feature.
// Feature keys match PLANS[x].features keys in constants.js

export function usePlan(settings) {
  if (!settings) return {
    plan:       'trial',
    status:     'active_trial',
    isTrialing: true,
    isExpired:  false,
    isActive:   false,
    daysLeft:   0,
    can:        () => true,   // default open until settings loads
  }

  const now              = new Date()
  const planKey          = settings.plan          || 'trial'
  const trialEndsAt      = settings.trial_ends_at
    ? new Date(settings.trial_ends_at)
    : settings.created_at
      ? new Date(new Date(settings.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
  const planExpiresAt    = settings.plan_expires_at ? new Date(settings.plan_expires_at) : null
  const graceEndsAt      = settings.grace_ends_at  ? new Date(settings.grace_ends_at)  : null
  const cancelledAt      = settings.cancelled_at   ? new Date(settings.cancelled_at)   : null

  // ── Derive status ──
  let status = 'active'

  if (cancelledAt) {
    const archiveDate = new Date(cancelledAt)
    archiveDate.setDate(archiveDate.getDate() + CANCELLATION_GRACE_DAYS)
    status = now <= archiveDate ? 'cancelled_grace' : 'cancelled_archived'
  } else if (planKey === 'trial') {
    status = trialEndsAt && now <= trialEndsAt ? 'active_trial' : 'trial_expired'
  } else if (graceEndsAt && now <= graceEndsAt) {
    status = 'overage_grace'
  } else if (planExpiresAt && now > planExpiresAt) {
    status = 'expired'
  } else {
    status = 'active'
  }

  // ── Effective plan for feature checks ──
  // During active trial → treat as pro
  // Expired / cancelled → treat as starter (most restricted)
  const effectivePlanKey =
    status === 'active_trial'                          ? 'pro'
    : status === 'trial_expired'                       ? 'starter'
    : status === 'expired'                             ? 'starter'
    : status === 'cancelled_grace'                     ? planKey    // read-only access to their plan
    : status === 'cancelled_archived'                  ? 'starter'
    : planKey

  const planConfig = PLANS[effectivePlanKey] || PLANS.starter

  // ── Days left (for trial or plan expiry banners) ──
  let daysLeft = 0
  if (status === 'active_trial' && trialEndsAt) {
    daysLeft = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)))
  } else if (status === 'active' && planExpiresAt) {
    daysLeft = Math.max(0, Math.ceil((planExpiresAt - now) / (1000 * 60 * 60 * 24)))
  }

  // ── Feature check ──
  const can = (feature) => {
    if (status === 'cancelled_archived') return false
    return planConfig.features?.[feature] === true
  }

  // ── Limit checks ──
  const studentLimit = planConfig.studentLimit  // null = unlimited
  const userLimit    = planConfig.userLimit      // null = unlimited

  return {
    plan:          effectivePlanKey,
    rawPlan:       planKey,
    status,
    isTrialing:    status === 'active_trial',
    isExpired:     status === 'trial_expired' || status === 'expired',
    isCancelled:   status === 'cancelled_grace' || status === 'cancelled_archived',
    isActive:      status === 'active' || status === 'active_trial' || status === 'overage_grace',
    daysLeft,
    studentLimit,
    userLimit,
    can,
  }
}