with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'setSelectedLines' in line or 'selectedLines' in line:
        print(f"Line {i+1}: {line.strip()}")
