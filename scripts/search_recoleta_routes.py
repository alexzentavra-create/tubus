import os
import re
import json

filepath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\lib\officialRoutes.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Let's extract the officialRoutes object or search route-by-route.
# The file has structure like export const officialRoutes = { "12": { ... }, "24": { ... } }
# Let's find all line blocks.
# We can find them using a regex that looks for line definitions.
routes_matches = re.finditer(r'\"(\d+)\"\:\s*\{', content)
route_positions = [m.start() for m in routes_matches]
route_positions.append(len(content))

for idx in range(len(route_positions) - 1):
    start = route_positions[idx]
    end = route_positions[idx+1]
    segment = content[start:end]
    line_name = re.match(r'\"(\d+)\"\:', segment).group(1)
    
    # Check if there is a path in this segment
    path_m = re.search(r'\"path\"\:\s*(\[[\s\S]*?\])\s*,\s*\"stops\"', segment)
    if path_m:
        try:
            path = json.loads(path_m.group(1))
            # Let's find points close to -34.5945 or -34.5959
            found_near = []
            for p_idx, pt in enumerate(path):
                lat, lng = pt['lat'], pt['lng']
                # Check if it is within 0.002 degrees of Recoleta area
                if abs(lat - (-34.5945)) < 0.003 and abs(lng - (-58.3975)) < 0.003:
                    found_near.append((p_idx, lat, lng))
            if found_near:
                print(f"Line {line_name} has {len(found_near)} points near Recoleta Ayacucho/Riobamba intersection:")
                # print the first 5 and last 5 matching points or surrounding points
                for p_idx, lat, lng in found_near[:15]:
                    print(f"  Index {p_idx}: lat={lat}, lng={lng}")
                if len(found_near) > 15:
                    print(f"  ... and {len(found_near) - 15} more")
        except Exception as e:
            print(f"Error parsing path for line {line_name}: {e}")
