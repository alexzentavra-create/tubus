import os

app_dir = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app"
for dirpath, dirnames, filenames in os.walk(app_dir):
    for filename in filenames:
        if filename == "page.tsx":
            print(os.path.join(dirpath, filename))
