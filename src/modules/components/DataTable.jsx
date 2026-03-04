export default function DataTable({ columns, data, onRow }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            {columns.map(c => (
              <th key={c.key} style={{
                padding: '10px 16px', textAlign: 'left',
                fontSize: 10, fontWeight: 600, color: 'var(--mist3)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                whiteSpace: 'nowrap',
                fontFamily: "'Clash Display',sans-serif",
                background: 'var(--ink3)',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{
                padding: 48, textAlign: 'center',
                color: 'var(--mist3)', fontSize: 13,
              }}>No records found</td>
            </tr>
          )}
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRow && onRow(row)}
              style={{
                borderBottom: '1px solid var(--line)',
                cursor: onRow ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (onRow) e.currentTarget.style.background = 'var(--ink3)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {columns.map(c => (
                <td key={c.key} style={{
                  padding: '13px 16px', fontSize: 13,
                  color: 'var(--white)', verticalAlign: 'middle',
                }}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '--')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
