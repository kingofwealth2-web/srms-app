import Skeleton, { SkeletonRows } from './Skeleton'

export default function PageSkeleton({ label = 'Loading records', cards = 4, rows = 6 }) {
  return (
    <section className='srms-page-skeleton' role='status' aria-live='polite' aria-label={label}>
      <span className='sr-only'>{label}</span>
      <div className='srms-page-skeleton__heading' aria-hidden='true'>
        <Skeleton width='min(260px, 68%)' height={28}/>
        <Skeleton width='min(390px, 88%)' height={12}/>
      </div>
      {cards > 0 && (
        <div className='srms-page-skeleton__cards' aria-hidden='true'>
          {Array.from({ length: cards }, (_, index) => (
            <div className='srms-page-skeleton__card' key={index}>
              <Skeleton width='52%' height={10}/>
              <Skeleton width='68%' height={27}/>
              <Skeleton width='42%' height={10}/>
            </div>
          ))}
        </div>
      )}
      <div className='srms-page-skeleton__ledger' aria-hidden='true'>
        <div className='srms-page-skeleton__filters'>
          <Skeleton width='42%' height={40}/>
          <Skeleton width='24%' height={40}/>
          <Skeleton width='24%' height={40}/>
        </div>
        <div className='daybook-table-wrap'>
          <table className='daybook-table'><tbody><SkeletonRows count={rows} cols={5}/></tbody></table>
        </div>
      </div>
    </section>
  )
}
