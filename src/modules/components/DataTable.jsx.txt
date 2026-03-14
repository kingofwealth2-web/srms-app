export default function DataTable({ columns, data, onRow }) {
  return (
    <div style={{ overflowX: 'auto', marginInline: -2 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{
                padding: '9px 16px',
                textAlign: 'left',
                fontSize: 10, fontWeight: 700, color: 'var(--mist3)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                whiteSpace: 'nowrap',
                fontFamily: "'Clash Display',sans-serif",
                borderBottom: '1px solid var(--line)',
                background: 'transparent',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{
                padding: '60px 20px', textAlign: 'center',
                color: 'var(--mist3)', fontSize: 13,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'var(--ink4)', border: '1px solid var(--line2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, opacity: 0.5,
                  }}>◌</div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--mist2)', marginBottom: 3 }}>No records found</div>
                    <div style={{ fontSize: 12, color: 'var(--mist3)' }}>Try adjusting your filters</div>
                  </div>
                </div>
              </td>
            </tr>
          )}
          {data.map((row, i) => (
            <tr
              key={row.id != null ? String(row.id) : `row-${i}`}
              onClick={() => onRow && onRow(row)}
              style={{
                borderBottom: '1px solid var(--line)',
                cursor: onRow ? 'pointer' : 'default',
                transition: 'background var(--t-snap), box-shadow var(--t-snap)',
                animation: `fadeIn 0.3s ${Math.min(i * 0.025, 0.25)}s both`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--ink3)'
                if (onRow) e.currentTarget.style.boxShadow = 'inset 3px 0 0 var(--gold)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {columns.map(c => (
                <td key={c.key} style={{
                  padding: '13px 16px', fontSize: 13,
                  color: 'var(--white)', verticalAlign: 'middle',
                }}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}