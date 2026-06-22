import urllib.request
import json
import ssl
import re

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
        
        target_lines = ['12', '28', '37', '39', '59', '60', '102', '152']
        
        for line in target_lines:
            # We want to find which items correspond to this bus line.
            # In BA, the line could be route_short_name starting with '12' (like '12A', '12B') or route_id being '12' or something else.
            print(f"\n--- LINE {line} ---")
            found_short = []
            found_id = []
            
            # regex for line number
            regex = re.compile(rf'^0*{line}(?![0-9])', re.IGNORECASE)
            
            for b in data:
                rsn = str(b.get('route_short_name', ''))
                rid = str(b.get('route_id', ''))
                
                # Check both route_short_name and route_id
                if regex.match(rsn):
                    found_short.append(b)
                elif regex.match(rid):
                    found_id.append(b)
            
            print(f"Matches on route_short_name: {len(found_short)}")
            if found_short:
                sample = found_short[0]
                print(f"  Sample: id={sample.get('id')}, route_id={sample.get('route_id')}, route_short_name={sample.get('route_short_name')}, agency={sample.get('agency_name')}")
            
            print(f"Matches on route_id: {len(found_id)}")
            if found_id:
                sample = found_id[0]
                print(f"  Sample: id={sample.get('id')}, route_id={sample.get('route_id')}, route_short_name={sample.get('route_short_name')}, agency={sample.get('agency_name')}")

except Exception as e:
    print("Error:", e)
