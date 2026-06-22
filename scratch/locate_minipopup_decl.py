# scratch/locate_minipopup_decl.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "function MiniPopup" in line or "const MiniPopup" in line:
        print(f"{idx+1}: {line.strip()}")
