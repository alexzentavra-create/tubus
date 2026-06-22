import os

login_path = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx"
with open(login_path, "r", encoding="utf-8") as f:
    content = f.read()

old_style = "<div style={{minHeight:'100%',height:'100%',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'16px 12px',background:'var(--void)',fontFamily:'DM Sans,sans-serif',position:'relative',overflow:'hidden'}}>"
new_style = "<div style={{minHeight:'100vh',width:'100vw',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px 12px',background:'var(--void)',fontFamily:'DM Sans,sans-serif',position:'relative',overflow:'hidden'}}>"

if old_style in content:
    content = content.replace(old_style, new_style)
    print("Successfully restored login page outer container styling!")
else:
    old_style_alt = old_style.replace("\n", "\r\n")
    if old_style_alt in content:
        content = content.replace(old_style_alt, new_style)
        print("Successfully restored login page outer container styling (CRLF)!")
    else:
        print("Error: Style block not found!")

with open(login_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished unwrapping login page completely!")
