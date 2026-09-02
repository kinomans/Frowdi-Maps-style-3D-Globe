// Public Overpass API instance — free, no API key, but rate-limited and asks for
// light/considerate use (no bulk scraping). Fine for a study project's "nearby" search.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// amenity/shop/highway tag value -> label/icon/marker color shown on the pin and popup.
export const POI_CATEGORIES = {
  cafe: { label: 'Кафе', icon: '☕', color: '#C97A44' },
  restaurant: { label: 'Ресторан', icon: '🍽️', color: '#C97A44' },
  fast_food: { label: 'Фастфуд', icon: '🍔', color: '#C97A44' },
  pharmacy: { label: 'Аптека', icon: '💊', color: '#34C759' },
  bank: { label: 'Банк', icon: '🏦', color: '#5E5CE6' },
  atm: { label: 'Банкомат', icon: '🏧', color: '#5E5CE6' },
  fuel: { label: 'АЗС', icon: '⛽', color: '#FF9F0A' },
  hospital: { label: 'Больница', icon: '🏥', color: '#FF3B30' },
  supermarket: { label: 'Супермаркет', icon: '🛒', color: '#FF9F0A' },
  bus_stop: { label: 'Автобусная остановка', icon: '🚌', color: '#0A84FF' },
}

const AMENITY_VALUES = ['cafe', 'restaurant', 'fast_food', 'pharmacy', 'bank', 'atm', 'fuel', 'hospital']

function buildQuery(lon, lat, radius) {
  const around = `around:${radius},${lat},${lon}`
  return `
    [out:json][timeout:25];
    (
      node["amenity"~"^(${AMENITY_VALUES.join('|')})$"](${around});
      node["shop"="supermarket"](${around});
      node["highway"="bus_stop"](${around});
    );
    out body;
  `
}

function categoryOf(tags) {
  return tags.amenity || tags.shop || (tags.highway === 'bus_stop' ? 'bus_stop' : null)
}

/**
 * @returns {Promise<Array<{id:number, lon:number, lat:number, name:string, category:string, tags:object}>>}
 */
export async function fetchNearbyPOIs(lon, lat, radius = 800) {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(buildQuery(lon, lat, radius)),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)

  const data = await res.json()
  return (data.elements || [])
    .filter((el) => el.type === 'node' && el.tags)
    .map((el) => ({
      id: el.id,
      lon: el.lon,
      lat: el.lat,
      name: el.tags.name || POI_CATEGORIES[categoryOf(el.tags)]?.label || 'Без названия',
      category: categoryOf(el.tags),
      tags: el.tags,
    }))
    .filter((poi) => poi.category)
}
