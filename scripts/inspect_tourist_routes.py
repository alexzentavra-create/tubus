filepath = r"C:\Users\aleja\.gemini\antigravity\scratch\tubus\src\app\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

def print_stops_for_line(line_name):
    # Simple substring search
    pattern = f"OFFICIAL_ROUTES['{line_name}']"
    start_pos = content.find(pattern)
    if start_pos == -1:
        print(f"Could not find {line_name}")
        return
    
    # Find all stops: [ in the content after start_pos
    current_search_pos = start_pos
    while True:
        stops_pos = content.find('stops:', current_search_pos)
        if stops_pos == -1:
            break
            
        # Ensure it belongs to this line by checking if we have crossed the next OFFICIAL_ROUTES
        next_route_pos = content.find("OFFICIAL_ROUTES['", start_pos + 1)
        if next_route_pos != -1 and stops_pos > next_route_pos:
            break
            
        start_stops = content.find('[', stops_pos)
        brace_count = 0
        end_stops = -1
        for i in range(start_stops, len(content)):
            if content[i] == '[':
                brace_count += 1
            elif content[i] == ']':
                brace_count -= 1
                if brace_count == 0:
                    end_stops = i + 1
                    break
        if end_stops != -1:
            stops_str = content[start_stops:end_stops]
            print(f"\n--- {line_name} STOPS BLOCK ---")
            print(stops_str)
            
        current_search_pos = end_stops + 1

print_stops_for_line("T-Amarillo")
print_stops_for_line("T-Rojo")
