import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.database import get_db
from backend.shared.models import (
    SkillTwinSkillItem,
    SkillTwinEvidenceDetails,
    SkillTwinScoreBreakdown,
    SkillTwinInsightItem,
    SkillTwinSummaryResponse,
    SkillTwinRecalculateRequest
)
from backend.routers.evidence import (
    _get_user_evidence_store,
    _in_memory_evidence,
    _in_memory_users,
    SKILL_TAXONOMY
)

router = APIRouter(prefix="/api/skilltwin", tags=["SkillTwin — Living Digital Twin"])

# Canonical Role Requirements for Target Roles
ROLE_REQUIRED_SKILLS: Dict[str, List[str]] = {
    "Full-Stack Developer": ["JavaScript", "TypeScript", "React", "Python", "FastAPI", "PostgreSQL", "Git & GitHub", "Docker", "RESTful APIs"],
    "Frontend Developer": ["JavaScript", "TypeScript", "React", "HTML5 & CSS3", "Tailwind CSS", "Next.js", "Git & GitHub", "RESTful APIs"],
    "Backend Engineer": ["Python", "FastAPI", "Node.js", "PostgreSQL", "MongoDB", "Redis", "Docker", "Git & GitHub", "RESTful APIs"],
    "AI / ML Engineer": ["Python", "Machine Learning & AI", "PyTorch / TensorFlow", "FastAPI", "PostgreSQL", "Git & GitHub", "Docker"],
    "Data Scientist": ["Python", "Machine Learning & AI", "Pandas & NumPy", "PostgreSQL", "SQLAlchemy", "Git & GitHub"],
    "DevOps / Cloud Engineer": ["Docker", "Kubernetes", "CI / CD Pipelines", "AWS / Cloud", "Linux & Shell Scripting", "Python", "Git & GitHub"],
}

DEFAULT_FALLBACK_SKILLS = [
    {
        "name": "JavaScript",
        "category": "Technical",
        "proficiency": "Advanced",
        "numeric": 4.5,
        "confidence": 92.0,
        "sources": ["Resume", "GitHub", "Projects"],
        "status": "Demonstrated",
        "reasoning": "Strong JavaScript usage in multiple projects with clean code, ES6+, async/await and DOM manipulation.",
        "quotes": ["Built interactive UI and single page application using JavaScript and modern APIs."],
        "repos": ["SkillTwin", "Portfolio", "web-dashboard"],
        "projects": ["SkillTwin AI Operating System"],
        "strengths": ["Deep ES6+ knowledge", "Asynchronous API orchestration", "Component lifecycle management"],
        "limitations": ["Limited evidence of complex web-workers or WebAssembly"],
        "recommendations": ["Implement unit test suites using Vitest/Jest."]
    },
    {
        "name": "React",
        "category": "Technical",
        "proficiency": "Intermediate",
        "numeric": 3.0,
        "confidence": 78.0,
        "sources": ["Resume", "GitHub", "Projects"],
        "status": "Demonstrated",
        "reasoning": "Built several components and custom hooks. State management basics present, but limited advanced patterns.",
        "quotes": ["Developed responsive React application with glassmorphism UI components."],
        "repos": ["SkillTwin", "react-portfolio"],
        "projects": ["SkillTwin AI Operating System"],
        "strengths": ["Custom hook patterns", "Modular UI components", "Responsive CSS styling"],
        "limitations": ["Limited Redux/Zustand global store architecture evidence"],
        "recommendations": ["Integrate global state manager and SSR optimization."]
    },
    {
        "name": "Node.js",
        "category": "Technical",
        "proficiency": "Beginner",
        "numeric": 1.5,
        "confidence": 64.0,
        "sources": ["Resume", "GitHub"],
        "status": "Supported",
        "reasoning": "Basic Express server and API routes found. Authentication, testing and error handling need improvement.",
        "quotes": ["Configured Node.js build tools and microservice scripts."],
        "repos": ["backend-service"],
        "projects": [],
        "strengths": ["Familiar with npm ecosystems and basic HTTP servers"],
        "limitations": ["Limited evidence of enterprise clustering and stream processing"],
        "recommendations": ["Build a full REST API with JWT authentication and middleware in Node.js."]
    },
    {
        "name": "Python",
        "category": "Technical",
        "proficiency": "Advanced",
        "numeric": 4.0,
        "confidence": 88.0,
        "sources": ["Resume", "GitHub"],
        "status": "Demonstrated",
        "reasoning": "Multiple Python projects with functions, OOP, file handling and libraries like Pandas, NumPy.",
        "quotes": ["Engineered backend microservices using Python and FastAPI framework."],
        "repos": ["SkillTwin", "python-scripts", "data-analytics"],
        "projects": ["SkillTwin AI Operating System"],
        "strengths": ["Object-oriented architecture", "Type annotations with Pydantic", "Clean algorithmic code"],
        "limitations": ["Limited evidence of asynchronous task queues like Celery"],
        "recommendations": ["Integrate background worker tasks with Redis."]
    },
    {
        "name": "PostgreSQL",
        "category": "Technical",
        "proficiency": "Intermediate",
        "numeric": 3.0,
        "confidence": 74.0,
        "sources": ["GitHub"],
        "status": "Demonstrated",
        "reasoning": "Used PostgreSQL in projects with CRUD operations, foreign keys and relational schemas.",
        "quotes": ["Designed 9-table normalized PostgreSQL database schema."],
        "repos": ["SkillTwin"],
        "projects": ["SkillTwin AI Operating System"],
        "strengths": ["Schema normalization", "Foreign key constraints", "SQLAlchemy ORM integration"],
        "limitations": ["Limited evidence of query indexing, EXPLAIN ANALYZE tuning or partitioning"],
        "recommendations": ["Add database migration pipelines using Alembic."]
    },
    {
        "name": "Git",
        "category": "Tools",
        "proficiency": "Advanced",
        "numeric": 4.0,
        "confidence": 90.0,
        "sources": ["GitHub"],
        "status": "Demonstrated",
        "reasoning": "Regular commits, meaningful messages, branching, PRs, and repository hygiene.",
        "quotes": ["Active GitHub repository workflow with structured branching and tags."],
        "repos": ["SkillTwin", "all public repositories"],
        "projects": ["SkillTwin AI Operating System"],
        "strengths": ["Clean commit hygiene", "Structured branches", "Semantic versioning"],
        "limitations": ["Limited evidence of complex merge conflict resolution"],
        "recommendations": ["Set up automated GitHub Actions CI/CD pipelines."]
    },
    {
        "name": "TypeScript",
        "category": "Technical",
        "proficiency": "Intermediate",
        "numeric": 3.5,
        "confidence": 82.0,
        "sources": ["Resume", "GitHub", "Projects"],
        "status": "Demonstrated",
        "reasoning": "Strong type definitions, generics, interfaces, and strict compiler enforcement in frontend.",
        "quotes": ["Implemented type-safe React components with TypeScript and Vite."],
        "repos": ["SkillTwin"],
        "projects": ["SkillTwin AI Operating System"],
        "strengths": ["Strict typing", "Shared interfaces", "Clean refactoring"],
        "limitations": ["Limited utility types and complex mapped types"],
        "recommendations": ["Expand type coverage across all API transport layers."]
    },
    {
        "name": "FastAPI",
        "category": "Technical",
        "proficiency": "Intermediate",
        "numeric": 3.5,
        "confidence": 80.0,
        "sources": ["Resume", "GitHub", "Projects"],
        "status": "Demonstrated",
        "reasoning": "RESTful API development with Pydantic schemas, dependency injection, and CORS middleware.",
        "quotes": ["Built REST endpoints with FastAPI, Uvicorn, and Pydantic."],
        "repos": ["SkillTwin"],
        "projects": ["SkillTwin AI Operating System"],
        "strengths": ["Asynchronous routes", "Pydantic validation", "Swagger docs integration"],
        "limitations": ["Limited OAuth2/JWT security implementations"],
        "recommendations": ["Add security bearer token middleware."]
    }
]


def synthesize_living_skilltwin(
    email: Optional[str] = None,
    user_id: Optional[str] = None,
    target_role_override: Optional[str] = None,
    db: Optional[Session] = None
) -> SkillTwinSummaryResponse:
    """
    Core Evidence Synthesis Engine.
    Aggregates Resume text extractions, GitHub API repository metadata, and Registered Projects
    into a verified Living SkillTwin profile with dynamic score breakdown and insights.
    """
    user_key = email or user_id or "default_user"
    store = _get_user_evidence_store(user_key)
    user_profile = _in_memory_users.get(email or "", {})

    # Determine target role
    target_role = target_role_override or user_profile.get("target_role") or "Full-Stack Developer"

    # 1. Gather all evidence sources
    resume_data = store.get("resume")
    github_data = store.get("github")
    projects_data = store.get("projects", [])
    extracted_skills_dict = store.get("skills", {})

    skill_items: List[SkillTwinSkillItem] = []
    seen_canonical = set()

    # Process skills stored from Page 2
    if extracted_skills_dict:
        for canonical_name, raw_skill in extracted_skills_dict.items():
            sources_set = set()
            quotes: List[str] = []
            repos: List[str] = []
            projects: List[str] = []

            # Check Resume
            has_resume = False
            if resume_data:
                for rs in resume_data.skills_extracted:
                    if rs.canonical_name == canonical_name:
                        has_resume = True
                        sources_set.add("Resume")
                        quotes.append(rs.context_snippet)
                        break

            # Check GitHub
            has_github = False
            if github_data:
                for gs in github_data.skills_extracted:
                    if gs.canonical_name == canonical_name:
                        has_github = True
                        sources_set.add("GitHub")
                        repos.extend([r.name for r in github_data.repos if (r.primary_language and canonical_name.lower() in r.primary_language.lower()) or (r.topics and any(canonical_name.lower() in t.lower() for t in r.topics))][:3])
                        break

            # Check Projects
            has_proj = False
            for p in projects_data:
                if any(canonical_name.lower() in t.lower() for t in p.detected_technologies):
                    has_proj = True
                    sources_set.add("Projects")
                    projects.append(p.title)

            # Calculate source counts
            source_count = len(sources_set)
            if source_count == 0:
                sources_set.add(raw_skill.evidence_source or "Resume")
                source_count = 1

            # Determine Evidence Status
            if has_github or has_proj:
                evidence_status = "Demonstrated"
            elif has_resume and source_count > 1:
                evidence_status = "Supported"
            elif has_resume:
                evidence_status = "Mentioned"
            else:
                evidence_status = "Supported"

            # Determine Evidence-Based Proficiency & Numeric Score (0-5)
            if source_count >= 3 or (has_github and has_proj):
                proficiency = "Advanced"
                numeric_proficiency = 4.0 + (min(len(repos), 3) * 0.25)
            elif has_github or has_proj:
                proficiency = "Intermediate"
                numeric_proficiency = 3.0 + (0.5 if has_resume else 0.0)
            else:
                proficiency = "Beginner"
                numeric_proficiency = 1.5 + (0.5 if len(quotes) > 2 else 0.0)

            numeric_proficiency = round(min(numeric_proficiency, 5.0), 1)

            # Determine Independent Confidence Score (0-100%)
            if source_count >= 3:
                confidence = 88.0 + min(len(repos) * 2.0, 6.0)
            elif source_count == 2:
                confidence = 74.0 + min(len(repos) * 2.5, 8.0)
            else:
                confidence = 62.0 + (10.0 if has_github else 4.0)

            confidence = round(min(confidence, 96.0), 1)

            # Categorize
            category = "Technical"
            if canonical_name in ["Git", "Git & GitHub", "Docker", "VS Code", "Postman", "Linux & Shell Scripting", "CI / CD Pipelines"]:
                category = "Tools"
            elif canonical_name in ["PostgreSQL", "MongoDB", "Redis", "MySQL"]:
                category = "Technical"

            # Formulate Reasoning
            if has_github and has_proj:
                reasoning = f"Demonstrated practical implementation across {len(repos) or 1} GitHub repos and {len(projects) or 1} live projects."
            elif has_github:
                reasoning = f"Active code and repository proof found in {', '.join(repos[:2]) if repos else 'GitHub'}."
            elif has_proj:
                reasoning = f"Applied in verified project architecture ({', '.join(projects[:2])})."
            else:
                reasoning = f"Referenced in candidate resume experience across {len(quotes)} context section(s)."

            skill_item = SkillTwinSkillItem(
                id=str(uuid.uuid4()),
                name=canonical_name,
                canonical_name=canonical_name,
                category=category,
                proficiency=proficiency,
                numeric_proficiency=numeric_proficiency,
                confidence_score=confidence,
                evidence_sources=sorted(list(sources_set)),
                evidence_status=evidence_status,
                reasoning=reasoning,
                evidence_details=SkillTwinEvidenceDetails(
                    resume_quotes=quotes[:3],
                    github_repos=list(set(repos))[:4],
                    project_refs=list(set(projects))[:3],
                    strengths=[f"Demonstrated application in {s}" for s in sources_set],
                    limitations=["Expand automated test coverage" if "Testing" not in canonical_name else "Add performance benchmarks"],
                    recommendations=[f"Build dedicated full-stack component integrating {canonical_name}"]
                ),
                has_resume_evidence=has_resume,
                has_github_evidence=has_github,
                has_project_evidence=has_proj,
                has_assessment_evidence=False,
                last_updated=datetime.utcnow()
            )
            skill_items.append(skill_item)
            seen_canonical.add(canonical_name)

    # If no dynamic skills found yet (e.g. before initial upload), provide canonical seed skills
    if not skill_items:
        for seed in DEFAULT_FALLBACK_SKILLS:
            skill_items.append(
                SkillTwinSkillItem(
                    id=str(uuid.uuid4()),
                    name=seed["name"],
                    canonical_name=seed["name"],
                    category=seed["category"],
                    proficiency=seed["proficiency"],
                    numeric_proficiency=seed["numeric"],
                    confidence_score=seed["confidence"],
                    evidence_sources=seed["sources"],
                    evidence_status=seed["status"],
                    reasoning=seed["reasoning"],
                    evidence_details=SkillTwinEvidenceDetails(
                        resume_quotes=seed.get("quotes", []),
                        github_repos=seed.get("repos", []),
                        project_refs=seed.get("projects", []),
                        strengths=seed.get("strengths", []),
                        limitations=seed.get("limitations", []),
                        recommendations=seed.get("recommendations", [])
                    ),
                    has_resume_evidence="Resume" in seed["sources"],
                    has_github_evidence="GitHub" in seed["sources"],
                    has_project_evidence="Projects" in seed["sources"],
                    has_assessment_evidence=False,
                    last_updated=datetime.utcnow()
                )
            )

    # Calculate Counts
    total_skills = len(skill_items)
    technical_count = sum(1 for s in skill_items if s.category == "Technical")
    tools_count = sum(1 for s in skill_items if s.category == "Tools")
    others_count = total_skills - (technical_count + tools_count)

    demonstrated_count = sum(1 for s in skill_items if s.evidence_status == "Demonstrated")
    supported_count = sum(1 for s in skill_items if s.evidence_status == "Supported")
    mentioned_count = sum(1 for s in skill_items if s.evidence_status == "Mentioned")
    no_evidence_count = sum(1 for s in skill_items if s.evidence_status == "No Evidence")

    # Calculate Career Readiness Score & Breakdown
    tech_skills = [s for s in skill_items if s.category == "Technical"]
    tools_skills = [s for s in skill_items if s.category == "Tools"]

    tech_score = int(sum(s.confidence_score for s in tech_skills) / max(len(tech_skills), 1)) if tech_skills else 70
    tools_score = int(sum(s.confidence_score for s in tools_skills) / max(len(tools_skills), 1)) if tools_skills else 65

    proj_count = len(projects_data) or (1 if any(s.has_project_evidence for s in skill_items) else 0)
    projects_score = min(int(50 + (proj_count * 20)), 95)

    multi_source_count = sum(1 for s in skill_items if len(s.evidence_sources) >= 2)
    evidence_strength = min(int(55 + (multi_source_count / max(total_skills, 1) * 35)), 95)

    # Role Alignment calculation
    required = ROLE_REQUIRED_SKILLS.get(target_role, ROLE_REQUIRED_SKILLS["Full-Stack Developer"])
    matching_role_skills = sum(1 for req in required if any(req.lower() in s.canonical_name.lower() for s in skill_items))
    role_alignment = min(int((matching_role_skills / len(required)) * 100), 95)

    # Overall composite Career Readiness Score (weighted)
    overall_score = int(
        (tech_score * 0.30) +
        (tools_score * 0.15) +
        (projects_score * 0.20) +
        (evidence_strength * 0.20) +
        (role_alignment * 0.15)
    )

    if overall_score >= 85:
        rating_label = "Exceptional"
        encouragement = "Outstanding evidence profile! You are highly aligned with your target role."
    elif overall_score >= 70:
        rating_label = "Good"
        encouragement = "You're on the right track! Keep strengthening your weak areas."
    elif overall_score >= 50:
        rating_label = "Strong"
        encouragement = "Solid foundation detected. Add more project evidence to boost confidence."
    else:
        rating_label = "Emerging"
        encouragement = "Initial evidence processed. Connect GitHub and projects to unlock higher ratings."

    # Generate Dynamic Evidence-Backed Insights
    top_skills = [s.name for s in sorted(skill_items, key=lambda x: x.confidence_score, reverse=True)[:2]]
    weak_skills = [s.name for s in sorted(skill_items, key=lambda x: x.confidence_score) if s.proficiency == "Beginner"][:2]

    insights: List[SkillTwinInsightItem] = [
        SkillTwinInsightItem(
            id="ins_1",
            type="strength",
            text=f"Your {', '.join(top_skills)} skills are strong with verified multi-source evidence!",
            icon="up"
        ),
        SkillTwinInsightItem(
            id="ins_2",
            type="warning",
            text=f"Improve {', '.join(weak_skills) if weak_skills else 'testing and cloud'} skills with dedicated practical projects.",
            icon="alert"
        ),
        SkillTwinInsightItem(
            id="ins_3",
            type="recommendation",
            text="Add more live projects and deploy them with automated CI/CD to strengthen your profile.",
            icon="info"
        )
    ]

    breakdown = SkillTwinScoreBreakdown(
        technical_score=tech_score,
        tools_score=tools_score,
        projects_score=projects_score,
        evidence_strength=evidence_strength,
        role_alignment=role_alignment
    )

    return SkillTwinSummaryResponse(
        overall_score=overall_score,
        rating_label=rating_label,
        encouragement_message=encouragement,
        total_skills=total_skills,
        technical_count=technical_count,
        tools_count=tools_count,
        others_count=others_count,
        demonstrated_count=demonstrated_count,
        supported_count=supported_count,
        mentioned_count=mentioned_count,
        no_evidence_count=no_evidence_count,
        breakdown=breakdown,
        insights=insights,
        skills=skill_items,
        target_role=target_role,
        sources_connected={
            "resume": bool(resume_data),
            "github": bool(github_data),
            "projects": len(projects_data) > 0
        },
        calculated_at=datetime.utcnow()
    )


@router.get("/profile", response_model=SkillTwinSummaryResponse)
def get_skilltwin_profile(
    email: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    target_role: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Fetch the Living SkillTwin Profile synthesized from candidate evidence.
    """
    try:
        return synthesize_living_skilltwin(email=email, user_id=user_id, target_role_override=target_role, db=db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to synthesize SkillTwin: {str(e)}"
        )


@router.post("/recalculate", response_model=SkillTwinSummaryResponse)
def recalculate_skilltwin_profile(
    req: SkillTwinRecalculateRequest,
    db: Session = Depends(get_db)
):
    """
    Trigger real-time recalculation of the Living SkillTwin after new evidence upload.
    """
    try:
        return synthesize_living_skilltwin(email=req.email, user_id=req.user_id, db=db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recalculate SkillTwin: {str(e)}"
        )
