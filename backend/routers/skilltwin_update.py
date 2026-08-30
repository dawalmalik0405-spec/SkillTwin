import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.shared.models import (
    SkillTwinUpdatedSkillChange,
    SkillGrowthPoint,
    RecentActivityItem,
    SkillTwinUpdatedResponse,
    ApplyVerificationRequest,
    ProjectVerificationItem
)
from backend.routers.evidence import _normalize_user_key
from backend.routers.verification import _get_user_projects_list
from backend.routers.skilltwin import synthesize_living_skilltwin, ROLE_REQUIRED_SKILLS

router = APIRouter(
    prefix="/api/skilltwin",
    tags=["SkillTwin Updated — Evidence Refresh Engine"]
)


def calculate_skilltwin_updated(
    user_id: Optional[str] = "default_user",
    db: Optional[Session] = None
) -> SkillTwinUpdatedResponse:
    """
    Dynamic Evidence Recalculation Engine for SkillTwin Updated (Page 8).
    Compares baseline synthesized SkillTwin against actual verified projects on Page 7.
    """
    uid = user_id or "default_user"
    norm_key = _normalize_user_key(uid)

    # 1. Fetch Baseline SkillTwin Profile
    base_twin = synthesize_living_skilltwin(email=norm_key, user_id=norm_key, db=db)
    target_role = base_twin.target_role or "Full-Stack Developer"
    experience_level = "Entry Level (0-2 years)"

    # 2. Fetch User's Verified Projects from Page 7
    user_projects = _get_user_projects_list(norm_key)
    verified_projects = [p for p in user_projects if p.status == "Verified"]
    latest_project = verified_projects[0] if verified_projects else (user_projects[0] if user_projects else None)

    # Current timestamp strings
    now = datetime.utcnow()
    last_updated_label = now.strftime("%b %d, %Y, %I:%M %p")
    today_short = now.strftime("%b %d")

    # 3. Base Metrics
    base_skills = base_twin.skills or []
    if base_skills:
        base_avg_prof = int(sum(s.numeric_proficiency * 20 for s in base_skills) / len(base_skills))
        base_avg_conf = int(sum(s.confidence_score for s in base_skills) / len(base_skills))
    else:
        base_avg_prof = 45
        base_avg_conf = 55

    base_alignment = base_twin.breakdown.role_alignment if base_twin.breakdown else 50

    # 4. Handle Case: No Verified Projects Yet (Honest Empty / Baseline State)
    if not verified_projects:
        # Construct baseline growth timeline
        growth_timeline = [
            SkillGrowthPoint(date_label="Stage 1", proficiency_pct=max(base_avg_prof - 25, 15), alignment_pct=max(base_alignment - 30, 15), event_label="Initial Onboarding"),
            SkillGrowthPoint(date_label="Stage 2", proficiency_pct=max(base_avg_prof - 12, 25), alignment_pct=max(base_alignment - 18, 25), event_label="Evidence Uploaded"),
            SkillGrowthPoint(date_label="Stage 3", proficiency_pct=base_avg_prof, alignment_pct=base_alignment, event_label="SkillTwin Synthesized"),
            SkillGrowthPoint(date_label="Stage 4", proficiency_pct=base_avg_prof, alignment_pct=base_alignment, event_label="Target Role Mapped"),
            SkillGrowthPoint(date_label="Stage 6", proficiency_pct=base_avg_prof, alignment_pct=base_alignment, event_label="Roadmap Active"),
            SkillGrowthPoint(date_label=today_short, proficiency_pct=base_avg_prof, alignment_pct=base_alignment, event_label="Awaiting Project Verification")
        ]

        recent_activity = [
            RecentActivityItem(
                id=f"act-{uuid.uuid4().hex[:6]}",
                title="Evidence Synthesized",
                subtitle="Baseline SkillTwin Generated",
                timestamp_label=last_updated_label,
                icon_type="refresh",
                status="Completed"
            )
        ]

        return SkillTwinUpdatedResponse(
            user_id=norm_key,
            target_role=target_role,
            experience_level=experience_level,
            last_updated_label=last_updated_label,
            overall_alignment_pct=base_alignment,
            overall_alignment_before_pct=base_alignment,
            overall_alignment_change_pct=0,
            average_proficiency_pct=base_avg_prof,
            average_proficiency_before_pct=base_avg_prof,
            average_proficiency_change_pct=0,
            average_confidence_pct=base_avg_conf,
            average_confidence_before_pct=base_avg_conf,
            average_confidence_change_pct=0,
            verified_projects_count=0,
            verified_projects_change_count=0,
            skills_improved_count=0,
            new_evidence_count=0,
            latest_verified_project=latest_project,
            skill_changes=[],
            growth_timeline=growth_timeline,
            recent_activity=recent_activity,
            target_role_impact_explanation="Submit and verify project implementations on Page 7 to upgrade your SkillTwin metrics with real evidence.",
            calculated_at=now,
            version="1.0.0"
        )

    # 5. Process Genuine Verified Evidence & Calculate Skill Changes
    skill_changes: List[SkillTwinUpdatedSkillChange] = []
    seen_skills = set()

    for proj in verified_projects:
        for vs in proj.verified_skills:
            canonical = vs.skill_name.strip()
            if canonical in seen_skills:
                continue
            seen_skills.add(canonical)

            # Match against baseline skills
            matched_base = next((s for s in base_skills if s.name.lower() == canonical.lower() or s.canonical_name.lower() == canonical.lower()), None)

            if matched_base:
                b_level = matched_base.proficiency
                b_pct = int(matched_base.numeric_proficiency * 20)
            else:
                b_level = "Beginner"
                b_pct = 35

            # Calculate boost from verified project code evidence
            boost = min(int(proj.score_pct * 0.22), 22)  # up to +22% boost
            a_pct = min(b_pct + boost, 92)

            if a_pct >= 75:
                a_level = "Advanced"
            elif a_pct >= 50:
                a_level = "Intermediate"
            else:
                a_level = "Beginner"

            # Determine icon category
            c_lower = canonical.lower()
            icon_type = "react" if "react" in c_lower else ("nodejs" if "node" in c_lower else ("python" if "python" in c_lower else ("javascript" if "javascript" in c_lower or "js" in c_lower else ("git" if "git" in c_lower else ("docker" if "docker" in c_lower else ("mongodb" if "mongo" in c_lower else ("postgresql" if "postgres" in c_lower or "sql" in c_lower else "api")))))))

            citations = vs.file_locations if vs.file_locations else ["src/", "README.md"]

            skill_changes.append(
                SkillTwinUpdatedSkillChange(
                    skill_name=canonical,
                    category=vs.category or "Implementation",
                    icon_type=icon_type,
                    before_level=b_level,
                    before_pct=b_pct,
                    after_level=a_level,
                    after_pct=a_pct,
                    change_pct=a_pct - b_pct,
                    reason=f"Verified in '{proj.name}' repository with {vs.status.lower()} practical implementation.",
                    evidence_text=vs.evidence or f"Demonstrated implementation files and code structure verified in '{proj.name}'.",
                    file_citations=citations,
                    project_id=proj.id,
                    project_name=proj.name
                )
            )

    # 6. Calculate Dynamic Updated Averages & Alignment
    skills_improved_count = len(skill_changes)
    total_change = sum(sc.change_pct for sc in skill_changes)
    avg_change = int(total_change / max(skills_improved_count, 1))

    updated_avg_prof = min(base_avg_prof + max(int(avg_change * 0.7), 4), 92)
    updated_avg_conf = min(base_avg_conf + max(int(avg_change * 0.8), 5), 94)
    prof_change_pct = updated_avg_prof - base_avg_prof
    conf_change_pct = updated_avg_conf - base_avg_conf

    # Target Role Alignment calculation
    required_skills = ROLE_REQUIRED_SKILLS.get(target_role, ROLE_REQUIRED_SKILLS["Full-Stack Developer"])
    base_matches = sum(1 for req in required_skills if any(req.lower() in s.name.lower() for s in base_skills))
    base_alignment_pct = min(int((base_matches / len(required_skills)) * 100), 90)

    # Verified skills match boost
    verified_names = [sc.skill_name.lower() for sc in skill_changes]
    updated_matches = sum(1 for req in required_skills if any(req.lower() in s.name.lower() for s in base_skills) or any(req.lower() in vn for vn in verified_names))
    updated_alignment_pct = min(int((updated_matches / len(required_skills)) * 100) + min(len(verified_projects) * 3, 12), 95)
    alignment_change_pct = max(updated_alignment_pct - base_alignment_pct, len(verified_projects) * 3)

    # 7. Construct Dynamic Growth Timeline
    growth_timeline = [
        SkillGrowthPoint(date_label="Stage 1", proficiency_pct=max(base_avg_prof - 24, 15), alignment_pct=max(base_alignment_pct - 30, 15), event_label="Initial Onboarding"),
        SkillGrowthPoint(date_label="Stage 2", proficiency_pct=max(base_avg_prof - 12, 25), alignment_pct=max(base_alignment_pct - 18, 25), event_label="Evidence Uploaded"),
        SkillGrowthPoint(date_label="Stage 3", proficiency_pct=base_avg_prof, alignment_pct=base_alignment_pct, event_label="First SkillTwin"),
        SkillGrowthPoint(date_label="Stage 4", proficiency_pct=base_avg_prof, alignment_pct=min(base_alignment_pct + 4, 90), event_label="Target Role Set"),
        SkillGrowthPoint(date_label="Stage 6", proficiency_pct=min(base_avg_prof + 4, 90), alignment_pct=min(base_alignment_pct + 8, 92), event_label="Roadmap Completed"),
        SkillGrowthPoint(date_label=today_short, proficiency_pct=updated_avg_prof, alignment_pct=updated_alignment_pct, event_label="Projects Verified & Updated")
    ]

    # 8. Construct Dynamic Recent Activity
    recent_activity: List[RecentActivityItem] = []

    for p in verified_projects[:2]:
        recent_activity.append(
            RecentActivityItem(
                id=f"act-{uuid.uuid4().hex[:6]}",
                title="Project Verified",
                subtitle=p.name,
                timestamp_label=last_updated_label,
                icon_type="project",
                status="Completed"
            )
        )

    if skill_changes:
        recent_activity.append(
            RecentActivityItem(
                id=f"act-{uuid.uuid4().hex[:6]}",
                title="Skills Updated",
                subtitle=f"{len(skill_changes)} skills improved with project evidence",
                timestamp_label=last_updated_label,
                icon_type="skill",
                status="Completed"
            )
        )

    recent_activity.append(
        RecentActivityItem(
            id=f"act-{uuid.uuid4().hex[:6]}",
            title="SkillTwin Refreshed",
            subtitle="Digital twin recalibrated with verified evidence",
            timestamp_label=last_updated_label,
            icon_type="refresh",
            status="Completed"
        )
    )

    impact_explanation = f"Your verified projects have strengthened your evidence base, raising your alignment to {updated_alignment_pct}% for {target_role}."

    return SkillTwinUpdatedResponse(
        user_id=norm_key,
        target_role=target_role,
        experience_level=experience_level,
        last_updated_label=last_updated_label,
        overall_alignment_pct=updated_alignment_pct,
        overall_alignment_before_pct=base_alignment_pct,
        overall_alignment_change_pct=alignment_change_pct,
        average_proficiency_pct=updated_avg_prof,
        average_proficiency_before_pct=base_avg_prof,
        average_proficiency_change_pct=prof_change_pct,
        average_confidence_pct=updated_avg_conf,
        average_confidence_before_pct=base_avg_conf,
        average_confidence_change_pct=conf_change_pct,
        verified_projects_count=len(verified_projects),
        verified_projects_change_count=len(verified_projects),
        skills_improved_count=skills_improved_count,
        new_evidence_count=len(verified_projects),
        latest_verified_project=latest_project,
        skill_changes=skill_changes,
        growth_timeline=growth_timeline,
        recent_activity=recent_activity,
        target_role_impact_explanation=impact_explanation,
        calculated_at=now,
        version="1.0.0"
    )


@router.get("/updated", response_model=SkillTwinUpdatedResponse)
def get_skilltwin_updated(
    user_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    Retrieve refreshed SkillTwin profile after project verification.
    Provides explainable before/after comparisons, growth timeline, and target role impact.
    """
    return calculate_skilltwin_updated(user_id=user_id, db=db)


@router.post("/apply-verification", response_model=SkillTwinUpdatedResponse)
def apply_verification_to_skilltwin(
    payload: ApplyVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Apply a verified project's evidence to the candidate's living SkillTwin profile.
    Recalculates proficiency, confidence, and target-role alignment.
    """
    return calculate_skilltwin_updated(user_id=payload.user_id, db=db)


@router.get("/updated/export-report", response_class=PlainTextResponse)
def export_skilltwin_updated_report(
    user_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    """
    Export comprehensive plain-text / markdown verification update report for candidate portfolio.
    """
    updated_data = calculate_skilltwin_updated(user_id=user_id, db=db)

    report_lines = [
        "================================================================================",
        "                       SKILLTWIN — DIGITAL TWIN UPDATE REPORT                   ",
        "                     Evidence-Based Skill Recalculation Summary                ",
        "================================================================================",
        f"Generated At      : {updated_data.calculated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Target Role       : {updated_data.target_role}",
        f"Experience Level  : {updated_data.experience_level}",
        f"Last Updated      : {updated_data.last_updated_label}",
        "--------------------------------------------------------------------------------",
        "SUMMARY METRICS (BEFORE → AFTER):",
        f"  • Overall Role Alignment  : {updated_data.overall_alignment_before_pct}% → {updated_data.overall_alignment_pct}% (+{updated_data.overall_alignment_change_pct}%)",
        f"  • Average Proficiency    : {updated_data.average_proficiency_before_pct}% → {updated_data.average_proficiency_pct}% (+{updated_data.average_proficiency_change_pct}%)",
        f"  • Average Confidence     : {updated_data.average_confidence_before_pct}% → {updated_data.average_confidence_pct}% (+{updated_data.average_confidence_change_pct}%)",
        f"  • Verified Projects      : {updated_data.verified_projects_count} Total (+{updated_data.verified_projects_change_count} New)",
        f"  • Skills Improved        : {updated_data.skills_improved_count} Skills",
        "--------------------------------------------------------------------------------",
        "WHAT CHANGED (EVIDENCE CITATIONS):",
    ]

    if not updated_data.skill_changes:
        report_lines.append("  No verified project evidence applied yet.")
    else:
        for sc in updated_data.skill_changes:
            report_lines.append(f"\n  • {sc.skill_name} ({sc.category}): {sc.before_level} ({sc.before_pct}%) → {sc.after_level} ({sc.after_pct}%) [+{sc.change_pct}%]")
            report_lines.append(f"    Reason   : {sc.reason}")
            report_lines.append(f"    Evidence : {sc.evidence_text}")
            if sc.file_citations:
                report_lines.append(f"    Files    : {', '.join(sc.file_citations)}")

    report_lines.extend([
        "\n================================================================================",
        "Skills are proven, not promised. Real evidence changes your living SkillTwin.",
        "================================================================================"
    ])

    return PlainTextResponse(
        content="\n".join(report_lines),
        media_type="text/plain",
        headers={"Content-Disposition": 'attachment; filename="SkillTwin_Update_Report.txt"'}
    )
