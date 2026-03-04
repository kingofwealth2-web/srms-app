export default function Avatar({ name, size = 32, color, photo }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')

  if (photo) return (
    <img
      src={photo} alt={name}
      style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'cover', border: '1px solid var(--line)', flexShrink: 0,
      }}
    />
  )

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color || 'var(--ink5)',
      border: '1px solid var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: 'var(--mist)',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}
