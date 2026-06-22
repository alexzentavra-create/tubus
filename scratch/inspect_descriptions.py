# scratch/inspect_descriptions.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "TOURIST_STOP_DESCRIPTIONS" in line:
        print(f"{idx+1}: {line.strip()}")
