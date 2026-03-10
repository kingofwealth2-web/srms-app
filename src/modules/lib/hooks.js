import { useState, useEffect, useRef } from 'react'

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

// ── Page transition key ─────────────────────────────────────────
// Usage: wrap page content in <div key={transitionKey} className="page">
export function usePageTransition(activePage) {
  const [key, setKey] = useState(activePage)
  const prevRef = useRef(activePage)

  useEffect(() => {
    if (activePage !== prevRef.current) {
      prevRef.current = activePage
      setKey(activePage + '_' + Date.now())
    }
  }, [activePage])

  return key
}