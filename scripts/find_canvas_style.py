with open(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "canvasRef" in line or "<canvas" in line:
        print(f"Line {i+1}: {line.strip()}")
        # print surrounding context
        start = max(0, i - 5)
        end = min(len(lines), i + 15)
        print("Context:")
        for j in range(start, end):
            print(f"  {j+1}: {lines[j].strip()}")
        print("-" * 50)
