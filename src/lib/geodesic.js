import * as Cesium from 'cesium'

/**
 * Great-circle surface distance (meters) and midpoint between two {lon, lat}
 * points (degrees), for the measuring-ruler tool.
 */
export function geodesicInfo(a, b) {
  const geodesic = new Cesium.EllipsoidGeodesic(Cesium.Cartographic.fromDegrees(a.lon, a.lat), Cesium.Cartographic.fromDegrees(b.lon, b.lat))
  const mid = geodesic.interpolateUsingFraction(0.5)
  return {
    distance: geodesic.surfaceDistance,
    midpoint: { lon: Cesium.Math.toDegrees(mid.longitude), lat: Cesium.Math.toDegrees(mid.latitude) },
  }
}
