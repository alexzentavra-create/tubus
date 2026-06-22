with open(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("return (")
if idx != -1:
    print(content[idx:idx+800])
else:
    print("return not found")
