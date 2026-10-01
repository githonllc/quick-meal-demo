// Grey stand-in for a meal card while results load.
export function Skeleton() {
  return (
    <div className="meal-skel" aria-hidden="true">
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 14, width: '70%' }} />
      <div className="skeleton" style={{ height: 12, width: '50%' }} />
      <div className="skeleton" style={{ height: 12, width: '80%' }} />
    </div>
  )
}
