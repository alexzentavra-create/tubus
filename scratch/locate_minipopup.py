# scratch/locate_minipopup.py
import os

for root, dirs, files in os.walk("."):
    if "node_modules" in root or ".next" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith((".tsx", ".ts")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            if "MiniPopup" in content:
                print(f"Found MiniPopup in: {path}")
