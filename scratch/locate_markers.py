# scratch/locate_markers.py
import re

with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

queries = [
    "renderDrawerContent",
    "TOP BAR",
    "Filter Toolbar",
    "Travel Planner Panel",
    "Unified Floating Controls",
    "activeMode",
    "touristYellowSelected",
    "solveRoutes",
    "MOCK_LINES",
    "OFFICIAL_ROUTES"
]

print(f"Total lines in page.tsx: {len(lines)}")
for q in queries:
    matches = [i+1 for i, line in enumerate(lines) if q in line]
    print(f"Query '{q}': found on lines: {matches[:15]}")
