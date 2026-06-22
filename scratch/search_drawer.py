with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

keywords = ['drawerState', 'activeMode', 'selectedCity', 'touristYellowSelected', 'touristRedSelected', 'selectedTouristStop', 'Asistente de Viaje']
for kw in keywords:
    print(f"Keyword '{kw}': {content.count(kw)} occurrences")
