import { Menu, Map, LocateFixed } from 'lucide-react'

/** The compact mobile cluster: a hamburger for everything else, plus the two most
 * common actions (map style, locate me) as a joined pill — mirrors Apple/Google Maps. */
export default function MobileQuickActions({ onOpenMenu, onToggleLayer, onLocateMe }) {
  return (
    <div className="mobile-quick">
      <button className="mobile-quick__menu" onClick={onOpenMenu} title="Меню" aria-label="Меню">
        <Menu size={20} strokeWidth={2.25} />
      </button>
      <div className="mobile-quick__pill">
        <button onClick={onToggleLayer} title="Стиль карты" aria-label="Стиль карты">
          <Map size={18} strokeWidth={2.25} />
        </button>
        <button onClick={onLocateMe} title="Моё местоположение" aria-label="Моё местоположение">
          <LocateFixed size={18} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}
