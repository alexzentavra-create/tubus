import os

# 1. Append autofill and focus overrides to globals.css
css_path = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\globals.css"
with open(css_path, "r", encoding="utf-8") as f:
    css_content = f.read()

autofill_rules = """
/* ==========================================================================
   BROWSER AUTOFILL & INPUT FOCUS OVERRIDES
   ========================================================================== */
input:-webkit-autofill,
input:-webkit-autofill:hover, 
input:-webkit-autofill:focus, 
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px #f0f4f8 inset !important;
  box-shadow: 0 0 0 30px #f0f4f8 inset !important;
  -webkit-text-fill-color: #111827 !important;
  color: #111827 !important;
  border-radius: 8px !important;
  border: 1px solid rgba(184, 200, 224, 0.15) !important;
  outline: none !important;
  transition: background-color 5000s ease-in-out 0s;
}

input:focus,
input:-webkit-autofill:focus {
  outline: none !important;
  border: 1px solid rgba(184, 200, 224, 0.15) !important;
  box-shadow: none !important;
}
"""

if autofill_rules not in css_content:
    with open(css_path, "a", encoding="utf-8") as f:
        f.write(autofill_rules)
    print("Successfully appended autofill overrides to globals.css!")
else:
    print("Autofill overrides already present in globals.css.")


# 2. Simplify input border and shadow focus states in login/page.tsx
login_path = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx"
with open(login_path, "r", encoding="utf-8") as f:
    login_content = f.read()

old_input_style = """          background:f?'rgba(10,14,20,0.9)':'rgba(6,8,16,0.7)',
          border:`1px solid ${f?'rgba(184,200,224,0.3)':'rgba(184,200,224,0.08)'}`,
          borderRadius:'var(--r-sm)',
          color:'var(--text-primary)',
          fontSize:'12px',
          fontFamily:'DM Sans,sans-serif',
          outline:'none',
          transition:'all var(--t-base) var(--ease-out)',
          boxShadow:f?'0 0 0 2px rgba(184,200,224,0.08)':'none'"""

new_input_style = """          background:f?'rgba(10,14,20,0.95)':'rgba(6,8,16,0.85)',
          border:'1px solid rgba(184,200,224,0.12)',
          borderRadius:'var(--r-sm)',
          color:'var(--text-primary)',
          fontSize:'12px',
          fontFamily:'DM Sans,sans-serif',
          outline:'none',
          transition:'all var(--t-base) var(--ease-out)',
          boxShadow:'none'"""

if old_input_style in login_content:
    login_content = login_content.replace(old_input_style, new_input_style)
    print("Successfully updated login page input styles!")
else:
    # Try alternate line endings
    old_input_style_alt = old_input_style.replace("\n", "\r\n")
    if old_input_style_alt in login_content:
        login_content = login_content.replace(old_input_style_alt, new_input_style)
        print("Successfully updated login page input styles (CRLF)!")
    else:
        print("Warning: login page input styles block not found!")

with open(login_path, "w", encoding="utf-8") as f:
    f.write(login_content)

print("Done! Input autofill and outline styles successfully corrected.")
