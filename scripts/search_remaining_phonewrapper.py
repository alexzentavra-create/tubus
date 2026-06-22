import os
import re

root_dir = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus"
for dirpath, dirnames, filenames in os.walk(root_dir):
    if ".next" in dirpath or "node_modules" in dirpath or ".git" in dirpath:
        continue
    for filename in filenames:
        if filename.endswith((".ts", ".tsx", ".js", ".jsx")):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                if "PhoneWrapper" in content:
                    print(f"Found 'PhoneWrapper' in: {filepath}")
            except Exception as e:
                pass
