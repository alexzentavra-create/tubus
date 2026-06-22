import re
import sys

# Reconfigure stdout to use UTF-8 on Windows
sys.stdout.reconfigure(encoding='utf-8')

filepath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\lib\mockData.ts"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Let's find MOCK_STOPS definition
stops_match = re.search(r'export\s+const\s+MOCK_STOPS\s*\:\s*Record<string,\s*BusStop\[\]>\s*\=\s*\{([\s\S]*?)\n\}', content)
if stops_match:
    stops_content = stops_match.group(1)
    print("MOCK_STOPS content (first 120 lines):")
    lines = stops_content.split("\n")
    for idx, line in enumerate(lines[:120]):
        print(f"{idx+1}: {line}")
else:
    print("MOCK_STOPS not found via simple regex")

# Let's list all lines that contain "line-" in mockData.ts
print("\nAll lines with 'line-':")
for i, line in enumerate(content.split("\n")):
    if "line-" in line:
        print(f"Line {i+1}: {line.strip()}")
