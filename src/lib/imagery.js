import * as Cesium from 'cesium'

// Classic public Esri World Imagery REST endpoint — free, no API key required.
const ESRI_WORLD_IMAGERY_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'

// Esri's transparent country/ocean/place-name overlay, explicitly designed to sit on top of
// World Imagery — this is what turns a bare satellite photo into "Apple Maps hybrid" style
// with country borders and labels. Same free/keyless domain as the imagery above.
const ESRI_LABELS_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer'

let satellitePromise = null
let labelsPromise = null
let schemePromise = null

/** Retries a flaky async factory a few times with backoff — a slow/dropped first
 * request to a public tile service shouldn't leave the globe stuck on its bare
 * default-blue base color for the rest of the session. */
async function withRetry(factory, { attempts = 3, baseDelayMs = 1000 } = {}) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      return await factory()
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** i))
    }
  }
  throw lastErr
}

function getSatelliteProvider() {
  if (!satellitePromise) {
    satellitePromise = withRetry(() => Cesium.ArcGisMapServerImageryProvider.fromUrl(ESRI_WORLD_IMAGERY_URL)).catch((err) => {
      satellitePromise = null // don't cache a failure forever — let the next attempt start fresh
      throw err
    })
  }
  return satellitePromise
}

function getLabelsProvider() {
  if (!labelsPromise) {
    labelsPromise = withRetry(() => Cesium.ArcGisMapServerImageryProvider.fromUrl(ESRI_LABELS_URL)).catch((err) => {
      labelsPromise = null
      throw err
    })
  }
  return labelsPromise
}

function getSchemeProvider() {
  if (!schemePromise) {
    schemePromise = withRetry(
      () =>
        new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
          credit: '© OpenStreetMap contributors',
        })
    ).catch((err) => {
      schemePromise = null
      throw err
    })
  }
  return schemePromise
}

/**
 * Swaps the viewer's base imagery for the requested kind, keeping providers cached across
 * calls so switching back and forth doesn't re-fetch metadata. "satellite" stacks Esri's
 * country/ocean/place-name overlay on top of the raw photo — a bare satellite photo has no
 * labels at all, so without it there'd be no way to tell where anything is.
 * @param {Cesium.Viewer} viewer
 * @param {'satellite'|'scheme'} kind
 */
export async function setBaseLayer(viewer, kind) {
  if (kind === 'scheme') {
    // OSM's own map tiles already bake in labels/borders, so no overlay is needed here.
    const provider = await getSchemeProvider()
    if (viewer.isDestroyed()) return
    viewer.imageryLayers.removeAll(false)
    viewer.imageryLayers.addImageryProvider(provider)
    return
  }

  // The labels overlay is a nice-to-have on top of the satellite photo, not the main event —
  // if it fails even after retrying, show the imagery on its own rather than a blank/blue
  // globe over one flaky secondary request.
  const [satellite, labels] = await Promise.all([
    getSatelliteProvider(),
    getLabelsProvider().catch((err) => {
      console.warn('Labels overlay unavailable, showing imagery without it:', err)
      return null
    }),
  ])
  // The viewer can be destroyed while this fetch was in flight (React StrictMode's
  // double-mount in dev, or a fast unmount) — touching it after that throws.
  if (viewer.isDestroyed()) return
  viewer.imageryLayers.removeAll(false)
  viewer.imageryLayers.addImageryProvider(satellite)
  if (labels) viewer.imageryLayers.addImageryProvider(labels)
}
