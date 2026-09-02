// Public OSRM demo server — free, no API key, but explicitly "not for production use"
// (rate-limited, best-effort uptime). Fine for a study project's routing feature.
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving'

/**
 * @param {{lon:number, lat:number}} start
 * @param {{lon:number, lat:number}} end
 * @returns {Promise<{coordinates:[number,number][], distance:number, duration:number}>}
 *   distance in meters, duration in seconds, coordinates as [lon,lat] pairs.
 */
export async function fetchRoute(start, end) {
  const coords = `${start.lon},${start.lat};${end.lon},${end.lat}`
  const url = `${OSRM_URL}/${coords}?overview=full&geometries=geojson`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)

  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(data.message || `OSRM: ${data.code}`)
  }

  const route = data.routes[0]
  return {
    coordinates: route.geometry.coordinates,
    distance: route.distance,
    duration: route.duration,
  }
}
