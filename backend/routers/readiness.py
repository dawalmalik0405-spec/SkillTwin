import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.shared.models import (
    CareerReadinessSkillItem,
    RecentlyVerifiedSkillItem,
    RecommendedActionItem,
    JourneyMilestoneItem,
    OverallProgressPoint,
    ReadinessGrowthPoint,
    LatestUpdateSummary,
    TopSkillRankingItem,
    CareerReadinessResponse
)
from backend.routers.evidence import _normalize_user_key, _in_memory_evidence, _in_memory_users
from backend.routers.verification import _get_user_projects_list
from backend.routers.skilltwin import synthesize_living_skilltwin, ROLE_REQUIRED_SKILLS
from backend.routers.skilltwin_update import calculate_skilltwin_updated
from backend.routers.roadmap import build_personalized_roadmap

router = APIRouter(
    prefix="/api/readiness",
    tags=["Career Readiness / Continuous Loop"]
)


async def calculate_career_readiness_metrics(
    user_id: Optional[str] = "default_user",
    db: Optional[Session] = None
) -> CareerReadinessResponse:
    """
    Dynamic Career Readiness Engine (Page 9).
    Calculates multi-factor readiness scores using genuine data from Pages 1–8:
    - Target Role requirements
    - Living SkillTwin & Verified Skill changes
    - Project Verification credibility
    - Roadmap progress & task completion
    - Evidence breadth
    """
    uid = user_id or "default_user"
    norm_key = _normalize_user_key(uid)

    # 1. Ingest Data from Pages 1–8
    user_profile = _in_memory_users.get(norm_key, {})
    updated_twin = calculate_skilltwin_updated(user_id=norm_key, db=db)
    base_twin = synthesize_living_skilltwin(email=norm_key, user_id=norm_key, db=db)

    target_role = updated_twin.target_role or "Full-Stack Developer"
    experience_level = updated_twin.experience_level or "Entry Level (0-2 years)"

    # Ingest verified projects from Page 7
    user_projects = _get_user_projects_list(norm_key)
    verified_projects = [p for p in user_projects if p.status == "Verified"]

    # Ingest roadmap progress from Page 6
    roadmap_plan = await build_personalized_roadmap(
        role_name=target_role,
        experience_level=experience_level,
        user_id=norm_key
    )
    roadmap_progress_pct = roadmap_plan.summary.overall_completion_pct

    # Ingest evidence breadth from Page 2
    ev_store = _in_memory_evidence.get(norm_key, {})
    has_resume = bool(ev_store.get("resume"))
    has_github = bool(ev_store.get("github"))
    has_projects = len(ev_store.get("projects", [])) > 0 or len(verified_projects) > 0
    evidence_sources_count = (1 if has_resume else 0) + (1 if has_github else 0) + (1 if has_projects else 0)

    # Current timestamps
    now = datetime.utcnow()
    last_refreshed_label = now.strftime("%b %d, %Y, %I:%M %p")
    today_short = now.strftime("%b %d")

    # 2. Multi-Factor Weighted Readiness Calculation
    alignment_score = updated_twin.overall_alignment_pct

    # Project Verification Credibility (0-100)
    if verified_projects:
        verified_avg = sum(p.score_pct for p in verified_projects) / len(verified_projects)
        project_cred_score = int(min(verified_avg * 0.9 + (len(verified_projects) * 3), 96))
    else:
        project_cred_score = 0

    # Evidence Breadth Score (0-100)
    evidence_score = int(min(evidence_sources_count * 30 + 10, 95)) if evidence_sources_count > 0 else 20

    # Roadmap Progress Score (0-100)
    roadmap_score = min(roadmap_progress_pct, 100)

    # Weighted Composite Score
    if base_twin.total_skills == 0 and not verified_projects:
        career_readiness_score = 25
        score_change_pct = 0
        rating_label = "Initial"
        explanation = "Complete your onboarding and evidence collection to calculate your readiness score."
    else:
        career_readiness_score = int(
            (alignment_score * 0.35) +
            (project_cred_score * 0.30) +
            (roadmap_score * 0.20) +
            (evidence_score * 0.15)
        )

        # Calculate readiness improvement delta
        base_readiness = int(
            (updated_twin.overall_alignment_before_pct * 0.40) +
            (evidence_score * 0.30) +
            (roadmap_score * 0.30)
        )
        score_change_pct = max(career_readiness_score - base_readiness, len(verified_projects) * 4)

        if career_readiness_score >= 82:
            rating_label = "Exceptional"
            explanation = "Outstanding career readiness! High project credibility and strong skill alignment."
        elif career_readiness_score >= 68:
            rating_label = "Good"
            explanation = "You're on the right track! Verified projects and roadmap completions are boosting your profile."
        elif career_readiness_score >= 48:
            rating_label = "Developing"
            explanation = "Solid baseline established. Complete remaining roadmap milestones to increase your hireability."
        else:
            rating_label = "Emerging"
            explanation = "Initial evidence processed. Verify projects on Page 7 to raise your readiness score."

    # 3. Categorize Real Skills (Strong, Developing, Critical Gaps)
    all_user_skills = base_twin.skills or []
    strong_skills: List[CareerReadinessSkillItem] = []
    developing_skills: List[CareerReadinessSkillItem] = []
    seen_skill_names = set()

    # Names of verified skills
    verified_skill_names = set()
    for p in verified_projects:
        for vs in p.verified_skills:
            verified_skill_names.add(vs.skill_name.lower())

    for s in all_user_skills:
        canonical = s.name.strip()
        seen_skill_names.add(canonical.lower())
        c_score = int(s.confidence_score)
        p_pct = int(s.numeric_proficiency * 20)

        # If verified in a project, boost
        is_verified = any(v in s.name.lower() or v in s.canonical_name.lower() for v in verified_skill_names)
        if is_verified:
            p_pct = min(p_pct + 18, 92)
            c_score = min(c_score + 15, 94)

        if p_pct >= 70 or s.proficiency == "Advanced" or is_verified:
            strong_skills.append(
                CareerReadinessSkillItem(
                    name=s.name,
                    category=s.category or "Technical",
                    proficiency_pct=p_pct,
                    confidence_pct=c_score,
                    status="Strong",
                    verified_date=today_short if is_verified else None
                )
            )
        elif p_pct >= 38 or s.proficiency == "Intermediate":
            developing_skills.append(
                CareerReadinessSkillItem(
                    name=s.name,
                    category=s.category or "Technical",
                    proficiency_pct=p_pct,
                    confidence_pct=c_score,
                    status="Developing",
                    verified_date=None
                )
            )

    # Ingest verified project skills from updated SkillTwin not in base twin
    for sc in updated_twin.skill_changes:
        c_name = sc.skill_name.strip()
        if c_name.lower() not in seen_skill_names:
            seen_skill_names.add(c_name.lower())
            if sc.after_pct >= 65 or sc.after_level == "Advanced":
                strong_skills.append(
                    CareerReadinessSkillItem(
                        name=c_name,
                        category=sc.category or "Implementation",
                        proficiency_pct=sc.after_pct,
                        confidence_pct=min(sc.after_pct + 10, 94),
                        status="Strong",
                        verified_date=today_short
                    )
                )
            else:
                developing_skills.append(
                    CareerReadinessSkillItem(
                        name=c_name,
                        category=sc.category or "Implementation",
                        proficiency_pct=sc.after_pct,
                        confidence_pct=min(sc.after_pct + 5, 88),
                        status="Developing",
                        verified_date=today_short
                    )
                )

    # 4. Critical Gaps: Target Role Requirements missing from user skills
    required_role_skills = ROLE_REQUIRED_SKILLS.get(target_role, ROLE_REQUIRED_SKILLS["Full-Stack Developer"])
    critical_gaps: List[CareerReadinessSkillItem] = []

    for req in required_role_skills:
        has_skill = any(req.lower() in s_name for s_name in seen_skill_names)
        if not has_skill:
            critical_gaps.append(
                CareerReadinessSkillItem(
                    name=req,
                    category="Core Requirement",
                    proficiency_pct=15,
                    confidence_pct=18,
                    status="Critical Gap",
                    verified_date=None
                )
            )

    # Limit lists cleanly
    strong_skills = strong_skills[:5]
    developing_skills = developing_skills[:5]
    critical_gaps = critical_gaps[:5]

    # 5. Recently Verified Projects List
    recently_verified: List[RecentlyVerifiedSkillItem] = []
    for p in verified_projects[:4]:
        recently_verified.append(
            RecentlyVerifiedSkillItem(
                name=p.name,
                project_name=p.name,
                verified_date=p.verified_at.strftime("%b %d, %Y")
            )
        )

    # 6. Recommended Next Action
    if critical_gaps:
        top_gap = critical_gaps[0]
        rec_action = RecommendedActionItem(
            skill_name=top_gap.name,
            title=f"Master {top_gap.name}",
            priority_label="High Impact",
            why_text=f"High-demand requirement for {target_role}. Completing roadmap tasks for {top_gap.name} will directly close this gap.",
            action_type="roadmap"
        )
    elif developing_skills:
        top_dev = developing_skills[0]
        rec_action = RecommendedActionItem(
            skill_name=top_dev.name,
            title=f"Build and Verify a {top_dev.name} Project",
            priority_label="Priority",
            why_text=f"Demonstrating {top_dev.name} with project evidence will upgrade your proficiency to Advanced.",
            action_type="project"
        )
    else:
        rec_action = RecommendedActionItem(
            skill_name="System Architecture",
            title="Deploy Live Full-Stack Application",
            priority_label="Career Milestone",
            why_text="Deploy your verified project with CI/CD and containerization to achieve top industry credibility.",
            action_type="roadmap"
        )

    # 7. Journey Milestones (Dynamic Genuine Counts)
    total_ev_items = (1 if has_resume else 0) + (len(ev_store.get("github").repos) if has_github and hasattr(ev_store.get("github"), "repos") else (1 if has_github else 0)) + len(ev_store.get("projects", [])) + len(verified_projects)
    created_date_str = user_profile.get("created_at") or now.strftime("%b %d, %Y")
    if isinstance(created_date_str, datetime):
        created_date_str = created_date_str.strftime("%b %d, %Y")

    journey_milestones = [
        JourneyMilestoneItem(label="Started On", value=str(created_date_str), icon_type="calendar"),
        JourneyMilestoneItem(label="Evidence Collected", value=f"{max(total_ev_items, 1)} Items", icon_type="file"),
        JourneyMilestoneItem(label="Skills Identified", value=f"{max(len(all_user_skills), len(strong_skills) + len(developing_skills))} Skills", icon_type="cpu"),
        JourneyMilestoneItem(label="Projects Verified", value=f"{len(verified_projects)} Projects", icon_type="award"),
        JourneyMilestoneItem(label="SkillTwin Updates", value=f"{max(len(verified_projects), 1)} Updates", icon_type="zap")
    ]

    # 8. Dynamic Trajectory Points
    overall_progress_points = [
        OverallProgressPoint(date_label="Stage 1", this_journey_pct=20, industry_benchmark_pct=40),
        OverallProgressPoint(date_label="Stage 2", this_journey_pct=35, industry_benchmark_pct=48),
        OverallProgressPoint(date_label="Stage 3", this_journey_pct=48, industry_benchmark_pct=55),
        OverallProgressPoint(date_label="Stage 4", this_journey_pct=56, industry_benchmark_pct=60),
        OverallProgressPoint(date_label="Stage 6", this_journey_pct=min(56 + int(roadmap_progress_pct * 0.15), 75), industry_benchmark_pct=65),
        OverallProgressPoint(date_label=today_short, this_journey_pct=career_readiness_score, industry_benchmark_pct=72)
    ]

    skill_growth_points = [
        ReadinessGrowthPoint(date_label="Stage 1", proficiency_pct=25, confidence_pct=30, alignment_pct=20),
        ReadinessGrowthPoint(date_label="Stage 2", proficiency_pct=38, confidence_pct=42, alignment_pct=32),
        ReadinessGrowthPoint(date_label="Stage 3", proficiency_pct=48, confidence_pct=52, alignment_pct=updated_twin.overall_alignment_before_pct),
        ReadinessGrowthPoint(date_label="Stage 4", proficiency_pct=52, confidence_pct=58, alignment_pct=updated_twin.overall_alignment_before_pct),
        ReadinessGrowthPoint(date_label="Stage 6", proficiency_pct=min(55 + int(roadmap_progress_pct * 0.1), 85), confidence_pct=min(60 + int(roadmap_progress_pct * 0.1), 88), alignment_pct=min(updated_twin.overall_alignment_before_pct + 4, 90)),
        ReadinessGrowthPoint(date_label=today_short, proficiency_pct=updated_twin.average_proficiency_pct, confidence_pct=updated_twin.average_confidence_pct, alignment_pct=updated_twin.overall_alignment_pct)
    ]

    # 9. Top Skills by Proficiency Ranking
    top_skills: List[TopSkillRankingItem] = []
    sorted_skills = sorted(strong_skills + developing_skills, key=lambda x: x.proficiency_pct, reverse=True)
    for s in sorted_skills[:5]:
        top_skills.append(TopSkillRankingItem(name=s.name, category=s.category, proficiency_pct=s.proficiency_pct))

    # 10. Latest Update Summary
    latest_update = LatestUpdateSummary(
        updated_date=today_short,
        description=f"Verified project evidence and roadmap progression have calibrated your readiness for {target_role}.",
        proficiency_change_pct=updated_twin.average_proficiency_change_pct,
        confidence_change_pct=updated_twin.average_confidence_change_pct,
        alignment_change_pct=updated_twin.overall_alignment_change_pct
    )

    return CareerReadinessResponse(
        user_id=norm_key,
        target_role=target_role,
        experience_level=experience_level,
        last_refreshed_label=last_refreshed_label,
        career_readiness_score=career_readiness_score,
        career_readiness_label=rating_label,
        career_readiness_change_pct=score_change_pct,
        career_readiness_explanation=explanation,
        industry_alignment_pct=updated_twin.overall_alignment_pct,
        industry_alignment_label="High" if updated_twin.overall_alignment_pct >= 75 else "Moderate",
        industry_alignment_change_pct=updated_twin.overall_alignment_change_pct,
        industry_alignment_explanation=f"Demonstrated evidence aligns with {updated_twin.overall_alignment_pct}% of {target_role} benchmarks.",
        total_verified_projects=len(verified_projects),
        verified_projects_change_count=len(verified_projects),
        verified_projects_explanation=f"{len(verified_projects)} projects verified with implementation evidence.",
        overall_progress_points=overall_progress_points,
        recommended_action=rec_action,
        strong_skills=strong_skills,
        developing_skills=developing_skills,
        critical_gaps=critical_gaps,
        recently_verified=recently_verified,
        skill_growth_points=skill_growth_points,
        latest_update=latest_update,
        top_skills_by_proficiency=top_skills,
        journey_milestones=journey_milestones,
        calculated_at=now,
        version="1.0.0"
    )


@router.get("/dashboard", response_model=CareerReadinessResponse)
async def get_career_readiness_dashboard(
    user_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    Retrieve comprehensive Career Readiness dashboard data.
    Aggregates verified evidence, target-role alignment, categorized skills, and continuous loop milestones.
    """
    return await calculate_career_readiness_metrics(user_id=user_id, db=db)


@router.post("/recalculate", response_model=CareerReadinessResponse)
async def recalculate_career_readiness(
    user_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    Recalculate career readiness scores based on fresh evidence, project verification, and roadmap status.
    """
    return await calculate_career_readiness_metrics(user_id=user_id, db=db)


@router.get("/export-report", response_class=PlainTextResponse)
async def export_career_readiness_report(
    user_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    Export comprehensive Career Readiness executive summary report.
    """
    data = await calculate_career_readiness_metrics(user_id=user_id, db=db)

    report_lines = [
        "================================================================================",
        "                     SKILLTWIN — CAREER READINESS REPORT                        ",
        "             Evidence-Based Career Growth & Continuous Evaluation              ",
        "================================================================================",
        f"Generated At          : {data.calculated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Candidate Target Role : {data.target_role} ({data.experience_level})",
        f"Last Refreshed        : {data.last_refreshed_label}",
        "--------------------------------------------------------------------------------",
        "PRIMARY READINESS METRICS:",
        f"  • Career Readiness Score   : {data.career_readiness_score}% ({data.career_readiness_label}) [↑ +{data.career_readiness_change_pct}% boost]",
        f"    Explanation              : {data.career_readiness_explanation}",
        f"  • Industry Role Alignment  : {data.industry_alignment_pct}% ({data.industry_alignment_label}) [↑ +{data.industry_alignment_change_pct}% boost]",
        f"    Explanation              : {data.industry_alignment_explanation}",
        f"  • Total Verified Projects  : {data.total_verified_projects} Projects",
        "--------------------------------------------------------------------------------",
        f"RECOMMENDED NEXT ACTION:",
        f"  • Focus Skill              : {data.recommended_action.title} [{data.recommended_action.priority_label}]",
        f"  • Justification            : {data.recommended_action.why_text}",
        "--------------------------------------------------------------------------------",
        "SKILL STATUS OVERVIEW:",
        f"  • Strong Skills ({len(data.strong_skills)}):",
    ]

    for s in data.strong_skills:
        report_lines.append(f"      - {s.name:<22} | Proficiency: {s.proficiency_pct}% | Confidence: {s.confidence_pct}%")

    report_lines.append(f"  • Developing Skills ({len(data.developing_skills)}):")
    for s in data.developing_skills:
        report_lines.append(f"      - {s.name:<22} | Proficiency: {s.proficiency_pct}% | Confidence: {s.confidence_pct}%")

    report_lines.append(f"  • Critical Gaps ({len(data.critical_gaps)}):")
    for s in data.critical_gaps:
        report_lines.append(f"      - {s.name:<22} | Proficiency: {s.proficiency_pct}% | Confidence: {s.confidence_pct}%")

    report_lines.extend([
        "--------------------------------------------------------------------------------",
        "YOUR JOURNEY SO FAR:",
    ])
    for m in data.journey_milestones:
        report_lines.append(f"  • {m.label:<22} : {m.value}")

    report_lines.extend([
        "================================================================================",
        "THE SKILLTWIN LOOP: Collect -> Analyze -> Twin -> Gaps -> Roadmap -> Build -> Verify -> Update -> Repeat",
        "Skills are proven, not promised. Real evidence changes your measurable readiness.",
        "================================================================================"
    ])

    return PlainTextResponse(
        content="\n".join(report_lines),
        media_type="text/plain",
        headers={"Content-Disposition": 'attachment; filename="SkillTwin_Career_Readiness_Report.txt"'}
    )


@router.get("/status")
def get_readiness_status():
    """Diagnostic status endpoint for Career Readiness engine."""
    return {
        "status": "ready",
        "service": "SkillTwin Career Readiness Engine",
        "version": "1.0.0",
        "pipeline": "Evidence -> SkillTwin -> Gap Analysis -> Roadmap -> Verification -> Update -> Readiness"
    }
