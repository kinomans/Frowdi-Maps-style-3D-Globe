/**
 * Reads a camera view (lat/lon/height/heading/pitch) from the current URL's query
 * string, e.g. "?lat=55.7539&lon=37.6208&h=500&heading=0&pitch=-45". Returns null if
 * the essential params (lat/lon) aren't present.
 */
export function readViewFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const lat = parseFloat(params.get('lat'))
  const lon = parseFloat(params.get('lon'))
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const height = parseFloat(params.get('h'))
  const heading = parseFloat(params.get('heading'))
  const pitch = parseFloat(params.get('pitch'))
  return {
    lat,
    lon,
    height: Number.isFinite(height) ? height : 1_000_000,
    heading: Number.isFinite(heading) ? heading : 0,
    pitch: Number.isFinite(pitch) ? pitch : -90,
  }
}

/**
 * Mirrors a camera view into the URL query string without adding a history entry
 * or triggering navigation, so the current page can be copied/shared as a link
 * that reopens the same view.
 */
export function writeViewToUrl({ lat, lon, height, heading, pitch }) {
  const params = new URLSearchParams(window.location.search)
  params.set('lat', lat.toFixed(6))
  params.set('lon', lon.toFixed(6))
  params.set('h', Math.round(height).toString())
  params.set('heading', (Math.round(heading) % 360).toString())
  params.set('pitch', Math.round(pitch).toString())
  const newUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState(null, '', newUrl)
}
