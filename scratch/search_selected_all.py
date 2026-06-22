import os

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if 'setSelectedLines' in content:
                for i, line in enumerate(content.split('\n')):
                    if 'setSelectedLines' in line:
                        print(f"{path} Line {i+1}: {line.strip()}")
