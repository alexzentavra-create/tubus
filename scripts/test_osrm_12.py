import json
import re
import urllib.request

filepath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\lib\officialRoutes.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

parts = content.split('"12": {')
if len(parts) > 1:
    line12_content = parts[1].split('},\n  "24": {', 1)
    if len(line12_content) > 1:
        segment = line12_content[0]
        stops_match = re.search(r'"stops":\s*\[', segment)
        if stops_match:
            start_stops = stops_match.end() - 1
            brace_c = 0
            end_stops = -1
            for i in range(start_stops, len(segment)):
                if segment[i] == '[':
                    brace_c += 1
                elif segment[i] == ']':
                    brace_c -= 1
                    if brace_c == 0:
                        end_stops = i + 1
                        break
            stops_json_str = segment[start_stops:end_stops]
            stops_json_str = re.sub(r',\s*\]', ']', stops_json_str)
            stops = json.loads(stops_json_str)
            
            # Query OSRM
            coords_str = ";".join([f"{stop['lng']},{stop['lat']}" for stop in stops])
            url = f"http://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
            print("Querying OSRM...")
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    res_data = json.loads(response.read().decode())
                if res_data.get("code") == "Ok" and res_data.get("routes"):
                    route = res_data["routes"][0]
                    coords = route["geometry"]["coordinates"]
                    print(f"OSRM returned {len(coords)} points.")
                    print("First 10 points:")
                    for idx, pt in enumerate(coords[:10]):
                        print(f"  {idx}: {pt}")
                    print("Points 120 to 140:")
                    for idx in range(120, min(len(coords), 140)):
                        print(f"  {idx}: {coords[idx]}")
                else:
                    print("OSRM error:", res_data)
            except Exception as e:
                print("Error:", e)
