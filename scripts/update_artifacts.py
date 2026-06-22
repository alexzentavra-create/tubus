import sys

sys.stdout.reconfigure(encoding='utf-8')

# 1. Update task.md
task_path = r"C:\Users\aleja\.gemini\antigravity\brain\f3d71b18-4bcd-4121-aebe-154e4824e8ac\task.md"
task_content = """# Checklist of Completed Tasks

- [x] Query Project OSRM API to systematically align all 11 bus line paths in `officialRoutes.ts` with the actual OpenStreetMap road network.
- [x] Dynamically recalculate and map each stop's `pathIndex` to the closest OSRM coordinates to maintain absolute synchronicity in the simulation.
- [x] Create the premium, interactive `PhoneWrapper.tsx` component featuring a segmented viewport controller, glowing ambient backgrounds, iPhone-style mockup border, notch, home bar, and active mock status bar.
- [x] Wrap the 6 major application pages with `PhoneWrapper` to provide layout emulation toggling across all profiles.
- [x] Enforce page-specific default viewing layouts:
  - **Passenger App** (`/`): Defaults to Phone view.
  - **Chofer App** (`/driver`): Defaults to Phone view.
  - **Inicio de Sesión** (`/login`): Defaults to Phone view.
  - **Admin dashboards** (`/admin`, `/admin/company`, `/admin/super`): Default to Desktop view.
- [x] Verify full static optimization and Next.js production compilation with a successful `npm run build`.
- [x] Stage, commit, and push core implementation changes to remote GitHub repository (`main` branch).
"""

with open(task_path, "w", encoding="utf-8") as f:
    f.write(task_content)
print("Updated task.md successfully!")

# 2. Append to walkthrough.md
walkthrough_path = r"C:\Users\aleja\.gemini\antigravity\brain\f3d71b18-4bcd-4121-aebe-154e4824e8ac\walkthrough.md"
with open(walkthrough_path, "r", encoding="utf-8") as f:
    wt_content = f.read()

new_section = """
---

## 15. Real-World OSRM Street Grid Alignment and Mobile Device Emulator Viewport Toggle

We have implemented two massive visual and mathematical upgrades to resolve the user's feedback regarding block-crossing paths and responsive mockup presentation:

### A. System-Wide OSRM Road Grid Path Realignment
To completely eliminate all instances of path segments cutting diagonally through blocks, buildings, or railway tracks (such as the Palermo terminal end or the Recoleta Ayacucho/Riobamba segment on Line 12), we transitioned from linear interpolation to dynamic street routing:
1. **Automated OSRM Street Routing**:
   - Developed a Python script to extract stops lists for all 11 active bus lines (`12`, `24`, `28`, `37`, `55`, `60`, `71`, `88`, `102`, `115`, and `152`) inside [officialRoutes.ts](file:///C:/Users/aleja/.gemini/antigravity/scratch/tubus/src/lib/officialRoutes.ts).
   - Queried the official OpenStreetMap Project OSRM (Open Source Routing Machine) API using exact stop coordinate lists to generate complete, high-fidelity street-snapped coordinates.
   - This guarantees that 100% of all route coordinate sequences are placed strictly along real-world streets and lanes, preventing any diagonal block cuts or building-crossing lines.
2. **Dynamic pathIndex Mapping**:
   - For every stops list, the script scanned the new OSRM coordinate stream, calculated the nearest point in the generated path using the coordinate distance-squared formula, and dynamically updated the stop's `pathIndex`.
   - This ensures absolute synchronicity between route paths and stops, allowing the live simulation, passenger trackers, and bus pause telemetries to continue functioning cleanly.

### B. Segmented App Toggle and Phone Emulator Frame wrapper
To allow viewing pages in both realistic native smartphone form factor and regular responsive computer format:
1. **Premium Phone Emulator Component**:
   - Created the [PhoneWrapper.tsx](file:///C:/Users/aleja/.gemini/antigravity/scratch/tubus/src/components/PhoneWrapper.tsx) component featuring a fully interactive segmented switcher at the very top of the screen: **Celular** (Phone App view) vs **Computadora** (Desktop view).
   - When **Celular** is selected, the component centers the child page inside a high-end smartphone mock container styled with premium aesthetics:
     - Outer frame with thin dark bezels, rounded corners (`rounded-[48px]`), and solid box shadows.
     - Top dynamic island/notch mock housing the camera.
     - Active status bar displaying local time (synced via React effect), network connections, and battery levels.
     - Scrollable content viewport with hidden scrollbars for native touch feel.
     - Slim bottom home indicator bar.
     - Seamless background overlay showcasing gorgeous blurred ambient tech glows behind the floating device.
2. **Page-Specific Layout Defaulting**:
   - Integrated the wrapper cleanly across all 6 main application entry points, enforcing respective starting formats:
     - **Passenger view** ([page.tsx](file:///C:/Users/aleja/.gemini/antigravity/scratch/tubus/src/app/page.tsx)): Defaults to **Phone Format**.
     - **Driver view** ([driver/page.tsx](file:///C:/Users/aleja/.gemini/antigravity/scratch/tubus/src/app/driver/page.tsx)): Defaults to **Phone Format**.
     - **Login page** ([login/page.tsx](file:///C:/Users/aleja/.gemini/antigravity/scratch/tubus/src/app/login/page.tsx)): Defaults to **Phone Format**.
     - **Lines Admin** ([admin/page.tsx](file:///C:/Users/aleja/.gemini/antigravity/scratch/tubus/src/app/admin/page.tsx)): Defaults to **Computer Format**.
     - **Company Admin** ([admin/company/page.tsx](file:///C:/Users/aleja/.gemini/antigravity/scratch/tubus/src/app/admin/company/page.tsx)): Defaults to **Computer Format**.
     - **Super Admin** ([admin/super/page.tsx](file:///C:/Users/aleja/.gemini/antigravity/scratch/tubus/src/app/admin/super/page.tsx)): Defaults to **Computer Format**.
   - These defaults ensure that users see interfaces in their intended native environment at first glance, while preserving the full flexibility to toggle layouts interactively.
"""

# Append the new section
wt_content_updated = wt_content + new_section
with open(walkthrough_path, "w", encoding="utf-8") as f:
    f.write(wt_content_updated)
print("Updated walkthrough.md successfully!")
