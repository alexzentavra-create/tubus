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
        path_m = re.search(r'\"path\"\:\s*(\[[\s\S]*?\])\s*,\s*\"stops\"', segment)
        if path_m:
            path = json.loads(path_m.group(1))
            print(f"Line 12 path has {len(path)} points.")
            print("Points 115 to 145:")
            for idx in range(115, min(len(path), 145)):
                print(f"Index {idx}: {path[idx]}")
        else:
            print("Path not found!")
