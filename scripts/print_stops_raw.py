import re

filepath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\lib\officialRoutes.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

parts = content.split('"12": {')
if len(parts) > 1:
    line12_content = parts[1].split('},\n  "24": {', 1)
    if len(line12_content) > 1:
        segment = line12_content[0]
        # Let's find "stops" and print the next 1000 characters
        idx = segment.find('"stops"')
        if idx != -1:
            print("Found 'stops' at position:", idx)
            print(segment[idx:idx+2500])
        else:
            print("'stops' string not found!")
