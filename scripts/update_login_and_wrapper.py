import os

# 1. Update PhoneWrapper.tsx to use a warm sand-beige background when Phone View is active
wrapper_path = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\components\PhoneWrapper.tsx"
with open(wrapper_path, "r", encoding="utf-8") as f:
    wrapper_content = f.read()

old_wrapper_bg = """        /* 📱 Phone Format Container */
        <div className="flex-1 w-full py-12 px-4 flex items-center justify-center relative bg-gradient-to-b from-[#080b11] via-[#0b0f19] to-[#07090e]">
          {/* Ambient Glowing Background Blobs */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[80px] pointer-events-none" />"""

new_wrapper_bg = """        /* 📱 Phone Format Container */
        <div className="flex-1 w-full py-12 px-4 flex items-center justify-center relative bg-[#f4f4f0] transition-all duration-300">
          {/* Subtle elegant shadow under the phone for realistic surface placement */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.01)_0%,rgba(0,0,0,0.04)_100%)] pointer-events-none" />"""

if old_wrapper_bg in wrapper_content:
    wrapper_content = wrapper_content.replace(old_wrapper_bg, new_wrapper_bg)
    print("Successfully updated PhoneWrapper background!")
else:
    # Try alternate line endings
    old_wrapper_bg_alt = old_wrapper_bg.replace("\n", "\r\n")
    if old_wrapper_bg_alt in wrapper_content:
        wrapper_content = wrapper_content.replace(old_wrapper_bg_alt, new_wrapper_bg)
        print("Successfully updated PhoneWrapper background (CRLF)!")
    else:
        print("Warning: PhoneWrapper background block not found!")

with open(wrapper_path, "w", encoding="utf-8") as f:
    f.write(wrapper_content)


# 2. Update login/page.tsx
login_path = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx"
with open(login_path, "r", encoding="utf-8") as f:
    login_content = f.read()

# Make canvas position absolute instead of fixed
login_content = login_content.replace(
    "position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0",
    "position:'absolute',inset:0,width:'100%',height:'100%',zIndex:0"
)

# Decrease sizes
login_content = login_content.replace("padding:'24px 16px',", "padding:'16px 12px',")
login_content = login_content.replace("maxWidth:'380px',", "maxWidth:'320px',")
login_content = login_content.replace("marginBottom:'24px'", "marginBottom:'12px'")

old_logo_box = """          <motion.div style={{
            width:'56px',height:'56px',borderRadius:'16px',
            border:'1px solid rgba(184,200,224,0.15)',
            overflow: 'hidden',
            display:'flex',alignItems:'center',justifyContent:'center',
            margin:'0 auto 12px',
            background: 'var(--elevated)'
          }}"""

new_logo_box = """          <motion.div style={{
            width:'44px',height:'44px',borderRadius:'12px',
            border:'1px solid rgba(184,200,224,0.15)',
            overflow: 'hidden',
            display:'flex',alignItems:'center',justifyContent:'center',
            margin:'0 auto 8px',
            background: 'var(--elevated)'
          }}"""

login_content = login_content.replace(old_logo_box, new_logo_box)
login_content = login_content.replace(old_logo_box.replace("\n", "\r\n"), new_logo_box)

login_content = login_content.replace("fontSize:'32px',color:'var(--text-primary)'", "fontSize:'24px',color:'var(--text-primary)'")
login_content = login_content.replace("fontSize:'13px',marginTop:'4px',", "fontSize:'11px',marginTop:'2px',")
login_content = login_content.replace("padding:'28px 24px 30px'", "padding:'18px 16px 20px'")
login_content = login_content.replace("fontSize:'20px',color:'var(--text-primary)',textAlign:'center',margin:'0 0 20px'", "fontSize:'16px',color:'var(--text-primary)',textAlign:'center',margin:'0 0 12px'")
login_content = login_content.replace("marginBottom:'20px'", "marginBottom:'12px'")
login_content = login_content.replace("padding:'8px',borderRadius:'8px',fontSize:'12px',", "padding:'6px',borderRadius:'8px',fontSize:'11px',")
login_content = login_content.replace("gap:'12px'", "gap:'8px'")

login_content = login_content.replace("padding:'14px 44px 14px 16px',", "padding:'11px 40px 11px 14px',")
login_content = login_content.replace("fontSize:'13px',", "fontSize:'12px',")
login_content = login_content.replace("margin: '4px 0 10px', fontSize: '12px',", "margin: '2px 0 6px', fontSize: '11px',")

old_submit = """                <button type="submit" disabled={loading} className="action-btn"
                  style={{
                    width:'100%',
                    padding:'15px 28px',
                    marginTop:'8px',
                    background:loading?'linear-gradient(145deg, #2D3444, #1E2638)':'linear-gradient(145deg, rgba(194,200,212,1) 0%, rgba(154,164,184,1) 50%, rgba(176,184,200,1) 100%)',
                    color:'#0A0E14',
                    fontFamily:'Syne,sans-serif',
                    fontWeight:700,
                    fontSize:'13px',"""

new_submit = """                <button type="submit" disabled={loading} className="action-btn"
                  style={{
                    width:'100%',
                    padding:'11px 20px',
                    marginTop:'4px',
                    background:loading?'linear-gradient(145deg, #2D3444, #1E2638)':'linear-gradient(145deg, rgba(194,200,212,1) 0%, rgba(154,164,184,1) 50%, rgba(176,184,200,1) 100%)',
                    color:'#0A0E14',
                    fontFamily:'Syne,sans-serif',
                    fontWeight:700,
                    fontSize:'12px',"""

login_content = login_content.replace(old_submit, new_submit)
login_content = login_content.replace(old_submit.replace("\n", "\r\n"), new_submit)

login_content = login_content.replace("marginTop:'18px',", "marginTop:'12px',")
login_content = login_content.replace("marginTop:'20px',", "marginTop:'12px',")

# Remove Google login button and O divider
old_google = """              {mode==='login' && (<>
                <div style={{display:'flex',alignItems:'center',gap:'10px',margin:'18px 0 14px'}}>
                  <div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'}}/><span style={{fontSize:'10px',color:'var(--text-muted)',fontFamily:'DM Mono',letterSpacing:'0.08em'}}>O</span><div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'}}/>
                </div>
                <button onClick={loginWithGoogle} style={{
                  width:'100%',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:'10px',
                  background:'rgba(184,200,224,0.06)',
                  border:'1px solid rgba(184,200,224,0.15)',
                  borderRadius:'var(--r-md)',
                  padding:'13px 20px',
                  color:'var(--platinum)',
                  fontFamily:'DM Sans,sans-serif',
                  fontWeight:500,
                  fontSize:'14px',
                  cursor:'pointer',
                  transition:'all var(--t-base) var(--ease-out)',
                  boxShadow:'0 2px 8px rgba(0,0,0,0.3), 0 1px 0 rgba(184,200,224,0.05) inset'
                }}>
                  <svg width="15" height="15" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Continuar con Google
                </button>
              </>)}"""

login_content = login_content.replace(old_google, "")
login_content = login_content.replace(old_google.replace("\n", "\r\n"), "")

with open(login_path, "w", encoding="utf-8") as f:
    f.write(login_content)
print("Successfully resized and updated login view!")
