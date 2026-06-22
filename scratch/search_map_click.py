# scratch/search_map_click.py
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "mapSelectionMode" in line or "onMapClick" in line or "originCoord" in line or "destCoord" in line:
        if "useState" not in line:
            print(f"{idx+1}: {line.strip()}")
