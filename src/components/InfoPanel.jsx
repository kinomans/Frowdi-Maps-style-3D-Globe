import { X } from 'lucide-react'

export default function InfoPanel({ info, onClose }) {
  if (!info) return null
  return (
    <div className="info-panel" style={{ left: info.x + 16, top: info.y }}>
      <button className="info-panel__close" onClick={onClose} aria-label="Закрыть">
        <X size={16} />
      </button>
      <h2>{info.title}</h2>
      {info.rows.length > 0 && (
        <dl>
          {info.rows.map(([label, value]) => (
            <div key={label} className="info-panel__row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {info.actions && (
        <div className="info-panel__actions">
          {info.actions.map((action) => (
            <button key={action.label} className="info-panel__action" onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
