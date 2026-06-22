import re
import os

pages = [
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\page.tsx",
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\driver\page.tsx",
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\page.tsx",
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\company\page.tsx",
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\super\page.tsx",
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx"
]

for page in pages:
    if not os.path.exists(page):
        print(f"File not found: {page}")
        continue
    
    with open(page, "r", encoding="utf-8") as f:
        content = f.read()
        
    print(f"\n=== File: {page} ===")
    
    # Search for <PhoneWrapper
    m = re.search(r'<PhoneWrapper[\s\S]*?>\s*([\s\S]*?)\n', content)
    if m:
        print("PhoneWrapper child line:")
        print(m.group(0).strip())
        print(m.group(1).strip())
    else:
        print("PhoneWrapper opening not found!")
