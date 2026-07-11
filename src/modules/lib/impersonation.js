const KEY = 'srms_impersonation_v1'
const EVENT = 'srms-impersonation-change'

// Backed by localStorage (not sessionStorage) -- the impersonated Supabase
// session itself persists in localStorage across tab close/restart, so the
// warning flag has to live exactly as long, or a closed tab could silently
// reopen still logged in as the client's user with no banner shown.
export function getImpersonationState() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setImpersonationState(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
  window.dispatchEvent(new Event(EVENT))
}

export function clearImpersonationState() {
  localStorage.removeItem(KEY)
  window.dispatchEvent(new Event(EVENT))
}

export const IMPERSONATION_EVENT = EVENT
