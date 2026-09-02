export default function ModeHint({ text, onCancel }) {
  if (!text) return null
  return (
    <div className="mode-hint">
      <span>{text}</span>
      <button onClick={onCancel} aria-label="Отменить">
        Отмена (Esc)
      </button>
    </div>
  )
}
