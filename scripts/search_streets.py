import os
import re

search_terms = ["Ayacucho", "Riobamba", "Alvear"]
root_dir = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus"

for dirpath, dirnames, filenames in os.walk(root_dir):
    if ".next" in dirpath or "node_modules" in dirpath or ".git" in dirpath:
        continue
    for filename in filenames:
        if filename.endswith((".ts", ".tsx", ".js", ".jsx", ".json", ".py", ".sql")):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                for term in search_terms:
                    if term.lower() in content.lower():
                        print(f"Found '{term}' in file: {filepath}")
            except Exception as e:
                pass
