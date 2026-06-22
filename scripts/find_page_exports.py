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
    
    # Search for export default function
    m = re.search(r'export\s+default\s+function\s+(\w+)\s*\(', content)
    if m:
        name = m.group(1)
        print(f"Page: {page} -> Found default export: {name}")
        
        # Let's locate the return statement in this function
        # Simple brace matching
        start_idx = content.find(f"export default function {name}")
        ret_idx = content.find("return (", start_idx)
        if ret_idx != -1:
            print(f"  Return starts at char {ret_idx}")
            snippet = content[ret_idx:ret_idx+150].strip()
            print(f"  Snippet: {snippet}")
        else:
            # Let's search for "return" in other formats
            ret_idx_alt = content.find("return", start_idx)
            print(f"  Alt Return starts at char {ret_idx_alt}")
            snippet = content[ret_idx_alt:ret_idx_alt+150].strip()
            print(f"  Snippet Alt: {snippet}")
    else:
        print(f"Page: {page} -> Default export not found!")
