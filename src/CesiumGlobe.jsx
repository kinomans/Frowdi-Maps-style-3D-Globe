import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { Ruler, X } from 'lucide-react'

import { setBaseLayer as applyBaseLayer } from './lib/imagery'
import { fetchRoute } from './lib/osrm'
import { fetchNearbyPOIs, POI_CATEGORIES } from './lib/overpass'
import { getCurrentPosition } from './lib/geolocation'
import { getBookmarks, addBookmark, removeBookmark } from './lib/bookmarks'
import { readViewFromUrl, writeViewToUrl } from './lib/viewState'
import { geodesicInfo } from './lib/geodesic'
import { formatDistance } from './lib/format'
import { addMarker, addPin, addLine, addLabel, addLocationDot, removeEntities } from './lib/entities'
import { createGeocoderService, searchPlaces } from './lib/geocoder'

import InfoPanel from './components/InfoPanel'
import Toolbar from './components/Toolbar'
import CompassZoom from './components/CompassZoom'
import BookmarksPanel from './components/BookmarksPanel'
import ModeHint from './components/ModeHint'
import PinLabelForm from './components/PinLabelForm'
import RouteSummary from './components/RouteSummary'
import SearchBox from './components/SearchBox'
import MobileQuickActions from './components/MobileQuickActions'
import MobileMenu from './components/MobileMenu'

// Use your own free token from https://ion.cesium.com/tokens for production use
// (removes the "using Cesium's default access token" warning and its shared rate limit).
// Falls back to Cesium's shared demo token, which is fine for local development.
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN || Cesium.Ion.defaultAccessToken

// Cesium OSM Buildings tags each feature with OpenStreetMap keys, some prefixed with
// "part#" (when the picked triangle belongs to one roof/wall part of a multi-part building)
// and some Cesium-computed ones prefixed with "cesium#". A feature rarely has all of them,
// so each row tries a few plausible keys in priority order and is only shown if one matches.
const LABELED_PROPERTIES = [
  ['Название', ['name', 'part#name']],
  ['Дом №', ['addr:housenumber', 'part#addr:housenumber']],
  ['Улица', ['addr:street', 'part#addr:street']],
  ['Тип здания', ['building', 'part#building', 'type']],
  ['Категория', ['amenity', 'part#amenity', 'shop', 'tourism']],
  ['Высота (м)', ['height', 'part#height', 'cesium#estimatedHeight']],
  ['Этажей', ['building:levels', 'part#building:levels']],
  ['Материал крыши', ['roof:material', 'part#roof:material']],
]

const HINT_TEXT = {
  'route-start': 'Кликните начальную точку маршрута',
  'route-end': 'Кликните конечную точку маршрута',
  'measure-a': 'Кликните первую точку для измерения',
  'measure-b': 'Кликните вторую точку',
  pin: 'Кликните на карту, чтобы поставить метку',
  poi: 'Кликните точку, рядом с которой искать',
}

/** Reads every property off a picked Cesium3DTileFeature into a plain object. */
function readFeatureProperties(feature) {
  const props = {}
  for (const id of feature.getPropertyIds()) {
    props[id] = feature.getProperty(id)
  }
  return props
}

/** Turns a building feature's raw OSM-tag soup into a short title + row list. */
function describeFeature(props) {
  const rows = []
  for (const [label, keys] of LABELED_PROPERTIES) {
    const key = keys.find((k) => props[k] != null && props[k] !== '')
    if (key) rows.push([label, props[key]])
  }
  const title = props.name || props['part#name'] || 'Здание'
  if (rows.length === 0) {
    rows.push(['OSM element', props.elementId ?? props['part#elementId'] ?? '—'])
  }
  return { title, rows }
}

/** Turns a fetched POI into a title + row list for the info popup. */
function describePoi(poi) {
  const cat = POI_CATEGORIES[poi.category]
  const rows = []
  if (poi.tags['addr:street']) rows.push(['Улица', poi.tags['addr:street']])
  if (poi.tags['addr:housenumber']) rows.push(['Дом №', poi.tags['addr:housenumber']])
  if (poi.tags.opening_hours) rows.push(['Часы работы', poi.tags.opening_hours])
  if (poi.tags.phone) rows.push(['Телефон', poi.tags.phone])
  rows.push(['Категория', cat?.label ?? poi.category])
  return { title: `${cat?.icon ?? ''} ${poi.name}`.trim(), rows }
}

export default function CesiumGlobe() {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)

  const [info, setInfo] = useState(null) // { x, y, title, rows, actions? } | null
  const [toast, setToast] = useState(null)
  const [mode, setMode] = useState('default')
  const modeRef = useRef('default')
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  const [layer, setLayer] = useState('satellite')
  const [is2D, setIs2D] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [route, setRoute] = useState(null) // { distance, duration } | null
  const routeStartRef = useRef(null)
  const routeEntitiesRef = useRef({})

  const [measurement, setMeasurement] = useState(null) // { distance } | null
  const measureARef = useRef(null)
  const measureEntitiesRef = useRef({})

  const poiEntitiesRef = useRef([])
  const poiListRef = useRef([])

  const [pinForm, setPinForm] = useState(null) // { x, y, lon, lat } | null
  const [bookmarks, setBookmarks] = useState(() => getBookmarks())
  const bookmarksRef = useRef(bookmarks)
  useEffect(() => {
    bookmarksRef.current = bookmarks
  }, [bookmarks])
  const bookmarkEntitiesRef = useRef(new Map())
  const [bookmarksOpen, setBookmarksOpen] = useState(false)

  const locationEntitiesRef = useRef([])
  const geocoderServiceRef = useRef(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  // --- Route (OSRM) ------------------------------------------------------
  function clearRoute() {
    const viewer = viewerRef.current
    if (viewer) removeEntities(viewer, Object.values(routeEntitiesRef.current))
    routeEntitiesRef.current = {}
    routeStartRef.current = null
    setRoute(null)
  }

  async function runRoute(start, end) {
    const viewer = viewerRef.current
    try {
      const { coordinates, distance, duration } = await fetchRoute(start, end)
      if (!viewerRef.current) return // unmounted mid-fetch
      const flat = coordinates.flatMap(([lon, lat]) => [lon, lat])
      routeEntitiesRef.current.line = addLine(viewer, Cesium.Cartesian3.fromDegreesArray(flat), { color: '#0A84FF', width: 5 })
      setRoute({ distance, duration })
    } catch (err) {
      console.error('OSRM routing failed:', err)
      setInfo({ x: 80, y: 80, title: 'Не удалось построить маршрут', rows: [['Причина', err.message]] })
    }
  }

  // --- Measuring ruler -----------------------------------------------------
  function clearMeasurement() {
    const viewer = viewerRef.current
    if (viewer) removeEntities(viewer, Object.values(measureEntitiesRef.current))
    measureEntitiesRef.current = {}
    measureARef.current = null
    setMeasurement(null)
  }

  // --- Nearby POIs (Overpass) ----------------------------------------------
  function clearPoi() {
    const viewer = viewerRef.current
    if (viewer) removeEntities(viewer, poiEntitiesRef.current)
    poiEntitiesRef.current = []
    poiListRef.current = []
  }

  async function runPoiSearch(lon, lat) {
    const viewer = viewerRef.current
    clearPoi()
    try {
      const pois = await fetchNearbyPOIs(lon, lat, 800)
      if (!viewerRef.current) return
      poiListRef.current = pois
      poiEntitiesRef.current = pois.map((poi) =>
        addMarker(viewer, poi.lon, poi.lat, POI_CATEGORIES[poi.category]?.color ?? '#8E8E93', { kind: 'poi', poiId: poi.id })
      )
      if (pois.length === 0) {
        setInfo({ x: 80, y: 80, title: 'Ничего не найдено', rows: [['Радиус поиска', '800 м']] })
      }
    } catch (err) {
      console.error('Overpass search failed:', err)
      setInfo({ x: 80, y: 80, title: 'Ошибка поиска', rows: [['Причина', err.message]] })
    }
  }

  // --- Bookmarks -------------------------------------------------------------
  function removeBookmarkAction(id) {
    const viewer = viewerRef.current
    removeBookmark(id)
    const entity = bookmarkEntitiesRef.current.get(id)
    if (viewer && entity) viewer.entities.remove(entity)
    bookmarkEntitiesRef.current.delete(id)
    setBookmarks(getBookmarks())
    setInfo(null)
  }

  function savePin(label) {
    const viewer = viewerRef.current
    if (!viewer || !pinForm) return
    const bookmark = addBookmark({ lon: pinForm.lon, lat: pinForm.lat, label })
    const entity = addPin(viewer, pinForm.lon, pinForm.lat, {
      color: '#FFD60A',
      label: bookmark.label,
      properties: { kind: 'bookmark', bookmarkId: bookmark.id },
    })
    bookmarkEntitiesRef.current.set(bookmark.id, entity)
    setBookmarks(getBookmarks())
    setPinForm(null)
  }

  function flyToBookmark(b) {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(b.lon, b.lat, 800) })
    setBookmarksOpen(false)
  }

  // --- Shared click dispatcher: registered once, reads modeRef so it never goes stale ---
  function pickGround(position) {
    const viewer = viewerRef.current
    if (!viewer) return null
    const cartesian = viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid)
    if (!Cesium.defined(cartesian)) return null
    // fromCartesian returns undefined (not just falls through) if the point maps to the
    // ellipsoid's center — an edge case that turns up when picking during/around the 2D
    // scene-mode morph.
    const carto = Cesium.Cartographic.fromCartesian(cartesian)
    if (!Cesium.defined(carto)) return null
    return { lon: Cesium.Math.toDegrees(carto.longitude), lat: Cesium.Math.toDegrees(carto.latitude) }
  }

  function handleMapClick(click) {
    const viewer = viewerRef.current
    if (!viewer) return
    const currentMode = modeRef.current

    if (currentMode === 'route-start') {
      const point = pickGround(click.position)
      if (!point) return
      clearRoute()
      routeStartRef.current = point
      routeEntitiesRef.current.start = addMarker(viewer, point.lon, point.lat, '#34C759')
      setMode('route-end')
      return
    }
    if (currentMode === 'route-end') {
      const point = pickGround(click.position)
      if (!point) return
      routeEntitiesRef.current.end = addMarker(viewer, point.lon, point.lat, '#FF3B30')
      setMode('default')
      runRoute(routeStartRef.current, point)
      return
    }
    if (currentMode === 'measure-a') {
      const point = pickGround(click.position)
      if (!point) return
      clearMeasurement()
      measureARef.current = point
      measureEntitiesRef.current.a = addMarker(viewer, point.lon, point.lat, '#FFD60A')
      setMode('measure-b')
      return
    }
    if (currentMode === 'measure-b') {
      const point = pickGround(click.position)
      if (!point) return
      measureEntitiesRef.current.b = addMarker(viewer, point.lon, point.lat, '#FFD60A')
      const a = measureARef.current
      const { distance, midpoint } = geodesicInfo(a, point)
      measureEntitiesRef.current.line = addLine(viewer, Cesium.Cartesian3.fromDegreesArray([a.lon, a.lat, point.lon, point.lat]), {
        color: '#FFD60A',
        dashed: true,
        width: 3,
      })
      measureEntitiesRef.current.label = addLabel(viewer, midpoint.lon, midpoint.lat, formatDistance(distance))
      setMeasurement({ distance })
      setMode('default')
      return
    }
    if (currentMode === 'pin') {
      const point = pickGround(click.position)
      if (!point) return
      setPinForm({ x: click.position.x, y: click.position.y, lon: point.lon, lat: point.lat })
      setMode('default')
      return
    }
    if (currentMode === 'poi') {
      const point = pickGround(click.position)
      if (!point) return
      setMode('default')
      runPoiSearch(point.lon, point.lat)
      return
    }

    // Default mode: inspect whatever is under the cursor.
    const picked = viewer.scene.pick(click.position)

    if (Cesium.defined(picked) && typeof picked.getPropertyIds === 'function') {
      // A 3D-tile feature: a building.
      const props = readFeatureProperties(picked)
      const { title, rows } = describeFeature(props)
      setInfo({ x: click.position.x, y: click.position.y, title, rows })
      return
    }

    if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity && picked.id.properties) {
      const kind = picked.id.properties.kind?.getValue()
      if (kind === 'bookmark') {
        const id = picked.id.properties.bookmarkId.getValue()
        const bookmark = bookmarksRef.current.find((b) => b.id === id)
        if (bookmark) {
          setInfo({
            x: click.position.x,
            y: click.position.y,
            title: bookmark.label,
            rows: [
              ['Широта', bookmark.lat.toFixed(5)],
              ['Долгота', bookmark.lon.toFixed(5)],
            ],
            actions: [{ label: 'Удалить', onClick: () => removeBookmarkAction(bookmark.id) }],
          })
          return
        }
      }
      if (kind === 'poi') {
        const id = picked.id.properties.poiId.getValue()
        const poi = poiListRef.current.find((p) => p.id === id)
        if (poi) {
          setInfo({ x: click.position.x, y: click.position.y, ...describePoi(poi) })
          return
        }
      }
    }

    // Otherwise, if the click hit the globe itself, show its coordinates.
    const point = pickGround(click.position)
    if (point) {
      setInfo({
        x: click.position.x,
        y: click.position.y,
        title: 'Точка на карте',
        rows: [
          ['Широта', point.lat.toFixed(5)],
          ['Долгота', point.lon.toFixed(5)],
        ],
      })
      return
    }

    setInfo(null)
  }

  useEffect(() => {
    let cancelled = false
    const urlView = readViewFromUrl()

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayer: false,
      baseLayerPicker: false,
      // Our own <SearchBox> replaces Cesium's built-in geocoder widget (below), so its
      // fixed toolbar-anchored search box isn't needed.
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      selectionIndicator: false,
      infoBox: false,
      shouldAnimate: true,
      // Let the WebGL canvas clear to transparent instead of opaque black, so the
      // #stars-bg canvas behind it shows through wherever Cesium draws nothing.
      contextOptions: { webgl: { alpha: true } },
    })
    viewerRef.current = viewer
    if (import.meta.env.DEV) {
      window.__cesiumViewer = viewer
      window.__Cesium = Cesium
    }

    // Replace Cesium's own starfield with the #stars-bg canvas behind it.
    viewer.scene.skyBox.show = false
    viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT.clone()

    // Same Bing-via-ion geocoding the old built-in widget used, driven by our own <SearchBox>.
    geocoderServiceRef.current = createGeocoderService(viewer)

    // Viewer wires up its own left-click/double-click entity picking unconditionally
    // (it drives `selectedEntity`/`trackedEntity`), even with selectionIndicator/infoBox
    // off — it's just not shown. We have our own click handler below and never use those
    // properties, and Cesium's own picker throws ("Ray intersections are only supported
    // in 3D mode") the moment you click anything after morphing to 2D. Remove it outright.
    viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)

    // Deliberately NOT using a real terrain provider (createWorldTerrainAsync): with elevation
    // data enabled, fast zooming can push the camera below the terrain mesh in areas with
    // coarse height data (e.g. open ocean) before finer tiles finish loading, which clips the
    // globe out of view entirely. A smooth ellipsoid avoids that failure mode, and it's all we
    // need — the imagery layer's own tile pyramid is what gives us the "zoom to street level"
    // effect, and OSM Buildings below don't depend on terrain to render or to be clickable.
    viewer.scene.globe.depthTestAgainstTerrain = false
    viewer.scene.globe.enableLighting = false

    // Keep the camera from zooming past the surface, and cap how far out it can go.
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 4 * 6378137 // ~4 Earth radii

    // --- Base imagery: Esri World Imagery (satellite) by default ---
    applyBaseLayer(viewer, 'satellite').catch((err) => console.error('Failed to load imagery:', err))

    // --- Clickable 3D buildings (needs an Ion token; app still works without it) ---
    Cesium.createOsmBuildingsAsync()
      .then((tileset) => {
        if (cancelled) return
        viewer.scene.primitives.add(tileset)
      })
      .catch((err) => console.warn('OSM Buildings unavailable:', err))

    // --- Restore bookmark pins saved from a previous visit ---
    for (const b of getBookmarks()) {
      const entity = addPin(viewer, b.lon, b.lat, { color: '#FFD60A', label: b.label, properties: { kind: 'bookmark', bookmarkId: b.id } })
      bookmarkEntitiesRef.current.set(b.id, entity)
    }

    // --- Initial camera: restore from the URL if it encodes one, else the whole Earth ---
    if (urlView) {
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(urlView.lon, urlView.lat, urlView.height),
        orientation: {
          heading: Cesium.Math.toRadians(urlView.heading),
          pitch: Cesium.Math.toRadians(urlView.pitch),
          roll: 0,
        },
      })
    } else {
      viewer.camera.flyHome(0)
    }

    // --- Keep the URL in sync with the camera, so the current view can be shared as a link ---
    // camera.heading/pitch are briefly undefined while scene.mode === MORPHING (2D/3D toggle),
    // so guard both — writing NaN into the URL, or crashing Cesium's toDegrees, otherwise.
    const removeMoveEnd = viewer.camera.moveEnd.addEventListener(() => {
      if (!Cesium.defined(viewer.camera.heading)) return
      const carto = viewer.camera.positionCartographic
      writeViewToUrl({
        lat: Cesium.Math.toDegrees(carto.latitude),
        lon: Cesium.Math.toDegrees(carto.longitude),
        height: carto.height,
        heading: Cesium.Math.toDegrees(viewer.camera.heading),
        pitch: Cesium.Math.toDegrees(viewer.camera.pitch),
      })
    })

    // --- Keep the 2D map on-screen: Cesium's own 2D camera controller doesn't clamp
    // panning or zooming to the map's actual extent, so both dragging past a pole and
    // zooming out past "the whole world fits" reveal empty space beyond its edges.
    // maxCoord is the map's half-extent in projected map units (~20,038km x, ~10,019km y
    // for the default geographic projection) — computed once since it never changes.
    const maxCoord2D = viewer.scene.mapProjection.project(new Cesium.Cartographic(Math.PI, Cesium.Math.PI_OVER_TWO))
    const removePostRenderConstrain2D = viewer.scene.postRender.addEventListener(() => {
      if (viewer.scene.mode !== Cesium.SceneMode.SCENE2D) return
      const camera = viewer.camera
      const frustum = camera.frustum

      // Never let the visible area exceed the map's real extent (caps zoom-out).
      const halfWidth = (frustum.right - frustum.left) / 2
      const halfHeight = (frustum.top - frustum.bottom) / 2
      const scale = Math.min(maxCoord2D.x / halfWidth, maxCoord2D.y / halfHeight, 1)
      if (scale < 1) {
        frustum.left *= scale
        frustum.right *= scale
        frustum.top *= scale
        frustum.bottom *= scale
      }

      // Never let panning push the view above the north pole or below the south pole.
      // Horizontal panning is left free — INFINITE_SCROLL wraps it seamlessly.
      const clampedHalfHeight = Math.min(halfHeight, maxCoord2D.y)
      const maxY = maxCoord2D.y - clampedHalfHeight
      camera.position.y = Cesium.Math.clamp(camera.position.y, -maxY, maxY)
    })

    // --- Click-to-inspect / picking for every mode above ---
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction(handleMapClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    return () => {
      cancelled = true
      handler.destroy()
      removeMoveEnd()
      removePostRenderConstrain2D()
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  // Esc cancels whatever multi-click mode is in progress.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      const m = modeRef.current
      if (m === 'route-start' || m === 'route-end') clearRoute()
      if (m === 'measure-a' || m === 'measure-b') clearMeasurement()
      setMode('default')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // --- Toolbar actions (fresh each render, safe to read `mode`/`layer`/etc. directly) ---
  function toggleRouteMode() {
    const active = mode === 'route-start' || mode === 'route-end'
    clearRoute()
    setMode(active ? 'default' : 'route-start')
  }

  function toggleMeasureMode() {
    const active = mode === 'measure-a' || mode === 'measure-b'
    clearMeasurement()
    setMode(active ? 'default' : 'measure-a')
  }

  function togglePinMode() {
    setMode(mode === 'pin' ? 'default' : 'pin')
  }

  function togglePoiMode() {
    setMode(mode === 'poi' ? 'default' : 'poi')
  }

  function setViewMode(mode) {
    const viewer = viewerRef.current
    if (!viewer) return
    if (mode === '2d') viewer.scene.morphTo2D(1.0)
    else viewer.scene.morphTo3D(1.0)
    setIs2D(mode === '2d')
  }

  function handleSetLayer(kind) {
    const viewer = viewerRef.current
    if (!viewer) return
    applyBaseLayer(viewer, kind).catch((err) => console.error('Failed to switch layer:', err))
    setLayer(kind)
  }

  async function locateMe() {
    const viewer = viewerRef.current
    if (!viewer) return
    try {
      const { lon, lat, accuracy } = await getCurrentPosition()
      if (!viewerRef.current) return // unmounted while waiting on the geolocation prompt
      removeEntities(viewer, locationEntitiesRef.current)
      locationEntitiesRef.current = addLocationDot(viewer, lon, lat, accuracy)
      viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1500) })
    } catch (err) {
      console.error('Geolocation failed:', err)
      setInfo({
        x: 80,
        y: 80,
        title: 'Не удалось определить местоположение',
        rows: [['Причина', err.message || 'Доступ запрещён']],
      })
    }
  }

  function handleSearch(query) {
    return searchPlaces(geocoderServiceRef.current, query)
  }

  function handleSearchSelect(destination) {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.camera.flyTo({ destination })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setToast('Ссылка на текущий вид скопирована')
    } catch (err) {
      console.error('Clipboard write failed:', err)
      setToast('Не удалось скопировать ссылку')
    }
  }

  function zoomBy(direction) {
    const viewer = viewerRef.current
    if (!viewer) return
    const height = viewer.camera.positionCartographic.height
    if (direction > 0) viewer.camera.zoomIn(height * 0.5)
    else viewer.camera.zoomOut(height)
  }

  function toggleLayerMobile() {
    handleSetLayer(layer === 'satellite' ? 'scheme' : 'satellite')
  }

  const toolbarState = {
    layer,
    is2D,
    routeMode: mode === 'route-start' || mode === 'route-end',
    measureMode: mode === 'measure-a' || mode === 'measure-b',
    pinMode: mode === 'pin',
    poiMode: mode === 'poi',
    bookmarksOpen,
  }
  const toolbarActions = {
    setLayer: handleSetLayer,
    setViewMode,
    toggleRouteMode,
    toggleMeasureMode,
    togglePinMode,
    togglePoiMode,
    toggleBookmarks: () => setBookmarksOpen((v) => !v),
    copyLink,
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div className="mobile-dock">
        <SearchBox onSearch={handleSearch} onSelect={handleSearchSelect} />

        <Toolbar state={toolbarState} actions={toolbarActions} />

        <CompassZoom onZoomIn={() => zoomBy(1)} onZoomOut={() => zoomBy(-1)} onLocateMe={locateMe} />

        <MobileQuickActions onOpenMenu={() => setMobileMenuOpen(true)} onToggleLayer={toggleLayerMobile} onLocateMe={locateMe} />
      </div>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} toolbarState={toolbarState} toolbarActions={toolbarActions} />

      <ModeHint
        text={HINT_TEXT[mode]}
        onCancel={() => {
          if (mode === 'route-start' || mode === 'route-end') clearRoute()
          if (mode === 'measure-a' || mode === 'measure-b') clearMeasurement()
          setMode('default')
        }}
      />

      {route && <RouteSummary distance={route.distance} duration={route.duration} onClear={clearRoute} />}
      {measurement && (
        <div className="route-summary" style={{ top: route ? '3.6rem' : '1rem' }}>
          <Ruler size={16} />
          <span>{formatDistance(measurement.distance)}</span>
          <button onClick={clearMeasurement} aria-label="Убрать линейку">
            <X size={16} />
          </button>
        </div>
      )}

      {bookmarksOpen && (
        <BookmarksPanel bookmarks={bookmarks} onFlyTo={flyToBookmark} onRemove={removeBookmarkAction} onClose={() => setBookmarksOpen(false)} />
      )}

      {pinForm && <PinLabelForm x={pinForm.x} y={pinForm.y} onSave={savePin} onCancel={() => setPinForm(null)} />}

      <InfoPanel info={info} onClose={() => setInfo(null)} />

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
