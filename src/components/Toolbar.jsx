import { Satellite, Map, Globe, Square, Route, Ruler, MapPin, Search, Star, Link } from 'lucide-react'

function Btn({ active, onClick, title, icon: Icon, children }) {
  return (
    <button className={'toolbar__btn' + (active ? ' toolbar__btn--active' : '')} onClick={onClick} title={title}>
      <Icon size={16} strokeWidth={2} />
      <span>{children}</span>
    </button>
  )
}

/** variant="sheet" is used inside <MobileMenu>, where CSS restores the full labeled layout. */
export default function Toolbar({ state, actions, variant = 'default' }) {
  return (
    <div className={'toolbar' + (variant === 'sheet' ? ' toolbar--sheet' : '')}>
      <div className="toolbar__group">
        <div className="toolbar__label">Стиль карты</div>
        <Btn active={state.layer === 'satellite'} onClick={() => actions.setLayer('satellite')} title="Спутник" icon={Satellite}>
          Спутник
        </Btn>
        <Btn active={state.layer === 'scheme'} onClick={() => actions.setLayer('scheme')} title="Схема" icon={Map}>
          Схема
        </Btn>
      </div>

      <div className="toolbar__group">
        <div className="toolbar__label">Вид</div>
        <Btn active={!state.is2D} onClick={() => actions.setViewMode('3d')} title="Объёмный глобус" icon={Globe}>
          Глобус
        </Btn>
        <Btn active={state.is2D} onClick={() => actions.setViewMode('2d')} title="Плоская карта" icon={Square}>
          Плоская карта
        </Btn>
      </div>

      <div className="toolbar__group">
        <Btn active={state.routeMode} onClick={actions.toggleRouteMode} title="Построить маршрут" icon={Route}>
          Маршрут
        </Btn>
      </div>

      <div className="toolbar__group">
        <Btn active={state.measureMode} onClick={actions.toggleMeasureMode} title="Линейка расстояний" icon={Ruler}>
          Линейка
        </Btn>
        <Btn active={state.pinMode} onClick={actions.togglePinMode} title="Поставить метку" icon={MapPin}>
          Метка
        </Btn>
        <Btn active={state.poiMode} onClick={actions.togglePoiMode} title="Найти рядом" icon={Search}>
          Рядом
        </Btn>
      </div>

      <div className="toolbar__group">
        <Btn active={state.bookmarksOpen} onClick={actions.toggleBookmarks} title="Избранное" icon={Star}>
          Избранное
        </Btn>
        <Btn onClick={actions.copyLink} title="Скопировать ссылку на вид" icon={Link}>
          Ссылка
        </Btn>
      </div>
    </div>
  )
}
