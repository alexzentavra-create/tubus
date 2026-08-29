const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_2ibp_1_607b6bfc187187d28662f0c3'
const keyParam = CARTO_KEY ? `?key=${CARTO_KEY}` : ''

export const CARTODB_DARK = {
  version: 8,
  sources: {
    "cartodb-dark-tiles": {
      type: "raster",
      tiles: [
        `https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png${keyParam}`,
        `https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png${keyParam}`,
        `https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png${keyParam}`,
        `https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png${keyParam}`
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © CartoDB"
    }
  },
  layers: [
    {
      id: "cartodb-dark-layer",
      type: "raster",
      source: "cartodb-dark-tiles",
      minzoom: 0,
      maxzoom: 20
    }
  ]
}

export const CARTODB_LIGHT = {
  version: 8,
  sources: {
    "cartodb-light-tiles": {
      type: "raster",
      tiles: [
        `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${keyParam}`,
        `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${keyParam}`,
        `https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${keyParam}`,
        `https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png${keyParam}`
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © CartoDB"
    }
  },
  layers: [
    {
      id: "cartodb-light-layer",
      type: "raster",
      source: "cartodb-light-tiles",
      minzoom: 0,
      maxzoom: 20
    }
  ]
}

export const CARTODB_POSITRON = {
  version: 8,
  sources: {
    "cartodb-positron-tiles": {
      type: "raster",
      tiles: [
        `https://a.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png${keyParam}`,
        `https://b.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png${keyParam}`,
        `https://c.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png${keyParam}`,
        `https://d.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png${keyParam}`
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © CartoDB"
    }
  },
  layers: [
    {
      id: "cartodb-positron-layer",
      type: "raster",
      source: "cartodb-positron-tiles",
      minzoom: 0,
      maxzoom: 20
    }
  ]
}
