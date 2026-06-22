import os
import re

def wrap_page(filepath, default_mode, title):
    print(f"Processing {filepath}...")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Add import statement if not present
    if "import PhoneWrapper" not in content:
        # Insert after 'use client' or at the very top
        if "'use client'" in content:
            content = content.replace("'use client'", "'use client'\nimport PhoneWrapper from '@/components/PhoneWrapper'", 1)
        elif '"use client"' in content:
            content = content.replace('"use client"', '"use client"\nimport PhoneWrapper from "@/components/PhoneWrapper"', 1)
        else:
            content = "import PhoneWrapper from '@/components/PhoneWrapper'\n" + content

    # 2. Find the default export function
    match = re.search(r'export\s+default\s+function\s+(\w+)', content)
    if not match:
        print(f"Could not find default export in {filepath}")
        return
    
    func_name = match.group(1)
    func_start = match.start()
    
    # Find the opening brace of the function
    brace_idx = content.find("{", func_start)
    if brace_idx == -1:
        print(f"Could not find opening brace for {func_name}")
        return
    
    # Brace count to find the end of the function
    brace_count = 1
    func_end = -1
    for i in range(brace_idx + 1, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                func_end = i + 1
                break
                
    if func_end == -1:
        print(f"Could not find closing brace for {func_name}")
        return
        
    func_block = content[brace_idx:func_end]
    
    # Within the func_block, let's locate the main return statement at brace level 1
    # We do a pass over func_block to find "return (" at level 1
    curr_brace = 0
    ret_pos = -1
    for idx in range(len(func_block)):
        if func_block[idx] == '{':
            curr_brace += 1
        elif func_block[idx] == '}':
            curr_brace -= 1
        elif curr_brace == 1:
            # Check if "return (" starts here
            if func_block[idx:idx+8] == 'return (':
                ret_pos = idx
                break
                
    if ret_pos == -1:
        print(f"Could not find main 'return (' at level 1 in {func_name}")
        return
        
    # Find the closing parenthesis of this return statement
    # The return statement is "return (\n  <...\n)" at level 1
    paren_count = 1
    ret_end = -1
    for idx in range(ret_pos + 8, len(func_block)):
        if func_block[idx] == '(':
            paren_count += 1
        elif func_block[idx] == ')':
            paren_count -= 1
            if paren_count == 0:
                ret_end = idx + 1
                break
                
    if ret_end == -1:
        print(f"Could not find closing parenthesis for 'return ('")
        return
        
    # Wrap the return content
    # The return string is func_block[ret_pos:ret_end] which is "return (\n  ...\n)"
    # We want to change it to:
    # return (
    #   <PhoneWrapper defaultMode="mode" title="title">
    #     ...
    #   </PhoneWrapper>
    # )
    orig_return = func_block[ret_pos:ret_end]
    
    # Extract the JSX inside return(...)
    # It is between return ( and the final )
    jsx_content = orig_return[8:-1]
    
    wrapped_return = f'return (\n    <PhoneWrapper defaultMode="{default_mode}" title="{title}">\n      {jsx_content.strip()}\n    </PhoneWrapper>\n  )'
    
    # Replace in func_block
    new_func_block = func_block[:ret_pos] + wrapped_return + func_block[ret_end:]
    
    # Replace in content
    new_content = content[:brace_idx] + new_func_block + content[func_end:]
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"Successfully wrapped {func_name} in {filepath}!")

wrap_page(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\page.tsx", "phone", "Pasajeros App")
wrap_page(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\driver\page.tsx", "phone", "Chofer App")
wrap_page(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\page.tsx", "computer", "Panel de Control de Líneas")
wrap_page(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\company\page.tsx", "computer", "Panel de Compañía")
wrap_page(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\admin\super\page.tsx", "computer", "Super Admin Dashboard")
wrap_page(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\login\page.tsx", "phone", "Inicio de Sesión")
