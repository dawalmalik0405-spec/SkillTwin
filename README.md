# SkillTwin

### Evidence-Based Skill Development Platform

SkillTwin is an evidence-based skill development platform designed to help students identify, measure, validate, and improve their skills using real-world evidence such as GitHub repositories, resumes, projects, certifications, and assessments.

Instead of relying only on self-declared skills, SkillTwin aims to create a dynamic skill profile that evolves as students gain experience, identify skill gaps, and work toward industry-relevant career goals.

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



 ## Technology Stack

### Frontend
- React
- JavaScript
- HTML
- CSS

### Backend
- Python
- FastAPI

### AI / ML
- Large Language Model (LLM) based analysis
- Natural Language Processing
- Skill extraction and normalization
- Evidence analysis
- Recommendation and gap analysis

### Data & Integrations
- GitHub REST API
- Structured skill and occupation references
- Resume text extraction
- Database-backed application data

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
> instances also expire after 30 days.

---

## License

This project is developed as an **open-source hackathon prototype**.

See the repository's license file for the applicable terms of usage, modification, and distribution.




---



> **Note:** All team members contributed approximately equal effort to the design, development, testing, and documentation of this project.
