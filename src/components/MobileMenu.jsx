import { X } from 'lucide-react'
import Toolbar from './Toolbar'

/** Bottom sheet opened by the mobile hamburger button — the full toolbar, reused as-is. */
export default function MobileMenu({ open, onClose, toolbarState, toolbarActions }) {
  if (!open) return null
  return (
    <div className="mobile-menu-backdrop" onClick={onClose}>
      <div className="mobile-menu-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-menu-sheet__header">
          <h2>Меню</h2>
          <button onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <Toolbar state={toolbarState} actions={toolbarActions} variant="sheet" />
      </div>
    </div>
  )
}
