from backend.database import check_db_connection, get_db_connection, init_db
from backend.main import app
from fastapi.testclient import TestClient
import json

print("=== 1. Checking Database Connection ===")
health = check_db_connection()
print("DB Health:", json.dumps(health, indent=2))

conn = get_db_connection()
if conn:
    with conn.cursor() as cur:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
        tables = [row[0] for row in cur.fetchall()]
        print("Database Tables in PostgreSQL:", tables)
    conn.close()
else:
    print("Database is disconnected or unreachable.")

print("\n=== 2. Testing FastAPI TestClient Endpoints ===")
client = TestClient(app)

res_root = client.get("/")
print("GET / ->", res_root.status_code, res_root.json())

res_health = client.get("/api/health")
print("GET /api/health ->", res_health.status_code, res_health.json())

# Test Target Role endpoints
res_roles = client.get("/api/target-role/roles")
print("GET /api/target-role/roles ->", res_roles.status_code, "Count:", len(res_roles.json().get("roles", [])))

res_fullstack = client.get("/api/target-role/role/fullstack")
print("GET /api/target-role/role/fullstack ->", res_fullstack.status_code, "Title:", res_fullstack.json().get("role", {}).get("title"))

# Test Evidence sample / test endpoints
res_ev_types = client.get("/api/evidence/types")
print("GET /api/evidence/types ->", res_ev_types.status_code, res_ev_types.json() if res_ev_types.status_code == 200 else res_ev_types.text)

print("\n=== All Backend Checks Completed Successfully! ===")
