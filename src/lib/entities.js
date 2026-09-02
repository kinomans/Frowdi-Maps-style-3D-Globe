import * as Cesium from 'cesium'

/**
 * A small colored dot marker with no label, e.g. for route endpoints, measurement
 * points, or POIs (where a permanent on-map label per point would clutter the view).
 */
export function addMarker(viewer, lon, lat, color, properties) {
  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    properties,
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString(color),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

/**
 * A pin-style marker with a text label underneath, for bookmarks and POIs.
 * `properties` is attached via Cesium's own Entity.properties bag so the shared
 * click handler can identify what was picked (e.g. { kind: 'bookmark', id }).
 */
export function addPin(viewer, lon, lat, { color, label, properties }) {
  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    properties,
    point: {
      pixelSize: 14,
      color: Cesium.Color.fromCssColorString(color),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: label,
      font: '13px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

/** A polyline between geodesic-interpolated positions, e.g. a route or a ruler line. */
export function addLine(viewer, positions, { color, dashed = false, width = 4 }) {
  return viewer.entities.add({
    polyline: {
      positions,
      width,
      material: dashed
        ? new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString(color) })
        : Cesium.Color.fromCssColorString(color),
      clampToGround: true,
    },
  })
}

/** The "blue dot" for the user's own location, with a translucent accuracy halo. */
export function addLocationDot(viewer, lon, lat, accuracyMeters) {
  const position = Cesium.Cartesian3.fromDegrees(lon, lat)
  const halo = viewer.entities.add({
    position,
    ellipse: {
      semiMinorAxis: Math.max(accuracyMeters, 20),
      semiMajorAxis: Math.max(accuracyMeters, 20),
      material: Cesium.Color.fromCssColorString('#4A90FF').withAlpha(0.18),
      outline: false,
      height: 0,
    },
  })
  const dot = viewer.entities.add({
    position,
    point: {
      pixelSize: 16,
      color: Cesium.Color.fromCssColorString('#4A90FF'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 3,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
  return [halo, dot]
}

/** A standalone text label, e.g. the distance readout on the measuring ruler. */
export function addLabel(viewer, lon, lat, text) {
  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat),
    label: {
      text,
      font: 'bold 14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -14),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })
}

export function removeEntities(viewer, entities) {
  for (const entity of entities) {
    if (entity) viewer.entities.remove(entity)
  }
}
