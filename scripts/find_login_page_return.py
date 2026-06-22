with open(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("export default function LoginPage")
ret_idx = content.find("return (", idx)
if ret_idx != -1:
    print(content[ret_idx:ret_idx+500])
else:
    print("Return block in LoginPage not found")
