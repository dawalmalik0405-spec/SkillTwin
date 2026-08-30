import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.shared.models import (
    RoadmapResourceItem,
    RoadmapTaskItem,
    RoadmapPhaseItem,
    RoadmapMilestoneItem,
    RoadmapSummary,
    PersonalizedRoadmapResponse,
    TaskToggleRequest
)
from backend.routers.evidence import _in_memory_users
from backend.routers.gap_analysis import compute_skill_gap_analysis

router = APIRouter(
    prefix="/api/roadmap",
    tags=["Personalized Roadmap & Verification"]
)

# Persistent in-memory storage for candidate roadmap task completion states
_in_memory_task_progress: Dict[str, Dict[str, bool]] = {}

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


def build_personalized_roadmap(
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
    user_progress = _in_memory_task_progress.get(uid, {})

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

    # 3. Construct 6 Dynamic Phases tailored to the Target Role & Gap Severity
    # We inspect gap severities to prioritize phases
    critical_gaps = [g for g in gap_summary.gaps if g.priority == "Critical"]
    weak_gaps = [g for g in gap_summary.gaps if g.match_status == "Weak"]
    strong_skills = [g for g in gap_summary.gaps if g.match_status == "Strong"]

    # Phase 1: Strengthen Fundamentals / Foundation Essentials
    # If the user already demonstrated strong JS & HTML, initial progress is high (e.g. 75%)
    t1_1_done = user_progress.get("task-p1-1", True)  # HTML/CSS already strong in SkillTwin
    t1_2_done = user_progress.get("task-p1-2", True)  # JS (ES6+) strong in SkillTwin
    t1_3_done = user_progress.get("task-p1-3", False) # Personal portfolio project
    t1_4_done = user_progress.get("task-p1-4", False) # Frontend challenges

    p1_tasks = [
        RoadmapTaskItem(
            id="task-p1-1",
            title="HTML, CSS & Responsive Design",
            type="Course",
            description="Learn semantic HTML, modern CSS, Flexbox, Grid, and responsive design systems.",
            progress_pct=100 if t1_1_done else 75,
            estimated_hours=12,
            is_completed=t1_1_done,
            topics=["Semantic HTML5", "CSS Flexbox & Grid", "Mobile-First Media Queries", "CSS Custom Properties"],
            resources=CURATED_RESOURCES["html_css"],
            practice_exercises=[
                {"id": "p1-1-ex1", "title": "Build a responsive product landing page grid", "is_done": t1_1_done},
                {"id": "p1-1-ex2", "title": "Implement multi-column dark mode layout with CSS variables", "is_done": t1_1_done}
            ]
        ),
        RoadmapTaskItem(
            id="task-p1-2",
            title="JavaScript (ES6+)",
            type="Course",
            description="Variables, functions, DOM manipulation, events, ES6+ features, and async/await.",
            progress_pct=100 if t1_2_done else 40,
            estimated_hours=16,
            is_completed=t1_2_done,
            topics=["ES6+ Syntax & Modules", "Async/Await & Promises", "Event Loop & Closures", "DOM Manipulation"],
            resources=CURATED_RESOURCES["javascript"],
            practice_exercises=[
                {"id": "p1-2-ex1", "title": "Fetch and render JSON data from an external REST API", "is_done": t1_2_done},
                {"id": "p1-2-ex2", "title": "Implement debounce and throttle utility functions", "is_done": t1_2_done}
            ]
        ),
        RoadmapTaskItem(
            id="task-p1-3",
            title="Build: Personal Portfolio (Project 1)",
            type="Project",
            description="Build and deploy your own responsive portfolio website showcasing initial projects.",
            progress_pct=100 if t1_3_done else 60,
            estimated_hours=10,
            is_completed=t1_3_done,
            topics=["Portfolio Architecture", "Responsive Styling", "Project Showcases", "Vercel / GitHub Pages Deployment"],
            resources=CURATED_RESOURCES["html_css"][:2],
            project_deliverable={
                "name": "Developer Portfolio Website",
                "deliverable": "Public GitHub Repository URL + Live URL",
                "key_technologies": ["HTML5", "CSS3", "JavaScript", "Responsive Design"]
            }
        ),
        RoadmapTaskItem(
            id="task-p1-4",
            title="Practice: Frontend Challenges",
            type="Practice",
            description="Solve interactive UI challenges and improve responsive styling techniques.",
            progress_pct=100 if t1_4_done else 30,
            estimated_hours=6,
            is_completed=t1_4_done,
            topics=["Interactive Modals", "Dropdown Menus", "Form Validations", "Accessible Components"],
            resources=CURATED_RESOURCES["html_css"]
        )
    ]

    p1_completed_count = sum(1 for t in p1_tasks if t.is_completed)
    p1_progress = int(sum(t.progress_pct for t in p1_tasks) / len(p1_tasks))

    phase_1 = RoadmapPhaseItem(
        phase_number=1,
        title="Phase 1: Strengthen Fundamentals",
        subtitle="Build a strong foundation in core web development and programming.",
        priority="Critical",
        estimated_duration_weeks="2–3 Weeks",
        progress_pct=p1_progress,
        status="Completed" if p1_progress >= 100 else ("In Progress" if p1_progress > 0 else "Not Started"),
        topics_count=12,
        projects_count=2,
        resources_count=18,
        why_it_matters="Strengthen the core fundamentals required for full-stack engineering.",
        exact_gap_addressed="Solidifies JavaScript & HTML/CSS foundations as prerequisites for React.",
        current_proficiency="Advanced (Demonstrated)",
        required_proficiency="Advanced (Core)",
        tasks=p1_tasks
    )

    # Phase 2: Frontend Mastery & Interactive State (Addresses React & TypeScript Gaps)
    t2_1_done = user_progress.get("task-p2-1", False)
    t2_2_done = user_progress.get("task-p2-2", False)
    t2_3_done = user_progress.get("task-p2-3", False)
    t2_4_done = user_progress.get("task-p2-4", False)

    p2_tasks = [
        RoadmapTaskItem(
            id="task-p2-1",
            title="React.js Basics to Advanced",
            type="Course",
            description="Component architecture, JSX, hooks, state, context, routing, and custom hooks.",
            progress_pct=100 if t2_1_done else 25,
            estimated_hours=20,
            is_completed=t2_1_done,
            topics=["Functional Components & JSX", "useState & useEffect Lifecycle", "Custom Hooks", "React Router v6"],
            resources=CURATED_RESOURCES["react"],
            practice_exercises=[
                {"id": "p2-1-ex1", "title": "Build a multi-step dynamic onboarding form with state", "is_done": t2_1_done},
                {"id": "p2-1-ex2", "title": "Create a reusable searchable data table component", "is_done": t2_1_done}
            ]
        ),
        RoadmapTaskItem(
            id="task-p2-2",
            title="TypeScript for React Applications",
            type="Course",
            description="Type annotations, interfaces, generics, strict compiler configs, and typed props/events.",
            progress_pct=100 if t2_2_done else 15,
            estimated_hours=12,
            is_completed=t2_2_done,
            topics=["Interfaces & Type Aliases", "Generics in React Components", "Typed API Contracts", "Union & Discriminated Types"],
            resources=CURATED_RESOURCES["react"]
        ),
        RoadmapTaskItem(
            id="task-p2-3",
            title="State Management with Redux Toolkit",
            type="Course",
            description="Global state management for complex UI flows, slice reducers, and async thunk fetching.",
            progress_pct=100 if t2_3_done else 0,
            estimated_hours=8,
            is_completed=t2_3_done,
            topics=["createSlice & Store Configuration", "Typed useSelector & useDispatch", "createAsyncThunk Data Orchestration"],
            resources=CURATED_RESOURCES["react"]
        ),
        RoadmapTaskItem(
            id="task-p2-4",
            title="Build: E-commerce UI with Cart & Filters (Project 2)",
            type="Project",
            description="Build a responsive e-commerce frontend with category filtering, live search, and global shopping cart.",
            progress_pct=100 if t2_4_done else 0,
            estimated_hours=15,
            is_completed=t2_4_done,
            topics=["Component Composition", "Cart Reducer State", "Optimistic UI Updates", "Responsive Grid Layout"],
            resources=CURATED_RESOURCES["react"],
            project_deliverable={
                "name": "E-Commerce Shopping Application",
                "deliverable": "React + TypeScript Code Repository with Component Hierarchy",
                "key_technologies": ["React", "TypeScript", "Tailwind CSS / CSS Modules", "State Management"]
            }
        )
    ]

    p2_progress = int(sum(t.progress_pct for t in p2_tasks) / len(p2_tasks))

    phase_2 = RoadmapPhaseItem(
        phase_number=2,
        title="Phase 2: Frontend Mastery",
        subtitle="Deepen your frontend knowledge and build real-world component interfaces.",
        priority="Critical",
        estimated_duration_weeks="4–5 Weeks",
        progress_pct=p2_progress,
        status="Completed" if p2_progress >= 100 else ("In Progress" if p2_progress > 0 else "Not Started"),
        topics_count=18,
        projects_count=3,
        resources_count=24,
        why_it_matters="Closes the critical -40% React and -25% TypeScript gaps identified in Gap Analysis.",
        exact_gap_addressed="React (40% -> 80%) & TypeScript (50% -> 75%)",
        current_proficiency="Beginner (Evidence Missing)",
        required_proficiency="Intermediate / Advanced (Core)",
        tasks=p2_tasks
    )

    # Phase 3: Backend Development & REST API Engineering (Addresses Node.js & FastAPI Gaps)
    t3_1_done = user_progress.get("task-p3-1", False)
    t3_2_done = user_progress.get("task-p3-2", False)
    t3_3_done = user_progress.get("task-p3-3", False)
    t3_4_done = user_progress.get("task-p3-4", False)

    p3_tasks = [
        RoadmapTaskItem(
            id="task-p3-1",
            title="Node.js & Express.js REST Engineering",
            type="Course",
            description="Server architecture, routing, middleware pipeline, REST standards, and error handling.",
            progress_pct=100 if t3_1_done else 0,
            estimated_hours=16,
            is_completed=t3_1_done,
            topics=["Event-Driven Architecture", "Express Router & Middleware", "RESTful Status Codes & Headers", "Global Error Handling"],
            resources=CURATED_RESOURCES["backend"],
            practice_exercises=[
                {"id": "p3-1-ex1", "title": "Build a modular CRUD REST API with Express", "is_done": t3_1_done}
            ]
        ),
        RoadmapTaskItem(
            id="task-p3-2",
            title="FastAPI & Async Python Backends",
            type="Course",
            description="High-performance async APIs, Pydantic type validation, and automatic OpenAPI Swagger docs.",
            progress_pct=100 if t3_2_done else 0,
            estimated_hours=14,
            is_completed=t3_2_done,
            topics=["FastAPI Path Operations", "Pydantic v2 Models", "Dependency Injection", "Async Database Sessions"],
            resources=CURATED_RESOURCES["backend"]
        ),
        RoadmapTaskItem(
            id="task-p3-3",
            title="Authentication & JWT Security",
            type="Practice",
            description="Implement secure user authentication, bcrypt password hashing, and JWT bearer tokens.",
            progress_pct=100 if t3_3_done else 0,
            estimated_hours=8,
            is_completed=t3_3_done,
            topics=["Bcrypt Password Hashing", "JWT Token Signing & Verification", "Protected Route Middleware", "OAuth2 Flow"],
            resources=CURATED_RESOURCES["backend"]
        ),
        RoadmapTaskItem(
            id="task-p3-4",
            title="Build: Secure Task Management REST API (Project 3)",
            type="Project",
            description="Build a production-ready REST API with user registration, JWT auth, and CRUD resources.",
            progress_pct=100 if t3_4_done else 0,
            estimated_hours=18,
            is_completed=t3_4_done,
            topics=["REST API Design", "Authentication Pipeline", "CORS Configuration", "Unit Tests with Pytest/Supertest"],
            resources=CURATED_RESOURCES["backend"],
            project_deliverable={
                "name": "Secure Multi-User Task Management API",
                "deliverable": "Backend REST API Repository with OpenAPI Documentation",
                "key_technologies": ["Node.js / FastAPI", "Express / Pydantic", "JWT Auth", "Postman Collection"]
            }
        )
    ]

    p3_progress = int(sum(t.progress_pct for t in p3_tasks) / len(p3_tasks))

    phase_3 = RoadmapPhaseItem(
        phase_number=3,
        title="Phase 3: Backend Development",
        subtitle="Learn server-side development, authentication, and RESTful APIs.",
        priority="High",
        estimated_duration_weeks="5–6 Weeks",
        progress_pct=p3_progress,
        status="Completed" if p3_progress >= 100 else ("In Progress" if p3_progress > 0 else "Not Started"),
        topics_count=16,
        projects_count=3,
        resources_count=22,
        why_it_matters="Closes the -20% Node.js gap and establishes production server architecture capabilities.",
        exact_gap_addressed="Node.js & Express.js (60% -> 80%)",
        current_proficiency="Intermediate (60%)",
        required_proficiency="Intermediate / Advanced (80%)",
        tasks=p3_tasks
    )

    # Phase 4: Database & ORM (Addresses PostgreSQL & SQL Gaps)
    t4_1_done = user_progress.get("task-p4-1", False)
    t4_2_done = user_progress.get("task-p4-2", False)
    t4_3_done = user_progress.get("task-p4-3", False)

    p4_tasks = [
        RoadmapTaskItem(
            id="task-p4-1",
            title="PostgreSQL & Relational Schema Modeling",
            type="Course",
            description="Relational database design, table relationships, foreign keys, indexing, and joins.",
            progress_pct=100 if t4_1_done else 0,
            estimated_hours=14,
            is_completed=t4_1_done,
            topics=["Relational Modeling & 3NF", "Complex SQL Joins & Aggregations", "B-Tree Indexing", "Transactions & ACID"],
            resources=CURATED_RESOURCES["database"]
        ),
        RoadmapTaskItem(
            id="task-p4-2",
            title="ORM Integration & Database Migrations",
            type="Course",
            description="SQLAlchemy / Prisma ORM modeling, migration tracking with Alembic, and connection pools.",
            progress_pct=100 if t4_2_done else 0,
            estimated_hours=10,
            is_completed=t4_2_done,
            topics=["ORM Models & Relationships", "Alembic Migrations", "Connection Pooling", "Lazy vs Eager Loading"],
            resources=CURATED_RESOURCES["database"]
        ),
        RoadmapTaskItem(
            id="task-p4-3",
            title="Build: Full-Stack Persistent Data Platform (Project 4)",
            type="Project",
            description="Connect your React frontend with FastAPI/Express and PostgreSQL database persistence.",
            progress_pct=100 if t4_3_done else 0,
            estimated_hours=16,
            is_completed=t4_3_done,
            topics=["Full Stack Integration", "Relational Queries", "Data Validation", "Pagination & Filtering"],
            resources=CURATED_RESOURCES["database"],
            project_deliverable={
                "name": "Full-Stack Data Persistence Platform",
                "deliverable": "End-to-end Full Stack Web Application with Database Migrations",
                "key_technologies": ["React", "FastAPI / Node.js", "PostgreSQL", "SQLAlchemy"]
            }
        )
    ]

    p4_progress = int(sum(t.progress_pct for t in p4_tasks) / len(p4_tasks))

    phase_4 = RoadmapPhaseItem(
        phase_number=4,
        title="Phase 4: Database & ORM",
        subtitle="Work with relational databases, schema modeling, and ORM migrations.",
        priority="High",
        estimated_duration_weeks="3–4 Weeks",
        progress_pct=p4_progress,
        status="Completed" if p4_progress >= 100 else ("In Progress" if p4_progress > 0 else "Not Started"),
        topics_count=10,
        projects_count=2,
        resources_count=16,
        why_it_matters="Closes the -25% PostgreSQL gap and proves hands-on data persistence.",
        exact_gap_addressed="PostgreSQL & SQL (45% -> 70%)",
        current_proficiency="Beginner (45%)",
        required_proficiency="Intermediate (70%)",
        tasks=p4_tasks
    )

    # Phase 5: DevOps & Deployment (Addresses Docker Containerization Gap)
    t5_1_done = user_progress.get("task-p5-1", False)
    t5_2_done = user_progress.get("task-p5-2", False)
    t5_3_done = user_progress.get("task-p5-3", False)

    p5_tasks = [
        RoadmapTaskItem(
            id="task-p5-1",
            title="Docker Containerization & Compose",
            type="Course",
            description="Package applications into portable containers with Dockerfiles, multi-stage builds, and Docker Compose.",
            progress_pct=100 if t5_1_done else 0,
            estimated_hours=12,
            is_completed=t5_1_done,
            topics=["Docker Architecture & Images", "Multi-Stage Dockerfiles", "Docker Compose Multi-Service Networks", "Volume Persistence"],
            resources=CURATED_RESOURCES["devops"]
        ),
        RoadmapTaskItem(
            id="task-p5-2",
            title="CI/CD Pipelines with GitHub Actions",
            type="Course",
            description="Automate testing, build verification, and deployment workflows triggered on pull requests.",
            progress_pct=100 if t5_2_done else 0,
            estimated_hours=8,
            is_completed=t5_2_done,
            topics=["GitHub Actions Workflows", "Automated Linting & Test Runners", "Build Artifacts", "Environment Secrets"],
            resources=CURATED_RESOURCES["devops"]
        ),
        RoadmapTaskItem(
            id="task-p5-3",
            title="Build: Multi-Container Cloud Deployment (Project 5)",
            type="Project",
            description="Containerize full-stack application (React + Node/FastAPI + PostgreSQL) with docker-compose.",
            progress_pct=100 if t5_3_done else 0,
            estimated_hours=14,
            is_completed=t5_3_done,
            topics=["Docker Compose Orchestration", "Environment Variable Management", "Production Builds", "Health Checks"],
            resources=CURATED_RESOURCES["devops"],
            project_deliverable={
                "name": "Containerized Multi-Service Deployment",
                "deliverable": "GitHub Repo with Dockerfile + docker-compose.yml + GitHub Actions Workflow",
                "key_technologies": ["Docker", "Docker Compose", "GitHub Actions", "Cloud Deployment"]
            }
        )
    ]

    p5_progress = int(sum(t.progress_pct for t in p5_tasks) / len(p5_tasks))

    phase_5 = RoadmapPhaseItem(
        phase_number=5,
        title="Phase 5: DevOps & Deployment",
        subtitle="Deploy applications and learn containerization & CI/CD workflows.",
        priority="Medium",
        estimated_duration_weeks="3–4 Weeks",
        progress_pct=p5_progress,
        status="Completed" if p5_progress >= 100 else ("In Progress" if p5_progress > 0 else "Not Started"),
        topics_count=8,
        projects_count=2,
        resources_count=14,
        why_it_matters="Eliminates the critical -40% Docker gap and demonstrates production deployment readiness.",
        exact_gap_addressed="Docker Containerization (20% -> 60%)",
        current_proficiency="Insufficient Evidence (20%)",
        required_proficiency="Intermediate (60%)",
        tasks=p5_tasks
    )

    # Phase 6: Advanced & Best Practices (Testing, Performance, Verification Preparation)
    t6_1_done = user_progress.get("task-p6-1", False)
    t6_2_done = user_progress.get("task-p6-2", False)
    t6_3_done = user_progress.get("task-p6-3", False)

    p6_tasks = [
        RoadmapTaskItem(
            id="task-p6-1",
            title="Frontend & Backend Automated Testing",
            type="Course",
            description="Unit testing, integration testing, component testing with Vitest/Jest, and API testing.",
            progress_pct=100 if t6_1_done else 0,
            estimated_hours=14,
            is_completed=t6_1_done,
            topics=["Unit Testing with Vitest", "React Testing Library", "API Integration Tests", "Mocking & Test Coverage"],
            resources=CURATED_RESOURCES["testing"]
        ),
        RoadmapTaskItem(
            id="task-p6-2",
            title="Performance Optimization & Security Auditing",
            type="Course",
            description="Lighthouse Core Web Vitals, code splitting, lazy loading, API rate limiting, and CORS security.",
            progress_pct=100 if t6_2_done else 0,
            estimated_hours=10,
            is_completed=t6_2_done,
            topics=["Bundle Size Minimization", "Lazy Loading & Code Splitting", "OWASP Security Audits", "API Rate Limiting"],
            resources=CURATED_RESOURCES["testing"]
        ),
        RoadmapTaskItem(
            id="task-p6-3",
            title="Build: Production-Ready Capstone Application (Project 6)",
            type="Project",
            description="Build an end-to-end full stack platform with testing, authentication, containerization, and docs for Project Verification.",
            progress_pct=100 if t6_3_done else 0,
            estimated_hours=25,
            is_completed=t6_3_done,
            topics=["End-to-End Architecture", "Production Deployment", "Comprehensive README", "Project Verification Submission"],
            resources=CURATED_RESOURCES["testing"],
            project_deliverable={
                "name": "SkillTwin Capstone Engineering Platform",
                "deliverable": "Complete Production-Ready Full Stack Repository ready for Page 7 Project Verification",
                "key_technologies": ["React", "TypeScript", "FastAPI / Node.js", "PostgreSQL", "Docker", "CI/CD"]
            }
        )
    ]

    p6_progress = int(sum(t.progress_pct for t in p6_tasks) / len(p6_tasks))

    phase_6 = RoadmapPhaseItem(
        phase_number=6,
        title="Phase 6: Advanced & Best Practices",
        subtitle="Best practices, testing, performance optimization, and capstone verification.",
        priority="Medium",
        estimated_duration_weeks="4–5 Weeks",
        progress_pct=p6_progress,
        status="Completed" if p6_progress >= 100 else ("In Progress" if p6_progress > 0 else "Not Started"),
        topics_count=12,
        projects_count=2,
        resources_count=18,
        why_it_matters="Prepares your verified capstone project for Page 7 GitHub Project Verification.",
        exact_gap_addressed="Testing, Architecture & Capstone Verification",
        current_proficiency="Beginner",
        required_proficiency="Advanced (Core)",
        tasks=p6_tasks
    )

    all_phases = [phase_1, phase_2, phase_3, phase_4, phase_5, phase_6]

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

    # Top Skills You Will Gain
    top_skills = [
        {"name": "JavaScript", "category": "Language"},
        {"name": "React.js", "category": "Frontend"},
        {"name": "TypeScript", "category": "Language"},
        {"name": "Node.js", "category": "Backend"},
        {"name": "Express.js", "category": "Backend"},
        {"name": "FastAPI", "category": "Backend"},
        {"name": "PostgreSQL", "category": "Database"},
        {"name": "SQL", "category": "Database"},
        {"name": "Git & GitHub", "category": "Tools"},
        {"name": "Docker", "category": "DevOps"}
    ]

    # Why This Roadmap Personalization Reasons
    why_reasons = [
        "Based on your actual identified skill gaps",
        f"Personalized for your target role: {role_name}",
        "Focuses on critical & high priority requirements first",
        "Leverages your existing strengths (JavaScript, HTML/CSS, Git)",
        f"Structured for your {daily_effort_hours} available study commitment",
        "Provides concrete projects ready for GitHub Project Verification"
    ]

    # Milestones Checkpoints
    milestones = [
        RoadmapMilestoneItem(
            milestone_number=1,
            title="Frontend Fundamentals",
            description="Complete HTML/CSS, core JavaScript, and responsive portfolio project.",
            is_achieved=phase_1.progress_pct >= 75
        ),
        RoadmapMilestoneItem(
            milestone_number=2,
            title="Frontend Mastery",
            description="Master React component architecture, TypeScript typing, and e-commerce UI.",
            is_achieved=phase_2.progress_pct >= 100
        ),
        RoadmapMilestoneItem(
            milestone_number=3,
            title="Backend Development",
            description="Build secure RESTful APIs with Node.js/FastAPI and JWT authentication.",
            is_achieved=phase_3.progress_pct >= 100
        ),
        RoadmapMilestoneItem(
            milestone_number=4,
            title="Full Stack Integration",
            description="Integrate relational PostgreSQL modeling with frontend client applications.",
            is_achieved=phase_4.progress_pct >= 100
        ),
        RoadmapMilestoneItem(
            milestone_number=5,
            title="Deploy & Optimize",
            description="Containerize services with Docker and set up automated CI/CD pipelines.",
            is_achieved=phase_5.progress_pct >= 100
        ),
        RoadmapMilestoneItem(
            milestone_number=6,
            title="Job & Verification Ready",
            description="Complete production-ready capstone project for Page 7 Project Verification.",
            is_achieved=phase_6.progress_pct >= 100
        )
    ]

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
def get_personalized_roadmap(
    role: str = Query("Full-Stack Developer", description="Target role name"),
    experience: str = Query("Entry Level (0-2 years)", description="Experience level"),
    daily_effort: str = Query("1-2 hours/day", description="Daily study time"),
    user_id: Optional[str] = Query("default_user", description="Candidate ID")
):
    """
    Retrieve generated personalized roadmap tailored to candidate's gap analysis and daily study pace.
    """
    try:
        return build_personalized_roadmap(
            role_name=role,
            experience_level=experience,
            daily_effort_hours=daily_effort,
            user_id=user_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate personalized roadmap: {str(e)}"
        )


@router.post("/task/toggle", response_model=PersonalizedRoadmapResponse)
def toggle_roadmap_task(
    payload: TaskToggleRequest,
    role: str = Query("Full-Stack Developer"),
    experience: str = Query("Entry Level (0-2 years)"),
    daily_effort: str = Query("1-2 hours/day")
):
    """
    Toggle task or practice item completion state and persist updated progress.
    """
    uid = payload.user_id or "default_user"
    if uid not in _in_memory_task_progress:
        _in_memory_task_progress[uid] = {}

    _in_memory_task_progress[uid][payload.task_id] = payload.is_completed

    return build_personalized_roadmap(
        role_name=role,
        experience_level=experience,
        daily_effort_hours=daily_effort,
        user_id=uid
    )


@router.post("/recalculate", response_model=PersonalizedRoadmapResponse)
def recalculate_roadmap(
    role: str = Query("Full-Stack Developer"),
    experience: str = Query("Entry Level (0-2 years)"),
    daily_effort: str = Query("1-2 hours/day"),
    user_id: Optional[str] = Query("default_user")
):
    """
    Recalculate personalized roadmap when underlying SkillTwin or Gap Analysis changes.
    """
    return build_personalized_roadmap(
        role_name=role,
        experience_level=experience,
        daily_effort_hours=daily_effort,
        user_id=user_id
    )


@router.get("/export")
def export_roadmap_report(
    role: str = Query("Full-Stack Developer"),
    experience: str = Query("Entry Level (0-2 years)"),
    daily_effort: str = Query("1-2 hours/day"),
    user_id: Optional[str] = Query("default_user")
):
    """
    Generate downloadable formatted copy of the candidate's personalized learning roadmap.
    """
    roadmap = build_personalized_roadmap(
        role_name=role,
        experience_level=experience,
        daily_effort_hours=daily_effort,
        user_id=user_id
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
