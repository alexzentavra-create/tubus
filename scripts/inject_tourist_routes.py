import json
import urllib.request
import time
import re

filepath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\page.tsx"

# Target stops
stops_yellow_ida = [
    { "id": 'ty-1', "name": 'Obelisco', "lat": -34.6037, "lng": -58.3816 },
    { "id": 'ty-2', "name": 'Congreso', "lat": -34.6098, "lng": -58.3927 },
    { "id": 'ty-3', "name": 'San Telmo', "lat": -34.6176, "lng": -58.3703 },
    { "id": 'ty-4', "name": 'La Bombonera', "lat": -34.6356, "lng": -58.3647 },
    { "id": 'ty-5', "name": 'Caminito', "lat": -34.6398, "lng": -58.3628 },
    { "id": 'ty-6', "name": 'Puerto Madero', "lat": -34.6076, "lng": -58.364 },
    { "id": 'ty-7', "name": 'Plaza de Mayo', "lat": -34.6083, "lng": -58.3721 },
    { "id": 'ty-8', "name": 'Recoleta', "lat": -34.5875, "lng": -58.3916 },
    { "id": 'ty-9', "name": 'Palermo Soho', "lat": -34.5885, "lng": -58.4305 }
]

stops_yellow_vuelta = [
    { "id": 'ty-1', "name": 'Obelisco', "lat": -34.6037, "lng": -58.3816 },
    { "id": 'ty-9', "name": 'Palermo Soho', "lat": -34.5885, "lng": -58.4305 },
    { "id": 'ty-8', "name": 'Recoleta', "lat": -34.5875, "lng": -58.3916 },
    { "id": 'ty-7', "name": 'Plaza de Mayo', "lat": -34.6083, "lng": -58.3721 },
    { "id": 'ty-6', "name": 'Puerto Madero', "lat": -34.6076, "lng": -58.364 },
    { "id": 'ty-5', "name": 'Caminito', "lat": -34.6398, "lng": -58.3628 },
    { "id": 'ty-4', "name": 'La Bombonera', "lat": -34.6356, "lng": -58.3647 },
    { "id": 'ty-3', "name": 'San Telmo', "lat": -34.6176, "lng": -58.3703 },
    { "id": 'ty-2', "name": 'Congreso', "lat": -34.6098, "lng": -58.3927 }
]

stops_rojo_ida = [
    { "id": 'tr-1', "name": 'Plaza de Mayo', "lat": -34.6083, "lng": -58.3721 },
    { "id": 'tr-2', "name": 'San Telmo', "lat": -34.6176, "lng": -58.3703 },
    { "id": 'tr-3', "name": 'Caminito', "lat": -34.6398, "lng": -58.3628 },
    { "id": 'tr-4', "name": 'Puerto Madero', "lat": -34.6076, "lng": -58.364 },
    { "id": 'tr-5', "name": 'Retiro', "lat": -34.591, "lng": -58.375 },
    { "id": 'tr-6', "name": 'Recoleta', "lat": -34.5875, "lng": -58.3916 },
    { "id": 'tr-7', "name": 'Palermo Rosedal', "lat": -34.5711, "lng": -58.4172 },
    { "id": 'tr-8', "name": 'Planetario', "lat": -34.5696, "lng": -58.4116 },
    { "id": 'tr-9', "name": 'Teatro Colón', "lat": -34.6011, "lng": -58.3831 }
]

stops_rojo_vuelta = [
    { "id": 'tr-1', "name": 'Plaza de Mayo', "lat": -34.6083, "lng": -58.3721 },
    { "id": 'tr-9', "name": 'Teatro Colón', "lat": -34.6011, "lng": -58.3831 },
    { "id": 'tr-8', "name": 'Planetario', "lat": -34.5696, "lng": -58.4116 },
    { "id": 'tr-7', "name": 'Palermo Rosedal', "lat": -34.5711, "lng": -58.4172 },
    { "id": 'tr-6', "name": 'Recoleta', "lat": -34.5875, "lng": -58.3916 },
    { "id": 'tr-5', "name": 'Retiro', "lat": -34.591, "lng": -58.375 },
    { "id": 'tr-4', "name": 'Puerto Madero', "lat": -34.6076, "lng": -58.364 },
    { "id": 'tr-3', "name": 'Caminito', "lat": -34.6398, "lng": -58.3628 },
    { "id": 'tr-2', "name": 'San Telmo', "lat": -34.6176, "lng": -58.3703 }
]

waypoint_solis_belgrano = { "lat": -34.6133, "lng": -58.3879 }

def query_osrm_path(coords):
    coords_str = ";".join([f"{pt['lng']},{pt['lat']}" for pt in coords])
    url = f"http://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        res_data = json.loads(response.read().decode())
    
    if res_data.get("code") == "Ok" and res_data.get("routes"):
        route = res_data["routes"][0]
        coordinates = route["geometry"]["coordinates"]
        return [{"lat": round(pt[1], 6), "lng": round(pt[0], 6)} for pt in coordinates]
    else:
        raise Exception(f"OSRM Error: {res_data}")

def generate_stops_with_index(stops, path):
    stops_with_index = []
    for s in stops:
        best_idx = 0
        best_dist = float('inf')
        for idx, pt in enumerate(path):
            dist = (pt["lat"] - s["lat"])**2 + (pt["lng"] - s["lng"])**2
            if dist < best_dist:
                best_dist = dist
                best_idx = idx
        stops_with_index.append({
            "id": s["id"],
            "name": s["name"],
            "lat": s["lat"],
            "lng": s["lng"],
            "pathIndex": best_idx
        })
    return stops_with_index

print("Querying OSRM routes...")
# Yellow Ida
coords_y_ida = [stops_yellow_ida[0], stops_yellow_ida[1], waypoint_solis_belgrano, *stops_yellow_ida[2:], stops_yellow_ida[0]]
path_y_ida = query_osrm_path(coords_y_ida)
stops_y_ida_indexed = generate_stops_with_index(stops_yellow_ida, path_y_ida)

# Yellow Vuelta
coords_y_vuelta = [*stops_yellow_vuelta[:8], waypoint_solis_belgrano, stops_yellow_vuelta[8], stops_yellow_vuelta[0]]
path_y_vuelta = query_osrm_path(coords_y_vuelta)
stops_y_vuelta_indexed = generate_stops_with_index(stops_yellow_vuelta, path_y_vuelta)

# Rojo Ida
coords_r_ida = [*stops_rojo_ida, stops_rojo_ida[0]]
path_r_ida = query_osrm_path(coords_r_ida)
stops_r_ida_indexed = generate_stops_with_index(stops_rojo_ida, path_r_ida)

# Rojo Vuelta
coords_r_vuelta = [*stops_rojo_vuelta, stops_rojo_vuelta[0]]
path_r_vuelta = query_osrm_path(coords_r_vuelta)
stops_r_vuelta_indexed = generate_stops_with_index(stops_rojo_vuelta, path_r_vuelta)

print("Formatting routes code...")

def format_route_js(line_id, route_name, short_name, head_sign_ida, path_ida, stops_ida, head_sign_vuelta, path_vuelta, stops_vuelta):
    # Formats the route block in JS format
    res = f"OFFICIAL_ROUTES['{line_id}'] = {{\n"
    res += f"  line: '{line_id}',\n"
    res += f"  routeShortName: '{short_name}',\n"
    res += f"  routeName: '{route_name}',\n"
    
    # Ida
    res += "  ida: {\n"
    res += f"    headsign: '{head_sign_ida}',\n"
    res += "    path: " + json.dumps(path_ida, indent=6) + ",\n"
    res += "    stops: " + json.dumps(stops_ida, indent=6) + "\n"
    res += "  },\n"
    
    # Vuelta
    res += "  vuelta: {\n"
    res += f"    headsign: '{head_sign_vuelta}',\n"
    res += "    path: " + json.dumps(path_vuelta, indent=6) + ",\n"
    res += "    stops: " + json.dumps(stops_vuelta, indent=6) + "\n"
    res += "  }\n"
    res += "}\n"
    return res

yellow_js = format_route_js(
    "T-Amarillo", "Bus Turístico Amarillo", "T-A",
    "Recorrido Amarillo", path_y_ida, stops_y_ida_indexed,
    "Recorrido Amarillo", path_y_vuelta, stops_y_vuelta_indexed
)

rojo_js = format_route_js(
    "T-Rojo", "Bus Turístico Rojo", "T-R",
    "Recorrido Rojo", path_r_ida, stops_r_ida_indexed,
    "Recorrido Rojo", path_r_vuelta, stops_r_vuelta_indexed
)

new_routes_block = yellow_js + "\n" + rojo_js + "\n"

print("Reading page.tsx...")
with open(filepath, "r", encoding="utf-8") as f:
    page_content = f.read()

# Locate start and end
start_marker = "OFFICIAL_ROUTES['T-Amarillo'] = {"
end_marker = "const TOURIST_STOP_DESCRIPTIONS: Record<string, string> = {"

start_idx = page_content.find(start_marker)
end_idx = page_content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"Error: start_idx={start_idx}, end_idx={end_idx}")
    exit(1)

# Replace the block
updated_content = page_content[:start_idx] + new_routes_block + page_content[end_idx:]

print("Writing updated page.tsx...")
with open(filepath, "w", encoding="utf-8") as f:
    f.write(updated_content)

print("Injected successfully!")
