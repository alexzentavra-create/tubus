import re
import json

with open('src/lib/officialRoutes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the object content
# It starts with export const OFFICIAL_ROUTES: Record<string, OfficialRoute> = {
# and ends at the end of the file.
match = re.search(r'export const OFFICIAL_ROUTES[^=]*=\s*({.*})', content, re.DOTALL)
if match:
    obj_str = match.group(1)
    # Convert TypeScript object format to valid JSON
    # Remove types if any, or just parse it. Wait, the structure is already valid JSON!
    try:
        data = json.loads(obj_str)
        for line_num, route in data.items():
            ida_stops = len(route.get('ida', {}).get('stops', []))
            vuelta_stops = len(route.get('vuelta', {}).get('stops', []))
            print(f"Line {line_num}: ida={ida_stops}, vuelta={vuelta_stops}, total={ida_stops + vuelta_stops}")
    except Exception as e:
        print("JSON parse error:", e)
else:
    print("Could not find OFFICIAL_ROUTES block")
