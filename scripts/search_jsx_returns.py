import sys

sys.stdout.reconfigure(encoding='utf-8')

def search_jsx_return(filepath):
    print(f"=== Searching in {filepath} ===")
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        if "return (" in line:
            print(f"Line {i+1}: {line.strip()}")
            for j in range(i+1, min(len(lines), i+6)):
                print(f"  {j+1}: {lines[j].strip()}")

search_jsx_return(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\page.tsx")
search_jsx_return(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\driver\page.tsx")
