import { Route, X } from 'lucide-react'
import { formatDistance, formatDuration } from '../lib/format'

export default function RouteSummary({ distance, duration, onClear }) {
  return (
    <div className="route-summary">
      <Route size={16} />
      <span>
        {formatDistance(distance)} · {formatDuration(duration)}
      </span>
      <button onClick={onClear} aria-label="Убрать маршрут">
        <X size={16} />
      </button>
    </div>
  )
}
