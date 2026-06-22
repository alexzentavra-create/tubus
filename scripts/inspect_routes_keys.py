import json
import re

filepath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\lib\officialRoutes.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Let's extract keys and basic info
# File format seems to be an export const officialRoutes = { ... }
# Let's find all keys at the top level
keys = re.findall(r'\"(\d+)\"\:\s*\{', content)
print("Keys in officialRoutes:", keys)

# Let's check key "12" structure
parts = content.split('"12": {')
if len(parts) > 1:
    line12_content = parts[1].split('},\n  "24": {', 1)
    if len(line12_content) > 1:
        # We can see the first few lines of line 12 content
        lines = line12_content[0].split("\n")
        print("Line 12 structure first 30 lines:")
        for line in lines[:30]:
            print(line)
