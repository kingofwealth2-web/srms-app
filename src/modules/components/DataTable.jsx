import EmptyState from './EmptyState'

export default function DataTable({ columns, data, onRow, emptyTitle = 'No records found', emptyHint = 'Try changing or clearing the filters above.', emptyAction, onEmptyAction, minWidth = 640 }) {
  return (
    <div className='daybook-table-shell'>
      <div className='daybook-table-hint' aria-hidden='true'>Swipe to see more <span>→</span></div>
      <div className='daybook-table-wrap' tabIndex='0' aria-label='Scrollable records table'>
        <table className='daybook-table' style={{ minWidth }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} className={c.numeric ? 'is-numeric' : ''} style={{textAlign:c.align||'left',width:c.width}}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{
                padding: '20px', textAlign: 'center',
                color: 'var(--mist3)', fontSize: 13,
              }}>
                <EmptyState title={emptyTitle} hint={emptyHint} actionLabel={emptyAction} onAction={onEmptyAction}/>
              </td>
            </tr>
          )}
          {data.map((row, i) => (
            <tr
              key={row.id != null ? String(row.id) : `row-${i}`}
              className={onRow ? 'is-clickable' : ''}
              tabIndex={onRow ? 0 : undefined}
              onClick={e => onRow && !e.target.closest('button,a,input,select,textarea') && onRow(row)}
              onKeyDown={e => { if(onRow && (e.key==='Enter'||e.key===' ')){e.preventDefault();onRow(row)} }}
            >
              {columns.map(c => (
                <td key={c.key} className={c.numeric ? 'is-numeric' : ''} style={{textAlign:c.align||'left',whiteSpace:c.nowrap?'nowrap':undefined}}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  )
}
