# scratch/search_lineselector_usages.py
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "LineSelector" in line or "showLineSelector" in line:
        print(f"{idx+1}: {line.strip()}")
