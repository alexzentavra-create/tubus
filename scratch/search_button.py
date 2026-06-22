# scratch/search_button.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "Planificar Viaje" in line or "NavIcon" in line:
        print(f"{idx+1}: {line.strip()}")
