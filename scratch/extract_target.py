# scratch/extract_target.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Extract lines 2370 to 2920 (0-indexed: 2369 to 2920)
target_lines = lines[2369:2920]
target_text = "".join(target_lines)

with open("scratch/target_block.txt", "w", encoding="utf-8") as out:
    out.write(target_text)

print(f"Target block length in chars: {len(target_text)}")
print("First line:")
print(repr(target_lines[0]))
print("Last line:")
print(repr(target_lines[-1]))
