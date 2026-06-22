# scratch/locate_sim_loop.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "setInterval" in line or "requestAnimationFrame" in line:
        print(f"{idx+1}: {line.strip()}")
