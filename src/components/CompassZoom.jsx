import { LocateFixed, Plus, Minus } from 'lucide-react'

export default function CompassZoom({ onZoomIn, onZoomOut, onLocateMe }) {
  return (
    <div className="compass-zoom">
      <button className="compass-zoom__locate" onClick={onLocateMe} title="Моё местоположение" aria-label="Моё местоположение">
        <LocateFixed size={18} strokeWidth={2.25} />
      </button>
      <div className="compass-zoom__zoom">
        <button onClick={onZoomIn} title="Приблизить" aria-label="Приблизить">
          <Plus size={16} strokeWidth={2.5} />
        </button>
        <button onClick={onZoomOut} title="Отдалить" aria-label="Отдалить">
          <Minus size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
