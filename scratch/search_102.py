import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

client_id = "f0433788933f43c2b63cbcf59824ff29"
client_secret = "A49c4180737440e6b75F61577d2cbf79"
url = f"https://apitransporte.buenosaires.gob.ar/colectivos/vehiclePositionsSimple?client_id={client_id}&client_secret={client_secret}"

try:
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
        data = json.loads(response.read())
        
        print("Searching for CABRAL in agency_name...")
        found = []
        for b in data:
            agency = str(b.get('agency_name', ''))
            if 'CABRAL' in agency.upper():
                found.append(b)
                
        print(f"Found {len(found)} buses for CABRAL")
        if found:
            print("Sample bus details:")
            print(json.dumps(found[0], indent=2))
            
except Exception as e:
    print("Error:", e)
