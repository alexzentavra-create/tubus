# scratch/search_dashboard.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "dashboard" in line.lower() or "panel" in line.lower() or "MOCK_LINES.map" in line:
        print(f"{idx+1}: {line.strip()}")
