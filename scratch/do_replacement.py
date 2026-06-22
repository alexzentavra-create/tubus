# scratch/do_replacement.py
import sys

with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    page_content = f.read()

with open("scratch/target_block.txt", "r", encoding="utf-8") as f:
    target_block = f.read()

with open("scratch/new_drawer_jsx.txt", "r", encoding="utf-8") as f:
    new_block = f.read()

if target_block in page_content:
    updated_content = page_content.replace(target_block, new_block, 1)
    with open("src/app/page.tsx", "w", encoding="utf-8") as f:
        f.write(updated_content)
    print("SUCCESS: Target block found and replaced successfully!")
else:
    print("ERROR: Target block not found in page.tsx! Please check line boundaries.")
