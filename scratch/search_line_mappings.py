# scratch/search_line_mappings.py
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    page_content = f.read()

pattern = r"([a-zA-Z0-9_]+)\.map\b"
for m in re.finditer(pattern, page_content):
    var_name = m.group(1)
    if var_name in ["lines", "allLines", "MOCK_LINES", "selectedLines"]:
        start = max(0, page_content.rfind("\n", 0, m.start()))
        end = min(len(page_content), page_content.find("\n", m.end()) + 120)
        snippet = page_content[start:end]
        print(f"Match for variable '{var_name}' at position {m.start()}:")
        print("-" * 40)
        print(snippet.strip())
        print("-" * 40)
        print()
