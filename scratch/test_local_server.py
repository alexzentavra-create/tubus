import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "http://localhost:3001/api/buses?line_id=line-1&line_number=12"

try:
    print(f"Querying local server: {url}")
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
        status = response.status
        print(f"Status: {status}")
        raw = response.read()
        data = json.loads(raw)
        print("Response Keys:", list(data.keys()))
        print("Buses Count:", len(data.get('data', [])))
        if len(data.get('data', [])) > 0:
            print("Sample Bus:")
            print(json.dumps(data.get('data', [])[0], indent=2))
        else:
            print("Response Data:", data)
except Exception as e:
    print("Error:", e)
