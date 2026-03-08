export default function Avatar({ name, size = 32, color, photo }) {
  const initials = (name || '?').split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('')
  const hue = name ? name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360 : 200
  const defaultBg = `hsla(${hue},45%,30%,0.6)`

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
      background: color || defaultBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700,
      color: 'rgba(255,255,255,0.9)',
      flexShrink: 0,
      fontFamily: "'Cabinet Grotesk',sans-serif",
      letterSpacing: '-0.02em',
      userSelect: 'none',
    }}>
      {initials}
    </div>
  )
}