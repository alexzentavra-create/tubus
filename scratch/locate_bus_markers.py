# scratch/locate_bus_markers.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "bus.id" in line or "setSelectedBus" in line:
        print(f"{idx+1}: {line.strip()}")
