import json
import re
import urllib.request
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

filepath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\lib\officialRoutes.ts"

with open(filepath, "r", encoding="utf-8") as f:
    new_content = f.read()

def get_block_bounds(line_key, text):
    match = re.search(f'"{line_key}":\\s*\\{{', text)
    if not match:
        return None
    start_pos = match.start()
    brace_count = 0
    end_pos = -1
    for i in range(start_pos + len(f'"{line_key}":'), len(text)):
        if text[i] == '{':
            brace_count += 1
        elif text[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end_pos = i + 1
                break
    if end_pos != -1:
        return start_pos, end_pos
    return None

target_lines = ["12", "24", "28", "37", "55", "60", "71", "88", "102", "115", "152"]

for line_key in target_lines:
    bounds = get_block_bounds(line_key, new_content)
    if not bounds:
        print(f"Could not find bounds for Line {line_key}")
        continue
    start_pos, end_pos = bounds
    block = new_content[start_pos:end_pos]
    
    # Extract stops
    stops_match = re.search(r'"stops":\s*\[', block)
    if not stops_match:
        print(f"No stops found for Line {line_key}")
        continue
    
    start_stops = stops_match.end() - 1
    brace_c = 0
    end_stops = -1
    for i in range(start_stops, len(block)):
        if block[i] == '[':
            brace_c += 1
        elif block[i] == ']':
            brace_c -= 1
            if brace_c == 0:
                end_stops = i + 1
                break
    if end_stops == -1:
        print(f"Brace mismatch in stops for Line {line_key}")
        continue
    
    stops_json_str = block[start_stops:end_stops]
    stops_json_str = re.sub(r',\s*\]', ']', stops_json_str)
    stops_json_str = re.sub(r',\s*\}', '}', stops_json_str)
    stops = json.loads(stops_json_str)
    
    print(f"Line {line_key} has {len(stops)} stops.")
    
    # Query OSRM
    # Coordinate format: lng,lat;lng,lat;...
    coords_str = ";".join([f"{stop['lng']},{stop['lat']}" for stop in stops])
    url = f"http://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
    
    print(f"Querying OSRM for Line {line_key}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
        
        if res_data.get("code") == "Ok" and res_data.get("routes"):
            route = res_data["routes"][0]
            geometry = route["geometry"]
            coordinates = geometry["coordinates"] # List of [lng, lat]
            
            # Convert to path format [{lat, lng}]
            new_path = [{"lat": round(pt[1], 6), "lng": round(pt[0], 6)} for pt in coordinates]
            print(f"Generated {len(new_path)} points for Line {line_key}")
            
            # Map stops to pathIndex
            for stop in stops:
                best_idx = 0
                best_dist = float('inf')
                for idx, pt in enumerate(new_path):
                    dist = (pt["lat"] - stop["lat"])**2 + (pt["lng"] - stop["lng"])**2
                    if dist < best_dist:
                        best_dist = dist
                        best_idx = idx
                stop["pathIndex"] = best_idx
                
            # Replace path and stops inside block
            path_str = '"path": ' + json.dumps(new_path, indent=4)
            stops_str = '"stops": ' + json.dumps(stops, indent=4)
            
            # Locate path in block
            path_match = re.search(r'"path":\s*\[', block)
            if path_match:
                start_path = path_match.start()
                brace_c = 0
                end_path = -1
                for i in range(start_path, len(block)):
                    if block[i] == '[':
                        brace_c += 1
                    elif block[i] == ']':
                        brace_c -= 1
                        if brace_c == 0:
                            end_path = i + 1
                            break
                block = block[:start_path] + path_str + block[end_path:]
                
            # Locate stops in block
            stops_match2 = re.search(r'"stops":\s*\[', block)
            if stops_match2:
                start_stops2 = stops_match2.start()
                brace_c = 0
                end_stops2 = -1
                for i in range(start_stops2, len(block)):
                    if block[i] == '[':
                        brace_c += 1
                    elif block[i] == ']':
                        brace_c -= 1
                        if brace_c == 0:
                            end_stops2 = i + 1
                            break
                block = block[:start_stops2] + stops_str + block[end_stops2:]
                
            # Update new_content
            active_bounds = get_block_bounds(line_key, new_content)
            if active_bounds:
                o_start, o_end = active_bounds
                new_content = new_content[:o_start] + block + new_content[o_end:]
                print(f"Successfully updated Line {line_key} path and stops in content!")
                
        else:
            print(f"OSRM returned error for Line {line_key}: {res_data}")
            
    except Exception as e:
        print(f"Error querying OSRM for Line {line_key}: {e}")
        
    time.sleep(1.0) # Rate limit friendly

# Save the updated file
with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Done! officialRoutes.ts updated successfully with all street-aligned paths.")
