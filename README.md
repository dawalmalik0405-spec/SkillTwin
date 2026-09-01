# SkillTwin

### Evidence-Based Skill Development Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenRouter](https://img.shields.io/badge/AI-OpenRouter-7C3AED?style=flat-square)](https://openrouter.ai/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-00E599?style=flat-square&logo=render&logoColor=white)](https://skilltwin-vx3z.onrender.com)
[![Demo Video](https://img.shields.io/badge/Demo%20Video-Google%20Drive-FFC107?style=flat-square&logo=googledrive&logoColor=white)](https://drive.google.com/file/d/1Dvh-mgq0wrQ5PmRUXhPIHPS-WDh7QJuU/view?usp=sharing)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

SkillTwin is an evidence-based skill development platform designed to help students identify, measure, validate, and improve their skills using real-world evidence such as GitHub repositories, resumes, projects, certifications, and assessments.

Instead of relying only on self-declared skills, SkillTwin aims to create a dynamic skill profile that evolves as students gain experience, identify skill gaps, and work toward industry-relevant career goals.

> 🌐 **Live Deployed Demo**: [https://skilltwin-vx3z.onrender.com](https://skilltwin-vx3z.onrender.com)  
> 🎬 **Demo Video**: [Watch Demo Video on Google Drive](https://drive.google.com/file/d/1Dvh-mgq0wrQ5PmRUXhPIHPS-WDh7QJuU/view?usp=sharing)
> 📂 **github repo**: [clone this repo](https://github.com/dawalmalik0405-spec/SkillTwin)]


---

## Table of Contents

- [Problem](#problem)
- [Proposed Solution](#proposed-solution)
- [Key Features](#key-features)
- [Prototype Workflow & Architecture](#prototype-workflow)
- [Evidence Used](#evidence-used)
- [Team Members & Contributions](#team-members--contributions)
- [Reviewer Notes](#reviewer-notes)
- [Technology Stack](#technology-stack)
- [Local Setup & Quick Start](#local-setup--quick-start)
- [API Endpoints Overview](#api-endpoints-overview)
- [Environment Configuration](#environment-configuration)
- [Generative AI Disclosure](#generative-ai-disclosure)
- [Research & Reference Resources](#research--reference-resources)
- [Responsible Use](#responsible-use)
- [Future Scope](#future-scope)
- [Project Status](#project-status)
- [Deployment](#deployment)
- [Security Policy](#security-policy)
- [License](#license)

---

## Problem

Students often know the skills they have learned but struggle to understand:

- What skills they can actually demonstrate with evidence
- How strong their current proficiency is
- Which skills are missing for a target career role
- What they should learn or practice next
- How their projects and experiences translate into industry requirements

SkillTwin addresses this gap by connecting student evidence with skill intelligence and personalized development.

---

## Proposed Solution

SkillTwin follows an evidence-first approach:

**Student Profile → Evidence Collection → AI-Assisted Analysis → SkillTwin → Skill Gap Analysis → Personalized Roadmap → Skill Development**

The platform brings together evidence such as resumes, GitHub repositories, projects, certifications, and assessments to create a structured view of a student's skills and development needs.

---

## Key Features

### 1. Student Onboarding
Students provide their profile information, career goals, educational background, and learning preferences.

### 2. Evidence Collection
The platform is designed around real-world evidence including:

- Resume
- GitHub repositories
- Projects
- Certifications
- Assessments

### 3. Skill Intelligence
Collected evidence can be analyzed to identify relevant skills and represent proficiency, confidence, and supporting evidence.

### 4. Skill Gap Analysis
The system compares the student's current skill profile with the requirements of a target career role to identify important gaps.

### 5. Personalized Roadmap
Skill gaps can be converted into a structured development roadmap containing learning, practice, project-building, and improvement stages.

### 6. Career Readiness
The long-term goal is to continuously update the student's SkillTwin as new evidence and achievements are added.

---

## Prototype Workflow

### Workflow Sequence

```text
Student Onboarding
        ↓
Evidence Collection
        ↓
AI-Assisted Analysis
        ↓
SkillTwin Creation
        ↓
Skill Intelligence
        ↓
Gap Analysis
        ↓
Personalized Roadmap
        ↓
Learn → Practice → Build
        ↓
Verification & New Evidence
        ↓
Updated SkillTwin
        ↓
Career Readiness
```

### Interactive Flowchart

```mermaid
flowchart TD
    A[Student Onboarding] --> B[Evidence Collection]
    B -->|Resume, GitHub, Certs| C[AI-Assisted Analysis]
    C --> D[SkillTwin Profile Creation]
    D --> E[Target Role Selection]
    E --> F[Skill Gap Analysis]
    F --> G[Personalized Roadmap]
    G --> H[Learn → Practice → Build]
    H --> I[AI Quizzes & Task Verification]
    I -->|Verification Result| J[Updated SkillTwin Profile]
    J --> K[Career Readiness Score]
```

### System Architecture Diagram

```mermaid
graph TD
    subgraph Client ["Client Layer"]
        Frontend["React SPA (TypeScript + Vite)"]
    end

    subgraph Server ["Server Layer (FastAPI Single-Service)"]
        MainApp["backend/main.py"]
        Routers["FastAPI Routers (Auth, Evidence, SkillTwin, Roadmap, Quiz)"]
        DBEngine["SQLAlchemy 2.0 / PostgreSQL Handler"]
        LLMClient["OpenRouter LLM Client"]
    end

    subgraph Integrations ["External APIs & Storage"]
        Postgres[(PostgreSQL Database)]
        OpenRouter["OpenRouter AI (Claude / Gemini / GPT)"]
        GitHubAPI["GitHub REST API"]
    end

    Frontend -->|HTTP / REST API| MainApp
    MainApp --> Routers
    Routers --> DBEngine
    Routers --> LLMClient
    DBEngine --> Postgres
    LLMClient --> OpenRouter
    Routers --> GitHubAPI
```

---


## Evidence Used

SkillTwin is designed to work with multiple forms of student evidence. These sources help the system build an evidence-backed skill profile rather than relying only on self-declared skills.

| Evidence Source | Purpose |
|---|---|
| Resume | Identifies education, experience, projects, technologies, certifications, and claimed skills |
| GitHub | Provides evidence from repositories, development activity, technologies, and project implementations |
| Projects | Demonstrates practical application and implementation of technical skills |
| Certifications | Provides external evidence of learning and achievements |
| Assessments | Supports skill validation and proficiency evaluation |

The evidence collected from these sources is analyzed and mapped to the student's SkillTwin. Each skill can be associated with supporting evidence, proficiency, and confidence so that the resulting profile remains traceable and evidence-based.

---

## Team Members & Contributions

| Team Member | GitHub | Role & Contributions |
|---|---|---|
| **Layeeba Haram** | [@layeebaharam14](https://github.com/layeebaharam14) | Frontend development, UI/UX design, interface design, user flows, onboarding experience, evidence-collection interfaces, SkillTwin dashboard presentation, documentation, and presentation work |
| **Davalmalik Sayadali Makandar** | [@dawalmalik0405-spec](https://github.com/dawalmalik0405-spec) | Backend development, AI/ML integration, evidence analysis, skill extraction and mapping logic, backend architecture, data processing, and system integration |

### Team Contribution Statement

Both team members contributed substantially and approximately equally to the overall project. Contributions included ideation, problem research, system design, development, AI integration, UI/UX, testing, debugging, documentation, iteration, and presentation preparation.

The project was developed collaboratively, with responsibilities divided according to the team members' technical roles while both members contributed to the overall product development process.

---

## Reviewer Notes

> 📌 **Notice for Hackathon Evaluators & Reviewers**:
>
> 1. **Single-Service Architecture**: The frontend (React SPA) and backend (FastAPI) are deployed together as a single container on Render. Requesting `/` serves the built React web application, while `/api/*` serves the REST API endpoints and `/docs` serves interactive OpenAPI documentation.
> 2. **Environment & Keys**: AI-powered features (Gap Analysis, Knowledge Check Quizzes, Learning Resources) utilize OpenRouter API endpoints configured via `OPENROUTER_API_KEY`. In local mode, fallback heuristics ensure complete UI functionality even if an API key is not supplied.
> 3. **Database Migration**: The PostgreSQL schema (`backend/schema.sql`) automatically initializes all database tables (`users`, `resumes`, `github_profiles`, `skill_twins`, `roadmaps`, `quizzes`, `readiness_scores`) upon deployment boot.
> 4. **Project Reports**: The official Round 1 PDF report is committed at the repository root as [`SkillTwin_Master_Implementation_Plan.pdf`](SkillTwin_Master_Implementation_Plan.pdf).

---



## Technology Stack

### Frontend
- **Framework & Language**: React 18, TypeScript, HTML5, CSS3
- **Build Tool**: Vite
- **UI Components**: Custom CSS with glassmorphism design tokens & micro-animations

### Backend
- **Framework**: Python 3.11, FastAPI, Uvicorn
- **ORM & DB**: SQLAlchemy 2.0, PostgreSQL

### AI / ML & LLM Integration
- **LLM Provider**: OpenRouter API (`anthropic/claude-3.5-sonnet`, `google/gemini-2.0-flash-thinking-exp`, `openai/gpt-4o`)
- **Intelligence**: Skill extraction, natural language normalization, gap analysis, dynamic quiz generation, roadmap synthesis

### Integrations & Services
- **GitHub REST API**: Repository verification, technology detection, commit activity analysis
- **Document Processing**: PyPDF2 / pdfplumber for resume parsing
- **Deployment**: Docker, Render (Single-service container architecture)

---

## Local Setup & Quick Start

### Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** & `npm` installed
- **PostgreSQL** database instance running locally or remotely

### 1. One-Command Start (Development)

Run both the FastAPI backend and React frontend simultaneously using the root launcher:

```bash
python start.py
```

This starts:
- **Backend API**: http://localhost:8000
- **Frontend SPA**: http://localhost:5173

---

### 2. Manual Step-by-Step Setup

#### Step A: Backend Setup

```bash
# 1. Create and activate a virtual environment
python -m venv .venv

# On Windows (PowerShell / CMD):
.venv\Scripts\activate
# On Linux / macOS:
source .venv/bin/activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Configure environment variables
cp .env.example .env

# 4. Initialize PostgreSQL schema
psql -U postgres -d skilltwin_db -f backend/schema.sql

# 5. Run backend server
python -m backend.main
```

#### Step B: Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

---

## API Endpoints Overview

The FastAPI backend exposes structured REST endpoints divided into modular routers:

| Router | Base Path | Description |
|---|---|---|
| **Auth Router** | `/api/auth` | User registration, authentication, session state (`/me`), JWT tokens |
| **Evidence Router** | `/api/evidence` | Resume parsing, GitHub repo verification, project/cert submissions |
| **Target Role Router** | `/api/target-role` | Career role selection (ESCO/O*NET aligned) and target skill goals |
| **SkillTwin Router** | `/api/skilltwin` | Evidence-backed skill graph, proficiency levels, confidence scores |
| **Gap Analysis Router** | `/api/gap-analysis` | Comparative matrix matching current skills against target role requirements |
| **Roadmap Router** | `/api/roadmap` | Step-by-step personalized skill development roadmap generation |
| **Quiz Router** | `/api/quiz` | AI-generated knowledge check quizzes per roadmap task & evaluation |
| **Verification Router** | `/api/verification` | Task verification, quiz validation, and SkillTwin profile recalculation |
| **Readiness Router** | `/api/readiness` | Quantitative Career Readiness Index score & strength breakdown |
| **Health Router** | `/api/health` | System health status and PostgreSQL database connection check |

Full interactive API documentation is available at `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc`.

---

## Environment Configuration

Copy `.env.example` to `.env` and configure the following parameters:

| Parameter | Required | Default / Description |
|---|---|---|
| `HOST` | No | Default `0.0.0.0` — Backend bind address |
| `PORT` | No | Default `8000` — Backend port |
| `SECRET_KEY` | Yes (Prod) | JWT signing secret. Auto-fallback used in local dev |
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql://user:pass@localhost:5432/skilltwin_db`) |
| `OPENROUTER_API_KEY` | Yes (AI) | Key from [OpenRouter](https://openrouter.ai/keys) for AI quizzes & gap analysis |
| `OPENROUTER_MODEL` | No | Default `anthropic/claude-3.5-sonnet` |
| `GITHUB_TOKEN` | No | Fine-grained GitHub token to increase API rate limit for repo analysis |
| `VITE_API_URL` | No | Default `http://localhost:8000` for frontend API requests |

---





## Generative AI Disclosure

Generative AI tools were used as **assistive tools** during the development of SkillTwin.

AI assistance was used for activities such as:

- Brainstorming and ideation
- Exploring and refining the problem statement
- Research assistance
- Documentation refinement
- Improving wording and presentation
- Exploring implementation approaches
- Debugging and development assistance

The team remained responsible for the project's:

- Concept and problem definition
- System and UI/UX design decisions
- Architecture and workflow
- Implementation decisions
- Integration
- Validation and testing
- Documentation
- Final submission and presentation

Generative AI was used as an **assistance tool and not as a substitute for the team's project work**.

---

## Research & Reference Resources

The project concept and prototype development were informed by publicly available technical, skills, and career-development resources, including:

- **ESCO** — European Skills, Competences, Qualifications and Occupations
- **O*NET** — Occupational Information Network
- **GitHub Documentation and API Resources**
- **MDN Web Docs**
- **Microsoft Learn**
- **AWS Skill Builder**
- **roadmap.sh**
- **freeCodeCamp**

These resources were used for research, technical reference, and understanding skills, technologies, and career-role requirements.

---

## Responsible Use

SkillTwin is intended to support students in understanding and developing their skills.

Skill assessments, proficiency estimates, and recommendations should be treated as **guidance rather than absolute judgments** of a person's abilities.

Evidence quality, context, individual experience, and personal learning paths should always be considered when interpreting SkillTwin results.

---

## Future Scope

Future versions of SkillTwin could include:

- More advanced automated resume and repository analysis
- Expanded industry-role and skill mapping
- Improved skill proficiency estimation
- Personalized learning-resource recommendations
- Project verification and assessment workflows
- Progress tracking over time
- Integration with additional professional and learning platforms
- More comprehensive career-readiness analytics
- Continuous SkillTwin updates based on newly generated evidence

---

## Project Status

### Hackathon Prototype

SkillTwin was developed as a **working prototype** demonstrating the concept of evidence-based skill intelligence and personalized skill development.

---

## Deployment

SkillTwin deploys as a **single service on one URL**. The FastAPI app serves the
built React bundle itself, so there is no separate frontend host and no CORS to
configure — the browser only ever talks to one origin.

### Deploy to Render

1. Push this repository to GitHub.
2. In Render: **New → Blueprint**, select the repo. Render reads
   [`render.yaml`](render.yaml) and provisions a Postgres database plus one
   Docker web service.
3. Set the two secrets Render cannot generate (**Environment** tab):

   | Variable | Required | Notes |
   |---|---|---|
   | `OPENROUTER_API_KEY` | Yes | From <https://openrouter.ai/keys>. Without it, AI quizzes, resources and gap analysis are unavailable. |
   | `GITHUB_TOKEN` | No | A fine-grained token with no scopes is enough; it only raises the GitHub API rate limit for repository verification. |

4. Deploy. First boot applies `backend/schema.sql` automatically.

`DATABASE_URL` is wired to the database automatically and `SECRET_KEY` is
generated by Render — do not copy the local development values for either.

### Pre-deploy checklist

Run this before pushing to make sure Render won't reject the build:

- [ ] `Dockerfile` and `render.yaml` are committed at the repo root
- [ ] `.dockerignore` excludes `.venv`, `node_modules`, `dist`, `.env`
- [ ] `backend/requirements.txt` is up to date (`pip freeze` if you added any)
- [ ] `frontend/package-lock.json` is committed (used by `npm ci` in the Docker build)
- [ ] `backend/schema.sql` has every table the routers read
- [ ] `OPENROUTER_API_KEY` is set in Render's **Environment** tab (not just `.env`)
- [ ] After first deploy: hit `/api/health` and confirm `"status": "ok"`
- [ ] Hit `/` and confirm the React app loads (not a 404)

### Common first-deploy issues

| Symptom | Cause | Fix |
|---|---|---|
| `/` returns the FastAPI docs page | The `frontend/dist` folder wasn't built | Verify `frontend/package-lock.json` is in the repo so the `npm ci && npm run build` step can run |
| `/api/health` shows `degraded` | The `init_db()` migration failed | Connect to the Render Postgres URL with `psql` and run `backend/schema.sql` by hand; the failure is in the server log |
| 401s on every protected route | `SECRET_KEY` rolled between deploys | Render's `generateValue: true` is set in `render.yaml`; do not paste a fixed value over it |
| AI features return empty | `OPENROUTER_API_KEY` missing or wrong model | Check Render logs for the `is_configured` line from `LLMClient`; the model in `OPENROUTER_MODEL` must be available on OpenRouter |

### How the single service works

| Piece | Where |
|---|---|
| Frontend build | [`Dockerfile`](Dockerfile) stage 1 (`node:20-alpine`, `npm ci && npm run build`) with `VITE_API_URL=""`, so the client issues relative `/api/...` requests |
| Runtime | Stage 2 (`python:3.11-slim`), runs `uvicorn backend.main:app` on Render's `$PORT` as a non-root user |
| Static + SPA routing | [`backend/main.py`](backend/main.py) mounts `/assets` and registers a catch-all that falls back to `index.html`. It is registered **last**, so every `/api` route still wins; `/api`, `/docs`, `/redoc` and `/openapi.json` return a real 404 instead of HTML |
| API info endpoint | `GET /api` (moved off `/`, which now serves the UI) |
| Health check | `GET /api/health` — returns 200 with `"status": "degraded"` if Postgres is unreachable, so a cold database does not fail the deploy |

Render hands out `postgres://` URLs, which SQLAlchemy 2 no longer accepts, and its
external endpoints require TLS. `backend/database.py` rewrites the scheme and
appends `sslmode=require` for non-local hosts, so no manual URL editing is needed.

### Run the same image locally

```bash
docker build -t skilltwin . && docker run --rm -p 8000:8000 --env-file .env skilltwin
```

Then open <http://localhost:8000>.

> **Note on the free tier:** Render's free web services sleep after inactivity, so
> the first request after an idle period takes ~30s to wake. Free Postgres
> instances also expire after 30 days. For a demo or prototype, that's fine.
> For a longer-lived deployment, upgrade to the **Starter** plan for both the
> web service (always-on) and the database (no expiration).

---

## License

This project is developed as an **open-source hackathon prototype**.

See the repository's license file for the applicable terms of usage, modification, and distribution.




---



> **Note:** All team members contributed approximately equal effort to the design, development, testing, and documentation of this project.
