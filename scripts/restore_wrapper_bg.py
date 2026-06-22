import os

wrapper_path = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\components\PhoneWrapper.tsx"
with open(wrapper_path, "r", encoding="utf-8") as f:
    content = f.read()

old_bg = """        /* 📱 Phone Format Container */
        <div className="flex-1 w-full py-12 px-4 flex items-center justify-center relative bg-[#f4f4f0] transition-all duration-300">
          {/* Subtle elegant shadow under the phone for realistic surface placement */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.01)_0%,rgba(0,0,0,0.04)_100%)] pointer-events-none" />"""

new_bg = """        /* 📱 Phone Format Container */
        <div className="flex-1 w-full py-12 px-4 flex items-center justify-center relative bg-gradient-to-b from-[#080b11] via-[#0b0f19] to-[#07090e] transition-all duration-300">
          {/* Ambient Glowing Background Blobs */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[80px] pointer-events-none" />"""

if old_bg in content:
    content = content.replace(old_bg, new_bg)
    print("Successfully restored PhoneWrapper dark background!")
else:
    # Try alternate line endings
    old_bg_alt = old_bg.replace("\n", "\r\n")
    if old_bg_alt in content:
        content = content.replace(old_bg_alt, new_bg)
        print("Successfully restored PhoneWrapper dark background (CRLF)!")
    else:
        print("Error: Background block not found in PhoneWrapper.tsx!")

with open(wrapper_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished updating PhoneWrapper.tsx!")
