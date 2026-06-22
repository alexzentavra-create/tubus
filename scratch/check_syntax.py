import sys

with open(r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

stack = []
for idx, char in enumerate(content):
    if char in ('{', '(', '['):
        stack.append((char, idx))
    elif char in ('}', ')', ']'):
        if not stack:
            print(f"Extra closing {char} at index {idx}")
            continue
        last, last_idx = stack.pop()
        if (char == '}' and last != '{') or (char == ')' and last != '(') or (char == ']' and last != '['):
            print(f"Mismatched {last} at index {last_idx} with {char} at index {idx}")

if stack:
    print(f"Unclosed items left on stack: {len(stack)}")
    for char, last_idx in stack[-5:]:
        # get line number
        line_num = content[:last_idx].count('\n') + 1
        snippet = content[last_idx:last_idx+50].replace('\n', ' ')
        print(f"  Unclosed '{char}' at line {line_num}: {snippet}")
else:
    print("Brackets are balanced!")
