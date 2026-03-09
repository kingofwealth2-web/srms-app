export default function Avatar({ name, size = 32, color, photo }) {
  const initials = (name || '?').split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('')
  const hue = name ? name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360 : 200
  // Use a darker, more saturated bg so initials are always readable in both themes
  const defaultBg = color || `hsla(${hue},50%,35%,0.85)`

  if (photo) return (
    <img src={photo} alt={name} style={{
      width: size, height: size, borderRadius: '50%',
      objectFit: 'cover', flexShrink: 0,
      border: '1.5px solid var(--line2)',
    }}/>
  )

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: defaultBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700,
      // Always white text — bg is always dark enough
      color: 'rgba(255,255,255,0.92)',
      flexShrink: 0,
      fontFamily: "'Cabinet Grotesk',sans-serif",
      letterSpacing: '-0.02em',
      userSelect: 'none',
    }}>
      {initials}
    </div>
  )
}