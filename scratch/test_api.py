import urllib.request
import json
import ssl

# Bypass SSL
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

client_id = "f0433788933f43c2b63cbcf59824ff29"
client_secret = "A49c4180737440e6b75F61577d2cbf79"
url = f"https://apitransporte.buenosaires.gob.ar/colectivos/vehiclePositionsSimple?client_id={client_id}&client_secret={client_secret}"

try:
    print("Fetching from GCBA API...")
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
        status = response.status
        print(f"Response status code: {status}")
        raw_data = response.read()
        data = json.loads(raw_data)
        print(f"Data type: {type(data)}, length: {len(data) if isinstance(data, list) else 'N/A'}")
        if isinstance(data, list) and len(data) > 0:
            print("\nSample item 1:")
            print(json.dumps(data[0], indent=2))
            
            print("\nSample item 2:")
            print(json.dumps(data[1], indent=2))
            
            # Let's count items matching various patterns
            print("\nSearching for items matching route_short_name or route_id related to 12, 28, 37...")
            matches = []
            for b in data:
                # print some matching route_short_name or route_id
                route_id = str(b.get('route_id', ''))
                route_short_name = str(b.get('route_short_name', ''))
                agency_id = str(b.get('agency_id', ''))
                
                if '12' in route_id or '12' in route_short_name or '28' in route_id or '28' in route_short_name:
                    matches.append((route_id, route_short_name, agency_id))
                    if len(matches) < 15:
                        print(f"Match: id={b.get('id')}, route_id={route_id}, route_short_name={route_short_name}, agency_id={agency_id}")
            print(f"Total matches found: {len(matches)}")
            
except Exception as e:
    print("Error:", e)
