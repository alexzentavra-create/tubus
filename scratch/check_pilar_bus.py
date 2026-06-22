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
    with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
        data = json.loads(response.read())
        
        print("Buses matching '12' in route_short_name or route_id:")
        for b in data:
            rsn = str(b.get('route_short_name', ''))
            rid = str(b.get('route_id', ''))
            if rsn.startswith('12') or rid == '12':
                print(f"ID={b.get('id')}, rsn={rsn}, rid={rid}, agency={b.get('agency_name')}, lat={b.get('latitude')}, lng={b.get('longitude')}")
except Exception as e:
    print("Error:", e)
