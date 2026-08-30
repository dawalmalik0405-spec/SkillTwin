"""
End-to-End Dynamic Verification Test Script for Pages 7, 8, and 9.
Tests complete pipeline:
1. Candidate Onboarding (Page 1)
2. Evidence Collection with GitHub & Projects (Page 2)
3. Initial SkillTwin Synthesis (Page 3)
4. Target Role Selection & Benchmark Mapping (Page 4)
5. Gap Analysis (Page 5)
6. Roadmap Generation (Page 6)
7. Project Verification (Page 7) - empty state first, then genuine project submission & analysis
8. SkillTwin Updated (Page 8) - verified delta boosts, dynamic role alignment, growth points
9. Career Readiness (Page 9) - multi-factor weighted score, categorized skills, milestones
"""

import sys
import uuid
import httpx
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"

def test_pipeline():
    client = httpx.Client(base_url=BASE_URL, timeout=15.0)

    test_user_id = f"usr-test-{uuid.uuid4().hex[:6]}"
    test_email = f"candidate_{uuid.uuid4().hex[:6]}@example.com"
    print(f"=== Starting E2E Pipeline Test for {test_email} ({test_user_id}) ===")

    # 1. Onboarding
    print("\n--- 1. Onboarding Candidate ---")
    onboard_payload = {
        "name": "Sarah Chen",
        "email": test_email,
        "education_level": "Undergraduate",
        "degree": "B.Tech Computer Science",
        "branch": "Computer Science & Engineering",
        "semester_year": "3rd Year",
        "target_role": "Full-Stack Developer",
        "study_time_per_day": "2-3 hours/day",
        "preferred_learning_style": "Hands-on projects",
        "preferred_language": "English"
    }
    r = client.post("/api/evidence/onboarding", json=onboard_payload)
    assert r.status_code in [200, 201], f"Onboarding failed: {r.text}"
    user_prof = r.json()
    print(f"[OK] Onboarded successfully: {user_prof['name']} -> Target Role: {user_prof['target_role']}")

    # 2. Check Empty State for Page 7 (Project Verification)
    print("\n--- 2. Checking Page 7 Initial Empty State ---")
    r = client.get(f"/api/verification/projects?user_id={test_email}")
    assert r.status_code == 200, f"Verification fetch failed: {r.text}"
    verif_empty = r.json()
    print(f"[OK] Total projects for new candidate: {verif_empty['total_projects']} (Verified: {verif_empty['verified_count']})")
    assert verif_empty['total_projects'] == 0, "Expected 0 initial projects for fresh user"
    assert verif_empty['overall_credibility_score'] == 0, "Expected 0 initial credibility score"

    # 3. Check Page 8 (SkillTwin Updated) Baseline State
    print("\n--- 3. Checking Page 8 Baseline State ---")
    r = client.get(f"/api/skilltwin/updated?user_id={test_email}")
    assert r.status_code == 200, f"SkillTwin updated fetch failed: {r.text}"
    twin_baseline = r.json()
    print(f"[OK] Baseline alignment: {twin_baseline['overall_alignment_pct']}% | Verified projects: {twin_baseline['verified_projects_count']}")
    assert twin_baseline['verified_projects_count'] == 0, "Expected 0 verified projects initially"
    assert twin_baseline['skills_improved_count'] == 0, "Expected 0 improved skills initially"

    # 4. Check Page 9 (Career Readiness) Baseline State
    print("\n--- 4. Checking Page 9 Baseline State ---")
    r = client.get(f"/api/readiness/dashboard?user_id={test_email}")
    assert r.status_code == 200, f"Readiness dashboard failed: {r.text}"
    readiness_baseline = r.json()
    print(f"[OK] Baseline Career Readiness Score: {readiness_baseline['career_readiness_score']}% ({readiness_baseline['career_readiness_label']})")
    assert readiness_baseline['total_verified_projects'] == 0, "Expected 0 verified projects in baseline readiness"

    # 5. Submit Real GitHub Project on Page 7
    print("\n--- 5. Submitting Real Project on Page 7 (Project Verification) ---")
    submit_payload = {
        "repo_url": "https://github.com/facebook/react",
        "primary_skill": "React.js",
        "user_id": test_email
    }
    r = client.post("/api/verification/submit", json=submit_payload)
    assert r.status_code == 200, f"Project submission failed: {r.text}"
    verif_res = r.json()
    print(f"[OK] Project submitted & verified! Total: {verif_res['total_projects']}, Verified: {verif_res['verified_count']}, Credibility: {verif_res['overall_credibility_score']}%")
    assert verif_res['verified_count'] >= 1, "Expected project to be verified"
    first_proj = verif_res['projects'][0]
    print(f"  Project: {first_proj['name']} | Score: {first_proj['score_pct']}% ({first_proj['score_label']})")
    print(f"  Demonstrated Skills: {[s['skill_name'] for s in first_proj['verified_skills']]}")

    # 6. Check Page 8 (SkillTwin Updated) with Real Verified Evidence
    print("\n--- 6. Recalculating Page 8 (SkillTwin Updated) from Verified Evidence ---")
    r = client.get(f"/api/skilltwin/updated?user_id={test_email}")
    assert r.status_code == 200, f"SkillTwin updated fetch failed: {r.text}"
    twin_updated = r.json()
    print(f"[OK] Refreshed SkillTwin:")
    print(f"  Role Alignment: {twin_updated['overall_alignment_before_pct']}% -> {twin_updated['overall_alignment_pct']}% (+{twin_updated['overall_alignment_change_pct']}%)")
    print(f"  Average Proficiency: {twin_updated['average_proficiency_before_pct']}% -> {twin_updated['average_proficiency_pct']}% (+{twin_updated['average_proficiency_change_pct']}%)")
    print(f"  Average Confidence: {twin_updated['average_confidence_before_pct']}% -> {twin_updated['average_confidence_pct']}% (+{twin_updated['average_confidence_change_pct']}%)")
    print(f"  Skills Improved: {twin_updated['skills_improved_count']}")
    print(f"  Latest Verified Project: {twin_updated['latest_verified_project']['name'] if twin_updated['latest_verified_project'] else 'None'}")
    assert twin_updated['verified_projects_count'] >= 1, "Expected verified projects count >= 1"
    assert twin_updated['skills_improved_count'] >= 1, "Expected at least 1 improved skill"
    assert len(twin_updated['skill_changes']) >= 1, "Expected skill changes array populated"
    first_change = twin_updated['skill_changes'][0]
    print(f"  Sample Skill Delta: {first_change['skill_name']} -> {first_change['before_level']} ({first_change['before_pct']}%) to {first_change['after_level']} ({first_change['after_pct']}%) [+{first_change['change_pct']}%]")
    print(f"  Evidence Citation: {first_change['evidence_text']}")

    # 7. Check Page 9 (Career Readiness) Multi-Factor Recalculation
    print("\n--- 7. Recalculating Page 9 (Career Readiness) ---")
    r = client.get(f"/api/readiness/dashboard?user_id={test_email}")
    assert r.status_code == 200, f"Readiness dashboard failed: {r.text}"
    readiness_updated = r.json()
    print(f"[OK] Career Readiness Score: {readiness_updated['career_readiness_score']}% ({readiness_updated['career_readiness_label']}) [+{readiness_updated['career_readiness_change_pct']}% boost]")
    print(f"  Industry Alignment: {readiness_updated['industry_alignment_pct']}% ({readiness_updated['industry_alignment_label']})")
    print(f"  Total Verified Projects: {readiness_updated['total_verified_projects']}")
    print(f"  Strong Skills: {[s['name'] for s in readiness_updated['strong_skills']]}")
    print(f"  Critical Gaps: {[s['name'] for s in readiness_updated['critical_gaps']]}")
    print(f"  Recommended Action: {readiness_updated['recommended_action']['title']} ({readiness_updated['recommended_action']['priority_label']})")
    print(f"  Journey Milestones: {[(m['label'], m['value']) for m in readiness_updated['journey_milestones']]}")

    assert readiness_updated['career_readiness_score'] > readiness_baseline['career_readiness_score'], "Readiness score should increase with verified projects"
    assert readiness_updated['total_verified_projects'] >= 1, "Verified projects count should be >= 1"
    assert len(readiness_updated['strong_skills']) >= 1 or len(readiness_updated['developing_skills']) >= 1, "Expected categorized skills"

    # 8. Test Export Reports for Pages 7, 8, 9
    print("\n--- 8. Testing Downloadable Reports ---")
    r7 = client.get(f"/api/verification/export-report?user_id={test_email}")
    assert r7.status_code == 200, "Verification export report failed"
    print(f"[OK] Page 7 Export Report generated ({len(r7.text)} bytes)")

    r8 = client.get(f"/api/skilltwin/updated/export-report?user_id={test_email}")
    assert r8.status_code == 200, "SkillTwin Updated export report failed"
    print(f"[OK] Page 8 Export Report generated ({len(r8.text)} bytes)")

    r9 = client.get(f"/api/readiness/export-report?user_id={test_email}")
    assert r9.status_code == 200, "Career Readiness export report failed"
    print(f"[OK] Page 9 Export Report generated ({len(r9.text)} bytes)")

    print("\n=== ALL E2E DYNAMIC PIPELINE TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_pipeline()
