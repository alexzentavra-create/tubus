with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'TOP BAR (Multi-selection' in line or 'Unified Floating Controls right side of map' in line:
        print(f"Line {i+1}: {line.strip()}")
