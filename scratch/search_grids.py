# scratch/search_grids.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "display: 'grid'" in line or "gridTemplateColumns" in line:
        print(f"{idx+1}: {line.strip()}")
