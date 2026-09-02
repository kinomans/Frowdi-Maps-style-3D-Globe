import { X } from 'lucide-react'

export default function BookmarksPanel({ bookmarks, onFlyTo, onRemove, onClose }) {
  return (
    <div className="bookmarks-panel">
      <div className="bookmarks-panel__header">
        <h2>Избранное</h2>
        <button className="info-panel__close" onClick={onClose} aria-label="Закрыть">
          <X size={16} />
        </button>
      </div>
      {bookmarks.length === 0 ? (
        <p className="bookmarks-panel__empty">Пока пусто. Нажмите «Метка» на панели инструментов, затем кликните на карту, чтобы сохранить точку.</p>
      ) : (
        <ul>
          {bookmarks.map((b) => (
            <li key={b.id}>
              <button className="bookmarks-panel__item" onClick={() => onFlyTo(b)}>
                {b.label}
              </button>
              <button className="bookmarks-panel__remove" onClick={() => onRemove(b.id)} aria-label="Удалить">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
