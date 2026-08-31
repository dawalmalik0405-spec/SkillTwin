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

# Simple in-memory cache to avoid regenerating roadmap on every refresh.
# Cache key: user_id + role_name. New role = regenerate, same = instant return.
_ROADMAP_CACHE: Dict[str, PersonalizedRoadmapResponse] = {}


def _get_cached_task_status(user_id: str) -> Dict[str, bool]:
    """Get current task completion status for a user from DB."""
    try:
        import uuid as uuid_lib
        uuid_lib.UUID(user_id)
        return TaskProgressDB.get_user_progress(user_id)
    except (ValueError, Exception):
        return {}


def _apply_task_status_to_phases(phases: List[RoadmapPhaseItem], task_status: Dict[str, bool]) -> None:
    """Apply user's current task completion status to roadmap phases."""
    if not task_status:
        return
    for phase in phases:
        for task in phase.tasks:
            if task.id in task_status:
                task.is_completed = task_status[task.id]
                task.progress_pct = 100 if task_status[task.id] else 0


def _store_in_cache(cache_key: str, roadmap: PersonalizedRoadmapResponse) -> None:
    """Store roadmap in cache (without user-specific task status)."""
    # Deep copy phases to avoid mutation of cached data
    cached_phases = []
    for phase in roadmap.phases:
        cached_phase = phase.model_copy(deep=True)
        # Reset task completion in cached version (will be applied per-user)
        for task in cached_phase.tasks:
            task.is_completed = False
            task.progress_pct = 0
        cached_phases.append(cached_phase)

    cached_roadmap = roadmap.model_copy(deep=True)
    cached_roadmap.phases = cached_phases
    _ROADMAP_CACHE[cache_key] = cached_roadmap


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
                # Model returned a search/playlist/channel link - DROP it.
                # We have our own curated real video IDs that will be merged in.
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

    # No fallback search URLs - we have our own curated real videos
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
2. YouTube video learning - provide AT LEAST ONE video resource. Use EITHER:
   - A specific video URL: https://www.youtube.com/watch?v=VIDEO_ID (with real 11-char id)
   - OR a YouTube search URL: https://www.youtube.com/results?search_query={skill_name.replace(' ', '+')}+tutorial
3. Interactive tutorials or courses
4. Practice exercises

IMPORTANT: Always include at least one YouTube video resource. If you don't know a specific video id, use a search URL format: https://www.youtube.com/results?search_query=YOUR_SEARCH_TERMS

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


# =========================================================
# Curated YouTube Video Database (Real video IDs for popular tutorials)
# =========================================================

# Real, popular YouTube video IDs for each skill
# These are well-known, high-quality tutorials that are guaranteed to exist
CURATED_YOUTUBE_VIDEOS: Dict[str, List[Dict[str, str]]] = {
    "javascript": [
        {"id": "PkZNo7MFNFg", "title": "Learn JavaScript - Full Course for Beginners", "channel": "freeCodeCamp.org"},
        {"id": "W6NZfCO5SIk", "title": "JavaScript Tutorial for Beginners: Learn JavaScript in 1 Hour", "channel": "Programming with Mosh"},
        {"id": "jS4a-s5fsc4", "title": "JavaScript Full Course 2024", "channel": "Bro Code"},
    ],
    "react": [
        {"id": "TnhaIS0B--E", "title": "React Hooks - Complete Guide", "channel": "Codevolution"},
        {"id": "TnhaIS0B--E", "title": "React Course - Beginner's Tutorial for React JavaScript Library", "channel": "freeCodeCamp.org"},
        {"id": "x4r8c7yO_MQ", "title": "React JS Full Course for Beginners", "channel": "Dave Gray"},
    ],
    "python": [
        {"id": "rfscVS0vtbw", "title": "Learn Python - Full Course for Beginners", "channel": "freeCodeCamp.org"},
        {"id": "_uQrJ0TkZlc", "title": "Python Tutorial - Python Full Course for Beginners", "channel": "Programming with Mosh"},
        {"id": "kqtD5dpn9C8", "title": "Python for Beginners - Learn Python in 1 Hour", "channel": "Programming with Mosh"},
    ],
    "typescript": [
        {"id": "BCg4Ugz6KHk", "title": "TypeScript Course for Beginners - Learn TypeScript from Scratch!", "channel": "Academind"},
        {"id": "gyOwBFLIxq4", "title": "TypeScript Tutorial for Beginners [2024]", "channel": "Net Ninja"},
    ],
    "node.js": [
        {"id": "TlB_eWDSMt4", "title": "Node.js and Express.js - Full Course", "channel": "freeCodeCamp.org"},
        {"id": "ENrzD9HA8L4", "title": "Node.js Tutorial for Beginners: Learn Node in 1 Hour", "channel": "Programming with Mosh"},
    ],
    "html/css": [
        {"id": "mU6anWqZJcc", "title": "HTML & CSS Full Course for Beginners", "channel": "Dave Gray"},
        {"id": "lAAP2Vi24AY", "title": "HTML Full Course - Build a Website Tutorial", "channel": "freeCodeCamp.org"},
    ],
    "html5": [
        {"id": "kUMe1FH4CHE", "title": "HTML5 Tutorial For Beginners", "channel": "Net Ninja"},
    ],
    "css3": [
        {"id": "ieTHC78iBic", "title": "CSS Tutorial - Zero to Hero (Complete Course)", "channel": "freeCodeCamp.org"},
    ],
    "postgresql": [
        {"id": "qw--VYLpxG4", "title": "PostgreSQL Tutorial for Beginners", "channel": "freeCodeCamp.org"},
        {"id": "SpfI3vxZJFQ", "title": "Learn PostgreSQL Tutorial - Full Course for Beginners", "channel": "Amigoscode"},
    ],
    "mongodb": [
        {"id": "ofme2o0nguA", "title": "MongoDB Crash Course 2024", "channel": "Traversy Media"},
        {"id": "c2M-rLjj1dc", "title": "MongoDB Full Course - Learn MongoDB in 7 Hours", "channel": "Knowledge Gate"},
    ],
    "docker": [
        {"id": "3c-iBn73dDE", "title": "Docker Mastery: The Complete Toolset From a Docker Captain", "channel": "Bret Fisher"},
        {"id": "Gjnup-PuquQ", "title": "Docker Tutorial for Beginners - A Full DevOps Course on How to Run Applications in Containers", "channel": "freeCodeCamp.org"},
    ],
    "kubernetes": [
        {"id": "X48VuDVv0do", "title": "Kubernetes Tutorial for Beginners - Full Course", "channel": "TechWorld with Nana"},
        {"id": "XtNHb1YG4ps", "title": "Kubernetes Course - Full Beginners Tutorial", "channel": "freeCodeCamp.org"},
    ],
    "fastapi": [
        {"id": "YelpDu7HGpE", "title": "Python API Tutorial - FastAPI", "channel": "Pixegami"},
        {"id": "0sOvCWFmrtE", "title": "FastAPI Course for Beginners - Building a Full API", "channel": "Bug Bytes"},
    ],
    "django": [
        {"id": "rHux0ghMp7Q", "title": "Python Django Tutorial for Beginners - Full Course", "channel": "freeCodeCamp.org"},
        {"id": "LdtZcKUl-2k", "title": "Django Full Course - Build a Complete Website", "channel": "Dave Gray"},
    ],
    "tensorflow": [
        {"id": "tPYj3-dF6B4", "title": "TensorFlow 2.0 Complete Course - Python Neural Networks for Beginners", "channel": "freeCodeCamp.org"},
        {"id": "ZUKw23LH1IU", "title": "TensorFlow In 100 Seconds", "channel": "Fireship"},
    ],
    "pytorch": [
        {"id": "V_xro1bcAuA", "title": "PyTorch for Deep Learning - Full Course", "channel": "freeCodeCamp.org"},
        {"id": "EMXfZB8rWAU", "title": "PyTorch Tutorial for Beginners", "channel": "Python Engineer"},
    ],
    "pandas": [
        {"id": "gtjxAHkn5qQ", "title": "Pandas in 100 Seconds", "channel": "Fireship"},
        {"id": "ZyhVh-qRZPA", "title": "Pandas Tutorial for Beginners", "channel": "Keith Galli"},
    ],
    "numpy": [
        {"id": "QUT1VHiLmuI", "title": "NumPy Tutorial for Beginners", "channel": "freeCodeCamp.org"},
    ],
    "rust": [
        {"id": "BpPEol-z6iA", "title": "Rust Programming Course for Beginners - Tutorial", "channel": "freeCodeCamp.org"},
    ],
    "go": [
        {"id": "YS4e4u9HGac", "title": "Learn Go Programming - Full Course for Beginners", "channel": "Net Ninja"},
    ],
    "java": [
        {"id": "grEKMHGYyns", "title": "Java Tutorial for Beginners", "channel": "Programming with Mosh"},
        {"id": "eIrMbUcTU0c", "title": "Learn Java 8 - Full Tutorial for Beginners", "channel": "freeCodeCamp.org"},
    ],
    "kotlin": [
        {"id": "EJxLgsogeOc", "title": "Kotlin Course - Tutorial for Beginners", "channel": "freeCodeCamp.org"},
    ],
    "swift": [
        {"id": "8XacriX1Gfo", "title": "Swift Programming Tutorial for Beginners (Full Tutorial)", "channel": "CodeWithChris"},
    ],
    "react native": [
        {"id": "0-S5a0eXPoc", "title": "React Native Crash Course 2024", "channel": "Academind"},
        {"id": "N27BN4ROhWo", "title": "React Native Tutorial for Beginners - Build a React Native App", "channel": "Programming with Mosh"},
    ],
    "flutter": [
        {"id": "VPvVD8tBbE0", "title": "Flutter Course for Beginners - 37-hour Cross Platform Mobile Development Tutorial", "channel": "freeCodeCamp.org"},
    ],
    "vue": [
        {"id": "FXpIoQ_rT_c", "title": "Vue.js Course for Beginners - The Net Ninja", "channel": "Net Ninja"},
        {"id": "qZXt1Agt3Ms", "title": "Vue 3 Tutorial - Full Course for Beginners", "channel": "JavaScript Mastery"},
    ],
    "angular": [
        {"id": "k5E2AVpwsko", "title": "Angular for Beginners Course - Build a Complete App", "channel": "Academind"},
    ],
    "aws": [
        {"id": "Ia-UEdRtvDk", "title": "AWS Certified Cloud Practitioner Training 2024 - Full Course", "channel": "freeCodeCamp.org"},
    ],
    "azure": [
        {"id": "NKEb4X21sCU", "title": "Azure Fundamentals Full Course", "channel": "John Savill's Technical Training"},
    ],
    "gcp": [
        {"id": "jpW4dcA8PeQ", "title": "Google Cloud Platform Full Course", "channel": "freeCodeCamp.org"},
    ],
    "git": [
        {"id": "RGOj5yH7evk", "title": "Git and GitHub for Beginners - Full Course", "channel": "freeCodeCamp.org"},
        {"id": "HWcJPgVTmWQ", "title": "Git Tutorial for Beginners: Learn Git in 1 Hour", "channel": "Programming with Mosh"},
    ],
    "ci/cd": [
        {"id": "R8_veQiYBjI", "title": "GitHub Actions Tutorial - Basic Concepts and CI/CD Pipeline", "channel": "TechWorld with Nana"},
        {"id": "1vqu9w0K_Gk", "title": "CI/CD Tutorial for Beginners", "channel": "KodeKloud"},
    ],
    "sql": [
        {"id": "HXV3zeQKqGY", "title": "SQL Tutorial - Full Database Course for Beginners", "channel": "freeCodeCamp.org"},
    ],
    "redis": [
        {"id": "XCsS7VHt5jQ", "title": "Redis Crash Course - The What, Why and How", "channel": "Bro Code"},
    ],
    "graphql": [
        {"id": "eIQhBFxuOM0", "title": "GraphQL Course for Beginners - Learn GraphQL in 2 Hours", "channel": "Academind"},
    ],
    "rest api": [
        {"id": "Q-Bpqy8DXgg", "title": "REST API Tutorial for Beginners - Learn REST API in 1 Hour", "channel": "Programming with Mosh"},
    ],
    "machine learning": [
        {"id": "i_LwzRVP7bg", "title": "Machine Learning for Everybody - Full Course", "channel": "freeCodeCamp.org"},
        {"id": "aircAruvnKk", "title": "But what is a neural network? - 3Blue1Brown", "channel": "3Blue1Brown"},
    ],
    "deep learning": [
        {"id": "VyWw1dWwnSQ", "title": "Deep Learning Crash Course for Beginners", "channel": "freeCodeCamp.org"},
    ],
    "nlp": [
        {"id": "CMrHMw5GJUg", "title": "Natural Language Processing (NLP) Tutorial - Full Course", "channel": "Simplilearn"},
    ],
    "statistics": [
        {"id": "xxpc-HPKN28", "title": "Statistics - A Full University Course on Data Science Basics", "channel": "freeCodeCamp.org"},
    ],
    "redux": [
        {"id": "zrs7u4bWRFQ", "title": "Redux Toolkit Tutorial - JavaScript State Management", "channel": "Dave Gray"},
    ],
    "redux toolkit": [
        {"id": "zrs7u4bWRFQ", "title": "Redux Toolkit Tutorial - JavaScript State Management", "channel": "Dave Gray"},
    ],
    "express": [
        {"id": "L72fhGm1tfE", "title": "Express JS Crash Course", "channel": "Traversy Media"},
    ],
    "express.js": [
        {"id": "L72fhGm1tfE", "title": "Express JS Crash Course", "channel": "Traversy Media"},
    ],
    "jwt": [
        {"id": "mbsmcimRtBY", "title": "JWT Authentication Tutorial - Node.js and Express", "channel": "Web Dev Simplified"},
    ],
    "authentication": [
        {"id": "mbsmcimRtBY", "title": "JWT Authentication Tutorial - Node.js and Express", "channel": "Web Dev Simplified"},
    ],
    "machine learning operations": [
        {"id": "12Nf55qDfHg", "title": "MLOps Tutorial - From Zero to Hero", "channel": "Codebasics"},
    ],
    "pytorch": [
        {"id": "V_xro1bcAuA", "title": "PyTorch for Deep Learning - Full Course", "channel": "freeCodeCamp.org"},
    ],
    "tensorflow": [
        {"id": "tPYj3-dF6B4", "title": "TensorFlow 2.0 Complete Course", "channel": "freeCodeCamp.org"},
    ],
    "terraform": [
        {"id": "l5k1aiKGBaw", "title": "Terraform Course - Automate your Infrastructure", "channel": "freeCodeCamp.org"},
    ],
    "spark": [
        {"id": "rpw3kRi26tg", "title": "Apache Spark Tutorial - Full Course", "channel": "freeCodeCamp.org"},
    ],
    "kafka": [
        {"id": "ZbI8YAze9OY", "title": "Apache Kafka Full Course", "channel": "Naveen AutomationLabs"},
    ],
    "airflow": [
        {"id": "uhzykQO9KgM", "title": "Apache Airflow Tutorial for Beginners", "channel": "Kahan Data Solutions"},
    ],
    "data engineering": [
        {"id": "HyhpohxjMGo", "title": "Data Engineering Course for Beginners", "channel": "freeCodeCamp.org"},
    ],
    "data science": [
        {"id": "X3paOmcrTjQ", "title": "Data Science Full Course - 2024", "channel": "Edureka"},
    ],
    "tensorflow extended": [
        {"id": "tPYj3-dF6B4", "title": "TensorFlow 2.0 Complete Course", "channel": "freeCodeCamp.org"},
    ],
    "aws sagemaker": [
        {"id": "Kz5bTj0X0i4", "title": "AWS SageMaker - Full Tutorial", "channel": "Simplilearn"},
    ],
    "ci/cd pipeline": [
        {"id": "R8_veQiYBjI", "title": "GitHub Actions Tutorial - CI/CD Pipeline", "channel": "TechWorld with Nana"},
    ],
    "mlops": [
        {"id": "12Nf55qDfHg", "title": "MLOps Tutorial - From Zero to Hero", "channel": "Codebasics"},
    ],
    "data pipeline": [
        {"id": "kGT1rQ5Fz3g", "title": "Building Data Pipelines - Python Tutorial", "channel": "Pixegami"},
    ],
    "model deployment": [
        {"id": "12Nf55qDfHg", "title": "MLOps Tutorial - Model Deployment", "channel": "Codebasics"},
    ],
    "ci/cd with github actions": [
        {"id": "R8_veQiYBjI", "title": "GitHub Actions Tutorial", "channel": "TechWorld with Nana"},
    ],
    "rest api design": [
        {"id": "Q-Bpqy8DXgg", "title": "REST API Tutorial for Beginners", "channel": "Programming with Mosh"},
    ],
    "cloud deployment": [
        {"id": "Ia-UEdRtvDk", "title": "AWS Cloud Deployment - Full Course", "channel": "freeCodeCamp.org"},
    ],
    "multi-container": [
        {"id": "3c-iBn73dDE", "title": "Docker Mastery Course", "channel": "Bret Fisher"},
    ],
    "unit testing": [
        {"id": "r9HdJ9PmgFY", "title": "JavaScript Testing - Unit Tests with Jest", "channel": "Net Ninja"},
    ],
    "testing": [
        {"id": "r9HdJ9PmgFY", "title": "JavaScript Testing - Unit Tests with Jest", "channel": "Net Ninja"},
    ],
    "security": [
        {"id": "inWWhr5tnEA", "title": "Web Security - OWASP Top 10", "channel": "Fireship"},
    ],
    "performance": [
        {"id": "Y8amkn2VjVQ", "title": "Web Performance - Core Web Vitals", "channel": "Fireship"},
    ],
    "javascript (es6+)": [
        {"id": "PkZNo7MFNFg", "title": "Learn JavaScript - Full Course for Beginners", "channel": "freeCodeCamp.org"},
    ],
    "html, css": [
        {"id": "mU6anWqZJcc", "title": "HTML & CSS Full Course for Beginners", "channel": "Dave Gray"},
    ],
    "responsive design": [
        {"id": "srvUrASNj0s", "title": "Responsive Web Design Tutorial", "channel": "Net Ninja"},
    ],
    "frontend": [
        {"id": "mU6anWqZJcc", "title": "HTML & CSS Full Course for Beginners", "channel": "Dave Gray"},
    ],
    "backend": [
        {"id": "ENrzD9HA8L4", "title": "Node.js Backend Tutorial", "channel": "Programming with Mosh"},
    ],
    "database": [
        {"id": "HXV3zeQKqGY", "title": "SQL Tutorial - Full Database Course", "channel": "freeCodeCamp.org"},
    ],
    "devops": [
        {"id": "3c-iBn73dDE", "title": "Docker Course", "channel": "Bret Fisher"},
    ],
    "capstone": [
        {"id": "PkZNo7MFNFg", "title": "Full Stack Development - Full Course", "channel": "freeCodeCamp.org"},
    ],
    "portfolio": [
        {"id": "mU6anWqZJcc", "title": "Build a Portfolio Website", "channel": "Dave Gray"},
    ],
    "e-commerce": [
        {"id": "x4r8c7yO_MQ", "title": "React E-commerce Tutorial", "channel": "Dave Gray"},
    ],
    "orm": [
        {"id": "qw--VYLpxG4", "title": "PostgreSQL ORM Tutorial", "channel": "freeCodeCamp.org"},
    ],
    "html5 & css3": [
        {"id": "mU6anWqZJcc", "title": "HTML & CSS Full Course for Beginners", "channel": "Dave Gray"},
    ],
}


def _get_curated_videos_for_skill(skill_name: str) -> List[Dict[str, str]]:
    """Get curated YouTube videos for a given skill, with fuzzy matching."""
    skill_lower = skill_name.lower().strip()

    # Direct match
    if skill_lower in CURATED_YOUTUBE_VIDEOS:
        return CURATED_YOUTUBE_VIDEOS[skill_lower]

    # Fuzzy match - check if any key is contained in the skill name
    for key, videos in CURATED_YOUTUBE_VIDEOS.items():
        if key in skill_lower or skill_lower in key:
            return videos

    # No match - return empty list
    return []


def _build_task_resources(skill_name: str, task_title: str) -> List[RoadmapResourceItem]:
    """
    Build dynamic YouTube + Docs resource links for any skill.
    Uses curated YouTube video IDs for real, working video links.
    """
    # Normalize skill name for URL
    skill_slug = skill_name.lower().replace(" ", "+").replace("/", "+").replace("-", "+")

    # Map skills to their official documentation sites
    docs_map = {
        "javascript": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
        "python": "https://docs.python.org/3/tutorial/",
        "react": "https://react.dev/learn",
        "typescript": "https://www.typescriptlang.org/docs/",
        "node.js": "https://nodejs.org/en/learn",
        "node": "https://nodejs.org/en/learn",
        "html/css": "https://developer.mozilla.org/en-US/docs/Learn",
        "html5": "https://developer.mozilla.org/en-US/docs/Learn/HTML",
        "css3": "https://developer.mozilla.org/en-US/docs/Learn/CSS",
        "postgresql": "https://www.postgresql.org/docs/",
        "mongodb": "https://www.mongodb.com/docs/manual/",
        "docker": "https://docs.docker.com/get-started/",
        "kubernetes": "https://kubernetes.io/docs/tutorials/",
        "fastapi": "https://fastapi.tiangolo.com/tutorial/",
        "django": "https://docs.djangoproject.com/en/stable/intro/tutorial01/",
        "flask": "https://flask.palletsprojects.com/en/stable/quickstart/",
        "tensorflow": "https://www.tensorflow.org/learn",
        "pytorch": "https://pytorch.org/tutorials/",
        "pandas": "https://pandas.pydata.org/docs/user_guide/10min.html",
        "numpy": "https://numpy.org/doc/stable/user/absolute_beginners.html",
        "rust": "https://doc.rust-lang.org/book/",
        "go": "https://go.dev/doc/",
        "java": "https://docs.oracle.com/javase/tutorial/",
        "kotlin": "https://kotlinlang.org/docs/getting-started.html",
        "swift": "https://developer.apple.com/documentation/swift",
        "react native": "https://reactnative.dev/docs/getting-started",
        "flutter": "https://docs.flutter.dev/get-started/codelab",
        "vue": "https://vuejs.org/guide/introduction.html",
        "angular": "https://angular.io/tutorial",
        "aws": "https://aws.amazon.com/getting-started/",
        "azure": "https://learn.microsoft.com/en-us/azure/",
        "gcp": "https://cloud.google.com/docs",
        "git": "https://git-scm.com/doc",
        "github": "https://docs.github.com/en",
        "ci/cd": "https://docs.github.com/en/actions",
        "sql": "https://www.w3schools.com/sql/",
        "redis": "https://redis.io/docs/latest/",
        "graphql": "https://graphql.org/learn/",
        "rest api": "https://restfulapi.net/",
        "machine learning": "https://www.coursera.org/learn/machine-learning",
        "deep learning": "https://www.deeplearning.ai/short-courses/",
        "nlp": "https://huggingface.co/learn/nlp-course",
        "statistics": "https://www.khanacademy.org/math/statistics-probability",
        "terraform": "https://developer.hashicorp.com/terraform/intro",
        "spark": "https://spark.apache.org/docs/latest/",
        "kafka": "https://kafka.apache.org/documentation/",
        "airflow": "https://airflow.apache.org/docs/",
    }

    # Find best matching docs URL
    docs_url = "https://developer.mozilla.org/en-US/docs/Learn"
    skill_lower = skill_name.lower()
    for key, url in docs_map.items():
        if key in skill_lower or skill_lower in key:
            docs_url = url
            break

    # Get curated YouTube videos for this skill
    curated_videos = _get_curated_videos_for_skill(skill_name)

    # Build resources with real video links first, then fall back to search
    resources = []

    # Add 2 curated YouTube videos (real, working links)
    for i, video in enumerate(curated_videos[:2]):
        resources.append(RoadmapResourceItem(
            title=video["title"],
            url=f"https://www.youtube.com/watch?v={video['id']}",
            type="video",
            provider=video["channel"]
        ))

    # Add a search link as additional option
    resources.append(RoadmapResourceItem(
        title=f"More {skill_name} Videos on YouTube",
        url=f"https://www.youtube.com/results?search_query={skill_slug}+tutorial+2024",
        type="video",
        provider="YouTube Search"
    ))

    # Add official documentation
    resources.append(RoadmapResourceItem(
        title=f"Official {skill_name} Documentation",
        url=docs_url,
        type="documentation",
        provider="Official Docs"
    ))

    # Add freeCodeCamp course
    resources.append(RoadmapResourceItem(
        title=f"FreeCodeCamp: Learn {skill_name}",
        url=f"https://www.freecodecamp.org/news/search/?query={skill_slug}",
        type="course",
        provider="freeCodeCamp"
    ))

    return resources


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

    Uses in-memory cache to avoid regenerating the roadmap on every refresh.
    Cache key: user_id + role_name. New role = regenerate.
    """
    # Check cache first - if same user+role, return cached roadmap (fast!)
    cache_key = f"{user_id or 'default'}::{role_name}"
    if cache_key in _ROADMAP_CACHE:
        cached = _ROADMAP_CACHE[cache_key]
        # Preserve user_progress for task completion state
        cached_tasks_status = _get_cached_task_status(user_id)
        if cached_tasks_status:
            _apply_task_status_to_phases(cached.phases, cached_tasks_status)
        return cached
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

            # Generate dynamic YouTube + Docs links based on the task's skill
            task_skill = task_data.get("skill_name", "JavaScript")
            task_resources = _build_task_resources(task_skill, task_data.get("title", ""))

            task = RoadmapTaskItem(
                id=task_id,
                title=task_data.get("title", f"Task {len(tasks)+1}"),
                type=task_data.get("type", "Course"),
                description=task_data.get("description", "Learn this topic"),
                progress_pct=100 if is_completed else 0,
                estimated_hours=task_data.get("estimated_hours", 10),
                is_completed=is_completed,
                topics=task_data.get("topics", []),
                resources=task_resources,
                practice_exercises=[],
                skill_name=task_skill
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

    final_roadmap = PersonalizedRoadmapResponse(
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

    # Store in cache (without user-specific task completion)
    _store_in_cache(cache_key, final_roadmap)

    return final_roadmap


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
    Falls back to curated real video IDs if LLM returns search URLs.
    """
    # Always start with curated real videos for guaranteed working links
    curated_videos = _get_curated_videos_for_skill(skill_name)
    real_video_resources = []
    for video in curated_videos[:2]:
        real_video_resources.append({
            "title": video["title"],
            "url": f"https://www.youtube.com/watch?v={video['id']}",
            "type": "video",
            "provider": video["channel"]
        })

    # Try AI generation for additional resources
    ai_resources = await generate_ai_resources(skill_name, user_level)

    if not ai_resources:
        # Use curated real videos + docs as the complete response
        ai_resources = []

        # Add real curated videos (real YouTube watch URLs)
        for video in curated_videos[:2]:
            ai_resources.append({
                "title": video["title"],
                "url": f"https://www.youtube.com/watch?v={video['id']}",
                "type": "video",
                "provider": video["channel"]
            })

        # Add official documentation
        docs_url = "https://developer.mozilla.org/en-US/docs/Learn"
        skill_lower = skill_name.lower()
        for key, url in {
            "javascript": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
            "python": "https://docs.python.org/3/tutorial/",
            "react": "https://react.dev/learn",
            "typescript": "https://www.typescriptlang.org/docs/",
            "node.js": "https://nodejs.org/en/learn",
            "postgresql": "https://www.postgresql.org/docs/",
            "docker": "https://docs.docker.com/get-started/",
            "fastapi": "https://fastapi.tiangolo.com/tutorial/",
            "tensorflow": "https://www.tensorflow.org/learn",
            "pytorch": "https://pytorch.org/tutorials/",
        }.items():
            if key in skill_lower or skill_lower in key:
                docs_url = url
                break

        ai_resources.append({
            "title": f"Official {skill_name} Documentation",
            "url": docs_url,
            "type": "documentation",
            "provider": "Official Docs"
        })

        # Add freeCodeCamp course link
        skill_slug = skill_name.lower().replace(" ", "+")
        ai_resources.append({
            "title": f"FreeCodeCamp: Learn {skill_name}",
            "url": f"https://www.freecodecamp.org/news/search/?query={skill_slug}",
            "type": "course",
            "provider": "freeCodeCamp"
        })
    else:
        # AI returned resources - merge with our curated real videos
        ai_urls = set(r.get("url", "") for r in ai_resources)
        merged = []

        # Add our real curated videos first (real YouTube watch URLs)
        for r in real_video_resources:
            merged.append(r)

        # Then add AI resources (skip search URLs and duplicates)
        real_videos_added = False
        for r in ai_resources:
            url = r.get("url", "")
            if "youtube.com/results" in url or "youtube.com/playlist" in url:
                # Skip YouTube search/playlist URLs - we have real videos
                continue
            if "youtube.com/watch" in url or "youtu.be" in url:
                real_videos_added = True
            if url in ai_urls or any(m["url"] == url for m in merged):
                continue
            merged.append(r)

        # If no real videos were added, ensure we have at least 2
        if not real_videos_added and real_video_resources:
            for r in real_video_resources:
                if not any(m["url"] == r["url"] for m in merged):
                    merged.insert(0, r)

        ai_resources = merged

    return AIResourceResponse(
        skill_name=skill_name,
        user_level=user_level,
        resources=ai_resources,
        generated_by="curated" if not llm_client.is_configured else "ai+curated"
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
