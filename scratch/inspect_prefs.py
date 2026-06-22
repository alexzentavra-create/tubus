# scratch/inspect_prefs.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "DEFAULT_PREFS" in line or "darkMap:" in line:
        print(f"{idx+1}: {line.strip()}")
