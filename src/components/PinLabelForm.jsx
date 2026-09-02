import { useState } from 'react'
import { X } from 'lucide-react'

export default function PinLabelForm({ x, y, onSave, onCancel }) {
  const [label, setLabel] = useState('')

  function submit(e) {
    e.preventDefault()
    onSave(label.trim() || 'Без названия')
  }

  return (
    <div className="info-panel" style={{ left: x + 16, top: y }}>
      <button className="info-panel__close" onClick={onCancel} aria-label="Закрыть">
        <X size={16} />
      </button>
      <h2>Новая метка</h2>
      <form onSubmit={submit} className="pin-form">
        <input
          className="pin-form__input"
          type="text"
          placeholder="Название метки"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
        />
        <button className="info-panel__action" type="submit">
          Сохранить
        </button>
      </form>
    </div>
  )
}
