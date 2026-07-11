export default function LogoMark({ size = 16, color = '#0b0b12' }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ color, flexShrink: 0 }} aria-hidden="true">
      <rect x="25" y="25" width="34" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="9" opacity="0.55" transform="rotate(45 42 42)" />
      <rect x="41" y="41" width="34" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="9" transform="rotate(45 58 58)" />
      <line x1="30" y1="58" x2="70" y2="42" stroke="currentColor" strokeWidth="2.2" opacity="0.5" />
      <line x1="34" y1="66" x2="74" y2="50" stroke="currentColor" strokeWidth="2.2" opacity="0.5" />
    </svg>
  )
}
