import os
import re

pages = [
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\page.tsx",
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\driver\page.tsx",
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\page.tsx",
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\company\page.tsx",
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\super\page.tsx",
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx"
]

def unwrap_page(filepath, restore_outer_old, restore_outer_new):
    print(f"Unwrapping {filepath}...")
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Remove import
    content = re.sub(r"import\s+PhoneWrapper\s+from\s+['\"].*?['\"]\s*\n?", "", content)
    
    # Remove <PhoneWrapper ...> opening tag
    content = re.sub(r'<PhoneWrapper[\s\S]*?>\s*\n?', "", content)
    
    # Remove </PhoneWrapper> closing tag
    # The last </PhoneWrapper> closing tag in the file usually appears inside the return block
    # Let's locate the last occurrence and remove it
    idx = content.rfind("</PhoneWrapper>")
    if idx != -1:
        content = content[:idx] + content[idx+15:]
        print("  Removed </PhoneWrapper> closing tag!")
        
    # Restore outer layout style
    if restore_outer_old in content:
        content = content.replace(restore_outer_old, restore_outer_new)
        print("  Restored outer container viewport dimensions!")
    else:
        print("  Warning: outer style match not found for restoration")
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

# File 1: page.tsx (Passenger View)
unwrap_page(
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\page.tsx",
    "<div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--void)' }}>",
    "<div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--void)' }}>"
)

# File 2: driver/page.tsx (Driver View)
unwrap_page(
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\driver\page.tsx",
    "<div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--void)', color: 'var(--text-primary)', fontFamily: 'DM Sans,sans-serif' }}>",
    "<div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--void)', color: 'var(--text-primary)', fontFamily: 'DM Sans,sans-serif' }}>"
)

# File 3: admin/page.tsx (Admin Control Panel)
unwrap_page(
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\page.tsx",
    "<div style={{minHeight:'100%',background:'var(--void)',display:'flex',overflow:'hidden',height:'100%',width:'100%',fontFamily:'DM Sans'}}>",
    "<div style={{minHeight:'100vh',background:'var(--void)',display:'flex',overflow:'hidden',height:'100vh',fontFamily:'DM Sans'}}>"
)

# File 4: admin/company/page.tsx (Company Admin Panel)
unwrap_page(
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\company\page.tsx",
    "<div style={{minHeight:'100%',background:'#0b0f19',display:'flex',flexDirection:'column',width:'100%',height:'100%',alignItems:'center',justifyContent:'center'}}>",
    "<div style={{minHeight:'100vh',background:'#0b0f19',display:'flex',alignItems:'center',justifyContent:'center'}}>"
)

# File 5: admin/super/page.tsx (Super Admin Panel)
unwrap_page(
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\super\page.tsx",
    "<div style={{minHeight:'100%',background:'#0b0f19',display:'flex',flexDirection:'column',width:'100%',height:'100%',alignItems:'center',justifyContent:'center'}}>",
    "<div style={{minHeight:'100vh',background:'#0b0f19',display:'flex',alignItems:'center',justifyContent:'center'}}>"
)

# File 6: login/page.tsx (Login View)
login_path = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx"
unwrap_page(
    login_path,
    "<div style={{minHeight:'100%',height:'100%',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 16px',background:'var(--void)',fontFamily:'DM Sans,sans-serif',position:'relative',overflow:'hidden'}}>",
    "<div style={{minHeight:'100vh',width:'100vw',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px',background:'var(--void)',fontFamily:'DM Sans,sans-serif',position:'relative',overflow:'hidden'}}>"
)

# In login/page.tsx, also restore canvas fixed positioning
with open(login_path, "r", encoding="utf-8") as f:
    login_content = f.read()

# Restore canvas position from absolute back to fixed
login_content = login_content.replace(
    "position:'absolute',inset:0,width:'100%',height:'100%',zIndex:0",
    "position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0"
)

# Restore canvas resizing to window innerWidth/innerHeight
old_canvas = """    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const parent = canvas.parentElement || document.body
    let W = parent.clientWidth || window.innerWidth, H = parent.clientHeight || window.innerHeight
    canvas.width = W; canvas.height = H
    const onResize = () => {
      const p = canvas.parentElement || document.body
      W = p.clientWidth || window.innerWidth
      H = p.clientHeight || window.innerHeight
      canvas.width = W
      canvas.height = H
    }
    window.addEventListener('resize', onResize)"""

new_canvas = """    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let W = window.innerWidth, H = window.innerHeight
    canvas.width = W; canvas.height = H
    const onResize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H }
    window.addEventListener('resize', onResize)"""

if old_canvas in login_content:
    login_content = login_content.replace(old_canvas, new_canvas)
    print("Successfully restored login canvas full-window resizing!")
else:
    old_canvas_alt = old_canvas.replace("\n", "\r\n")
    if old_canvas_alt in login_content:
        login_content = login_content.replace(old_canvas_alt, new_canvas)
        print("Successfully restored login canvas full-window resizing (CRLF)!")
    else:
        print("Warning: login canvas resizing block for restoration not found!")

with open(login_path, "w", encoding="utf-8") as f:
    f.write(login_content)

print("Done! PhoneWrapper completely removed and original full-screen styles restored.")
