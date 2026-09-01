import uuid
import re
from datetime import datetime
from typing import Optional, List, Dict, Any, Set
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
    _in_memory_users
)
from backend.routers.target_role import (
    build_target_role_benchmark,
    CURATED_ROLE_BENCHMARKS
)

router = APIRouter(prefix="/api/gap-analysis", tags=["Skill Gap Analysis Engine"])

# Canonical Skill Taxonomy and Alias Groups for Intelligent Cross-Evidence Resolution
SKILL_ALIASES: Dict[str, List[str]] = {
    "react": ["react", "react.js", "reactjs", "react native"],
    "typescript": ["typescript", "ts"],
    "javascript": ["javascript", "js", "es6", "ecmascript"],
    "html5 & css3": ["html5 & css3", "html5", "css3", "html", "css", "html / css", "html/css", "html5 & semantic markup", "css3 / modern layouts"],
    "tailwind css": ["tailwind css", "tailwind", "tailwindcss", "css3 / tailwind"],
    "next.js": ["next.js", "nextjs", "next.js & ssr", "next"],
    "state management": ["state management (redux/zustand)", "state management", "redux", "zustand", "redux-toolkit"],
    "responsive design": ["responsive web design", "responsive design", "mobile-first", "responsive styling"],
    "frontend testing": ["frontend testing (jest/vitest)", "frontend testing", "testing", "jest", "vitest", "cypress", "playwright", "unit testing"],
    "web performance": ["web performance optimization", "web performance & core vitals", "web performance", "performance", "optimization"],
    "node.js": ["node.js", "node", "nodejs"],
    "python": ["python", "python3", "py", "python or go scripting"],
    "fastapi": ["fastapi", "fastapi / django", "fastapi for model serving"],
    "express.js": ["express.js", "express", "expressjs"],
    "restful apis": ["restful api design", "restful api architecture", "restful apis", "rest apis", "rest api", "rest", "rest & graphql integration"],
    "security & auth": ["authentication & jwt", "authentication & oauth2", "security & auth", "authentication", "auth", "oauth2", "jwt", "api security & rate limiting", "security best practices", "security"],
    "microservices": ["microservices architecture", "microservices"],
    "graphql": ["graphql", "apollo"],
    "serverless": ["serverless functions", "serverless", "lambda", "aws lambda"],
    "sql": ["sql", "sql & databases", "sql & data engineering", "relational databases", "sql queries", "structured query language"],
    "postgresql": ["postgresql", "postgres", "psql"],
    "mongodb": ["mongodb", "mongo", "nosql"],
    "redis": ["redis caching", "redis & caching", "redis"],
    "database optimization": ["database indexing & tuning", "database optimization", "database indexing", "indexing & tuning"],
    "git": ["git", "git & github", "git & version control", "version control"],
    "github": ["github workflows & prs", "github", "github actions", "pull requests"],
    "docker": ["docker containerization", "docker & containerization", "docker & mlops", "docker", "containers", "containerization"],
    "ci/cd": ["ci / cd pipelines", "ci/cd (github actions / jenkins)", "ci/cd", "ci / cd", "continuous integration", "github actions"],
    "linux": ["linux & shell scripting", "linux & bash", "linux", "bash", "shell scripting", "ubuntu"],
    "cloud": ["aws / cloud basics", "aws", "aws/gcp/azure", "cloud", "cloud platforms", "amazon web services", "gcp", "azure"],
    "postman": ["postman & api testing", "postman", "api testing"],
    "build tools": ["vite & modern build tools", "vite", "webpack", "build tools"],
    "dsa": ["data structures & algorithms", "dsa", "algorithms", "data structures"],
    "agile": ["agile & scrum methodologies", "agile", "scrum"],
    "system design": ["system architecture & design", "system design", "system architecture"],
    "documentation": ["technical documentation", "documentation", "swagger", "openapi"],
    "debugging": ["debugging & troubleshooting", "debugging", "troubleshooting"],
    "sqlalchemy": ["sqlalchemy orm", "sqlalchemy", "orm"],
    "statistics": ["statistics & probability", "statistics", "probability"],
    "linear algebra": ["linear algebra", "matrices", "vectors"],
    "pandas": ["pandas & numpy", "pandas", "numpy", "data analysis (pandas/numpy)"],
    "scikit-learn": ["scikit-learn", "sklearn"],
    "pytorch": ["pytorch", "deep learning (pytorch/tensorflow)", "deep learning basics", "deep learning / pytorch"],
    "tensorflow": ["tensorflow", "keras"],
    "mlflow": ["mlflow / model registry", "mlflow", "model registry"],
    "machine learning": ["machine learning", "ml", "machine learning & ai", "ai/ml"],
    "data visualization": ["data visualization (matplotlib/seaborn)", "data visualization", "matplotlib", "seaborn"],
    "a/b testing": ["a/b testing & experimentation", "a/b testing", "experimentation"],
    "jupyter": ["jupyter notebooks", "jupyter", "ipython"],
    "nlp": ["nlp / llms", "nlp", "llms", "llm", "large language models", "transformers"],
    "kubernetes": ["kubernetes", "k8s"],
    "terraform": ["terraform / iac", "terraform", "iac", "infrastructure as code"],
    "ansible": ["ansible / configuration mgmt", "ansible"],
    "monitoring": ["monitoring (prometheus/grafana)", "monitoring", "prometheus", "grafana"],
    "networking": ["networking fundamentals", "networking", "tcp/ip", "dns", "http"]
}

# Canonical Skill Metadata mapping for Explainable AI & Recommendations
SKILL_GAP_METADATA: Dict[str, Dict[str, Any]] = {
    "React": {
        "why_role": "Essential for building modern, component-driven user interfaces in web applications.",
        "why_gap": "Essential for building modern user interfaces.",
        "missing_evidence": "No advanced state management (Redux/Zustand), testing, or component hook patterns observed.",
        "recommended_action": "Build an interactive dashboard application with routing, state management, and unit testing.",
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
        "recommended_action": "Containerize a multi-service web app (frontend + API + database) with multi-stage Docker builds.",
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


def _collect_all_user_evidence_skills(user_id: Optional[str] = None, email: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    Aggregates all extracted and verified skills for the user across:
    1. Persistent database (user_skills, user_evidence, user_projects)
    2. In-memory evidence store (_in_memory_evidence for user_id, email, and candidate keys)
    Returns a unified, deduplicated map of candidate evidence data.
    """
    candidate_skills: Dict[str, Dict[str, Any]] = {}

    def _merge_skill(
        name: str,
        canonical: str,
        category: str,
        proficiency: str,
        confidence: float,
        source: str,
        context: str = "",
        reasoning: str = "",
        repo_name: str = "",
        project_title: str = ""
    ):
        if not name and not canonical:
            return
        canon_name = canonical or name
        key = canon_name.strip().lower()

        if key not in candidate_skills:
            candidate_skills[key] = {
                "name": name or canon_name,
                "canonical_name": canon_name,
                "category": category or "Technical",
                "proficiency": proficiency or "Beginner",
                "confidence": float(confidence or 70.0),
                "sources": set([source]) if source else set(["Resume"]),
                "quotes": [context] if context else [],
                "repos": [repo_name] if repo_name else [],
                "projects": [project_title] if project_title else [],
                "reasoning": reasoning or ""
            }
        else:
            entry = candidate_skills[key]
            if source:
                entry["sources"].add(source)
            if context and context not in entry["quotes"]:
                entry["quotes"].append(context)
            if repo_name and repo_name not in entry["repos"]:
                entry["repos"].append(repo_name)
            if project_title and project_title not in entry["projects"]:
                entry["projects"].append(project_title)
            if confidence > entry["confidence"]:
                entry["confidence"] = float(confidence)

            # Proficiency precedence: Advanced > Intermediate > Beginner
            current_prof = (entry["proficiency"] or "").lower()
            new_prof = (proficiency or "").lower()
            if "advanced" in new_prof or (current_prof == "beginner" and "intermediate" in new_prof):
                entry["proficiency"] = proficiency

            if reasoning and not entry["reasoning"]:
                entry["reasoning"] = reasoning

    # 1. Load from persistent DB if valid UUID user_id is provided
    if user_id:
        try:
            is_valid_uuid = False
            try:
                uuid.UUID(str(user_id))
                is_valid_uuid = True
            except (ValueError, TypeError, AttributeError):
                is_valid_uuid = False

            if is_valid_uuid:
                from backend.shared.user_data_db import get_user_skills, get_user_evidence, get_user_projects
                db_skills = get_user_skills(user_id)
                for s in db_skills:
                    _merge_skill(
                        name=s.get("skill_name") or s.get("canonical_name", ""),
                        canonical=s.get("canonical_name") or s.get("skill_name", ""),
                        category=s.get("category", "Technical"),
                        proficiency=s.get("proficiency", "Beginner"),
                        confidence=s.get("confidence_score", 70.0),
                        source=s.get("evidence_source", "Resume"),
                        context=s.get("context_snippet", ""),
                        reasoning=s.get("reasoning", "")
                    )

                # Check DB resume
                db_resume = get_user_evidence(user_id, "resume")
                if db_resume and isinstance(db_resume, dict):
                    for s in db_resume.get("skills_extracted", []):
                        if isinstance(s, dict):
                            _merge_skill(
                                name=s.get("skill_name", ""),
                                canonical=s.get("canonical_name", ""),
                                category=s.get("category", "Technical"),
                                proficiency=s.get("proficiency", "Intermediate"),
                                confidence=s.get("confidence_score", 75.0),
                                source="Resume",
                                context=s.get("context_snippet", ""),
                                reasoning=s.get("reasoning", "")
                            )
                    for t in db_resume.get("technologies", []):
                        if isinstance(t, str):
                            _merge_skill(name=t, canonical=t, category="Technical", proficiency="Intermediate", confidence=70.0, source="Resume")

                # Check DB GitHub
                db_github = get_user_evidence(user_id, "github")
                if db_github and isinstance(db_github, dict):
                    for s in db_github.get("skills_extracted", []):
                        if isinstance(s, dict):
                            _merge_skill(
                                name=s.get("skill_name", ""),
                                canonical=s.get("canonical_name", ""),
                                category=s.get("category", "Technical"),
                                proficiency=s.get("proficiency", "Intermediate"),
                                confidence=s.get("confidence_score", 80.0),
                                source="GitHub",
                                context=s.get("context_snippet", ""),
                                reasoning=s.get("reasoning", "")
                            )
                    for lang in db_github.get("detected_languages", []):
                        _merge_skill(name=lang, canonical=lang, category="Technical", proficiency="Intermediate", confidence=75.0, source="GitHub")
                    for fw in db_github.get("detected_frameworks", []):
                        _merge_skill(name=fw, canonical=fw, category="Technical", proficiency="Intermediate", confidence=75.0, source="GitHub")

                # Check DB Projects
                db_projects = get_user_projects(user_id)
                for p in db_projects:
                    techs = p.get("detected_technologies", [])
                    if isinstance(techs, str):
                        techs = [techs]
                    for t in techs:
                        _merge_skill(
                            name=t,
                            canonical=t,
                            category="Technical",
                            proficiency="Intermediate",
                            confidence=75.0,
                            source="Projects",
                            project_title=p.get("title", "")
                        )
        except Exception as e:
            print(f"[GapAnalysis] DB Evidence Query Notice: {e}")

    # 2. Load from In-Memory Stores
    keys_to_check: List[str] = []
    if user_id:
        keys_to_check.append(_normalize_user_key(user_id))
    if email:
        keys_to_check.append(_normalize_user_key(email))
    keys_to_check.append("default_user")

    for k in keys_to_check:
        store = _in_memory_evidence.get(k)
        if store:
            # Check skills dict
            skills_dict = store.get("skills", {})
            if isinstance(skills_dict, dict):
                for s_name, s_obj in skills_dict.items():
                    if isinstance(s_obj, dict):
                        _merge_skill(
                            name=s_obj.get("skill_name") or s_name,
                            canonical=s_obj.get("canonical_name") or s_name,
                            category=s_obj.get("category", "Technical"),
                            proficiency=s_obj.get("proficiency", "Intermediate"),
                            confidence=s_obj.get("confidence_score", 75.0),
                            source=s_obj.get("evidence_source", "Resume"),
                            context=s_obj.get("context_snippet", ""),
                            reasoning=s_obj.get("reasoning", "")
                        )
                    else:
                        # ExtractedSkillItem object
                        _merge_skill(
                            name=getattr(s_obj, "skill_name", s_name),
                            canonical=getattr(s_obj, "canonical_name", s_name),
                            category=getattr(s_obj, "category", "Technical"),
                            proficiency=getattr(s_obj, "proficiency", "Intermediate"),
                            confidence=getattr(s_obj, "confidence_score", 75.0),
                            source=getattr(s_obj, "evidence_source", "Resume"),
                            context=getattr(s_obj, "context_snippet", ""),
                            reasoning=getattr(s_obj, "reasoning", "")
                        )

            # Check Resume
            res = store.get("resume")
            if res:
                skills_ext = getattr(res, "skills_extracted", []) if hasattr(res, "skills_extracted") else res.get("skills_extracted", [])
                for s in skills_ext:
                    name = getattr(s, "skill_name", None) or (s.get("skill_name") if isinstance(s, dict) else "")
                    canonical = getattr(s, "canonical_name", None) or (s.get("canonical_name") if isinstance(s, dict) else "")
                    cat = getattr(s, "category", "Technical") or (s.get("category", "Technical") if isinstance(s, dict) else "Technical")
                    prof = getattr(s, "proficiency", "Intermediate") or (s.get("proficiency", "Intermediate") if isinstance(s, dict) else "Intermediate")
                    conf = getattr(s, "confidence_score", 75.0) or (s.get("confidence_score", 75.0) if isinstance(s, dict) else 75.0)
                    ctx = getattr(s, "context_snippet", "") or (s.get("context_snippet", "") if isinstance(s, dict) else "")
                    rsn = getattr(s, "reasoning", "") or (s.get("reasoning", "") if isinstance(s, dict) else "")
                    _merge_skill(name=name, canonical=canonical, category=cat, proficiency=prof, confidence=conf, source="Resume", context=ctx, reasoning=rsn)

            # Check GitHub
            gh = store.get("github")
            if gh:
                skills_ext = getattr(gh, "skills_extracted", []) if hasattr(gh, "skills_extracted") else gh.get("skills_extracted", [])
                for s in skills_ext:
                    name = getattr(s, "skill_name", None) or (s.get("skill_name") if isinstance(s, dict) else "")
                    canonical = getattr(s, "canonical_name", None) or (s.get("canonical_name") if isinstance(s, dict) else "")
                    cat = getattr(s, "category", "Technical") or (s.get("category", "Technical") if isinstance(s, dict) else "Technical")
                    prof = getattr(s, "proficiency", "Intermediate") or (s.get("proficiency", "Intermediate") if isinstance(s, dict) else "Intermediate")
                    conf = getattr(s, "confidence_score", 80.0) or (s.get("confidence_score", 80.0) if isinstance(s, dict) else 80.0)
                    ctx = getattr(s, "context_snippet", "") or (s.get("context_snippet", "") if isinstance(s, dict) else "")
                    rsn = getattr(s, "reasoning", "") or (s.get("reasoning", "") if isinstance(s, dict) else "")
                    _merge_skill(name=name, canonical=canonical, category=cat, proficiency=prof, confidence=conf, source="GitHub", context=ctx, reasoning=rsn)

            # Check Projects
            projs = store.get("projects", [])
            for p in projs:
                p_title = getattr(p, "title", None) or (p.get("title") if isinstance(p, dict) else "")
                p_techs = getattr(p, "detected_technologies", []) if hasattr(p, "detected_technologies") else (p.get("detected_technologies", []) if isinstance(p, dict) else [])
                for t in p_techs:
                    _merge_skill(name=t, canonical=t, category="Technical", proficiency="Intermediate", confidence=75.0, source="Projects", project_title=p_title)

    # Convert sources set to list
    for k, v in candidate_skills.items():
        if isinstance(v.get("sources"), set):
            v["sources"] = sorted(list(v["sources"]))

    return candidate_skills


def _find_matching_evidence(req_skill: str, req_canonical: str, candidate_skills: Dict[str, Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Intelligently matches a required target role skill against candidate evidence skills
    using canonical names, aliases, and clean token resolution.
    """
    if not candidate_skills:
        return None

    s_key = req_skill.strip().lower()
    c_key = req_canonical.strip().lower()

    # 1. Direct lowercase key match
    if s_key in candidate_skills:
        return candidate_skills[s_key]
    if c_key in candidate_skills:
        return candidate_skills[c_key]

    # 2. Alias group matching
    for group_key, aliases in SKILL_ALIASES.items():
        req_in_group = any(s_key == a.lower() or c_key == a.lower() or a.lower() in s_key for a in aliases)
        if req_in_group:
            for cand_key, cand_data in candidate_skills.items():
                if any(cand_key == a.lower() or a.lower() in cand_key for a in aliases):
                    return cand_data

    # 3. Substring / Token matching
    def clean_tokens(text: str) -> Set[str]:
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
        tokens = set(cleaned.split()) - {
            "and", "or", "the", "in", "for", "with", "a", "an", "basics",
            "design", "development", "tools", "pipelines", "architecture",
            "markup", "workflows", "layouts", "overview"
        }
        return tokens

    req_tokens = clean_tokens(req_skill) | clean_tokens(req_canonical)
    for cand_key, cand_data in candidate_skills.items():
        cand_tokens = (
            clean_tokens(cand_data.get("name", ""))
            | clean_tokens(cand_data.get("canonical_name", ""))
            | clean_tokens(cand_key)
        )
        common = req_tokens & cand_tokens
        if common and any(len(t) >= 3 for t in common):
            return cand_data

    return None


def _calculate_proficiency_from_evidence(candidate_match: Dict[str, Any], req: Any) -> Dict[str, Any]:
    """
    Computes evidence-backed proficiency (0-100), score (0-5.0), level, and confidence
    based on the strength and quality of the user's actual collected evidence.
    """
    sources = candidate_match.get("sources", ["Resume"])
    if isinstance(sources, set):
        sources = list(sources)
    source_count = len(sources)

    prof = (candidate_match.get("proficiency") or "Intermediate").lower()
    raw_confidence = float(candidate_match.get("confidence") or 75.0)
    quotes = candidate_match.get("quotes", [])
    repos = candidate_match.get("repos", [])
    projects = candidate_match.get("projects", [])

    # Step 1: Base score from extraction depth
    if "advanced" in prof:
        base_score = 80.0
    elif "intermediate" in prof:
        base_score = 65.0
    elif "beginner" in prof:
        base_score = 45.0
    else:
        base_score = 55.0

    # Step 2: Multi-source evidence confirmation bonus
    if source_count >= 3:
        # Verified across Resume, GitHub repository code, AND registered Project
        multi_bonus = 12.0
    elif source_count == 2:
        multi_bonus = 6.0
    else:
        multi_bonus = 0.0

    # Step 3: Codebase & Project depth bonuses
    repo_bonus = min(len(repos) * 2.5, 6.0)
    proj_bonus = min(len(projects) * 3.0, 6.0)
    quotes_bonus = min(len(quotes) * 1.5, 4.0)

    # Step 4: Confidence adjustment
    conf_adj = (raw_confidence - 70.0) * 0.1

    # Total calculated proficiency percentage
    calc_pct = base_score + multi_bonus + repo_bonus + proj_bonus + quotes_bonus + conf_adj

    # Quality constraint: If only Resume text without code repository or project, cap at 72%
    if source_count == 1 and "Resume" in sources and len(repos) == 0 and len(projects) == 0:
        calc_pct = min(calc_pct, 72.0)

    your_pct = min(100, max(20, int(round(calc_pct))))
    your_score = round(your_pct / 20.0, 1)

    if your_pct >= 80:
        your_level = "Advanced"
    elif your_pct >= 60:
        your_level = "Intermediate"
    else:
        your_level = "Beginner"

    # Dynamic confidence score based on source verification
    if source_count >= 3:
        final_conf = min(98, max(85, int(raw_confidence + 8)))
    elif source_count == 2:
        final_conf = min(92, max(75, int(raw_confidence + 4)))
    else:
        final_conf = min(85, max(60, int(raw_confidence)))

    return {
        "proficiency_pct": your_pct,
        "proficiency_score": your_score,
        "proficiency_level": your_level,
        "confidence": final_conf,
        "sources": sources,
        "quotes": quotes,
        "repos": repos,
        "projects": projects,
        "reasoning": candidate_match.get("reasoning", "")
    }


def compute_skill_gap_analysis(
    role_name: str = "Full-Stack Developer",
    experience_level: str = "Entry Level (0-2 years)",
    industry: str = "All Industries",
    user_id: Optional[str] = None,
    email: Optional[str] = None
) -> GapAnalysisSummaryResponse:
    """
    Core Gap Engine Computation.
    Cross-references actual evidence collected across Resume, GitHub, and Projects
    against Target Role Industry Benchmark Requirements.
    """
    # 1. Fetch Target Role Benchmark Requirements
    benchmark = build_target_role_benchmark(
        role_name=role_name,
        experience_level=experience_level,
        industry=industry
    )

    # 2. Ingest Candidate's Demonstrated Skills from all Evidence stores
    candidate_skills = _collect_all_user_evidence_skills(user_id=user_id, email=email)

    # 3. Analyze each requirement from the Benchmark against evidence
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
        req_score = round(req_pct / 20.0, 1)

        # Check if candidate has evidence for this skill
        candidate_match = _find_matching_evidence(req.skill, req.canonical_name, candidate_skills)

        meta = (
            SKILL_GAP_METADATA.get(req.canonical_name)
            or SKILL_GAP_METADATA.get(req.skill)
            or SKILL_GAP_METADATA.get(req.skill.split()[0])
            or {}
        )

        if candidate_match:
            # User has evidence - calculate from actual evidence strength
            ev_calc = _calculate_proficiency_from_evidence(candidate_match, req)
            your_pct = ev_calc["proficiency_pct"]
            your_score = ev_calc["proficiency_score"]
            your_level = ev_calc["proficiency_level"]
            confidence = ev_calc["confidence"]
            sources = ev_calc["sources"]

            gap_pct = your_pct - req_pct

            # Determine Match Status
            if gap_pct >= 0:
                match_status = "Strong"
            elif gap_pct >= -12 or (your_pct >= 60 and gap_pct >= -15):
                match_status = "Matched"
            else:
                match_status = "Weak"

            # Determine Priority based on importance & gap
            if match_status == "Weak":
                if req.importance == "Core" and gap_pct < -20:
                    priority = "Critical"
                elif req.importance in ["Core", "High"]:
                    priority = "High"
                else:
                    priority = "Medium"
            elif match_status == "Matched":
                if req.importance == "Core" and gap_pct < -5:
                    priority = "Medium"
                else:
                    priority = "Low"
            else:  # Strong
                priority = "Low"

            # Explainable AI Reasoning
            if match_status == "Strong":
                why_gap = f"Your verified {your_pct}% proficiency ({your_level}) in {req.skill} meets or exceeds the {req_pct}% industry benchmark for {role_name}."
            elif match_status == "Matched":
                why_gap = f"Your {your_pct}% proficiency ({your_level}) in {req.skill} aligns with baseline expectations ({req_pct}% required) for {role_name}."
            else:
                why_gap = f"Your verified evidence demonstrates {your_pct}% proficiency ({your_level}), leaving a {abs(gap_pct)}% gap against the {req_pct}% requirement for {role_name}."

            evidence_summary = (
                f"Demonstrated across {', '.join(sources)}."
                if sources
                else "Demonstrated in candidate profile evidence."
            )
            evidence_details = {
                "sources": sources,
                "repos": ev_calc["repos"],
                "projects": ev_calc["projects"],
                "quotes": ev_calc["quotes"],
                "reasoning": ev_calc["reasoning"]
            }
        else:
            # Genuinely NO evidence found across connected sources
            your_pct = 0
            your_score = 0.0
            your_level = "Insufficient Evidence"
            confidence = 0
            gap_pct = -req_pct
            match_status = "Missing"

            # Missing skills with high role importance are critical priorities
            if req.importance == "Core":
                priority = "Critical"
            elif req.importance == "High":
                priority = "High"
            else:
                priority = "Medium"

            why_gap = f"{req.skill} is required for {role_name}, but no verified evidence was found in your connected Resume, GitHub, or Projects. Add code samples or projects to demonstrate this skill."
            evidence_summary = "Insufficient evidence in connected sources (Resume / GitHub / Projects)."
            evidence_details = {
                "sources": [],
                "repos": [],
                "projects": [],
                "quotes": [],
                "reasoning": "No supporting evidence found in uploaded resume, GitHub repositories, or registered projects."
            }

        # Metric counters
        if priority == "Critical" or match_status == "Missing":
            critical_count += 1
        elif match_status == "Weak":
            weak_count += 1
        elif match_status == "Strong":
            strong_count += 1
        elif match_status == "Matched":
            matched_count += 1

        # Weighted readiness computation based on importance
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
            required_level_score=req_score,
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

    # Severity distribution calculated from actual gaps
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

    # Dynamic AI Insights based on real candidate strengths and critical gaps
    strong_skills = [g.skill for g in gaps_list if g.match_status in ["Strong", "Matched"]][:3]
    critical_skills = [g.skill for g in gaps_list if g.priority == "Critical"][:3]

    ai_insights = [
        GapInsightItem(
            id="insight-1",
            type="critical",
            title="Focus on closing critical gaps first",
            description=(
                f"Prioritizing {', '.join(critical_skills)} will increase your overall match score significantly."
                if critical_skills
                else "Your core skill alignment is strong. Focus on expanding secondary framework depth."
            )
        ),
        GapInsightItem(
            id="insight-2",
            type="strength",
            title="Capitalize on verified evidence foundations",
            description=(
                f"Your verified proficiency in {', '.join(strong_skills)} satisfies industry benchmarks—leverage these foundations when tackling new milestones."
                if strong_skills
                else "Upload your resume or connect GitHub to verify your existing skill foundations."
            )
        ),
        GapInsightItem(
            id="insight-3",
            type="recommendation",
            title="Evidence-backed project verification",
            description="Completing practical projects with verified repository code will systematically eliminate high-priority gaps."
        )
    ]

    # Recommended Steps
    recommended_steps = [
        f"Start with {sev_critical} critical priority gaps" if sev_critical > 0 else "Review your roadmap progression",
        "Follow the personalized milestone roadmap",
        "Build and verify projects to demonstrate skills",
        "Track capability improvements with continuous verification"
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
    user_id: Optional[str] = Query(None, description="Optional user ID"),
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve evidence-backed Skill Gap Analysis comparing actual evidence with selected Target Role.
    Uses authenticated token if no user_id is provided.
    """
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
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    """
    Recalculate Skill Gap Analysis from newly uploaded evidence.
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
        user_id=user_id
    )


@router.get("/export-report")
def export_gap_report(
    role: str = Query("Full-Stack Developer"),
    experience: str = Query("Entry Level (0-2 years)"),
    industry: str = Query("All Industries"),
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
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
        user_id=user_id
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
        "engine": "SkillTwin Gap Engine v2.0",
        "features": ["evidence_matching", "explainable_reasoning", "priority_ranking", "report_export"]
    }
