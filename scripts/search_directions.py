import os
import re

filepath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\lib\officialRoutes.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Let's search if there are other keys or inbound/outbound references
print("Searching for 'direction' or 'inbound' or 'outbound' in officialRoutes.ts:")
for line in content.split("\n"):
    if any(term in line.lower() for term in ["direction", "inbound", "outbound", "regreso", "ida"]):
        print(line.strip())

# Also search mockData.ts
mockpath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\lib\mockData.ts"
if os.path.exists(mockpath):
    print("\nSearching in mockData.ts:")
    with open(mockpath, "r", encoding="utf-8") as f:
        mcontent = f.read()
    for line in mcontent.split("\n")[:40]:  # print first 40 lines
        print(line.strip())
