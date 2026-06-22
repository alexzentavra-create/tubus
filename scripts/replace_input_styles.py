import os

login_path = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx"
with open(login_path, "r", encoding="utf-8") as f:
    content = f.read()

old_style = """          background:f?'rgba(10,14,20,0.9)':'rgba(6,8,16,0.7)',
          border:`1px solid ${f?'rgba(184,200,224,0.3)':'rgba(184,200,224,0.08)'}`,
          borderRadius:'var(--r-sm)',
          color:'var(--text-primary)',
          fontSize:'14px',
          fontFamily:'DM Sans,sans-serif',
          outline:'none',
          transition:'all var(--t-fast) var(--ease-in-out)',
          boxShadow: f ? '0 0 0 3px rgba(184,200,224,0.06), 0 2px 8px rgba(0,0,0,0.3) inset' : '0 2px 8px rgba(0,0,0,0.3) inset',
          boxSizing:'border-box' as const"""

new_style = """          background:f?'rgba(10,14,20,0.9)':'rgba(6,8,16,0.7)',
          border:'1px solid rgba(184,200,224,0.12)',
          borderRadius:'var(--r-sm)',
          color:'var(--text-primary)',
          fontSize:'14px',
          fontFamily:'DM Sans,sans-serif',
          outline:'none',
          transition:'all var(--t-fast) var(--ease-in-out)',
          boxShadow:'0 2px 8px rgba(0,0,0,0.3) inset',
          boxSizing:'border-box' as const"""

if old_style in content:
    content = content.replace(old_style, new_style)
    print("Successfully updated input component styles!")
else:
    old_style_alt = old_style.replace("\n", "\r\n")
    if old_style_alt in content:
        content = content.replace(old_style_alt, new_style)
        print("Successfully updated input component styles (CRLF)!")
    else:
        print("Error: Style block not found!")

with open(login_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished updating login/page.tsx!")
