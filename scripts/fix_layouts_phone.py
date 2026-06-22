import os

def fix_page(filepath, old_str, new_str):
    print(f"Modifying {filepath}...")
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if old_str in content:
        content = content.replace(old_str, new_str)
        print("  Successfully replaced viewport string!")
    else:
        print("  Warning: old_str not found in file content!")
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

# File 1: page.tsx (Passenger View)
fix_page(
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\page.tsx",
    "<div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--void)' }}>",
    "<div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--void)' }}>"
)

# File 2: driver/page.tsx (Driver View)
fix_page(
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\driver\page.tsx",
    "<div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--void)', color: 'var(--text-primary)', fontFamily: 'DM Sans,sans-serif' }}>",
    "<div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--void)', color: 'var(--text-primary)', fontFamily: 'DM Sans,sans-serif' }}>"
)

# File 3: admin/page.tsx (Admin Control Panel)
fix_page(
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\page.tsx",
    "<div style={{minHeight:'100vh',background:'var(--void)',display:'flex',overflow:'hidden',height:'100vh',fontFamily:'DM Sans'}}>",
    "<div style={{minHeight:'100%',background:'var(--void)',display:'flex',overflow:'hidden',height:'100%',width:'100%',fontFamily:'DM Sans'}}>"
)

# File 4: admin/company/page.tsx (Company Admin Panel)
fix_page(
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\company\page.tsx",
    "<div style={{minHeight:'100vh',background:'#0b0f19',display:'flex',alignItems:'center',justifyContent:'center'}}>",
    "<div style={{minHeight:'100%',background:'#0b0f19',display:'flex',flexDirection:'column',width:'100%',height:'100%',alignItems:'center',justifyContent:'center'}}>"
)

# File 5: admin/super/page.tsx (Super Admin Panel)
fix_page(
    r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\super\page.tsx",
    "<div style={{minHeight:'100vh',background:'#0b0f19',display:'flex',alignItems:'center',justifyContent:'center'}}>",
    "<div style={{minHeight:'100%',background:'#0b0f19',display:'flex',flexDirection:'column',width:'100%',height:'100%',alignItems:'center',justifyContent:'center'}}>"
)

# File 6: login/page.tsx (Login View)
# We will do both the outer div replacement and the canvas dimensions replacement
login_path = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx"
with open(login_path, "r", encoding="utf-8") as f:
    login_content = f.read()

# Replace outer div
old_outer = "<div style={{minHeight:'100vh',width:'100vw',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px 16px',background:'var(--void)',fontFamily:'DM Sans,sans-serif',position:'relative',overflow:'hidden'}}>"
new_outer = "<div style={{minHeight:'100%',height:'100%',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 16px',background:'var(--void)',fontFamily:'DM Sans,sans-serif',position:'relative',overflow:'hidden'}}>"

if old_outer in login_content:
    login_content = login_content.replace(old_outer, new_outer)
    print("Successfully replaced login outer div!")
else:
    print("Warning: login outer div not found!")

# Replace canvas resizing
old_canvas = """    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    let W = window.innerWidth, H = window.innerHeight
    canvas.width = W; canvas.height = H
    const onResize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H }
    window.addEventListener('resize', onResize)"""

new_canvas = """    const canvas = canvasRef.current; if (!canvas) return
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

if old_canvas in login_content:
    login_content = login_content.replace(old_canvas, new_canvas)
    print("Successfully replaced login canvas background sizing!")
else:
    # Try alternate spacing
    old_canvas_alt = old_canvas.replace("\n", "\r\n")
    if old_canvas_alt in login_content:
        login_content = login_content.replace(old_canvas_alt, new_canvas)
        print("Successfully replaced login canvas background sizing (CRLF)!")
    else:
        print("Warning: login canvas resizing block not found!")

with open(login_path, "w", encoding="utf-8") as f:
    f.write(login_content)

print("Done! Outer layout sizes corrected in all pages.")
