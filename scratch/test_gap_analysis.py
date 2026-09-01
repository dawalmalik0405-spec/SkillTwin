"""
Test script to verify evidence-to-proficiency-to-gap calculation in Skill Gap Analysis.
"""

import sys
from pathlib import Path

# Add backend path
root_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_path))

from backend.routers.gap_analysis import compute_skill_gap_analysis
from backend.routers.evidence import _in_memory_evidence, _normalize_user_key
from backend.shared.models import ExtractedSkillItem, ResumeAnalysisResponse, GitHubAnalysisResponse, GitHubRepoItem, ProjectItem
from datetime import datetime

def run_tests():
    print("==================================================================")
    print("        RUNNING SKILL GAP ANALYSIS ENGINE VERIFICATION TESTS      ")
    print("==================================================================")

    # -------------------------------------------------------------
    # Test 1: User with NO evidence (Fresh clean user)
    # -------------------------------------------------------------
    print("\n--- TEST 1: User with ZERO Evidence ---")
    user_id_1 = "test-user-zero-evidence"
    res1 = compute_skill_gap_analysis(role_name="Full-Stack Developer", user_id=user_id_1)
    
    print(f"Target Role: {res1.target_role}")
    print(f"Overall Match: {res1.overall_match_percentage}%")
    print(f"Critical Gaps: {res1.critical_gaps_count} / {res1.total_gaps}")
    print(f"Readiness: {res1.readiness_rating}")
    
    # Assert all skills have 0% proficiency
    for g in res1.gaps[:5]:
        print(f"  Skill: {g.skill:<25} | Your: {g.your_proficiency_pct:>3}% ({g.your_proficiency_level}) | Req: {g.required_level_pct:>3}% | Gap: {g.gap_percentage:>4}% | Status: {g.match_status:<8} | Priority: {g.priority}")
        assert g.your_proficiency_pct == 0, f"Expected 0% for {g.skill}, got {g.your_proficiency_pct}%"
        assert g.your_proficiency_level == "Insufficient Evidence"
        assert g.match_status == "Missing"
    
    assert res1.overall_match_percentage == 0
    print("[PASS] Test 1 Passed: Zero-evidence user correctly shows 0% / Insufficient Evidence for all skills.")

    # -------------------------------------------------------------
    # Test 2: User with Resume Evidence Only
    # -------------------------------------------------------------
    print("\n--- TEST 2: User with Resume Evidence Only (Python, JavaScript, SQL) ---")
    user_id_2 = "test-user-resume-only"
    store_key_2 = _normalize_user_key(user_id_2)
    _in_memory_evidence[store_key_2] = {
        "resume": ResumeAnalysisResponse(
            filename="my_resume.pdf",
            file_size_kb=120.0,
            file_type="PDF",
            status="analyzed",
            skills_extracted=[
                ExtractedSkillItem(
                    skill_name="Python",
                    canonical_name="Python",
                    category="Backend",
                    proficiency="Advanced",
                    confidence_score=88.0,
                    evidence_source="Resume",
                    context_snippet="Developed backend REST microservices with Python",
                    reasoning="Demonstrated in resume projects"
                ),
                ExtractedSkillItem(
                    skill_name="JavaScript",
                    canonical_name="JavaScript",
                    category="Frontend",
                    proficiency="Intermediate",
                    confidence_score=75.0,
                    evidence_source="Resume",
                    context_snippet="Built interactive client web interfaces",
                    reasoning="Mentioned in web development experience"
                ),
                ExtractedSkillItem(
                    skill_name="SQL",
                    canonical_name="SQL",
                    category="Databases",
                    proficiency="Intermediate",
                    confidence_score=70.0,
                    evidence_source="Resume",
                    context_snippet="Wrote database queries and relational schemas",
                    reasoning="Relational SQL usage in resume"
                )
            ],
            technologies=["Python", "JavaScript", "SQL"],
            education="Bachelor of Science in Computer Science",
            experience_years=2.0,
            projects=["Student Portal"],
            certifications=[],
            summary="Resume analysis completed",
            processed_at=datetime.utcnow()
        ),
        "github": None,
        "projects": [],
        "skills": {},
        "technologies": set(["Python", "JavaScript", "SQL"]),
        "certifications": set(),
        "projects_found": set(["Student Portal"])
    }

    res2 = compute_skill_gap_analysis(role_name="Full-Stack Developer", user_id=user_id_2)
    print(f"Target Role: {res2.target_role}")
    print(f"Overall Match: {res2.overall_match_percentage}%")
    print(f"Matched/Strong Count: {res2.matched_skills_count + res2.strong_skills_count}")
    
    # Check Python, JavaScript, SQL vs Docker / React
    gaps_by_name = {g.skill: g for g in res2.gaps}
    
    py_gap = gaps_by_name.get("Python")
    js_gap = gaps_by_name.get("JavaScript")
    sql_gap = gaps_by_name.get("SQL")
    docker_gap = gaps_by_name.get("Docker Containerization") or gaps_by_name.get("Docker")

    print(f"  Python:     Your: {py_gap.your_proficiency_pct}% ({py_gap.your_proficiency_level}) | Req: {py_gap.required_level_pct}% | Gap: {py_gap.gap_percentage:+d}% | Status: {py_gap.match_status} | Sources: {py_gap.evidence_details.get('sources')}")
    print(f"  JavaScript: Your: {js_gap.your_proficiency_pct}% ({js_gap.your_proficiency_level}) | Req: {js_gap.required_level_pct}% | Gap: {js_gap.gap_percentage:+d}% | Status: {js_gap.match_status} | Sources: {js_gap.evidence_details.get('sources')}")
    print(f"  SQL:        Your: {sql_gap.your_proficiency_pct}% ({sql_gap.your_proficiency_level}) | Req: {sql_gap.required_level_pct}% | Gap: {sql_gap.gap_percentage:+d}% | Status: {sql_gap.match_status} | Sources: {sql_gap.evidence_details.get('sources')}")
    print(f"  Docker:     Your: {docker_gap.your_proficiency_pct}% ({docker_gap.your_proficiency_level}) | Req: {docker_gap.required_level_pct}% | Gap: {docker_gap.gap_percentage:+d}% | Status: {docker_gap.match_status} | Sources: {docker_gap.evidence_details.get('sources')}")

    assert py_gap.your_proficiency_pct > 0, "Python should have positive evidence-calculated proficiency"
    assert js_gap.your_proficiency_pct > 0, "JavaScript should have positive evidence-calculated proficiency"
    assert sql_gap.your_proficiency_pct > 0, "SQL should have positive evidence-calculated proficiency"
    assert docker_gap.your_proficiency_pct == 0, "Docker should have 0% because not in resume"
    assert docker_gap.match_status == "Missing"
    print("[PASS] Test 2 Passed: Resume-evidenced skills properly calculated and unevidenced skills marked Missing.")

    # -------------------------------------------------------------
    # Test 3: User with All 3 Sources (Resume + GitHub + Projects)
    # -------------------------------------------------------------
    print("\n--- TEST 3: User with All 3 Evidence Sources (Multi-Source Confirmation) ---")
    user_id_3 = "test-user-full-evidence"
    store_key_3 = _normalize_user_key(user_id_3)
    _in_memory_evidence[store_key_3] = {
        "resume": ResumeAnalysisResponse(
            filename="full_resume.pdf",
            file_size_kb=150.0,
            file_type="PDF",
            status="analyzed",
            skills_extracted=[
                ExtractedSkillItem(skill_name="React", canonical_name="React", category="Frontend", proficiency="Advanced", confidence_score=92.0, evidence_source="Resume", context_snippet="Built React client apps", reasoning="Demonstrated in projects"),
                ExtractedSkillItem(skill_name="TypeScript", canonical_name="TypeScript", category="Frontend", proficiency="Intermediate", confidence_score=85.0, evidence_source="Resume", context_snippet="Used TypeScript for typed codebase", reasoning="Demonstrated in codebase"),
                ExtractedSkillItem(skill_name="Python", canonical_name="Python", category="Backend", proficiency="Advanced", confidence_score=90.0, evidence_source="Resume", context_snippet="Engineered Python microservices", reasoning="Demonstrated in backend services"),
                ExtractedSkillItem(skill_name="FastAPI", canonical_name="FastAPI", category="Backend", proficiency="Intermediate", confidence_score=82.0, evidence_source="Resume", context_snippet="Built FastAPI endpoints", reasoning="REST API endpoints"),
                ExtractedSkillItem(skill_name="PostgreSQL", canonical_name="PostgreSQL", category="Databases", proficiency="Intermediate", confidence_score=80.0, evidence_source="Resume", context_snippet="Schema design in PostgreSQL", reasoning="Database operations"),
                ExtractedSkillItem(skill_name="Docker", canonical_name="Docker", category="DevOps", proficiency="Intermediate", confidence_score=78.0, evidence_source="Resume", context_snippet="Containerized apps with Docker", reasoning="Docker configuration"),
                ExtractedSkillItem(skill_name="Git", canonical_name="Git", category="DevOps", proficiency="Advanced", confidence_score=95.0, evidence_source="Resume", context_snippet="Version control with Git", reasoning="Repository collaboration"),
            ],
            technologies=["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker", "Git"],
            summary="Resume analysis"
        ),
        "github": GitHubAnalysisResponse(
            username="developer",
            profile_url="https://github.com/developer",
            status="analyzed",
            total_repositories=5,
            repos=[
                GitHubRepoItem(name="react-dashboard", html_url="https://github.com/developer/react-dashboard", primary_language="TypeScript", topics=["react", "typescript", "tailwindcss"]),
                GitHubRepoItem(name="fastapi-backend", html_url="https://github.com/developer/fastapi-backend", primary_language="Python", topics=["fastapi", "postgresql", "docker"]),
                GitHubRepoItem(name="infra-config", html_url="https://github.com/developer/infra-config", primary_language="Dockerfile", topics=["docker", "github-actions"])
            ],
            detected_languages=["TypeScript", "Python", "JavaScript"],
            detected_frameworks=["React", "FastAPI", "Docker", "TailwindCSS"],
            skills_extracted=[
                ExtractedSkillItem(skill_name="React", canonical_name="React", category="Frontend", proficiency="Advanced", confidence_score=95.0, evidence_source="GitHub", context_snippet="GitHub repo: react-dashboard", reasoning="Production repo proof"),
                ExtractedSkillItem(skill_name="FastAPI", canonical_name="FastAPI", category="Backend", proficiency="Intermediate", confidence_score=88.0, evidence_source="GitHub", context_snippet="GitHub repo: fastapi-backend", reasoning="Backend microservice proof"),
                ExtractedSkillItem(skill_name="Docker", canonical_name="Docker", category="DevOps", proficiency="Intermediate", confidence_score=85.0, evidence_source="GitHub", context_snippet="GitHub repo: infra-config", reasoning="Dockerfile configurations"),
            ]
        ),
        "projects": [
            ProjectItem(
                id="p-1",
                title="SkillTwin AI OS",
                url="https://skilltwin.ai",
                detected_technologies=["React", "TypeScript", "FastAPI", "PostgreSQL", "Docker"],
                skills_extracted=[
                    ExtractedSkillItem(skill_name="React", canonical_name="React", category="Frontend", proficiency="Advanced", confidence_score=94.0, evidence_source="Projects", context_snippet="Live project UI", reasoning="Full application architecture"),
                    ExtractedSkillItem(skill_name="FastAPI", canonical_name="FastAPI", category="Backend", proficiency="Advanced", confidence_score=90.0, evidence_source="Projects", context_snippet="Live project API", reasoning="Asynchronous REST architecture"),
                ]
            )
        ],
        "skills": {},
        "technologies": set(),
        "certifications": set(),
        "projects_found": set()
    }

    res3 = compute_skill_gap_analysis(role_name="Full-Stack Developer", user_id=user_id_3)
    print(f"Target Role: {res3.target_role}")
    print(f"Overall Match: {res3.overall_match_percentage}% ({res3.readiness_rating})")
    print(f"Strong Skills: {res3.strong_skills_count} | Matched Skills: {res3.matched_skills_count} | Critical: {res3.critical_gaps_count}")

    gaps_by_name3 = {g.skill: g for g in res3.gaps}
    react_gap = gaps_by_name3.get("React.js") or gaps_by_name3.get("React")
    fastapi_gap = gaps_by_name3.get("FastAPI")
    docker_gap = gaps_by_name3.get("Docker Containerization") or gaps_by_name3.get("Docker")

    print(f"  React:   Your: {react_gap.your_proficiency_pct}% ({react_gap.your_proficiency_level}) | Req: {react_gap.required_level_pct}% | Gap: {react_gap.gap_percentage:+d}% | Status: {react_gap.match_status} | Sources: {react_gap.evidence_details.get('sources')}")
    print(f"  FastAPI: Your: {fastapi_gap.your_proficiency_pct}% ({fastapi_gap.your_proficiency_level}) | Req: {fastapi_gap.required_level_pct}% | Gap: {fastapi_gap.gap_percentage:+d}% | Status: {fastapi_gap.match_status} | Sources: {fastapi_gap.evidence_details.get('sources')}")
    print(f"  Docker:  Your: {docker_gap.your_proficiency_pct}% ({docker_gap.your_proficiency_level}) | Req: {docker_gap.required_level_pct}% | Gap: {docker_gap.gap_percentage:+d}% | Status: {docker_gap.match_status} | Sources: {docker_gap.evidence_details.get('sources')}")

    assert len(react_gap.evidence_details.get("sources", [])) == 3, "React should have 3 evidence sources"
    assert react_gap.your_proficiency_pct >= 85, f"React with 3 sources should have >= 85% proficiency, got {react_gap.your_proficiency_pct}%"
    assert react_gap.match_status in ["Strong", "Matched"]
    assert len(fastapi_gap.evidence_details.get("sources", [])) == 3, "FastAPI should have 3 evidence sources"
    assert fastapi_gap.your_proficiency_pct >= 80, f"FastAPI with 3 sources should have >= 80%, got {fastapi_gap.your_proficiency_pct}%"
    assert res3.overall_match_percentage >= 25, "Overall match should reflect multi-source competence"
    print("[PASS] Test 3 Passed: 3-source evidence is fully recognized, multi-source bonuses applied, and match statuses reflect true proficiency.")

    # -------------------------------------------------------------
    # Test 4: Different Target Roles
    # -------------------------------------------------------------
    print("\n--- TEST 4: Frontend vs Backend vs ML Engineer Benchmarks ---")
    for role in ["Frontend Developer", "Backend Developer", "ML Engineer", "Data Scientist", "DevOps Engineer"]:
        role_res = compute_skill_gap_analysis(role_name=role, user_id=user_id_3)
        print(f"  {role:<22} -> Requirements: {role_res.total_gaps:>2} | Match: {role_res.overall_match_percentage:>3}% ({role_res.readiness_rating:<8}) | Critical: {role_res.critical_gaps_count}")
        assert role_res.total_gaps > 0
        assert role_res.overall_match_percentage >= 0

    print("[PASS] Test 4 Passed: All role benchmarks dynamically evaluate against evidence.")

    print("\n==================================================================")
    print("      ALL SKILL GAP ANALYSIS PROFICIENCY TESTS PASSED! (4/4)      ")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
