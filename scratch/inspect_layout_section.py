# scratch/inspect_layout_section.py
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx in range(2368, min(3100, len(lines))):
    line = lines[idx]
    trimmed = line.strip()
    if "{/*" in line:
        print(f"{idx+1}: {trimmed}")
