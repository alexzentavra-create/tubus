# scratch/inspect_states.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx in range(350, min(550, len(lines))):
    line = lines[idx]
    if "useState" in line or "const [" in line:
        print(f"{idx+1}: {line.strip()}")
