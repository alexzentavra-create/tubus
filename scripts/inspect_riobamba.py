with open(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\lib\mockData.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "riobamba" in line.lower() or "ayacucho" in line.lower():
        print(f"Line {i+1}: {line.strip()}")
        # print surrounding context
        start = max(0, i - 10)
        end = min(len(lines), i + 10)
        print("Context:")
        for j in range(start, end):
            print(f"  {j+1}: {lines[j].strip()}")
        print("-" * 50)
