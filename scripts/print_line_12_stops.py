import json
import re

filepath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\lib\officialRoutes.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

parts = content.split('"12": {')
if len(parts) > 1:
    line12_content = parts[1].split('},\n  "24": {', 1)
    if len(line12_content) > 1:
        segment = line12_content[0]
        stops_m = re.search(r'\"stops\"\:\s*(\[[\s\S]*?\])\s*\}', segment)
        if stops_m:
            stops = json.loads(stops_m.group(1))
            print(f"Line 12 has {len(stops)} stops.")
            for idx, stop in enumerate(stops):
                print(f"Stop {idx+1}: {stop['name']} (index {stop['pathIndex']}, lat={stop['lat']}, lng={stop['lng']})")
        else:
            print("Stops not found!")
