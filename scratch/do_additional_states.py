# scratch/do_additional_states.py
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

target = "const [lineSearchQuery, setLineSearchQuery] = useState('')"
replacement = """const [lineSearchQuery, setLineSearchQuery] = useState('')
  const [activeTravelRoute, setActiveTravelRoute] = useState<any>(null)
  const [alarmPinMode, setAlarmPinMode] = useState(false)
  const [alarmPinCoord, setAlarmPinCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [alarmSelectedLineId, setAlarmSelectedLineId] = useState<string | null>(null)
  const [alarmThresholdType, setAlarmThresholdType] = useState<'minutes' | 'blocks'>('minutes')
  const [alarmThresholdValue, setAlarmThresholdValue] = useState<number>(5)
  const [activeAlarms, setActiveAlarms] = useState<any[]>([])"""

if target in code:
    code = code.replace(target, replacement, 1)
    with open("src/app/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    print("SUCCESS: Added additional states to page.tsx")
else:
    print("ERROR: Target line for states not found!")
