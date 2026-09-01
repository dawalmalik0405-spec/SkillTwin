import uuid
import re
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, Query, HTTPException, status, Header
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
    _normalize_user_key,
    _in_memory_evidence,
    _in_memory_users,
    SKILL_TAXONOMY
)
from backend.routers.skilltwin import (
    synthesize_living_skilltwin,
    DEFAULT_FALLBACK_SKILLS
)
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

# Alias & Keyword mapping for cross-referencing target role requirements with evidence skills
SKILL_SYNONYMS: Dict[str, List[str]] = {
    "react": ["react.js", "reactjs", "react", "react native"],
    "typescript": ["typescript", "ts"],
    "javascript": ["javascript", "js", "es6", "ecmascript"],
    "html5 & css3": ["html5 & css3", "html / css", "html5", "css3", "html", "css", "html5 & semantic markup", "css3 / modern layouts"],
    "html5": ["html5", "html", "html5 & semantic markup", "html5 & css3"],
    "css3": ["css3", "css", "css3 / modern layouts", "html5 & css3"],
    "tailwind css": ["tailwind css", "tailwind", "tailwindcss"],
    "next.js": ["next.js", "nextjs", "next.js & ssr"],
    "state management": ["state management", "redux", "redux toolkit", "zustand", "state management (redux/zustand)"],
    "redux": ["redux", "redux toolkit", "state management", "state management (redux/zustand)"],
    "node.js": ["node.js", "nodejs", "node"],
    "python": ["python", "python3", "py"],
    "fastapi": ["fastapi", "fastapi / django"],
    "django": ["django", "django rest framework", "fastapi / django"],
    "express.js": ["express.js", "express", "expressjs"],
    "restful apis": ["restful apis", "restful api design", "rest api", "rest apis", "rest & graphql integration", "api integration"],
    "sql": ["sql", "postgresql", "mysql", "sqlite", "relational databases"],
    "postgresql": ["postgresql", "postgres", "psql", "sql"],
    "mongodb": ["mongodb", "mongo", "nosql"],
    "redis": ["redis", "redis caching", "redis & caching"],
    "sqlalchemy": ["sqlalchemy", "sqlalchemy orm", "orm"],
    "git": ["git", "git & github", "git & version control", "github workflows & prs", "version control"],
    "github": ["github", "git & github", "github workflows & prs", "git"],
    "docker": ["docker", "docker containerization", "containers"],
    "ci/cd": ["ci/cd", "ci / cd pipelines", "github actions", "continuous integration"],
    "linux": ["linux", "linux & shell scripting", "bash", "shell scripting"],
    "cloud": ["cloud", "aws", "aws / cloud basics", "cloud infrastructure"],
    "postman": ["postman", "postman & api testing", "api testing"],
    "testing": ["testing", "frontend testing (jest/vitest)", "unit testing", "pytest", "jest", "vitest"],
    "graphql": ["graphql", "apollo"],
    "machine learning": ["machine learning", "machine learning & ai", "ml", "data science"],
    "pandas": ["pandas", "pandas & numpy", "data analysis (pandas/numpy)"]
}


def _normalize_skill_string(s: str) -> str:
    """Lowercase and clean skill strings for fuzzy matching."""
    if not s:
        return ""
    # Strip punctuation and normalize spaces
    cleaned = re.sub(r"[^\w\s\+\#\/\.\-]", " ", s.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def _match_candidate_skill(
    req_skill: str,
    req_canonical: str,
    candidate_skills: Dict[str, Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """
    Intelligently cross-reference a required benchmark skill against
    the candidate's living evidence skills.
    """
    req_s_norm = _normalize_skill_string(req_skill)
    req_c_norm = _normalize_skill_string(req_canonical)

    # 1. Direct match on canonical name or skill name
    for key, data in candidate_skills.items():
        cand_s_norm = _normalize_skill_string(data.get("skill_name", ""))
        cand_c_norm = _normalize_skill_string(data.get("canonical_name", ""))
        cand_name_norm = _normalize_skill_string(data.get("name", ""))

        if req_c_norm and req_c_norm in [cand_c_norm, cand_s_norm, cand_name_norm, key]:
            return data
        if req_s_norm and req_s_norm in [cand_c_norm, cand_s_norm, cand_name_norm, key]:
            return data

    # 2. Synonym dictionary lookup
    for syn_key, synonyms in SKILL_SYNONYMS.items():
        # Check if the requirement matches any synonym group
        syn_matches_req = (
            req_c_norm == syn_key or
            req_s_norm == syn_key or
            any(_normalize_skill_string(syn) in [req_s_norm, req_c_norm] for syn in synonyms)
        )
        if syn_matches_req:
            # Look for candidate skills in this synonym group
            for key, data in candidate_skills.items():
                cand_c_norm = _normalize_skill_string(data.get("canonical_name", ""))
                cand_s_norm = _normalize_skill_string(data.get("skill_name", ""))
                cand_name_norm = _normalize_skill_string(data.get("name", ""))

                for syn in synonyms:
                    syn_norm = _normalize_skill_string(syn)
                    if syn_norm in [cand_c_norm, cand_s_norm, cand_name_norm, key]:
                        return data

    # 3. Substring word match for multi-word skills (e.g. "Docker Containerization" -> "Docker")
    req_words = [w for w in req_s_norm.split() if len(w) > 2 and w not in ["and", "for", "the", "with"]]
    for key, data in candidate_skills.items():
        cand_text = f"{data.get('canonical_name', '')} {data.get('skill_name', '')} {data.get('name', '')}".lower()
        for word in req_words:
            if word in cand_text:
                return data

    return None


def _calculate_evidence_proficiency_pct(skill_data: Dict[str, Any]) -> int:
    """
    Calculate realistic 0-100% proficiency based on genuine evidence quality,
    multi-source confirmation, and confidence score.
    """
    prof = (skill_data.get("proficiency") or "Intermediate").capitalize()

    # 1. Base score from qualitative proficiency
    if prof == "Advanced":
        base_pct = 84
    elif prof == "Intermediate":
        base_pct = 68
    elif prof == "Beginner":
        base_pct = 48
    else:
        base_pct = 60

    # 2. Adjust using numeric proficiency (1.0 to 5.0 scale) if present
    numeric = skill_data.get("numeric_proficiency") or skill_data.get("numeric")
    if numeric and float(numeric) > 0:
        # Numeric 1.0 -> 38%, 2.0 -> 52%, 3.0 -> 68%, 4.0 -> 84%, 5.0 -> 96%
        numeric_pct = int(22 + (float(numeric) * 15))
        base_pct = int((base_pct * 0.35) + (numeric_pct * 0.65))

    # 3. Multi-source confirmation bonus
    sources = skill_data.get("sources") or skill_data.get("evidence_sources") or []
    source_count = len(sources)
    if source_count >= 3:
        source_bonus = 8
    elif source_count == 2:
        source_bonus = 4
    elif source_count == 1 and "Resume" in sources:
        source_bonus = -3  # Single resume mention has less proven technical depth
    else:
        source_bonus = 0

    # 4. Confidence score adjustment
    conf = skill_data.get("confidence_score") or skill_data.get("confidence") or 75
    conf_adj = (float(conf) - 75) * 0.12

    # 5. Depth bonus from verified repos and project deliverables
    repos = skill_data.get("repos") or skill_data.get("github_repos") or []
    projects = skill_data.get("projects") or skill_data.get("project_refs") or []
    depth_bonus = min(len(repos) * 1.5 + len(projects) * 2.0, 6.0)

    final_pct = round(base_pct + source_bonus + conf_adj + depth_bonus)
    return max(25, min(98, final_pct))


def _ingest_all_user_evidence_skills(
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    db: Optional[Session] = None
) -> Tuple[Dict[str, Dict[str, Any]], bool]:
    """
    Comprehensive multi-source evidence ingestor.
    Gathers extracted skills from Resume, GitHub, and Projects across both
    persistent database and active in-memory session caches.

    Returns:
      (candidate_skills_map, has_any_evidence)
    """
    candidate_skills: Dict[str, Dict[str, Any]] = {}
    has_any_evidence = False

    # 1. Ingest from synthesize_living_skilltwin (the core multi-source aggregator)
    try:
        twin = synthesize_living_skilltwin(email=email, user_id=user_id, db=db)
        if twin and twin.skills and len(twin.skills) > 0:
            has_any_evidence = True
            for s in twin.skills:
                key = _normalize_skill_string(s.canonical_name or s.name)
                candidate_skills[key] = {
                    "name": s.name,
                    "canonical_name": s.canonical_name or s.name,
                    "skill_name": s.name,
                    "category": s.category,
                    "proficiency": s.proficiency,
                    "numeric_proficiency": s.numeric_proficiency,
                    "confidence_score": s.confidence_score,
                    "evidence_sources": s.evidence_sources,
                    "sources": s.evidence_sources,
                    "evidence_status": s.evidence_status,
                    "reasoning": s.reasoning,
                    "quotes": s.evidence_details.resume_quotes if s.evidence_details else [],
                    "repos": s.evidence_details.github_repos if s.evidence_details else [],
                    "projects": s.evidence_details.project_refs if s.evidence_details else []
                }
    except Exception as e:
        print(f"[GapAnalysis] synthesize_living_skilltwin ingest note: {e}")

    # 2. Ingest from persistent database user_skills table directly
    if user_id:
        try:
            from backend.shared.user_data_db import get_user_skills, get_all_user_evidence, get_user_projects
            db_skills = get_user_skills(user_id)
            if db_skills and len(db_skills) > 0:
                has_any_evidence = True
                for item in db_skills:
                    cname = item.get("canonical_name") or item.get("skill_name")
                    if cname:
                        key = _normalize_skill_string(cname)
                        if key not in candidate_skills:
                            candidate_skills[key] = {
                                "name": cname,
                                "canonical_name": cname,
                                "skill_name": item.get("skill_name") or cname,
                                "category": item.get("category", "Technical"),
                                "proficiency": item.get("proficiency", "Intermediate"),
                                "numeric_proficiency": 4.5 if item.get("proficiency") == "Advanced" else (3.0 if item.get("proficiency") == "Intermediate" else 2.0),
                                "confidence_score": item.get("confidence_score", 75.0),
                                "sources": [item.get("evidence_source", "Resume")],
                                "evidence_sources": [item.get("evidence_source", "Resume")],
                                "reasoning": item.get("reasoning", "")
                            }

            # Check if user has uploaded resume or connected GitHub in DB
            db_ev = get_all_user_evidence(user_id)
            if db_ev and len(db_ev) > 0:
                has_any_evidence = True

            db_proj = get_user_projects(user_id)
            if db_proj and len(db_proj) > 0:
                has_any_evidence = True
        except Exception as e:
            print(f"[GapAnalysis] Direct DB evidence lookup note: {e}")

    # 3. Ingest from in-memory evidence store (active session / newly uploaded data)
    user_key = _normalize_user_key(email or user_id or "default_user")
    store = _get_user_evidence_store(user_key)

    # If the direct store is empty, check candidate aliases
    if not store.get("skills") and not store.get("resume") and not store.get("github"):
        for candidate in [email, user_id, "default_user"]:
            if candidate:
                cand_key = _normalize_user_key(candidate)
                cand_store = _in_memory_evidence.get(cand_key)
                if cand_store and (cand_store.get("skills") or cand_store.get("resume") or cand_store.get("github")):
                    store = cand_store
                    break

    # Read extracted skills from in-memory store
    in_mem_skills = store.get("skills", {})
    if in_mem_skills:
        has_any_evidence = True
        for cname, item in in_mem_skills.items():
            key = _normalize_skill_string(cname)
            if key not in candidate_skills:
                if isinstance(item, dict):
                    candidate_skills[key] = item
                else:
                    candidate_skills[key] = {
                        "name": getattr(item, "canonical_name", cname),
                        "canonical_name": getattr(item, "canonical_name", cname),
                        "skill_name": getattr(item, "skill_name", cname),
                        "category": getattr(item, "category", "Technical"),
                        "proficiency": getattr(item, "proficiency", "Intermediate"),
                        "numeric_proficiency": 4.5 if getattr(item, "proficiency", "") == "Advanced" else 3.0,
                        "confidence_score": getattr(item, "confidence_score", 80.0),
                        "sources": [getattr(item, "evidence_source", "Resume")],
                        "reasoning": getattr(item, "reasoning", "")
                    }

    if store.get("resume") or store.get("github") or store.get("projects"):
        has_any_evidence = True

    return candidate_skills, has_any_evidence


def compute_skill_gap_analysis(
    role_name: str = "Full-Stack Developer",
    experience_level: str = "Entry Level (0-2 years)",
    industry: str = "All Industries",
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    db: Optional[Session] = None
) -> GapAnalysisSummaryResponse:
    """
    Core Gap Engine Computation.
    Dynamically cross-references user's verified evidence (Resume, GitHub, Projects)
    against Target Role requirements to calculate genuine proficiencies, gaps, and match statuses.
    """
    # 1. Fetch Target Role Benchmark Requirements
    benchmark = build_target_role_benchmark(
        role_name=role_name,
        experience_level=experience_level,
        industry=industry
    )

    # 2. Ingest Candidate's Demonstrated Skills from All Connected Evidence Sources
    candidate_skills, has_any_evidence = _ingest_all_user_evidence_skills(
        user_id=user_id,
        email=email,
        db=db
    )

    # 3. Analyze each requirement from the Benchmark
    gaps_list: List[SkillGapItem] = []

    critical_count = 0
    weak_count = 0
    strong_count = 0
    matched_count = 0

    total_weighted_match = 0
    total_weights = 0

    for req in benchmark.requirements:
        req_pct = int(req.industry_avg_proficiency or 75)
        req_level = req.required_proficiency

        # Match requirement against candidate's verified evidence
        candidate_match = _match_candidate_skill(
            req_skill=req.skill,
            req_canonical=req.canonical_name,
            candidate_skills=candidate_skills
        )

        meta = (
            SKILL_GAP_METADATA.get(req.canonical_name) or
            SKILL_GAP_METADATA.get(req.skill) or
            SKILL_GAP_METADATA.get(req.skill.split()[0]) or
            {}
        )

        if candidate_match:
            # User has verified evidence for this skill
            your_pct = _calculate_evidence_proficiency_pct(candidate_match)
            your_score = round(your_pct / 20.0, 1)
            your_level = candidate_match.get("proficiency", "Intermediate")
            confidence = int(candidate_match.get("confidence_score") or candidate_match.get("confidence") or 80)

            # Compare against required benchmark
            gap_pct = your_pct - req_pct

            # Determine Match Status based on evidence
            if gap_pct >= 0:
                match_status = "Strong"
            elif gap_pct >= -15:
                match_status = "Matched"
            else:
                match_status = "Weak"

            # Determine Priority
            if req.importance == "Core" and gap_pct < -20:
                priority = "Critical"
            elif req.importance in ["Core", "High"] and gap_pct < -15:
                priority = "High"
            elif gap_pct < -10:
                priority = "Medium"
            else:
                priority = "Low"

            # Evidence summary and reasoning
            sources_list = candidate_match.get("sources") or candidate_match.get("evidence_sources") or ["Resume"]
            repos_list = candidate_match.get("repos") or []
            projects_list = candidate_match.get("projects") or []
            quotes_list = candidate_match.get("quotes") or []

            evidence_summary = f"Demonstrated across {', '.join(sources_list)}"
            if repos_list:
                evidence_summary += f" ({len(repos_list)} GitHub repo{'s' if len(repos_list) > 1 else ''})"

            if gap_pct >= 0:
                why_gap = f"Your verified evidence demonstrates strong capability ({your_pct}%), exceeding the role requirement ({req_pct}%)."
            elif gap_pct >= -15:
                why_gap = f"Your proficiency ({your_pct}%) closely matches the required benchmark ({req_pct}%) for {role_name}."
            else:
                why_gap = f"Your current evidence shows {your_pct}% proficiency, creating a {abs(gap_pct)}% gap against the {req_pct}% benchmark required for {role_name}."

            evidence_details = {
                "sources": sources_list,
                "repos": repos_list,
                "quotes": quotes_list,
                "reasoning": candidate_match.get("reasoning", f"Verified through candidate evidence in {', '.join(sources_list)}.")
            }
        else:
            # Genuine Insufficient Evidence - user has no verified evidence for this skill
            your_pct = 0
            your_score = 0.0
            your_level = "Insufficient Evidence"
            confidence = 0
            gap_pct = -req_pct
            match_status = "Missing"

            # Missing skills with high importance are prioritized
            if req.importance == "Core":
                priority = "Critical"
            elif req.importance == "High":
                priority = "High"
            else:
                priority = "Medium"

            why_gap = f"{req.skill} is required ({req_pct}%) for {role_name}, but no verified evidence was found in your connected resume, GitHub, or projects."
            evidence_summary = "Insufficient evidence in connected sources (Resume / GitHub / Projects)."
            evidence_details = {
                "sources": [],
                "repos": [],
                "quotes": [],
                "reasoning": f"No evidence found in uploaded resume, GitHub repositories, or registered projects for {req.skill}."
            }

        # Metric counters
        if match_status == "Missing" or priority == "Critical":
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

        gap_item = SkillGapItem(
            id=f"gap-{uuid.uuid4().hex[:8]}",
            skill=req.skill,
            canonical_name=req.canonical_name,
            category=req.category,
            your_proficiency_pct=your_pct,
            your_proficiency_score=your_score,
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
            evidence_details=evidence_details,
            missing_evidence_note=meta.get("missing_evidence") if match_status in ["Missing", "Weak"] else None,
            why_role_requires=meta.get("why_role") or req.description,
            recommended_action=meta.get("recommended_action") or f"Build an end-to-end practical project exercising {req.skill}.",
            roadmap_destination=meta.get("roadmap_destination") or f"Roadmap Stage: {req.skill} Mastery"
        )
        gaps_list.append(gap_item)

    total_skills = len(gaps_list)
    overall_pct = int(total_weighted_match / max(1, total_weights)) if total_weights > 0 else 0

    # Severity distribution
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

    # Identify top critical gaps and strong verified skills for dynamic AI Insights
    critical_skill_names = [g.skill for g in gaps_list if g.priority == "Critical"][:3]
    strong_skill_names = [g.skill for g in gaps_list if g.match_status == "Strong"][:3]

    ai_insights = [
        GapInsightItem(
            id="insight-1",
            type="critical",
            title="Focus on closing critical gaps first",
            description=f"Improving {', '.join(critical_skill_names) if critical_skill_names else 'core foundational'} skills will significantly increase your role readiness score."
        ),
        GapInsightItem(
            id="insight-2",
            type="strength",
            title="Capitalize on verified strengths",
            description=f"Your verified evidence in {', '.join(strong_skill_names) if strong_skill_names else 'foundational skills'} demonstrates strong baseline competence."
        ),
        GapInsightItem(
            id="insight-3",
            type="recommendation",
            title="Evidence-backed project verification",
            description="Completing verified full-stack project deliverables will eliminate high-priority gaps and validate production readiness."
        )
    ]

    # Recommended Steps
    recommended_steps = [
        f"Start with {sev_critical} critical priority gap skills",
        "Follow your personalized roadmap milestones",
        "Build and verify hands-on projects to demonstrate missing competencies",
        "Re-evaluate your SkillTwin to track real readiness progress"
    ]

    readiness_rating = "Moderate"
    if overall_pct >= 85:
        readiness_rating = "Exceptional"
    elif overall_pct >= 75:
        readiness_rating = "Strong"
    elif overall_pct >= 60:
        readiness_rating = "Moderate"
    elif overall_pct >= 40:
        readiness_rating = "Good"
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
    user_id: Optional[str] = Query(None, description="Optional user ID"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Retrieve evidence-backed Skill Gap Analysis comparing Living SkillTwin with selected Target Role.
    Uses authenticated token or user_id to dynamically analyze all candidate evidence.
    """
    # Use authenticated user_id if not provided
    if not user_id and authorization:
        from backend.routers.auth import get_user_id_from_token
        auth_user_id = get_user_id_from_token(authorization)
        if auth_user_id:
            user_id = auth_user_id

    try:
        return compute_skill_gap_analysis(
            role_name=role,
            experience_level=experience,
            industry=industry,
            user_id=user_id,
            db=db
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
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Recalculate Skill Gap Analysis from newly uploaded/modified evidence.
    """
    if not user_id and authorization:
        from backend.routers.auth import get_user_id_from_token
        auth_user_id = get_user_id_from_token(authorization)
        if auth_user_id:
            user_id = auth_user_id

    return compute_skill_gap_analysis(
        role_name=role,
        experience_level=experience,
        industry=industry,
        user_id=user_id,
        db=db
    )


@router.get("/export-report")
def export_gap_report(
    role: str = Query("Full-Stack Developer"),
    experience: str = Query("Entry Level (0-2 years)"),
    industry: str = Query("All Industries"),
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Generate downloadable text/markdown summary of the candidate's Gap Analysis.
    """
    if not user_id and authorization:
        from backend.routers.auth import get_user_id_from_token
        auth_user_id = get_user_id_from_token(authorization)
        if auth_user_id:
            user_id = auth_user_id

    analysis = compute_skill_gap_analysis(
        role_name=role,
        experience_level=experience,
        industry=industry,
        user_id=user_id,
        db=db
    )

    report_lines = [
        "==================================================================",
        "          SKILLTWIN — EVIDENCE-BASED SKILL GAP REPORT             ",
        "==================================================================",
        f"Generated At: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Target Role: {analysis.target_role} ({analysis.experience_level})",
        f"Overall Role Match: {analysis.overall_match_percentage}% ({analysis.readiness_rating} Readiness)",
        "------------------------------------------------------------------",
        "SUMMARY METRICS:",
        f"• Total Gaps Analyzed: {analysis.total_gaps}",
        f"• Critical Priority Gaps: {analysis.critical_gaps_count}",
        f"• Weak Skills (Below Required): {analysis.weak_skills_count}",
        f"• Strong Skills (Above Required): {analysis.strong_skills_count}",
        f"• Matched Skills (Satisfies Requirement): {analysis.matched_skills_count}",
        "------------------------------------------------------------------",
        "GAP SEVERITY BREAKDOWN:",
        f"• Critical: {analysis.severity_breakdown.critical_count} ({analysis.severity_breakdown.critical_pct}%)",
        f"• High:     {analysis.severity_breakdown.high_count} ({analysis.severity_breakdown.high_pct}%)",
        f"• Medium:   {analysis.severity_breakdown.medium_count} ({analysis.severity_breakdown.medium_pct}%)",
        f"• Low:      {analysis.severity_breakdown.low_count} ({analysis.severity_breakdown.low_pct}%)",
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
