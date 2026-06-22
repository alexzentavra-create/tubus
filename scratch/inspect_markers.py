# scratch/inspect_markers.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "<Popup" in line or "<Marker" in line or "selectedTouristStop" in line:
        print(f"{idx+1}: {line.strip()}")
