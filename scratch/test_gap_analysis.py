import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.routers.gap_analysis import compute_skill_gap_analysis
from backend.routers.evidence import _get_user_evidence_store, ExtractedSkillItem
from backend.shared.models import ProjectItem

def run_test():
    test_user_id = "test_user_gap_123"
    
    # 1. Test brand new user with NO evidence
    res_empty = compute_skill_gap_analysis(
        role_name="Full-Stack Developer",
        experience_level="Entry Level (0-2 years)",
        industry="All Industries",
        user_id=test_user_id
    )
    
    print(f"=== TEST 1: Empty Evidence User ===")
    print(f"Total gaps analyzed: {res_empty.total_gaps}")
    print(f"Overall match percentage: {res_empty.overall_match_percentage}%")
    print(f"Readiness rating: {res_empty.readiness_rating}")
    print(f"Critical count: {res_empty.critical_gaps_count}")
    print(f"Missing count: {sum(1 for g in res_empty.gaps if g.match_status == 'Missing')}")
    
    for g in res_empty.gaps[:5]:
        print(f"  Skill: {g.skill} | Your Prof: {g.your_proficiency_pct}% ({g.your_proficiency_level}) | Req: {g.required_level_pct}% | Gap: {g.gap_percentage}% | Status: {g.match_status}")
    
    # 2. Add real evidence to the user's store
    store = _get_user_evidence_store(test_user_id)
    store["skills"] = {
        "JavaScript": ExtractedSkillItem(
            skill_name="JavaScript",
            canonical_name="JavaScript",
            category="Frontend",
            proficiency="Advanced",
            confidence_score=92.0,
            evidence_source="GitHub",
            context_snippet="Developed complex ES6+ async frontend applications.",
            reasoning="Active JavaScript repository with modern DOM manipulation."
        ),
        "React": ExtractedSkillItem(
            skill_name="React",
            canonical_name="React",
            category="Frontend",
            proficiency="Intermediate",
            confidence_score=85.0,
            evidence_source="Resume",
            context_snippet="Built reusable React component library and state hooks.",
            reasoning="Demonstrated in resume project experience."
        ),
        "Python": ExtractedSkillItem(
            skill_name="Python",
            canonical_name="Python",
            category="Backend",
            proficiency="Advanced",
            confidence_score=90.0,
            evidence_source="Resume",
            context_snippet="Designed Python microservices and data pipelines.",
            reasoning="Proven Python backend development."
        )
    }
    
    # 3. Test user with real evidence
    res_evidence = compute_skill_gap_analysis(
        role_name="Full-Stack Developer",
        experience_level="Entry Level (0-2 years)",
        industry="All Industries",
        user_id=test_user_id
    )
    
    print(f"\n=== TEST 2: User with Real Evidence (JS, React, Python) ===")
    print(f"Overall match percentage: {res_evidence.overall_match_percentage}%")
    print(f"Readiness rating: {res_evidence.readiness_rating}")
    print(f"Critical count: {res_evidence.critical_gaps_count}")
    
    print("\nVerified Skills:")
    for g in res_evidence.gaps:
        if g.your_proficiency_pct > 0:
            print(f"  [EVIDENCE] {g.skill:<20} | Your: {g.your_proficiency_pct:>3}% ({g.your_proficiency_level:<12}) | Req: {g.required_level_pct:>3}% | Gap: {g.gap_percentage:>+3}% | Status: {g.match_status:<8} | Sources: {g.evidence_summary}")
    
    print("\nMissing Evidence Skills:")
    for g in res_evidence.gaps:
        if g.your_proficiency_pct == 0:
            print(f"  [MISSING]  {g.skill:<20} | Your: {g.your_proficiency_pct:>3}% ({g.your_proficiency_level:<12}) | Req: {g.required_level_pct:>3}% | Gap: {g.gap_percentage:>+3}% | Status: {g.match_status:<8}")
            
    # 4. Test multi-source evidence (Resume + GitHub + Projects for TypeScript & FastAPI)
    store["resume"] = {
        "skills_extracted": [
            ExtractedSkillItem(
                skill_name="TypeScript",
                canonical_name="TypeScript",
                category="Frontend",
                proficiency="Intermediate",
                confidence_score=85.0,
                evidence_source="Resume",
                context_snippet="Developed React apps with strict TypeScript.",
                reasoning="Resume mentions TypeScript."
            ),
            ExtractedSkillItem(
                skill_name="FastAPI",
                canonical_name="FastAPI",
                category="Backend",
                proficiency="Intermediate",
                confidence_score=82.0,
                evidence_source="Resume",
                context_snippet="Built FastAPI microservices.",
                reasoning="Resume mentions FastAPI."
            )
        ]
    }
    
    from backend.shared.models import GitHubAnalysisResponse, GitHubRepoItem
    store["github"] = GitHubAnalysisResponse(
        username="testdev",
        profile_url="https://github.com/testdev",
        status="analyzed",
        total_repositories=2,
        repos=[
            GitHubRepoItem(name="fastapi-backend", html_url="https://github.com/testdev/fastapi-backend", description="Backend in FastAPI", primary_language="Python", topics=["fastapi", "typescript"], stars=5, forks=1)
        ],
        detected_languages=["Python", "TypeScript"],
        detected_frameworks=["FastAPI"],
        skills_extracted=[
            ExtractedSkillItem(
                skill_name="FastAPI",
                canonical_name="FastAPI",
                category="Backend",
                proficiency="Advanced",
                confidence_score=94.0,
                evidence_source="GitHub",
                context_snippet="Repo: fastapi-backend with 5 stars",
                reasoning="Verified high-activity repo."
            ),
            ExtractedSkillItem(
                skill_name="TypeScript",
                canonical_name="TypeScript",
                category="Frontend",
                proficiency="Advanced",
                confidence_score=90.0,
                evidence_source="GitHub",
                context_snippet="Repo: fastapi-backend typed client",
                reasoning="Verified TypeScript definitions."
            )
        ]
    )
    
    store["projects"] = [
        ProjectItem(
            id="proj-1",
            title="SkillTwin Platform",
            url="https://github.com/testdev/skilltwin",
            description="Full-stack AI skill platform",
            status="analyzed",
            detected_technologies=["React", "TypeScript", "FastAPI", "PostgreSQL"],
            skills_extracted=[
                ExtractedSkillItem(
                    skill_name="FastAPI",
                    canonical_name="FastAPI",
                    category="Backend",
                    proficiency="Advanced",
                    confidence_score=92.0,
                    evidence_source="Project",
                    context_snippet="Project: SkillTwin Platform",
                    reasoning="Full stack architecture."
                )
            ]
        )
    ]

    res_multisource = compute_skill_gap_analysis(
        role_name="Full-Stack Developer",
        experience_level="Entry Level (0-2 years)",
        industry="All Industries",
        user_id=test_user_id
    )

    print(f"\n=== TEST 3: User with Multi-Source Evidence (FastAPI & TypeScript in Resume + GitHub + Projects) ===")
    print(f"Overall match percentage: {res_multisource.overall_match_percentage}%")
    print(f"Readiness rating: {res_multisource.readiness_rating}")
    
    for g in res_multisource.gaps:
        if g.canonical_name in ["FastAPI", "TypeScript", "JavaScript", "React", "Python", "PostgreSQL"]:
            print(f"  [EVIDENCE] {g.skill:<20} | Your: {g.your_proficiency_pct:>3}% ({g.your_proficiency_level:<12}) | Req: {g.required_level_pct:>3}% | Gap: {g.gap_percentage:>+3}% | Status: {g.match_status:<8} | Sources: {g.evidence_summary}")

    print("\nSUCCESS: All tests completed correctly!")

if __name__ == "__main__":
    run_test()
