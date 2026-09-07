import Btn from './Btn'

export default function EmptyState({ title = 'Nothing to show yet', hint, actionLabel, onAction, compact = false }) {
  return (
    <div className={`daybook-empty-state${compact ? ' is-compact' : ''}`} role='status'>
      <div className='daybook-empty-state__mark' aria-hidden='true'>
        <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M7 3.75h7l3 3V20.25H7z'/><path d='M14 3.75v3h3M9.5 11h5M9.5 14.5h5'/>
        </svg>
      </div>
      <div className='daybook-empty-state__copy'>
        <div className='daybook-empty-state__title'>{title}</div>
        {hint && <div className='daybook-empty-state__hint'>{hint}</div>}
      </div>
      {actionLabel && onAction && <Btn size='sm' onClick={onAction}>{actionLabel}</Btn>}
    </div>
  )
}
