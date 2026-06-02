import fs from 'node:fs'
import readline from 'node:readline'

const TARGET_LINES = ['12', '28', '37', '39', '59', '60', '102', '152']
const GTFS_DIR = 'scratch/unzip_gtfs'
const OUT_FILE = 'src/lib/officialRoutes.ts'

function parseCsvLine(line) {
  const out = []
  let value = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && quoted && next === '"') {
      value += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      out.push(value)
      value = ''
    } else {
      value += char
    }
  }

  out.push(value)
  return out
}

function readCsv(path) {
  const lines = fs.readFileSync(path, 'utf8').trim().split(/\r?\n/)
  const header = parseCsvLine(lines.shift())
  return lines.map(line => Object.fromEntries(parseCsvLine(line).map((value, index) => [header[index], value])))
}

function normalizeLine(shortName) {
  return shortName.replace(/^0+/, '').match(/^\d+/)?.[0] || shortName
}

function distanceMeters(a, b) {
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const dLat = lat2 - lat1
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function simplify(points, maxPoints) {
  if (points.length <= maxPoints) return points
  const step = (points.length - 1) / (maxPoints - 1)
  const out = []
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(points[Math.round(i * step)])
  }
  return out
}

function projectStopToPath(stop, path) {
  let bestIndex = 0
  let bestDistance = Infinity
  for (let i = 0; i < path.length; i += 1) {
    const distance = distanceMeters(stop, path[i])
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = i
    }
  }
  return { ...stop, pathIndex: bestIndex }
}

const routes = readCsv(`${GTFS_DIR}/routes.txt`)
const selectedRoutes = new Map()

for (const line of TARGET_LINES) {
  const candidates = routes
    .filter(route => normalizeLine(route.route_short_name) === line)
    .sort((a, b) => a.route_short_name.localeCompare(b.route_short_name))

  const preferred = candidates.find(route => new RegExp(`^0*${line}A($|\\D)`).test(route.route_short_name)) || candidates[0]
  if (!preferred) throw new Error(`Missing GTFS route for line ${line}`)
  selectedRoutes.set(line, preferred)
}

const trips = readCsv(`${GTFS_DIR}/trips.txt`)
const selectedTrips = new Map()
const selectedTripIds = new Set()
const selectedShapeIds = new Set()

for (const [line, route] of selectedRoutes) {
  const trip = trips.find(item => item.route_id === route.route_id && item.direction_id === '0')
    || trips.find(item => item.route_id === route.route_id)
  if (!trip) throw new Error(`Missing GTFS trip for line ${line}`)
  selectedTrips.set(line, trip)
  selectedTripIds.add(trip.trip_id)
  selectedShapeIds.add(trip.shape_id)
}

const stops = new Map()
for (const stop of readCsv(`${GTFS_DIR}/stops.txt`)) {
  stops.set(stop.stop_id, {
    id: stop.stop_id,
    name: stop.stop_name,
    lat: Number(stop.stop_lat),
    lng: Number(stop.stop_lon),
  })
}

const stopTimesByTrip = new Map()
for (const tripId of selectedTripIds) stopTimesByTrip.set(tripId, [])

const rl = readline.createInterface({
  input: fs.createReadStream(`${GTFS_DIR}/stop_times.txt`),
  crlfDelay: Infinity,
})

let stopTimeHeader = null
for await (const line of rl) {
  if (!stopTimeHeader) {
    stopTimeHeader = parseCsvLine(line)
    continue
  }

  const cols = parseCsvLine(line)
  const tripId = cols[0]
  if (!selectedTripIds.has(tripId)) continue

  const row = Object.fromEntries(cols.map((value, index) => [stopTimeHeader[index], value]))
  const stop = stops.get(row.stop_id)
  if (stop) {
    stopTimesByTrip.get(tripId).push({
      ...stop,
      sequence: Number(row.stop_sequence),
    })
  }
}

const shapesById = new Map()
for (const row of readCsv(`${GTFS_DIR}/shapes.txt`)) {
  if (!selectedShapeIds.has(row.shape_id)) continue
  if (!shapesById.has(row.shape_id)) shapesById.set(row.shape_id, [])
  shapesById.get(row.shape_id).push({
    lat: Number(row.shape_pt_lat),
    lng: Number(row.shape_pt_lon),
    sequence: Number(row.shape_pt_sequence),
  })
}

const officialRoutes = {}
for (const [line, route] of selectedRoutes) {
  const trip = selectedTrips.get(line)
  const path = (shapesById.get(trip.shape_id) || [])
    .sort((a, b) => a.sequence - b.sequence)
    .map(({ lat, lng }) => ({ lat, lng }))
  const routeStops = (stopTimesByTrip.get(trip.trip_id) || [])
    .sort((a, b) => a.sequence - b.sequence)
    .map(({ sequence, ...stop }) => projectStopToPath(stop, path))

  officialRoutes[line] = {
    line,
    routeShortName: route.route_short_name,
    routeName: route.route_desc,
    headsign: trip.trip_headsign,
    path: simplify(path, 220),
    stops: routeStops,
  }
}

const source = `import type { OfficialRoute } from './routeTypes'\n\nexport const OFFICIAL_ROUTES: Record<string, OfficialRoute> = ${JSON.stringify(officialRoutes, null, 2)}\n`
fs.writeFileSync(OUT_FILE, source)
console.log(`Wrote ${OUT_FILE}`)
