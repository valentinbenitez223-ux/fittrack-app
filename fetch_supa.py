import urllib.request
import json
import time

SUPABASE_URL = "https://gwpkeeboywqsydjqumzk.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cGtlZWJveXdxc3lkanF1bXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTE4NDksImV4cCI6MjA5NjA2Nzg0OX0.Ysat6PVUMQEfd0Q6LnIniX98tF7blD2fTjtlVN8Nuu0"

def signup():
    url = f"{SUPABASE_URL}/auth/v1/signup"
    headers = {
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
    }
    data = {
        "email": f"test{int(time.time())}@example.com",
        "password": "password123"
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print("Signup error:", e)
        return None

auth_data = signup()
if not auth_data:
    exit(1)

access_token = auth_data['access_token']

url = f"{SUPABASE_URL}/rest/v1/students?select=*"
headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {access_token}"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"Total students found: {len(data)}")
        for s in data:
            print(s)
except urllib.error.HTTPError as e:
    print(f"Error fetching data: {e.code} {e.reason}")
    print(e.read().decode())
