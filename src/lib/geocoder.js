import * as Cesium from 'cesium'

/** Same Bing-backed-via-ion service the built-in Geocoder widget used, called directly. */
export function createGeocoderService(viewer) {
  return new Cesium.IonGeocoderService({ scene: viewer.scene })
}

/**
 * @returns {Promise<Array<{id:number, label:string, destination: Cesium.Cartesian3|Cesium.Rectangle}>>}
 */
export async function searchPlaces(service, query) {
  if (!query.trim()) return []
  const results = await service.geocode(query, Cesium.GeocodeType.AUTOCOMPLETE)
  return results.map((r, i) => ({ id: i, label: r.displayName, destination: r.destination }))
}
