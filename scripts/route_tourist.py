import json
import urllib.request
import time

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

# We need the Solís & Belgrano waypoint to force the Congreso -> San Telmo path
# Solís & Belgrano: lat: -34.6133, lng: -58.3879
waypoint_solis_belgrano = { "lat": -34.6133, "lng": -58.3879 }

def query_osrm_path(coords):
    # coords is a list of {"lat": ..., "lng": ...}
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

# Test Amarillo Ida
# Obelisco -> Congreso -> Solís/Belgrano -> San Telmo -> La Bombonera -> Caminito -> Puerto Madero -> Plaza de Mayo -> Recoleta -> Palermo Soho -> Obelisco
coords_y_ida = [
    stops_yellow_ida[0], # Obelisco
    stops_yellow_ida[1], # Congreso
    waypoint_solis_belgrano,
    stops_yellow_ida[2], # San Telmo
    stops_yellow_ida[3], # La Bombonera
    stops_yellow_ida[4], # Caminito
    stops_yellow_ida[5], # Puerto Madero
    stops_yellow_ida[6], # Plaza de Mayo
    stops_yellow_ida[7], # Recoleta
    stops_yellow_ida[8], # Palermo Soho
    stops_yellow_ida[0], # Obelisco
]
path_y_ida = query_osrm_path(coords_y_ida)
print("Yellow Ida path size:", len(path_y_ida))

# Test Amarillo Vuelta
# Obelisco -> Palermo Soho -> Recoleta -> Plaza de Mayo -> Puerto Madero -> Caminito -> La Bombonera -> San Telmo -> Solís/Belgrano -> Congreso -> Obelisco
coords_y_vuelta = [
    stops_yellow_vuelta[0], # Obelisco
    stops_yellow_vuelta[1], # Palermo Soho
    stops_yellow_vuelta[2], # Recoleta
    stops_yellow_vuelta[3], # Plaza de Mayo
    stops_yellow_vuelta[4], # Puerto Madero
    stops_yellow_vuelta[5], # Caminito
    stops_yellow_vuelta[6], # La Bombonera
    stops_yellow_vuelta[7], # San Telmo
    waypoint_solis_belgrano,
    stops_yellow_vuelta[8], # Congreso
    stops_yellow_vuelta[0], # Obelisco
]
path_y_vuelta = query_osrm_path(coords_y_vuelta)
print("Yellow Vuelta path size:", len(path_y_vuelta))

# Test Rojo Ida
# Plaza de Mayo -> San Telmo -> Caminito -> Puerto Madero -> Retiro -> Recoleta -> Palermo Rosedal -> Planetario -> Teatro Colón -> Plaza de Mayo
coords_r_ida = [
    stops_rojo_ida[0], # Plaza de Mayo
    stops_rojo_ida[1], # San Telmo
    stops_rojo_ida[2], # Caminito
    stops_rojo_ida[3], # Puerto Madero
    stops_rojo_ida[4], # Retiro
    stops_rojo_ida[5], # Recoleta
    stops_rojo_ida[6], # Palermo Rosedal
    stops_rojo_ida[7], # Planetario
    stops_rojo_ida[8], # Teatro Colón
    stops_rojo_ida[0], # Plaza de Mayo
]
path_r_ida = query_osrm_path(coords_r_ida)
print("Rojo Ida path size:", len(path_r_ida))

# Test Rojo Vuelta
# Plaza de Mayo -> Teatro Colón -> Planetario -> Palermo Rosedal -> Recoleta -> Retiro -> Puerto Madero -> Caminito -> San Telmo -> Plaza de Mayo
coords_r_vuelta = [
    stops_rojo_vuelta[0], # Plaza de Mayo
    stops_rojo_vuelta[1], # Teatro Colón
    stops_rojo_vuelta[2], # Planetario
    stops_rojo_vuelta[3], # Palermo Rosedal
    stops_rojo_vuelta[4], # Recoleta
    stops_rojo_vuelta[5], # Retiro
    stops_rojo_vuelta[6], # Puerto Madero
    stops_rojo_vuelta[7], # Caminito
    stops_rojo_vuelta[8], # San Telmo
    stops_rojo_vuelta[0], # Plaza de Mayo
]
path_r_vuelta = query_osrm_path(coords_r_vuelta)
print("Rojo Vuelta path size:", len(path_r_vuelta))
