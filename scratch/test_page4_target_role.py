import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from backend.main import app

def run_tests():
    client = TestClient(app)
    print("=" * 60)
    print("RUNNING PAGE 4 TARGET ROLE & INDUSTRY MAPPING TESTS")
    print("=" * 60)

    # 1. Test GET /api/target-role/roles
    res = client.get("/api/target-role/roles")
    assert res.status_code == 200, f"Failed: {res.text}"
    roles = res.json()
    print(f"[PASS] GET /api/target-role/roles: Found {len(roles)} available roles: {[r['role_name'] for r in roles]}")
    assert len(roles) >= 3

    # 2. Test GET /api/target-role/mapping for Full-Stack Developer
    res = client.get("/api/target-role/mapping?role=Full-Stack Developer&experience_level=Entry Level (0-2 years)&industry=All Industries")
    assert res.status_code == 200, f"Failed: {res.text}"
    data = res.json()
    print(f"[PASS] GET /api/target-role/mapping (Full-Stack Developer):")
    print(f"  - Total Skills: {data['total_skills_required']}")
    print(f"  - Core (Must-Have): {data['core_count']}")
    print(f"  - Important (Nice-to-Have): {data['important_count']}")
    print(f"  - Tools & Tech: {data['tools_count']}")
    print(f"  - Category Breakdown ({len(data['category_breakdown'])} items): {[c['category'] + ': ' + str(c['count']) for c in data['category_breakdown']]}")
    print(f"  - Top 5 In-Demand Skills: {[s['name'] + ' (' + s['demand_level'] + ')' for s in data['top_demand_skills']]}")
    print(f"  - Demand Trend: {data['demand_trend']['trend_direction']} {data['demand_trend']['percentage_change']}")

    assert data["total_skills_required"] == 38
    assert data["core_count"] == 12
    assert data["important_count"] == 18
    assert data["tools_count"] == 8
    assert len(data["top_demand_skills"]) == 5
    assert len(data["category_breakdown"]) == 5
    assert len(data["requirements"]) == 38

    # 3. Test Dynamic Role Change (Frontend Developer)
    res_fe = client.get("/api/target-role/mapping?role=Frontend Developer")
    assert res_fe.status_code == 200
    data_fe = res_fe.json()
    print(f"[PASS] GET /api/target-role/mapping (Frontend Developer): Total Skills: {data_fe['total_skills_required']}, Core: {data_fe['core_count']}")
    assert data_fe["role"] == "Frontend Developer"

    # 4. Test Export Report Endpoint
    res_export = client.get("/api/target-role/export-report?role=Full-Stack Developer")
    assert res_export.status_code == 200
    export_data = res_export.json()
    print(f"[PASS] GET /api/target-role/export-report: Successfully generated export report with {len(export_data['requirements'])} requirements.")
    assert "updated_at" in export_data

    print("=" * 60)
    print("ALL PAGE 4 TARGET ROLE TESTS PASSED SUCCESSFULLY! [OK]")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
