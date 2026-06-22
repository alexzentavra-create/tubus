import os
import re

search_coords = ["-34.5772", "-34.5746", "-34.5796", "-34.580195"]
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
                for coord in search_coords:
                    if coord in content:
                        print(f"Found '{coord}' in file: {filepath}")
            except Exception as e:
                pass
