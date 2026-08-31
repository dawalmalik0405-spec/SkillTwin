import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.shared.models import (
    SkillGapItem,
    GapSeverityBreakdown,
    CategoryGapCountItem,
    GapInsightItem,
    GapAnalysisSummaryResponse
)
from backend.routers.evidence import (
    _get_user_evidence_store,
    _in_memory_evidence,
    _in_memory_users
)
from backend.routers.skilltwin import DEFAULT_FALLBACK_SKILLS
from backend.routers.target_role import (
    build_target_role_benchmark,
    CURATED_ROLE_BENCHMARKS
)

router = APIRouter(prefix="/api/gap-analysis", tags=["Skill Gap Analysis Engine"])

# Canonical Skill Metadata mapping for Explainable AI & Recommendations
SKILL_GAP_METADATA: Dict[str, Dict[str, Any]] = {
    "React": {
        "why_role": "Essential for building modern, component-driven user interfaces in full-stack web applications.",
        "why_gap": "Essential for building modern user interfaces.",
        "missing_evidence": "No advanced state management (Redux/Zustand), testing, or complex hook patterns observed in public repos.",
        "recommended_action": "Build a multi-page interactive dashboard with client-side routing, optimistic UI updates, and unit testing.",
        "roadmap_destination": "Roadmap Milestone: Modern React & State Architecture"
    },
    "TypeScript": {
        "why_role": "Standard for scalable, enterprise-grade codebase maintainability, static type safety, and IDE autocompletion.",
        "why_gap": "Improves code quality and maintainability.",
        "missing_evidence": "Demonstrated basic JavaScript in repos, but limited strict TypeScript typing, generics, or interface contracts.",
        "recommended_action": "Migrate existing JavaScript API client and components to strict TypeScript with generic utility types.",
        "roadmap_destination": "Roadmap Milestone: Type-Safe Frontend & Backend Development"
    },
    "Node.js": {
        "why_role": "Required for building high-throughput asynchronous backend microservices and RESTful API endpoints.",
        "why_gap": "Required for backend server development.",
        "missing_evidence": "Basic Express server setup detected, but lacks authentication middleware, error handling layers, or database pools.",
        "recommended_action": "Build a secure REST API with Express/Fastify, JWT authentication, and structured error handlers.",
        "roadmap_destination": "Roadmap Milestone: Backend REST Engineering with Node.js"
    },
    "PostgreSQL": {
        "why_role": "Core relational database required for complex relational schema modeling, indexing, and transactional ACID compliance.",
        "why_gap": "Important for relational data management.",
        "missing_evidence": "Resume mentions SQL queries, but GitHub lacks production schema migrations, join queries, or ORM relationships.",
        "recommended_action": "Design normalized PostgreSQL schemas with foreign keys, indexes, and connection pooling in FastAPI/Express.",
        "roadmap_destination": "Roadmap Milestone: Relational Modeling & Index Tuning"
    },
    "Docker": {
        "why_role": "Industry standard for containerization, local development parity, and reproducible production deployment environments.",
        "why_gap": "Industry standard for containerization.",
        "missing_evidence": "No Dockerfiles or docker-compose.yml configurations found in repositories.",
        "recommended_action": "Containerize a multi-service web app (React frontend + Python/Node API + PostgreSQL) with multi-stage Docker builds.",
        "roadmap_destination": "Roadmap Milestone: Containerization & Cloud Deployments"
    },
    "JavaScript": {
        "why_role": "Foundational programming language for browser interactivity, event handling, and full-stack runtime execution.",
        "why_gap": "Good understanding of core concepts.",
        "missing_evidence": "None. Strong ES6+ patterns, async/await, and DOM manipulation verified across multiple projects.",
        "recommended_action": "Explore web workers, performance profiling, and browser engine internals.",
        "roadmap_destination": "Roadmap Milestone: Advanced JS Patterns & Performance"
    },
    "Git": {
        "why_role": "Distributed version control system essential for collaborative team engineering, branching, and PR workflows.",
        "why_gap": "Excellent version control and collaboration.",
        "missing_evidence": "None. Active commit history and clean branch management demonstrated.",
        "recommended_action": "Learn interactive rebase, git hooks, and automated CI release tagging.",
        "roadmap_destination": "Roadmap Milestone: Advanced Git & CI/CD Pipelines"
    },
    "GitHub": {
        "why_role": "Standard collaborative platform for code reviews, issue tracking, pull requests, and CI/CD pipelines.",
        "why_gap": "Excellent version control and collaboration.",
        "missing_evidence": "None. Well-structured repository readmes and collaboration proof verified.",
        "recommended_action": "Implement automated pull request checks with GitHub Actions.",
        "roadmap_destination": "Roadmap Milestone: GitHub Actions & Automated Testing"
    },
    "HTML5": {
        "why_role": "Semantic document structure, web accessibility (a11y), and SEO-friendly markup.",
        "why_gap": "Solid foundation in frontend basics.",
        "missing_evidence": "None. Semantic tags and accessible markup proven in frontend projects.",
        "recommended_action": "Incorporate ARIA roles and automated WCAG accessibility audits.",
        "roadmap_destination": "Roadmap Milestone: Accessible & Semantic Web Design"
    },
    "CSS3": {
        "why_role": "Modern responsive layout design, Flexbox, Grid, keyframe animations, and custom design tokens.",
        "why_gap": "Solid foundation in frontend basics.",
        "missing_evidence": "None. Responsive layouts and custom animations demonstrated.",
        "recommended_action": "Master container queries and advanced modern CSS layout properties.",
        "roadmap_destination": "Roadmap Milestone: Modern CSS & Design Tokens"
    },
    "FastAPI": {
        "why_role": "High-performance Python web framework for asynchronous APIs, automatic documentation, and type-safe endpoints.",
        "why_gap": "Used in backend, needs deeper microservice exposure.",
        "missing_evidence": "Basic endpoints observed; needs background tasks, dependency injection, and comprehensive test suites.",
        "recommended_action": "Implement async background workers and OAuth2 token validation with Pytest fixtures.",
        "roadmap_destination": "Roadmap Milestone: Enterprise FastAPI Architecture"
    },
    "Python": {
        "why_role": "Versatile backend programming language for services, data manipulation, automation, and API backends.",
        "why_gap": "Strong scripting proficiency, intermediate backend architecture.",
        "missing_evidence": "Solid scripting and logic demonstrated; expand into async asyncio patterns and architectural clean code.",
        "recommended_action": "Build an async REST microservice utilizing SQLAlchemy 2.0 and Pydantic v2.",
        "roadmap_destination": "Roadmap Milestone: Advanced Python & Async Engineering"
    }
}


def _level_to_pct(level_str: str) -> int:
    """Convert qualitative proficiency level to benchmark percentage."""
    normalized = (level_str or "").strip().lower()
    if "advanced" in normalized:
        return 80
    if "intermediate" in normalized:
        return 70
    if "beginner" in normalized or "basic" in normalized:
        return 60
    return 65


def _candidate_skill_to_pct(skill_data: Dict[str, Any]) -> int:
    """Convert candidate's skill item into a 0-100 percentage."""
    if not skill_data:
        return 20  # Insufficient evidence baseline

    numeric = skill_data.get("numeric", 0)
    if numeric > 0:
        # Scale 1-5 to percentage (1.0 -> 20%, 3.0 -> 60%, 4.5 -> 90%, 5.0 -> 100%)
        return min(100, max(15, int(numeric * 20)))

    prof = (skill_data.get("proficiency") or "").lower()
    if "advanced" in prof:
        return 85
    elif "intermediate" in prof:
        return 60
    elif "beginner" in prof:
        return 40
    return 20


def compute_skill_gap_analysis(
    role_name: str = "Full-Stack Developer",
    experience_level: str = "Entry Level (0-2 years)",
    industry: str = "All Industries",
    user_id: Optional[str] = None
) -> GapAnalysisSummaryResponse:
    """
    Core Gap Engine Computation.
    Cross-references Living SkillTwin skills against Target Role Curated Requirements.
    """
    # 1. Fetch Target Role Benchmark Requirements
    benchmark = build_target_role_benchmark(
        role_name=role_name,
        experience_level=experience_level,
        industry=industry
    )

    # 2. Ingest Candidate's Demonstrated Skills from Living SkillTwin Store
    candidate_skills_dict: Dict[str, Dict[str, Any]] = {}

    # Check in-memory evidence store
    user_store = _get_user_evidence_store(user_id) if user_id else None
    if user_store and user_store.get("skills_extracted"):
        for item in user_store["skills_extracted"]:
            name = item.get("canonical_name") or item.get("skill_name")
            if name:
                candidate_skills_dict[name.lower()] = {
                    "name": name,
                    "proficiency": item.get("proficiency", "Beginner"),
                    "numeric": 3.0 if item.get("proficiency") == "Intermediate" else (4.5 if item.get("proficiency") == "Advanced" else 2.0),
                    "confidence": item.get("confidence_score", 70),
                    "sources": [item.get("evidence_source", "Resume")],
                    "reasoning": item.get("reasoning", "")
                }
    else:
        # Use default fallback skills for default demo/initial profile
        for item in DEFAULT_FALLBACK_SKILLS:
            candidate_skills_dict[item["name"].lower()] = item

    # 3. Analyze each requirement from the Benchmark
    gaps_list: List[SkillGapItem] = []

    critical_count = 0
    weak_count = 0
    strong_count = 0
    matched_count = 0

    total_weighted_match = 0
    total_weights = 0

    for req in benchmark.requirements:
        skill_key = req.skill.lower()
        canonical_key = req.canonical_name.lower()

        # Check if candidate has evidence for this skill
        candidate_match = (
            candidate_skills_dict.get(skill_key) or
            candidate_skills_dict.get(canonical_key) or
            candidate_skills_dict.get(req.skill.split()[0].lower())
        )

        meta = (
            SKILL_GAP_METADATA.get(req.canonical_name) or
            SKILL_GAP_METADATA.get(req.skill) or
            SKILL_GAP_METADATA.get(req.skill.split()[0]) or
            {}
        )

        # Dynamic calculation based on actual user skills
        if candidate_match:
            # User has evidence - calculate from their actual proficiency
            your_pct = int(candidate_match.get("score", 60))  # Default 60% if found
            req_pct = int(req.industry_avg_proficiency or 75)
            gap_pct = your_pct - req_pct

            # Determine priority based on importance and gap
            if req.importance == "Core" and gap_pct < -20:
                priority = "Critical"
            elif req.importance in ["Core", "High"] and gap_pct < -15:
                priority = "High"
            elif gap_pct < -10:
                priority = "Medium"
            else:
                priority = "Low"

            # Determine match status
            if gap_pct >= 0:
                match_status = "Strong"
            elif gap_pct >= -15:
                match_status = "Matched"
            elif gap_pct >= -30:
                match_status = "Weak"
            else:
                match_status = "Missing"

            confidence = int(candidate_match.get("confidence", 75))
            your_level = candidate_match.get("proficiency", "Intermediate")
            req_level = req.required_proficiency
            why_gap = f"You have {your_pct}% proficiency but {req.skill} requires {req_pct}% for {role_name} positions."
        else:
            # No evidence - user is missing this skill
            your_pct = 0
            req_pct = int(req.industry_avg_proficiency or 75)
            gap_pct = -req_pct

            # Missing skills with high importance are critical
            if req.importance == "Core":
                priority = "Critical"
            elif req.importance == "High":
                priority = "High"
            else:
                priority = "Medium"

            match_status = "Missing"
            confidence = 0
            your_level = "Insufficient Evidence"
            req_level = req.required_proficiency
            why_gap = f"{req.skill} is required for {role_name} but no evidence found in your profile. Add projects or experience demonstrating this skill."

        # Metric counters
        if priority == "Critical" or match_status == "Missing":
            critical_count += 1
        elif match_status == "Weak":
            weak_count += 1
        elif match_status == "Strong":
            strong_count += 1
        elif match_status == "Matched":
            matched_count += 1

        # Weighted readiness computation
        weight = 3 if req.importance == "Core" else (2 if req.importance == "High" else 1)
        skill_alignment = min(100, max(0, int((your_pct / max(1, req_pct)) * 100)))
        total_weighted_match += skill_alignment * weight
        total_weights += weight

        evidence_summary = (
            f"Demonstrated in {', '.join(candidate_match.get('sources', ['Resume']))}"
            if candidate_match and candidate_match.get("sources")
            else "Insufficient evidence in connected sources (Resume / GitHub / Projects)."
        )

        gap_item = SkillGapItem(
            id=f"gap-{uuid.uuid4().hex[:8]}",
            skill=req.skill,
            canonical_name=req.canonical_name,
            category=req.category,
            your_proficiency_pct=your_pct,
            your_proficiency_score=round(your_pct / 20.0, 1),
            your_proficiency_level=your_level,
            required_level_pct=req_pct,
            required_level_score=round(req_pct / 20.0, 1),
            required_proficiency_level=req_level,
            gap_percentage=gap_pct,
            priority=priority,
            match_status=match_status,
            confidence=confidence,
            role_importance=req.importance,
            why_this_gap=why_gap,
            evidence_summary=evidence_summary,
            evidence_details={
                "sources": candidate_match.get("sources", []) if candidate_match else [],
                "repos": candidate_match.get("repos", []) if candidate_match else [],
                "quotes": candidate_match.get("quotes", []) if candidate_match else [],
                "reasoning": candidate_match.get("reasoning", "") if candidate_match else ""
            },
            missing_evidence_note=meta.get("missing_evidence") if match_status in ["Missing", "Weak"] else None,
            why_role_requires=meta.get("why_role") or req.description,
            recommended_action=meta.get("recommended_action") or f"Build an end-to-end practical project exercising {req.skill}.",
            roadmap_destination=meta.get("roadmap_destination") or f"Roadmap Stage: {req.skill} Mastery"
        )
        gaps_list.append(gap_item)

    total_skills = len(gaps_list)
    overall_pct = int(total_weighted_match / max(1, total_weights)) if total_weights > 0 else 0

    # Severity distribution - calculated from actual gaps
    sev_critical = sum(1 for g in gaps_list if g.priority == "Critical")
    sev_high = sum(1 for g in gaps_list if g.priority == "High")
    sev_med = sum(1 for g in gaps_list if g.priority == "Medium")
    sev_low = sum(1 for g in gaps_list if g.priority == "Low")

    total_sev = max(1, sev_critical + sev_high + sev_med + sev_low)

    severity_breakdown = GapSeverityBreakdown(
        critical_count=sev_critical,
        critical_pct=round((sev_critical / total_sev) * 100),
        high_count=sev_high,
        high_pct=round((sev_high / total_sev) * 100),
        medium_count=sev_med,
        medium_pct=round((sev_med / total_sev) * 100),
        low_count=sev_low,
        low_pct=round((sev_low / total_sev) * 100)
    )

    # Top Gap Categories
    category_counts: Dict[str, int] = {}
    for g in gaps_list:
        cat = g.category
        category_counts[cat] = category_counts.get(cat, 0) + 1

    color_map = {
        "Frontend Development": "#F43F5E",
        "Backend Development": "#F59E0B",
        "DevOps & Tools": "#38BDF8",
        "Databases": "#818CF8",
        "Other Important Skills": "#34D399",
        "Languages": "#C084FC"
    }

    top_categories: List[CategoryGapCountItem] = []
    for cat, cnt in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        top_categories.append(CategoryGapCountItem(
            category=cat,
            count=cnt,
            color=color_map.get(cat, "#A855F7")
        ))

    # AI Insights
    ai_insights = [
        GapInsightItem(
            id="insight-1",
            type="critical",
            title="Focus on closing critical gaps first",
            description="Improving React.js, TypeScript, and Docker skills will increase your industry match score by 25-30%."
        ),
        GapInsightItem(
            id="insight-2",
            type="strength",
            title="Capitalize on strong foundations",
            description="Your JavaScript, Git, and HTML/CSS skills satisfy baseline expectationsâ€”leverage them when tackling backend & state management milestones."
        ),
        GapInsightItem(
            id="insight-3",
            type="recommendation",
            title="Evidence-backed project verification",
            description="Completing a verified full-stack CRUD application with PostgreSQL containerization will eliminate 4 high-priority gaps simultaneously."
        )
    ]

    # Recommended Steps
    recommended_steps = [
        f"Start with {sev_critical} critical gap skills",
        "Follow the personalized roadmap",
        "Build projects to demonstrate skills",
        "Re-verify and track improvement"
    ]

    readiness_rating = "Moderate"
    if overall_pct >= 85:
        readiness_rating = "Exceptional"
    elif overall_pct >= 75:
        readiness_rating = "Strong"
    elif overall_pct >= 60:
        readiness_rating = "Moderate"
    else:
        readiness_rating = "Emerging"

    return GapAnalysisSummaryResponse(
        target_role=role_name,
        experience_level=experience_level,
        last_updated=datetime.utcnow().strftime("%B %d, %Y, %I:%M %p"),
        total_gaps=total_skills,
        critical_gaps_count=critical_count,
        weak_skills_count=weak_count,
        strong_skills_count=strong_count,
        matched_skills_count=matched_count,
        overall_match_percentage=overall_pct,
        readiness_rating=readiness_rating,
        severity_breakdown=severity_breakdown,
        top_gap_categories=top_categories,
        ai_insights=ai_insights,
        recommended_steps=recommended_steps,
        gaps=gaps_list,
        calculated_at=datetime.utcnow(),
        version="1.0.0"
    )


@router.get("/analysis", response_model=GapAnalysisSummaryResponse)
def get_gap_analysis(
    role: str = Query("Full-Stack Developer", description="Target role name"),
    experience: str = Query("Entry Level (0-2 years)", description="Experience level"),
    industry: str = Query("All Industries", description="Industry domain"),
    user_id: Optional[str] = Query(None, description="Optional user ID")
):
    """
    Retrieve evidence-backed Skill Gap Analysis comparing Living SkillTwin with selected Target Role.
    """
    try:
        return compute_skill_gap_analysis(
            role_name=role,
            experience_level=experience,
            industry=industry,
            user_id=user_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate skill gap analysis: {str(e)}"
        )


@router.post("/recalculate", response_model=GapAnalysisSummaryResponse)
def recalculate_gap_analysis(
    role: str = Query("Full-Stack Developer"),
    experience: str = Query("Entry Level (0-2 years)"),
    industry: str = Query("All Industries"),
    user_id: Optional[str] = Query(None)
):
    """
    Recalculate Skill Gap Analysis from newly uploaded evidence.
    """
    return compute_skill_gap_analysis(
        role_name=role,
        experience_level=experience,
        industry=industry,
        user_id=user_id
    )


@router.get("/export-report")
def export_gap_report(
    role: str = Query("Full-Stack Developer"),
    experience: str = Query("Entry Level (0-2 years)"),
    industry: str = Query("All Industries")
):
    """
    Generate downloadable text/markdown summary of the candidate's Gap Analysis.
    """
    analysis = compute_skill_gap_analysis(role_name=role, experience_level=experience, industry=industry)

    report_lines = [
        "==================================================================",
        "          SKILLTWIN â€” EVIDENCE-BASED SKILL GAP REPORT             ",
        "==================================================================",
        f"Generated At: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Target Role: {analysis.target_role} ({analysis.experience_level})",
        f"Overall Role Match: {analysis.overall_match_percentage}% ({analysis.readiness_rating} Readiness)",
        "------------------------------------------------------------------",
        "SUMMARY METRICS:",
        f"â€¢ Total Gaps Analyzed: {analysis.total_gaps}",
        f"â€¢ Critical Priority Gaps: {analysis.critical_gaps_count}",
        f"â€¢ Weak Skills (Below Required): {analysis.weak_skills_count}",
        f"â€¢ Strong Skills (Above Required): {analysis.strong_skills_count}",
        f"â€¢ Matched Skills (Satisfies Requirement): {analysis.matched_skills_count}",
        "------------------------------------------------------------------",
        "GAP SEVERITY BREAKDOWN:",
        f"â€¢ Critical: {analysis.severity_breakdown.critical_count} ({analysis.severity_breakdown.critical_pct}%)",
        f"â€¢ High:     {analysis.severity_breakdown.high_count} ({analysis.severity_breakdown.high_pct}%)",
        f"â€¢ Medium:   {analysis.severity_breakdown.medium_count} ({analysis.severity_breakdown.medium_pct}%)",
        f"â€¢ Low:      {analysis.severity_breakdown.low_count} ({analysis.severity_breakdown.low_pct}%)",
        "------------------------------------------------------------------",
        "DETAILED SKILL GAP TABLE:",
        f"{'SKILL':<28} | {'YOUR':<8} | {'REQ':<8} | {'GAP':<8} | {'PRIORITY':<10} | {'STATUS':<10} | {'REASON'}",
        "-" * 110
    ]

    for g in analysis.gaps:
        gap_str = f"{g.gap_percentage:+d}%"
        report_lines.append(
            f"{g.skill:<28} | {g.your_proficiency_pct:>3}%    | {g.required_level_pct:>3}%    | {gap_str:<8} | {g.priority:<10} | {g.match_status:<10} | {g.why_this_gap}"
        )

    report_lines.extend([
        "------------------------------------------------------------------",
        "RECOMMENDED NEXT STEPS:",
        "\n".join([f"  {idx+1}. {step}" for idx, step in enumerate(analysis.recommended_steps)]),
        "=================================================================="
    ])

    return PlainTextResponse(
        content="\n".join(report_lines),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="SkillTwin_Gap_Analysis_{role.replace(" ", "_")}.txt"'}
    )


@router.get("/status")
def get_gap_engine_status():
    """Diagnostic readiness status for Skill Gap Engine."""
    return {
        "status": "ready",
        "engine": "SkillTwin Gap Engine v1.0",
        "features": ["evidence_matching", "explainable_reasoning", "priority_ranking", "report_export"]
    }
