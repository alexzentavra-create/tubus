export interface RoutePoint {
  lat: number
  lng: number
}

export interface OfficialRouteStop extends RoutePoint {
  id: string
  name: string
  pathIndex: number
}

export interface OfficialRouteDirection {
  headsign: string
  path: RoutePoint[]
  stops: OfficialRouteStop[]
}

export interface OfficialRoute {
  line: string
  routeShortName: string
  routeName: string
  ida: OfficialRouteDirection
  vuelta: OfficialRouteDirection
}
