// Usage: <Pagination page={page} totalPages={totalPages} total={total} pageSize={50} onPage={setPage}/>
export default function Pagination({ page, totalPages, total, pageSize, onPage }) {
  if (totalPages <= 1) return null
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  // Show at most 7 page buttons with ellipsis
  const pages = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  const btnStyle = (active) => ({
    minWidth: 32, height: 32, borderRadius: 8,
    border: `1px solid ${active ? 'var(--gold)' : 'var(--line)'}`,
    background: active ? 'rgba(232,184,75,0.1)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--mist2)',
    fontSize: 12, fontWeight: active ? 700 : 500,
    cursor: 'pointer', transition: 'all 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Cabinet Grotesk',sans-serif",
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 4px 4px', flexWrap: 'wrap', gap: 8,
    }}>
      <span style={{ fontSize: 12, color: 'var(--mist3)' }}>
        {from}–{to} of {total}
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          onClick={() => onPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{ ...btnStyle(false), opacity: page === 1 ? 0.35 : 1 }}
        >‹</button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`ellipsis-${i}`} style={{ fontSize: 12, color: 'var(--mist3)', padding: '0 4px' }}>…</span>
            : <button key={p} onClick={() => onPage(p)} style={btnStyle(p === page)}>{p}</button>
        )}
        <button
          onClick={() => onPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          style={{ ...btnStyle(false), opacity: page === totalPages ? 0.35 : 1 }}
        >›</button>
      </div>
    </div>
  )
}
