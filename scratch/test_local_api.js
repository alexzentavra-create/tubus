import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Query local api on localhost port 3000 (standard next.js port)
# Wait, let's see if next.js is currently running, or if we can run it or call it.
# Actually, since it's next.js, we can write a script that imports GET from src/app/api/buses/route.ts and calls it directly with a NextRequest mock!
# Let's do that - it's 100% reliable and doesn't require any network ports to be open or next server to be running.
