import uuid
import json
import re
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from fastapi import APIRouter, Depends, Query, HTTPException, status, Header
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.shared.models import (
    RoadmapResourceItem,
    RoadmapTaskItem,
    RoadmapPhaseItem,
    RoadmapMilestoneItem,
    RoadmapSummary,
    PersonalizedRoadmapResponse,
    TaskToggleRequest,
    TASK_SKILL_MAP
)
from backend.routers.evidence import _in_memory_users
from backend.routers.gap_analysis import compute_skill_gap_analysis
from backend.shared.task_progress_db import TaskProgressDB
from backend.routers.auth import require_authentication, verify_access_token
from backend.shared.llm_client import llm_client

router = APIRouter(
    prefix="/api/roadmap",
    tags=["Personalized Roadmap & Verification"]
)

# Curated, verified learning resources (Strictly verified official/open URLs)
CURATED_RESOURCES: Dict[str, List[RoadmapResourceItem]] = {
    "html_css": [
        RoadmapResourceItem(title="MDN Web Docs — HTML & CSS Basics", url="https://developer.mozilla.org/en-US/docs/Learn", type="documentation", provider="MDN"),
        RoadmapResourceItem(title="CSS-Tricks — Complete Guide to Flexbox & Grid", url="https://css-tricks.com/snippets/css/a-guide-to-flexbox/", type="tutorial", provider="CSS-Tricks"),
        RoadmapResourceItem(title="web.dev — Learn Responsive Design", url="https://web.dev/learn/design/", type="interactive", provider="Google web.dev")
    ],
    "javascript": [
        RoadmapResourceItem(title="MDN JavaScript Guide & Modern ES6+", url="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", type="documentation", provider="MDN"),
        RoadmapResourceItem(title="javascript.info — The Modern JavaScript Tutorial", url="https://javascript.info/", type="tutorial", provider="JavaScript.info"),
        RoadmapResourceItem(title="freeCodeCamp — JavaScript Algorithms and Data Structures", url="https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/", type="course", provider="freeCodeCamp")
    ],
    "react": [
        RoadmapResourceItem(title="React Official Documentation (react.dev)", url="https://react.dev/learn", type="documentation", provider="React Core Team"),
        RoadmapResourceItem(title="React TypeScript Cheatsheet", url="https://react-typescript-cheatsheet.netlify.app/", type="tutorial", provider="Community"),
        RoadmapResourceItem(title="Redux Toolkit Official Quickstart", url="https://redux-toolkit.js.org/tutorials/quick-start", type="documentation", provider="Redux Team")
    ],
    "backend": [
        RoadmapResourceItem(title="Node.js Official Documentation & API Guide", url="https://nodejs.org/docs/latest/api/", type="documentation", provider="Node.js"),
        RoadmapResourceItem(title="FastAPI Official Tutorial & User Guide", url="https://fastapi.tiangolo.com/tutorial/", type="documentation", provider="FastAPI"),
        RoadmapResourceItem(title="Express.js Guide — Routing & Middleware", url="https://expressjs.com/en/guide/routing.html", type="documentation", provider="Express")
    ],
    "database": [
        RoadmapResourceItem(title="PostgreSQL Official Documentation", url="https://www.postgresql.org/docs/current/", type="documentation", provider="PostgreSQL"),
        RoadmapResourceItem(title="SQLAlchemy 2.0 Unified Tutorial", url="https://docs.sqlalchemy.org/en/20/tutorial/", type="documentation", provider="SQLAlchemy"),
        RoadmapResourceItem(title="MongoDB Official Developer Guide", url="https://www.mongodb.com/docs/manual/core/databases-and-collections/", type="documentation", provider="MongoDB")
    ],
    "devops": [
        RoadmapResourceItem(title="Docker Official Getting Started Guide", url="https://docs.docker.com/get-started/", type="documentation", provider="Docker"),
        RoadmapResourceItem(title="GitHub Actions Workflow Documentation", url="https://docs.github.com/en/actions", type="documentation", provider="GitHub"),
        RoadmapResourceItem(title="Roadmap.sh Full-Stack Developer Guide", url="https://roadmap.sh/full-stack", type="interactive", provider="Roadmap.sh")
    ],
    "testing": [
        RoadmapResourceItem(title="Vitest Official Getting Started Guide", url="https://vitest.dev/guide/", type="documentation", provider="Vitest"),
        RoadmapResourceItem(title="Testing Library — React Component Testing", url="https://testing-library.com/docs/react-testing-library/intro/", type="documentation", provider="Testing Library"),
        RoadmapResourceItem(title="OWASP Top 10 Web Application Security", url="https://owasp.org/www-project-top-ten/", type="documentation", provider="OWASP")
    ]
}


# Maps the 21 roadmap skill names (lowercased, "/" and " " -> "_") onto the
# broad CURATED_RESOURCES keys above, so every node has real curated links to
# fall back on when the model is unavailable.
CURATED_RESOURCE_ALIASES: Dict[str, str] = {
    "frontend": "html_css",
    "portfolio": "html_css",
    "typescript": "react",
    "redux": "react",
    "e-commerce": "react",
    "node.js": "backend",
    "python_fastapi": "backend",
    "authentication": "backend",
    "postgresql": "database",
    "orm": "database",
    "docker": "devops",
    "ci_cd": "devops",
    "security": "testing",
    "capstone": "devops",
}


# =========================================================
# AI Resource Generation
# =========================================================

# A YouTube resource is only useful if it points at one specific video. These
# match the two canonical single-video forms and capture the 11-character id.
_YT_WATCH_RE = re.compile(
    r"^https?://(?:www\.|m\.)?youtube\.com/watch\?(?=[^#]*\bv=([A-Za-z0-9_-]{11})\b)",
    re.IGNORECASE,
)
_YT_SHORT_RE = re.compile(
    r"^https?://youtu\.be/([A-Za-z0-9_-]{11})(?:[?&/#]|$)",
    re.IGNORECASE,
)
_YT_ANY_RE = re.compile(r"^https?://(?:[\w.-]+\.)?(?:youtube\.com|youtu\.be)/", re.IGNORECASE)


def _normalize_youtube_url(url: str) -> Optional[str]:
    """
    Return a canonical https://www.youtube.com/watch?v=ID URL, or None if the
    URL is not a single specific video.

    Search results, playlists, channels and bare youtube.com links all return
    None: the point of asking the model for a video is to get *that video*, and
    handing the user a search page back is the bug this exists to prevent.
    """
    url = (url or "").strip()
    if not url:
        return None

    match = _YT_WATCH_RE.match(url) or _YT_SHORT_RE.match(url)
    if not match:
        return None
    return f"https://www.youtube.com/watch?v={match.group(1)}"


def _sanitize_ai_resources(resources: Any) -> Tuple[List[Dict[str, str]], int]:
    """
    Drop malformed resources and rewrite YouTube links to canonical watch URLs.

    Returns (clean, videos_kept). Non-YouTube URLs pass through untouched as
    long as they are http(s); a YouTube URL that is not a specific video is
    dropped rather than shown, so nothing that reaches the UI is a search page.
    """
    if not isinstance(resources, list):
        return [], 0

    clean: List[Dict[str, str]] = []
    videos_kept = 0
    seen_urls = set()

    for raw in resources:
        if not isinstance(raw, dict):
            continue
        url = str(raw.get("url", "")).strip()
        title = str(raw.get("title", "")).strip()
        if not url or not title or not url.lower().startswith(("http://", "https://")):
            continue

        res_type = str(raw.get("type", "") or "").strip().lower() or "tutorial"

        if _YT_ANY_RE.match(url):
            canonical = _normalize_youtube_url(url)
            if not canonical:
                # Model ignored the rule and sent a search/playlist/channel link.
                print(f"[Roadmap AI] Dropped non-video YouTube URL: {url}")
                continue
            url = canonical
            res_type = "video"

        if url in seen_urls:
            continue
        seen_urls.add(url)

        if res_type == "video":
            videos_kept += 1

        clean.append({
            "title": title,
            "url": url,
            "type": res_type,
            "provider": str(raw.get("provider", "") or "").strip() or "Web",
            "description": str(raw.get("description", "") or "").strip(),
        })

    return clean, videos_kept


async def generate_ai_resources(
    skill_name: str,
    user_level: str = "intermediate",
    resource_type: str = "mixed"
) -> List[Dict[str, str]]:
    """
    Generate personalized learning resources using AI.
    Returns YouTube links, documentation, and tutorials based on skill and user level.
    """
    system_prompt = """You are an expert technical educator recommending learning resources.
You must return valid JSON with the following structure:
{
    "resources": [
        {
            "title": "Resource Title",
            "url": "https://example.com/resource",
            "type": "video/tutorial/documentation/course",
            "provider": "Provider Name",
            "description": "Brief description"
        }
    ]
}

Focus on high-quality, free resources that are currently available.

YOUTUBE RULES - these are strict:
- Every YouTube resource MUST be one specific video, in the exact form
  https://www.youtube.com/watch?v=VIDEO_ID
- VIDEO_ID is the real 11-character id of a real video you are confident exists,
  e.g. https://www.youtube.com/watch?v=PkZNo7MFNFg
- NEVER return a search URL (youtube.com/results?search_query=...), a playlist
  (/playlist?list=...), a channel (/@name, /c/, /channel/) or a bare youtube.com link.
- Put the real video title in "title" and the channel name in "provider".
- If you are not confident a specific video id is real, omit the video entirely
  and recommend a written resource instead. A wrong id is worse than no video.

For documentation, link the exact page on the official docs site, not a search."""

    user_prompt = f"""Recommend the best learning resources to master {skill_name}.
User level: {user_level}
Preferred resource type: {resource_type}

Provide 5-6 high-quality resources including:
1. Official documentation (link the exact page)
2. At least one specific YouTube video: https://www.youtube.com/watch?v=VIDEO_ID
   with the real video id, real title and real channel. Not a search, not a playlist.
3. Interactive tutorials or courses
4. Practice exercises

Make recommendations specific to {skill_name} at {user_level} level."""

    async def ask(extra_instruction: str = "") -> Tuple[List[Dict[str, str]], int]:
        result = await llm_client.extract_structured_json(
            messages=[{"role": "user", "content": user_prompt + extra_instruction}],
            system_prompt=system_prompt
        )
        if result.get("error"):
            print(f"[Roadmap AI] Error generating resources: {result['error']}")
            return [], 0
        data = result.get("data", {})
        return _sanitize_ai_resources(data.get("resources", []))

    try:
        resources, videos = await ask()

        # The model routinely answers with a search URL on the first pass. One
        # corrective round-trip is cheap and usually produces a real video id;
        # if it still cannot, we ship the written resources rather than fake one.
        if resources and videos == 0:
            print(f"[Roadmap AI] No specific video for {skill_name}, re-asking once")
            retry_resources, retry_videos = await ask(
                "\n\nIMPORTANT: your previous answer contained no usable YouTube video. "
                "Return at least one https://www.youtube.com/watch?v=VIDEO_ID link with a "
                "real 11-character video id, real title and real channel name. "
                "Do NOT return youtube.com/results, a playlist, or a channel link. "
                "If you genuinely cannot name a real video id, return no video at all."
            )
            if retry_videos > 0:
                resources, videos = retry_resources, retry_videos

        print(f"[Roadmap AI] Generated {len(resources)} resources "
              f"({videos} specific videos) for {skill_name}")
        return resources

    except Exception as e:
        print(f"[Roadmap AI] Exception generating resources: {e}")
        return []


async def generate_ai_task_description(
    skill_name: str,
    task_title: str,
    user_level: str = "intermediate",
    gap_info: str = ""
) -> Dict[str, str]:
    """
    Generate AI-powered task description and learning objectives.
    """
    system_prompt = """You are an expert curriculum designer creating personalized learning tasks.
Return valid JSON:
{
    "description": "What the user will learn and accomplish",
    "learning_objectives": ["Objective 1", "Objective 2", "Objective 3"],
    "key_concepts": ["Concept A", "Concept B"],
    "practical_exercises": ["Exercise 1", "Exercise 2"],
    "estimated_hours": number
}"""

    user_prompt = f"""Create a detailed task description for learning {skill_name}.
Task title: {task_title}
User level: {user_level}
Gap context: {gap_info}

Make this practical and action-oriented. Include specific things the user will build or practice."""

    try:
        result = await llm_client.extract_structured_json(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt
        )

        if result.get("error"):
            return {
                "description": f"Learn {skill_name} fundamentals and practical applications",
                "learning_objectives": [f"Understand {skill_name} core concepts", "Build practical projects"],
                "key_concepts": [skill_name],
                "practical_exercises": ["Complete exercises", "Build mini-project"],
                "estimated_hours": 8
            }

        return result.get("data", {})

    except Exception as e:
        print(f"[Roadmap AI] Exception generating task description: {e}")
        return {
            "description": f"Learn {skill_name}",
            "learning_objectives": [],
            "key_concepts": [],
            "practical_exercises": [],
            "estimated_hours": 8
        }


# =========================================================
# AI Roadmap Generator (Dynamic based on role & gaps)
# =========================================================

async def generate_ai_roadmap(
    role_name: str,
    experience_level: str,
    daily_effort_hours: str,
    gap_summary,
    user_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generate a fully personalized roadmap using AI based on:
    - Target role
    - User's current skill gaps
    - Experience level
    - Daily time commitment

    Returns a dictionary with phases, tasks, milestones, etc.
    Falls back to None if AI is unavailable.
    """
    if not llm_client.is_configured:
        return None

    # Build a summary of the gaps to feed to the LLM
    critical_skills = [g.skill for g in gap_summary.gaps if g.priority == "Critical"][:5]
    weak_skills = [g.skill for g in gap_summary.gaps if g.match_status == "Weak"][:5]
    strong_skills = [g.skill for g in gap_summary.gaps if g.match_status == "Strong"][:5]

    gaps_context = f"""
Critical Gaps (must learn): {', '.join(critical_skills) if critical_skills else 'None'}
Weak Skills (improve): {', '.join(weak_skills) if weak_skills else 'None'}
Strong Skills (already know): {', '.join(strong_skills) if strong_skills else 'None'}
"""

    system_prompt = """You are an expert career coach and curriculum designer.
You create personalized learning roadmaps for people pursuing specific tech careers.

IMPORTANT: Return ONLY valid JSON in this exact structure:
{
    "phases": [
        {
            "phase_number": 1,
            "title": "Phase 1: <Phase Name>",
            "subtitle": "<What this phase focuses on>",
            "priority": "Critical/High/Medium/Low",
            "estimated_duration_weeks": "2-3 Weeks",
            "why_it_matters": "<Why this phase is important for the role>",
            "exact_gap_addressed": "<What gap this phase fills>",
            "tasks": [
                {
                    "id": "task-p1-1",
                    "title": "<Task name>",
                    "type": "Course/Project/Practice",
                    "description": "<What user will learn>",
                    "estimated_hours": 12,
                    "topics": ["topic1", "topic2", "topic3"],
                    "skill_name": "<primary skill for this task>"
                }
            ]
        }
    ],
    "top_skills": [
        {"name": "SkillName", "category": "Category"}
    ],
    "milestones": [
        {
            "milestone_number": 1,
            "title": "<Milestone name>",
            "description": "<What completing this milestone means>"
        }
    ],
    "why_reasons": [
        "<Reason 1 why this roadmap is personalized>",
        "<Reason 2>"
    ]
}

Guidelines:
- Create 4-6 phases
- Each phase has 2-4 tasks
- Order phases from foundational to advanced
- Focus on closing the critical and weak gaps
- Tasks should be practical and actionable
- Use real technology names, not generic terms
- Make the roadmap specific to the target role
"""

    user_prompt = f"""Create a personalized learning roadmap for someone who wants to become a {role_name}.

Experience Level: {experience_level}
Daily Time Available: {daily_effort_hours}

User's Current Skill Gaps:
{gaps_context}

CRITICAL: The roadmap MUST be 100% specific to the role "{role_name}". Do NOT include generic web development content unless it directly serves the role.

ROLE-SPECIFIC EXAMPLES:
- Data Scientist: Python, Pandas, NumPy, Matplotlib, Scikit-learn, TensorFlow, SQL, Statistics, Jupyter, ML algorithms
- ML Engineer: Python, PyTorch, TensorFlow, MLOps, Docker, Kubernetes, Cloud (AWS/GCP), Model deployment, APIs
- Frontend Developer: HTML, CSS, JavaScript, React, TypeScript, Vue/Angular, Webpack, Responsive design, Browser APIs
- Backend Developer: Python/Java/Go, REST APIs, Databases, Authentication, Docker, Microservices, Caching
- Full-Stack Developer: HTML/CSS, JavaScript, React, Node.js, Python, SQL, Docker, Git, CI/CD
- DevOps Engineer: Linux, Docker, Kubernetes, Terraform, AWS/Azure, CI/CD pipelines, Monitoring, Bash scripting
- Mobile Developer: Swift/Kotlin, React Native, Flutter, iOS/Android SDK, Mobile UI/UX, App Store deployment
- Data Engineer: Python, SQL, Apache Spark, Airflow, Kafka, ETL pipelines, Data warehousing, BigQuery/Snowflake
- Cybersecurity Analyst: Networking, Linux, Python, SIEM tools, Penetration testing, OWASP, Cryptography
- Game Developer: C++, Unity/Unreal, Game physics, 3D graphics, OpenGL, Game design patterns

Requirements:
1. Phases MUST be specific to {role_name} - no generic web dev if it's not a web dev role
2. First phase covers prerequisites for the SPECIFIC role
3. Each phase has 2-4 tasks
4. Task IDs: "task-p1-1", "task-p1-2", etc.
5. Skill names should be REAL technologies for this role
6. The roadmap should be UNIQUE to {role_name} - completely different from other roles

Return ONLY the JSON."""

    try:
        result = await llm_client.extract_structured_json(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt
        )

        if result.get("error"):
            print(f"[Roadmap AI] Error generating roadmap: {result['error']}")
            return None

        data = result.get("data", {})
        if not data.get("phases"):
            print("[Roadmap AI] No phases in response")
            return None

        print(f"[Roadmap AI] Generated {len(data['phases'])} phases for {role_name}")
        return data

    except Exception as e:
        print(f"[Roadmap AI] Exception generating roadmap: {e}")
        return None


def build_fallback_roadmap_structure(
    role_name: str,
    critical_skills: List[str],
    weak_skills: List[str]
) -> Dict[str, Any]:
    """
    Build a dynamic fallback structure when AI is unavailable.
    Creates phases based on the actual gaps identified.
    """
    # Group skills into logical phases
    frontend_skills = ["HTML", "CSS", "JavaScript", "React", "TypeScript", "Redux", "Vue", "Angular", "Sass", "Tailwind"]
    backend_skills = ["Node.js", "Express", "Python", "FastAPI", "Django", "Flask", "Java", "Spring", "Go", "Ruby", "PHP"]
    database_skills = ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQL", "ORM", "SQLAlchemy", "Prisma"]
    devops_skills = ["Docker", "Kubernetes", "CI/CD", "AWS", "Azure", "GCP", "Terraform", "Jenkins"]
    data_skills = ["Pandas", "NumPy", "TensorFlow", "PyTorch", "Scikit-learn", "Machine Learning", "Deep Learning", "NLP", "Statistics"]
    mobile_skills = ["React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android"]

    # Categorize the user's gaps
    all_gap_skills = critical_skills + weak_skills
    user_frontend = [s for s in all_gap_skills if any(f in s for f in frontend_skills)]
    user_backend = [s for s in all_gap_skills if any(b in s for b in backend_skills)]
    user_database = [s for s in all_gap_skills if any(d in s for d in database_skills)]
    user_devops = [s for s in all_gap_skills if any(d in s for d in devops_skills)]
    user_data = [s for s in all_gap_skills if any(d in s for d in data_skills)]
    user_mobile = [s for s in all_gap_skills if any(m in s for m in mobile_skills)]

    phases = []
    phase_num = 1

    # Phase 1: Always fundamentals
    if user_frontend:
        phases.append({
            "phase_number": phase_num,
            "title": f"Phase {phase_num}: Frontend Foundations",
            "subtitle": f"Build core web development skills for {role_name}",
            "priority": "Critical",
            "estimated_duration_weeks": "3-4 Weeks",
            "why_it_matters": f"Frontend fundamentals are essential for {role_name}",
            "exact_gap_addressed": f"Address gaps in: {', '.join(user_frontend[:3])}",
            "tasks": [
                {
                    "id": f"task-p{phase_num}-1",
                    "title": f"Master {user_frontend[0] if user_frontend else 'HTML/CSS'}",
                    "type": "Course",
                    "description": f"Learn {user_frontend[0] if user_frontend else 'HTML and CSS'} fundamentals, best practices, and modern features.",
                    "estimated_hours": 12,
                    "topics": [user_frontend[0] if user_frontend else "HTML", "CSS", "Responsive Design"],
                    "skill_name": user_frontend[0] if user_frontend else "HTML/CSS"
                },
                {
                    "id": f"task-p{phase_num}-2",
                    "title": f"Build Project with {user_frontend[0] if user_frontend else 'HTML/CSS'}",
                    "type": "Project",
                    "description": f"Apply your skills by building a real project using {user_frontend[0] if user_frontend else 'web technologies'}.",
                    "estimated_hours": 8,
                    "topics": ["Project", "Practical Application"],
                    "skill_name": user_frontend[0] if user_frontend else "HTML/CSS"
                }
            ]
        })
        phase_num += 1

    # Phase for backend
    if user_backend:
        phases.append({
            "phase_number": phase_num,
            "title": f"Phase {phase_num}: Backend Development",
            "subtitle": f"Server-side development for {role_name}",
            "priority": "Critical",
            "estimated_duration_weeks": "4-5 Weeks",
            "why_it_matters": f"Backend skills are needed for {role_name}",
            "exact_gap_addressed": f"Address gaps in: {', '.join(user_backend[:3])}",
            "tasks": [
                {
                    "id": f"task-p{phase_num}-1",
                    "title": f"Learn {user_backend[0]}",
                    "type": "Course",
                    "description": f"Master {user_backend[0]} for building server-side applications.",
                    "estimated_hours": 16,
                    "topics": [user_backend[0], "APIs", "Server Architecture"],
                    "skill_name": user_backend[0]
                }
            ]
        })
        phase_num += 1

    # Phase for database
    if user_database:
        phases.append({
            "phase_number": phase_num,
            "title": f"Phase {phase_num}: Database & Data Management",
            "subtitle": f"Data persistence for {role_name}",
            "priority": "High",
            "estimated_duration_weeks": "3-4 Weeks",
            "why_it_matters": f"Database skills are essential for {role_name}",
            "exact_gap_addressed": f"Address gaps in: {', '.join(user_database[:3])}",
            "tasks": [
                {
                    "id": f"task-p{phase_num}-1",
                    "title": f"Master {user_database[0]}",
                    "type": "Course",
                    "description": f"Learn {user_database[0]} for data storage and retrieval.",
                    "estimated_hours": 14,
                    "topics": [user_database[0], "SQL", "Schema Design"],
                    "skill_name": user_database[0]
                }
            ]
        })
        phase_num += 1

    # Phase for data/ML
    if user_data:
        phases.append({
            "phase_number": phase_num,
            "title": f"Phase {phase_num}: Data Science & ML",
            "subtitle": f"Data analysis and machine learning for {role_name}",
            "priority": "High",
            "estimated_duration_weeks": "5-6 Weeks",
            "why_it_matters": f"Data/ML skills are critical for {role_name}",
            "exact_gap_addressed": f"Address gaps in: {', '.join(user_data[:3])}",
            "tasks": [
                {
                    "id": f"task-p{phase_num}-1",
                    "title": f"Learn {user_data[0]}",
                    "type": "Course",
                    "description": f"Master {user_data[0]} for data analysis and ML.",
                    "estimated_hours": 20,
                    "topics": [user_data[0], "Data Analysis", "Statistics"],
                    "skill_name": user_data[0]
                }
            ]
        })
        phase_num += 1

    # Phase for devops
    if user_devops:
        phases.append({
            "phase_number": phase_num,
            "title": f"Phase {phase_num}: DevOps & Deployment",
            "subtitle": f"Deployment and infrastructure for {role_name}",
            "priority": "Medium",
            "estimated_duration_weeks": "3-4 Weeks",
            "why_it_matters": f"DevOps skills are needed for {role_name}",
            "exact_gap_addressed": f"Address gaps in: {', '.join(user_devops[:3])}",
            "tasks": [
                {
                    "id": f"task-p{phase_num}-1",
                    "title": f"Learn {user_devops[0]}",
                    "type": "Course",
                    "description": f"Master {user_devops[0]} for deployment and infrastructure.",
                    "estimated_hours": 12,
                    "topics": [user_devops[0], "Containers", "CI/CD"],
                    "skill_name": user_devops[0]
                }
            ]
        })
        phase_num += 1

    # Phase for mobile
    if user_mobile:
        phases.append({
            "phase_number": phase_num,
            "title": f"Phase {phase_num}: Mobile Development",
            "subtitle": f"Mobile app development for {role_name}",
            "priority": "Medium",
            "estimated_duration_weeks": "4-5 Weeks",
            "why_it_matters": f"Mobile skills are needed for {role_name}",
            "exact_gap_addressed": f"Address gaps in: {', '.join(user_mobile[:3])}",
            "tasks": [
                {
                    "id": f"task-p{phase_num}-1",
                    "title": f"Learn {user_mobile[0]}",
                    "type": "Course",
                    "description": f"Master {user_mobile[0]} for mobile app development.",
                    "estimated_hours": 18,
                    "topics": [user_mobile[0], "Mobile UI", "App Deployment"],
                    "skill_name": user_mobile[0]
                }
            ]
        })
        phase_num += 1

    # If no specific skills matched, create a generic phase
    if not phases:
        phases.append({
            "phase_number": 1,
            "title": f"Phase 1: {role_name} Fundamentals",
            "subtitle": f"Core skills for {role_name}",
            "priority": "Critical",
            "estimated_duration_weeks": "4-5 Weeks",
            "why_it_matters": f"Building foundational skills for {role_name}",
            "exact_gap_addressed": "Address identified skill gaps",
            "tasks": [
                {
                    "id": "task-p1-1",
                    "title": f"Core Skills for {role_name}",
                    "type": "Course",
                    "description": f"Learn the fundamental skills required for {role_name}.",
                    "estimated_hours": 12,
                    "topics": ["Fundamentals", "Core Concepts"],
                    "skill_name": "General"
                }
            ]
        })

    return {
        "phases": phases,
        "top_skills": [{"name": s, "category": "Skill"} for s in (critical_skills + weak_skills)[:10]],
        "milestones": [
            {
                "milestone_number": i + 1,
                "title": f"Complete Phase {p['phase_number']}",
                "description": f"Finish all tasks in {p['title']}"
            }
            for i, p in enumerate(phases)
        ],
        "why_reasons": [
            f"Personalized for {role_name}",
            f"Based on your {len(critical_skills)} critical gaps and {len(weak_skills)} weak skills",
            "Structured for progressive learning"
        ]
    }


async def build_personalized_roadmap(
    role_name: str = "Full-Stack Developer",
    experience_level: str = "Entry Level (0-2 years)",
    daily_effort_hours: str = "1-2 hours/day",
    user_id: Optional[str] = "default_user"
) -> PersonalizedRoadmapResponse:
    """
    Core Roadmap Generation Engine.
    Ingests Page 5 Gap Analysis results, target role benchmarks, and study availability
    to construct an actionable, structured, prioritized 6-phase learning path.
    """
    uid = user_id or "default_user"

    # Get user progress from database (persistent storage)
    # Falls back to empty dict if user has no progress yet
    # Skip DB lookup if user_id is not a valid UUID (e.g., "default_user" or test strings)
    user_progress = {}
    try:
        import uuid as uuid_lib
        # Only try DB if user_id is a valid UUID format
        uuid_lib.UUID(uid)  # Will raise ValueError if not a valid UUID
        user_progress = TaskProgressDB.get_user_progress(uid)
    except (ValueError, Exception) as e:
        # Not a valid UUID or DB error - just use empty progress
        if "badly formed" not in str(e):
            print(f"[Roadmap] Skipping DB lookup for non-UUID user_id '{uid}': {e}")
        user_progress = {}

    # 1. Ingest Page 5 Gap Analysis Data
    gap_summary = compute_skill_gap_analysis(
        role_name=role_name,
        experience_level=experience_level,
        user_id=user_id
    )

    # 2. Derive Estimated Duration & Weekly Commitment from daily study time
    hours_lower = 1.5
    if "2-3" in daily_effort_hours or "3-4" in daily_effort_hours:
        hours_lower = 3.0
    elif "30" in daily_effort_hours or "45" in daily_effort_hours:
        hours_lower = 0.75

    # Duration calculations
    if hours_lower >= 3.0:
        est_duration = "3.5 Months"
        weekly_commitment = "18–22 hrs"
    elif hours_lower <= 1.0:
        est_duration = "8.5 Months"
        weekly_commitment = "6–8 hrs"
    else:
        est_duration = "6.5 Months"
        weekly_commitment = "10–12 hrs"

    # 3. AI-Generated Dynamic Phases based on Target Role & Gaps
    # First, gather skills data from the gap analysis
    critical_skills = [g.skill for g in gap_summary.gaps if g.priority == "Critical"]
    weak_skills = [g.skill for g in gap_summary.gaps if g.match_status == "Weak"]
    strong_skills = [g.skill for g in gap_summary.gaps if g.match_status == "Strong"]

    # Try to get AI-generated roadmap structure
    ai_structure = None
    if llm_client.is_configured:
        try:
            ai_structure = await generate_ai_roadmap(
                role_name=role_name,
                experience_level=experience_level,
                daily_effort_hours=daily_effort_hours,
                gap_summary=gap_summary,
                user_id=user_id
            )
        except Exception as e:
            print(f"[Roadmap] AI generation failed: {e}")
            ai_structure = None

    # Fall back to dynamic structure based on gaps
    if not ai_structure:
        print(f"[Roadmap] Using dynamic fallback structure for {role_name}")
        ai_structure = build_fallback_roadmap_structure(
            role_name=role_name,
            critical_skills=critical_skills,
            weak_skills=weak_skills
        )

    # Build phases from AI/fallback structure with user progress applied
    all_phases = []
    for phase_data in ai_structure.get("phases", []):
        phase_num = phase_data.get("phase_number", len(all_phases) + 1)
        tasks = []

        for task_data in phase_data.get("tasks", []):
            task_id = task_data.get("id", f"task-p{phase_num}-{len(tasks)+1}")
            is_completed = user_progress.get(task_id, False)

            task = RoadmapTaskItem(
                id=task_id,
                title=task_data.get("title", f"Task {len(tasks)+1}"),
                type=task_data.get("type", "Course"),
                description=task_data.get("description", "Learn this topic"),
                progress_pct=100 if is_completed else 0,
                estimated_hours=task_data.get("estimated_hours", 10),
                is_completed=is_completed,
                topics=task_data.get("topics", []),
                resources=CURATED_RESOURCES.get("javascript", []),  # Default
                practice_exercises=[],
                skill_name=task_data.get("skill_name", "")
            )
            tasks.append(task)

        # Calculate phase progress
        phase_progress = int(sum(t.progress_pct for t in tasks) / max(len(tasks), 1))

        phase = RoadmapPhaseItem(
            phase_number=phase_num,
            title=phase_data.get("title", f"Phase {phase_num}"),
            subtitle=phase_data.get("subtitle", ""),
            priority=phase_data.get("priority", "Medium"),
            estimated_duration_weeks=phase_data.get("estimated_duration_weeks", "3-4 Weeks"),
            progress_pct=phase_progress,
            status="Completed" if phase_progress >= 100 else ("In Progress" if phase_progress > 0 else "Not Started"),
            topics_count=sum(len(t.topics) for t in tasks),
            projects_count=sum(1 for t in tasks if t.type == "Project"),
            resources_count=sum(len(t.resources) for t in tasks),
            why_it_matters=phase_data.get("why_it_matters", ""),
            exact_gap_addressed=phase_data.get("exact_gap_addressed", ""),
            current_proficiency="Beginner",
            required_proficiency="Intermediate",
            tasks=tasks
        )
        all_phases.append(phase)

    # If somehow we have no phases, create a default one
    if not all_phases:
        print(f"[Roadmap] Warning: No phases generated for {role_name}, creating default")
        default_task = RoadmapTaskItem(
            id="task-p1-1",
            title=f"Start learning {role_name}",
            type="Course",
            description=f"Begin your journey to become a {role_name}",
            progress_pct=0,
            estimated_hours=10,
            is_completed=False,
            topics=[role_name],
            resources=[],
            skill_name=role_name
        )
        default_phase = RoadmapPhaseItem(
            phase_number=1,
            title=f"Phase 1: Getting Started with {role_name}",
            subtitle="Begin your learning journey",
            priority="Critical",
            estimated_duration_weeks="2-3 Weeks",
            progress_pct=0,
            status="Not Started",
            topics_count=1,
            projects_count=0,
            resources_count=0,
            why_it_matters=f"Start your path to becoming a {role_name}",
            exact_gap_addressed="Initial learning",
            current_proficiency="Beginner",
            required_proficiency="Intermediate",
            tasks=[default_task]
        )
        all_phases = [default_phase]

    # Store top_skills and why_reasons for later use
    dynamic_top_skills = ai_structure.get("top_skills", [])
    dynamic_why_reasons = ai_structure.get("why_reasons", [])
    dynamic_milestones = ai_structure.get("milestones", [])

    # Legacy variables for compatibility
    critical_gaps = critical_skills  # Alias for compatibility
    weak_gaps = weak_skills

    # (All phase construction is now dynamic and AI-generated above)

    # Stamp the authoritative skill onto every task so the UI never has to infer
    # it from the title (title-based guessing mislabelled 13 of 21 nodes).
    for _phase in all_phases:
        for _task in _phase.tasks:
            _task.skill_name = TASK_SKILL_MAP.get(_task.id, "")

    # Calculate overall completion percentage
    total_phase_progress = sum(p.progress_pct for p in all_phases)
    overall_completion = int(total_phase_progress / len(all_phases))

    completed_phases = sum(1 for p in all_phases if p.status == "Completed")
    in_progress_phases = sum(1 for p in all_phases if p.status == "In Progress")
    not_started_phases = sum(1 for p in all_phases if p.status == "Not Started")

    total_projects = sum(p.projects_count for p in all_phases)
    total_resources = sum(p.resources_count for p in all_phases)
    total_tasks = sum(len(p.tasks) for p in all_phases)

    roadmap_summary = RoadmapSummary(
        overall_completion_pct=overall_completion,
        completed_phases_count=completed_phases,
        in_progress_phases_count=in_progress_phases,
        not_started_phases_count=not_started_phases,
        total_phases=len(all_phases),
        total_duration=est_duration,
        total_projects=total_projects,
        total_resources=total_resources,
        total_items=total_tasks
    )

    # Top Skills You Will Gain (Dynamic based on role)
    if dynamic_top_skills:
        top_skills = dynamic_top_skills
    else:
        # Fallback: extract from phases
        top_skills = []
        for phase in all_phases:
            for task in phase.tasks:
                if task.skill_name and not any(s.get("name") == task.skill_name for s in top_skills):
                    top_skills.append({"name": task.skill_name, "category": "Skill"})
                if len(top_skills) >= 10:
                    break
            if len(top_skills) >= 10:
                break

    # Why This Roadmap Personalization Reasons (Dynamic)
    if dynamic_why_reasons:
        why_reasons = dynamic_why_reasons
    else:
        why_reasons = [
            f"AI-personalized for your target role: {role_name}",
            f"Based on your {len(critical_skills)} critical skill gaps",
            f"Structured for your {daily_effort_hours} daily study commitment",
            f"Addresses {len(weak_skills)} areas needing improvement",
            "Progressive learning path from fundamentals to advanced"
        ]

    # Milestones Checkpoints (Dynamic from phases)
    milestones = []
    if dynamic_milestones:
        for m_data in dynamic_milestones:
            m_num = m_data.get("milestone_number", len(milestones) + 1)
            # Find the corresponding phase to check progress
            phase = next((p for p in all_phases if p.phase_number == m_num), None)
            progress = phase.progress_pct if phase else 0

            milestones.append(RoadmapMilestoneItem(
                milestone_number=m_num,
                title=m_data.get("title", f"Milestone {m_num}"),
                description=m_data.get("description", ""),
                is_achieved=progress >= 100
            ))
    else:
        # Generate milestones from phases
        for phase in all_phases:
            milestones.append(RoadmapMilestoneItem(
                milestone_number=phase.phase_number,
                title=phase.title.replace(f"Phase {phase.phase_number}: ", ""),
                description=phase.subtitle or f"Complete all tasks in {phase.title}",
                is_achieved=phase.progress_pct >= 100
            ))

    # Generate Calendar Events distributing tasks week-by-week
    calendar_events = []
    week_offset = 1
    for phase in all_phases:
        for task in phase.tasks:
            calendar_events.append({
                "id": f"cal-{task.id}",
                "task_id": task.id,
                "title": task.title,
                "phase_number": phase.phase_number,
                "phase_title": phase.title,
                "type": task.type,
                "week": f"Week {week_offset}–{week_offset + 1}",
                "estimated_hours": task.estimated_hours,
                "is_completed": task.is_completed,
                "progress_pct": task.progress_pct
            })
            week_offset += 1

    return PersonalizedRoadmapResponse(
        target_role=role_name,
        experience_level=experience_level,
        estimated_duration=est_duration,
        weekly_commitment=weekly_commitment,
        daily_effort=daily_effort_hours,
        summary=roadmap_summary,
        top_skills_you_will_gain=top_skills,
        why_this_roadmap_reasons=why_reasons,
        milestones=milestones,
        phases=all_phases,
        calendar_events=calendar_events,
        calculated_at=datetime.utcnow(),
        version="1.0.0"
    )


@router.get("/plan", response_model=PersonalizedRoadmapResponse)
async def get_personalized_roadmap(
    role: str = Query("Full-Stack Developer", description="Target role name"),
    experience: str = Query("Entry Level (0-2 years)", description="Experience level"),
    daily_effort: str = Query("1-2 hours/day", description="Daily study time"),
    user_id: Optional[str] = Query("default_user", description="Candidate ID"),
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve generated personalized roadmap tailored to candidate's gap analysis and daily study pace.
    Requires authentication - users can only access their own roadmap data.
    """
    # Use authenticated user_id if available, otherwise fall back to provided user_id
    # This ensures user data isolation
    from backend.routers.auth import get_user_id_from_token
    auth_user_id = get_user_id_from_token(authorization)
    uid = auth_user_id or user_id

    try:
        return await build_personalized_roadmap(
            role_name=role,
            experience_level=experience,
            daily_effort_hours=daily_effort,
            user_id=uid
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate personalized roadmap: {str(e)}"
        )


# =========================================================
# AI-Generated Learning Resources Endpoint
# =========================================================

class AIResourceResponse(BaseModel):
    skill_name: str
    user_level: str
    resources: List[Dict[str, str]]
    generated_by: str = "ai"


@router.get("/ai-resources/{skill_name}", response_model=AIResourceResponse)
async def get_ai_resources(
    skill_name: str,
    user_level: str = Query("intermediate", description="User's skill level"),
    authorization: Optional[str] = Header(None)
):
    """
    Get AI-generated learning resources for a specific skill.
    Uses LLM to recommend high-quality YouTube tutorials, documentation, and courses.
    """
    # Try AI generation
    ai_resources = await generate_ai_resources(skill_name, user_level)

    if not ai_resources:
        # Fallback to curated resources. CURATED_RESOURCES is keyed by broad
        # topic, so map the 21 roadmap skill names onto those keys first --
        # without this, anything but HTML/CSS, JavaScript and React fell through
        # to the generic branch below.
        skill_key = skill_name.lower().replace("/", "_").replace(" ", "_")
        skill_key = CURATED_RESOURCE_ALIASES.get(skill_key, skill_key)
        if skill_key in CURATED_RESOURCES:
            ai_resources = [
                {
                    "title": r.title,
                    "url": r.url,
                    "type": r.type,
                    "provider": r.provider
                }
                for r in CURATED_RESOURCES[skill_key]
            ]
        else:
            # Last resort. Deliberately no YouTube entry: a search-results link
            # is not a lesson, and inventing a video id would give a dead link.
            # Videos come from the model or not at all.
            ai_resources = [
                {
                    "title": f"{skill_name} — Developer Roadmap",
                    "url": "https://roadmap.sh/full-stack",
                    "type": "interactive",
                    "provider": "roadmap.sh"
                },
                {
                    "title": "MDN Web Docs — Learn Web Development",
                    "url": "https://developer.mozilla.org/en-US/docs/Learn",
                    "type": "documentation",
                    "provider": "MDN"
                }
            ]

    return AIResourceResponse(
        skill_name=skill_name,
        user_level=user_level,
        resources=ai_resources,
        generated_by="ai" if llm_client.is_configured and ai_resources else "fallback"
    )


@router.post("/task/toggle", response_model=PersonalizedRoadmapResponse)
async def toggle_roadmap_task(
    payload: TaskToggleRequest,
    role: str = Query("Full-Stack Developer"),
    experience: str = Query("Entry Level (0-2 years)"),
    daily_effort: str = Query("1-2 hours/day"),
    authorization: Optional[str] = Header(None)
):
    """
    Toggle task or practice item completion state and persist to database.
    Requires authentication - users can only access their own task progress.
    """
    # Use authenticated user_id if available, otherwise fall back to provided user_id
    # This ensures user data isolation
    from backend.routers.auth import get_user_id_from_token
    auth_user_id = get_user_id_from_token(authorization)
    uid = auth_user_id or payload.user_id or "default_user"

    # Store task completion in database (persistent, survives restarts)
    # This ensures user data isolation - each user has their own progress
    success = TaskProgressDB.set_task_completion(
        user_id=uid,
        task_id=payload.task_id,
        is_completed=payload.is_completed
    )

    if not success:
        print(f"[Roadmap] Warning: Failed to persist task toggle for user {uid}, task {payload.task_id}")

    return await build_personalized_roadmap(
        role_name=role,
        experience_level=experience,
        daily_effort_hours=daily_effort,
        user_id=uid
    )


@router.post("/recalculate", response_model=PersonalizedRoadmapResponse)
async def recalculate_roadmap(
    role: str = Query("Full-Stack Developer"),
    experience: str = Query("Entry Level (0-2 years)"),
    daily_effort: str = Query("1-2 hours/day"),
    user_id: Optional[str] = Query("default_user"),
    authorization: Optional[str] = Header(None)
):
    """
    Recalculate personalized roadmap when underlying SkillTwin or Gap Analysis changes.
    Requires authentication - users can only access their own roadmap.
    """
    # Use authenticated user_id if available
    from backend.routers.auth import get_user_id_from_token
    auth_user_id = get_user_id_from_token(authorization)
    uid = auth_user_id or user_id

    return await build_personalized_roadmap(
        role_name=role,
        experience_level=experience,
        daily_effort_hours=daily_effort,
        user_id=uid
    )


@router.get("/export")
async def export_roadmap_report(
    role: str = Query("Full-Stack Developer"),
    experience: str = Query("Entry Level (0-2 years)"),
    daily_effort: str = Query("1-2 hours/day"),
    user_id: Optional[str] = Query("default_user"),
    authorization: Optional[str] = Header(None)
):
    """
    Generate downloadable formatted copy of the candidate's personalized learning roadmap.
    Requires authentication - users can only export their own roadmap.
    """
    # Use authenticated user_id if available
    from backend.routers.auth import get_user_id_from_token
    auth_user_id = get_user_id_from_token(authorization)
    uid = auth_user_id or user_id

    roadmap = await build_personalized_roadmap(
        role_name=role,
        experience_level=experience,
        daily_effort_hours=daily_effort,
        user_id=uid
    )

    lines = [
        "==================================================================",
        "          SKILLTWIN — PERSONALIZED LEARNING ROADMAP               ",
        "==================================================================",
        f"Generated At: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Target Role:  {roadmap.target_role} ({roadmap.experience_level})",
        f"Estimated Duration: {roadmap.estimated_duration} (Daily Effort: {roadmap.daily_effort})",
        f"Weekly Commitment:  {roadmap.weekly_commitment}",
        f"Overall Progress:   {roadmap.summary.overall_completion_pct}% Completed",
        "------------------------------------------------------------------",
        "ROADMAP SUMMARY:",
        f"• Total Phases:    {roadmap.summary.total_phases}",
        f"• Completed:       {roadmap.summary.completed_phases_count} phases",
        f"• In Progress:     {roadmap.summary.in_progress_phases_count} phases",
        f"• Not Started:     {roadmap.summary.not_started_phases_count} phases",
        f"• Total Projects:  {roadmap.summary.total_projects} projects",
        f"• Total Resources: {roadmap.summary.total_resources} resources",
        "------------------------------------------------------------------",
        "PHASE BREAKDOWN & ACTION PLAN:",
    ]

    for phase in roadmap.phases:
        status_marker = "[x]" if phase.status == "Completed" else ("[~]" if phase.status == "In Progress" else "[ ]")
        lines.append(f"\n{status_marker} {phase.title} ({phase.priority} Priority | {phase.estimated_duration_weeks} | {phase.progress_pct}% Progress)")
        lines.append(f"    Reason: {phase.why_it_matters}")
        lines.append(f"    Gap:    {phase.exact_gap_addressed}")
        lines.append("    Tasks:")
        for task in phase.tasks:
            t_marker = "[x]" if task.is_completed else "[ ]"
            lines.append(f"      {t_marker} [{task.type}] {task.title} (Est. {task.estimated_hours} hrs - {task.progress_pct}%)")
            lines.append(f"          {task.description}")
            if task.topics:
                lines.append(f"          Topics: {', '.join(task.topics)}")
            if task.resources:
                lines.append(f"          Resources: {task.resources[0].title} ({task.resources[0].url})")

    lines.extend([
        "\n------------------------------------------------------------------",
        "MILESTONES TRACK:",
        "\n".join([f"  {'[x]' if m.is_achieved else '[ ]'} Milestone {m.milestone_number}: {m.title} — {m.description}" for m in roadmap.milestones]),
        "=================================================================="
    ])

    return PlainTextResponse(
        content="\n".join(lines),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="SkillTwin_Personalized_Roadmap_{role.replace(" ", "_")}.txt"'}
    )


@router.get("/status")
def get_roadmap_status():
    """Foundational status endpoint for Roadmap Engine."""
    return {
        "status": "ready",
        "engine": "SkillTwin Personalized Roadmap v1.0",
        "loop_stages": ["Learn", "Practice", "Build", "Verify"],
        "phase": "Phase 6 - Personalized Roadmap Active"
    }
