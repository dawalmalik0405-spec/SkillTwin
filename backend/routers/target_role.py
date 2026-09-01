import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.shared.models import (
    RoleSkillRequirementItem,
    RoleCategoryBreakdownItem,
    TopDemandSkillItem,
    RoleOverviewInfo,
    TargetRoleMappingResponse
)
from backend.routers.evidence import _in_memory_users

router = APIRouter(prefix="/api/target-role", tags=["Target Role / Industry Mapping"])

# Curated Industry Occupational Skill Benchmarks
CURATED_ROLE_BENCHMARKS: Dict[str, Dict[str, Any]] = {
    "Full-Stack Developer": {
        "description": "Design, build, and maintain full-stack web applications and services from frontend user interface to backend databases and deployments.",
        "experience_levels": ["Entry Level (0-2 years)", "Mid Level (2-5 years)", "Senior Level (5+ years)"],
        "industries": ["All Industries", "Tech & SaaS", "Fintech & Banking", "E-Commerce & Retail", "Healthcare"],
        "roles_analyzed": "12,543+ job postings benchmark",
        "last_updated": "May 25, 2026",
        "top_5": [
            {"name": "JavaScript", "category": "Frontend", "demand_level": "Very High", "importance": "Core"},
            {"name": "React.js", "category": "Frontend", "demand_level": "Very High", "importance": "Core"},
            {"name": "Node.js", "category": "Backend", "demand_level": "High", "importance": "Core"},
            {"name": "Python", "category": "Backend", "demand_level": "High", "importance": "Core"},
            {"name": "SQL", "category": "Database", "demand_level": "High", "importance": "Core"}
        ],
        "guidance": [
            {"title": "Focus on core skills first", "desc": "12 must-have core skills define the baseline for full-stack candidates."},
            {"title": "Stay updated with trends", "desc": "TypeScript, modern component architectures, and REST APIs are constantly evolving."},
            {"title": "Build real projects", "desc": "Hands-on full-stack experience with database persistence is highly valued by hiring teams."},
            {"title": "Get industry ready", "desc": "Align your skills with market needs before submitting technical job applications."}
        ],
        "requirements": [
            # Frontend
            {"skill": "JavaScript", "canonical": "JavaScript", "category": "Frontend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 78, "desc": "Essential for interactive web development, DOM manipulation, and asynchronous workflows."},
            {"skill": "React.js", "canonical": "React", "category": "Frontend Development", "importance": "Core", "level": "Intermediate", "demand": "Very High", "avg": 72, "desc": "Popular component-based JavaScript library for building scalable user interfaces."},
            {"skill": "TypeScript", "canonical": "TypeScript", "category": "Frontend Development", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 74, "desc": "Static type checking for JavaScript to ensure robust, enterprise-grade applications."},
            {"skill": "HTML5 & CSS3", "canonical": "HTML5 & CSS3", "category": "Frontend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 85, "desc": "Semantic markup, modern layout models (Flexbox/Grid), and responsive web styling."},
            {"skill": "Tailwind CSS", "canonical": "Tailwind CSS", "category": "Frontend Development", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 68, "desc": "Utility-first CSS framework for rapid responsive interface engineering."},
            {"skill": "Next.js", "canonical": "Next.js", "category": "Frontend Development", "importance": "Medium", "level": "Intermediate", "demand": "High", "avg": 65, "desc": "React framework for server-side rendering, static generation, and production routing."},
            {"skill": "State Management (Redux/Zustand)", "canonical": "State Management", "category": "Frontend Development", "importance": "High", "level": "Intermediate", "demand": "Medium", "avg": 62, "desc": "Predictable global application state management for complex UI flows."},
            {"skill": "Responsive Web Design", "canonical": "Responsive Design", "category": "Frontend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 82, "desc": "Mobile-first, multi-viewport styling ensuring optimal cross-device user experiences."},
            {"skill": "Frontend Testing (Jest/Vitest)", "canonical": "Testing", "category": "Frontend Development", "importance": "Medium", "level": "Beginner", "demand": "Medium", "avg": 55, "desc": "Unit and integration testing for UI components and business utilities."},
            {"skill": "Web Performance Optimization", "canonical": "Performance", "category": "Frontend Development", "importance": "Nice-to-Have", "level": "Intermediate", "demand": "Medium", "avg": 58, "desc": "Bundle size minimization, lazy loading, and asset caching strategies."},

            # Backend
            {"skill": "Node.js", "canonical": "Node.js", "category": "Backend Development", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 68, "desc": "Event-driven asynchronous JavaScript runtime for high-throughput network applications."},
            {"skill": "Python", "canonical": "Python", "category": "Backend Development", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 75, "desc": "Versatile backend programming language for services, data engineering, and automation."},
            {"skill": "FastAPI", "canonical": "FastAPI", "category": "Backend Development", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 70, "desc": "Modern, high-performance web framework for building APIs with Python 3.8+ types."},
            {"skill": "Express.js", "canonical": "Express.js", "category": "Backend Development", "importance": "High", "level": "Intermediate", "demand": "Medium", "avg": 66, "desc": "Minimalist web application framework for Node.js backends."},
            {"skill": "RESTful API Design", "canonical": "RESTful APIs", "category": "Backend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 80, "desc": "Resource-oriented API modeling, HTTP status codes, versioning, and headers."},
            {"skill": "Authentication & JWT", "canonical": "Security & Auth", "category": "Backend Development", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 72, "desc": "Secure user session handling, token hashing, OAuth2, and role-based access control."},
            {"skill": "Microservices Architecture", "canonical": "Microservices", "category": "Backend Development", "importance": "Medium", "level": "Intermediate", "demand": "Medium", "avg": 58, "desc": "Decoupled service decomposition, inter-service RPC, and message brokers."},
            {"skill": "API Security & Rate Limiting", "canonical": "Security", "category": "Backend Development", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 64, "desc": "Input sanitization, CORS configuration, rate limiting, and vulnerability patching."},
            {"skill": "GraphQL", "canonical": "GraphQL", "category": "Backend Development", "importance": "Nice-to-Have", "level": "Beginner", "demand": "Medium", "avg": 52, "desc": "Declarative query language for client-driven data fetching."},
            {"skill": "Serverless Functions", "canonical": "Serverless", "category": "Backend Development", "importance": "Nice-to-Have", "level": "Beginner", "demand": "Medium", "avg": 54, "desc": "Event-driven ephemeral cloud functions on AWS Lambda or Vercel."},

            # Database
            {"skill": "SQL", "canonical": "SQL", "category": "Databases", "importance": "Core", "level": "Advanced", "demand": "High", "avg": 75, "desc": "Structured query language for relational database design, joins, and aggregations."},
            {"skill": "PostgreSQL", "canonical": "PostgreSQL", "category": "Databases", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 70, "desc": "Powerful open-source object-relational database system with advanced JSON support."},
            {"skill": "MongoDB", "canonical": "MongoDB", "category": "Databases", "importance": "High", "level": "Intermediate", "demand": "Medium", "avg": 64, "desc": "Document-oriented NoSQL database for flexible, schema-less data storage."},
            {"skill": "Redis Caching", "canonical": "Redis", "category": "Databases", "importance": "Medium", "level": "Beginner", "demand": "High", "avg": 60, "desc": "In-memory data structure store used as a database cache and message broker."},
            {"skill": "Database Indexing & Tuning", "canonical": "Database Optimization", "category": "Databases", "importance": "Medium", "level": "Intermediate", "demand": "Medium", "avg": 58, "desc": "Query optimization, execution plan analysis, and B-tree index creation."},

            # DevOps & Tools (8 items)
            {"skill": "Git", "canonical": "Git", "category": "DevOps & Tools", "importance": "High", "level": "Advanced", "demand": "Very High", "avg": 81, "desc": "Distributed version control system for tracking source code changes and collaboration."},
            {"skill": "GitHub Workflows & PRs", "canonical": "GitHub", "category": "DevOps & Tools", "importance": "High", "level": "Advanced", "demand": "Very High", "avg": 78, "desc": "Code review etiquette, pull request hygiene, issue tracking, and branch protections."},
            {"skill": "Docker Containerization", "canonical": "Docker", "category": "DevOps & Tools", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 66, "desc": "Packaging applications into portable containers with Dockerfiles and Compose."},
            {"skill": "CI / CD Pipelines", "canonical": "CI/CD", "category": "DevOps & Tools", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 63, "desc": "Automated build, test, and deployment workflows using GitHub Actions."},
            {"skill": "Linux & Shell Scripting", "canonical": "Linux", "category": "DevOps & Tools", "importance": "Medium", "level": "Intermediate", "demand": "Medium", "avg": 62, "desc": "Command-line server administration, file permissions, and Bash automation scripts."},
            {"skill": "AWS / Cloud Basics", "canonical": "Cloud", "category": "DevOps & Tools", "importance": "Medium", "level": "Beginner", "demand": "High", "avg": 59, "desc": "Core cloud infrastructure deployment on AWS EC2, S3, and RDS."},
            {"skill": "Postman & API Testing", "canonical": "Postman", "category": "DevOps & Tools", "importance": "Medium", "level": "Intermediate", "demand": "Medium", "avg": 67, "desc": "Endpoint verification, automated test collections, and environment variables."},
            {"skill": "Vite & Modern Build Tools", "canonical": "Build Tools", "category": "DevOps & Tools", "importance": "Medium", "level": "Intermediate", "demand": "Medium", "avg": 65, "desc": "Fast ESM-based bundling, hot module replacement, and asset optimization."},

            # Other Important Skills (5 items)
            {"skill": "Data Structures & Algorithms", "canonical": "DSA", "category": "Other Important Skills", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 70, "desc": "Core algorithmic thinking, time/space complexity analysis, and problem solving."},
            {"skill": "Agile & Scrum Methodologies", "canonical": "Agile", "category": "Other Important Skills", "importance": "Medium", "level": "Intermediate", "demand": "Medium", "avg": 72, "desc": "Iterative sprint planning, standups, retro meetings, and backlog grooming."},
            {"skill": "System Architecture & Design", "canonical": "System Design", "category": "Other Important Skills", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 60, "desc": "Designing scalable, resilient multi-tier client-server application architectures."},
            {"skill": "Technical Documentation", "canonical": "Documentation", "category": "Other Important Skills", "importance": "Medium", "level": "Intermediate", "demand": "Medium", "avg": 68, "desc": "Clear README creation, OpenAPI/Swagger specifications, and architecture diagrams."},
            {"skill": "Debugging & Troubleshooting", "canonical": "Debugging", "category": "Other Important Skills", "importance": "High", "level": "Advanced", "demand": "Very High", "avg": 76, "desc": "Root-cause analysis, browser devtools inspection, server log parsing, and monitoring."}
        ]
    },
    "Frontend Developer": {
        "description": "Builds modern, responsive, high-performance user interfaces and interactive web applications.",
        "experience_levels": ["Entry Level (0-2 years)", "Mid Level (2-5 years)", "Senior Level (5+ years)"],
        "industries": ["All Industries", "Tech & SaaS", "Design Agencies", "E-Commerce"],
        "roles_analyzed": "9,820+ job postings benchmark",
        "last_updated": "May 25, 2026",
        "top_5": [
            {"name": "JavaScript", "category": "Frontend", "demand_level": "Very High", "importance": "Core"},
            {"name": "React.js", "category": "Frontend", "demand_level": "Very High", "importance": "Core"},
            {"name": "TypeScript", "category": "Frontend", "demand_level": "High", "importance": "Core"},
            {"name": "CSS3 / Tailwind", "category": "Frontend", "demand_level": "High", "importance": "Core"},
            {"name": "Next.js", "category": "Frontend", "demand_level": "High", "importance": "High"}
        ],
        "guidance": [
            {"title": "Master the DOM and modern CSS", "desc": "Strong foundational styling and responsive layout skills are essential."},
            {"title": "Deep dive into component state", "desc": "Learn hooks, memoization, and scalable state stores."},
            {"title": "Focus on web accessibility", "desc": "WCAG compliance and semantic HTML differentiate top frontend candidates."}
        ],
        "requirements": [
            {"skill": "JavaScript", "canonical": "JavaScript", "category": "Frontend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 82, "desc": "Deep understanding of ES6+, event loop, closures, and async programming."},
            {"skill": "React.js", "canonical": "React", "category": "Frontend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 78, "desc": "Custom hooks, component composition, virtual DOM reconciliation, and context."},
            {"skill": "TypeScript", "canonical": "TypeScript", "category": "Frontend Development", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 75, "desc": "Type definitions, generics, and strict TypeScript configurations."},
            {"skill": "HTML5 & Semantic Markup", "canonical": "HTML5", "category": "Frontend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 88, "desc": "Accessible, SEO-friendly HTML5 document structure."},
            {"skill": "CSS3 / Modern Layouts", "canonical": "CSS3", "category": "Frontend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 84, "desc": "Flexbox, CSS Grid, animations, and CSS variables."},
            {"skill": "Tailwind CSS", "canonical": "Tailwind CSS", "category": "Frontend Development", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 72, "desc": "Utility classes for rapid, maintainable design systems."},
            {"skill": "Next.js & SSR", "canonical": "Next.js", "category": "Frontend Development", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 68, "desc": "Server components, App Router, and static asset generation."},
            {"skill": "Git & GitHub", "canonical": "Git", "category": "DevOps & Tools", "importance": "Core", "level": "Intermediate", "demand": "Very High", "avg": 80, "desc": "Version control, branching strategies, and collaborative code reviews."},
            {"skill": "REST & GraphQL Integration", "canonical": "API Integration", "category": "Backend Development", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 74, "desc": "Async data fetching, caching with React Query/SWR, and error states."},
            {"skill": "Web Performance & Core Vitals", "canonical": "Performance", "category": "Other Important Skills", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 64, "desc": "LCP, FID, CLS optimization, code splitting, and tree shaking."}
        ]
    },
    "Backend Developer": {
        "description": "Engineers scalable server-side systems, RESTful microservice APIs, database architectures, and cloud integrations.",
        "experience_levels": ["Entry Level (0-2 years)", "Mid Level (2-5 years)", "Senior Level (5+ years)"],
        "industries": ["All Industries", "Cloud & SaaS", "Enterprise Software", "Fintech"],
        "roles_analyzed": "11,400+ job postings benchmark",
        "last_updated": "May 25, 2026",
        "top_5": [
            {"name": "Python", "category": "Backend", "demand_level": "Very High", "importance": "Core"},
            {"name": "FastAPI / Django", "category": "Backend", "demand_level": "Very High", "importance": "Core"},
            {"name": "PostgreSQL", "category": "Database", "demand_level": "High", "importance": "Core"},
            {"name": "Docker", "category": "DevOps & Tools", "demand_level": "High", "importance": "Core"},
            {"name": "Redis", "category": "Database", "demand_level": "High", "importance": "High"}
        ],
        "guidance": [
            {"title": "Master database modeling", "desc": "Schema normalization, indexing, and ORM query optimization are critical."},
            {"title": "Focus on API security", "desc": "Authentication, authorization, and rate limiting protect production systems."},
            {"title": "Learn containerization", "desc": "Docker and CI/CD pipelines ensure reproducible backend deployments."}
        ],
        "requirements": [
            {"skill": "Python", "canonical": "Python", "category": "Backend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 80, "desc": "Idiomatic Python, typing, async I/O, and OOP architecture."},
            {"skill": "FastAPI", "canonical": "FastAPI", "category": "Backend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 76, "desc": "Modern async framework with Pydantic validation and Swagger docs."},
            {"skill": "PostgreSQL", "canonical": "PostgreSQL", "category": "Databases", "importance": "Core", "level": "Advanced", "demand": "High", "avg": 78, "desc": "Relational modeling, complex queries, transactions, and indexing."},
            {"skill": "RESTful API Architecture", "canonical": "RESTful APIs", "category": "Backend Development", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 82, "desc": "Status codes, pagination, filtering, and API contracts."},
            {"skill": "Docker", "canonical": "Docker", "category": "DevOps & Tools", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 70, "desc": "Container builds, Docker Compose, and environment virtualization."},
            {"skill": "Redis & Caching", "canonical": "Redis", "category": "Databases", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 65, "desc": "In-memory caching, TTL strategies, and pub/sub messaging."},
            {"skill": "Authentication & OAuth2", "canonical": "Security", "category": "Backend Development", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 74, "desc": "JWT token verification, password hashing with bcrypt, and RBAC."},
            {"skill": "Git & Version Control", "canonical": "Git", "category": "DevOps & Tools", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 82, "desc": "Branching, rebase workflows, and CI/CD automation integration."},
            {"skill": "SQLAlchemy ORM", "canonical": "SQLAlchemy", "category": "Databases", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 72, "desc": "Object-relational mapping, relationship models, and migrations."}
        ]
    },
    "ML Engineer": {
        "description": "Designs, builds, trains, and deploys machine learning models for production environments. Combines ML expertise with software engineering skills.",
        "experience_levels": ["Entry Level (0-2 years)", "Mid Level (2-5 years)", "Senior Level (5+ years)"],
        "industries": ["All Industries", "Tech & SaaS", "Healthcare & Biotech", "Fintech", "E-Commerce & Retail"],
        "roles_analyzed": "8,750+ job postings benchmark",
        "last_updated": "May 25, 2026",
        "top_5": [
            {"name": "Python", "category": "Programming", "demand_level": "Very High", "importance": "Core"},
            {"name": "Machine Learning", "category": "AI/ML", "demand_level": "Very High", "importance": "Core"},
            {"name": "Deep Learning (PyTorch/TensorFlow)", "category": "AI/ML", "demand_level": "Very High", "importance": "Core"},
            {"name": "SQL & Data Engineering", "category": "Data", "demand_level": "High", "importance": "Core"},
            {"name": "Docker & MLOps", "category": "DevOps", "demand_level": "High", "importance": "Core"}
        ],
        "guidance": [
            {"title": "Build a strong math foundation", "desc": "Linear algebra, calculus, and statistics are essential for understanding ML algorithms."},
            {"title": "Master Python data stack", "desc": "NumPy, Pandas, and Matplotlib are used in every ML workflow."},
            {"title": "Deploy models to production", "desc": "Use Docker, FastAPI, and cloud platforms to serve models at scale."}
        ],
        "requirements": [
            {"skill": "Python", "canonical": "Python", "category": "Programming Languages", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 88, "desc": "Primary language for ML - data structures, OOP, async, and scientific libraries."},
            {"skill": "Statistics & Probability", "canonical": "Statistics", "category": "Mathematics", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 82, "desc": "Hypothesis testing, Bayesian inference, distributions, and A/B testing."},
            {"skill": "Linear Algebra", "canonical": "Linear Algebra", "category": "Mathematics", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 75, "desc": "Vectors, matrices, eigenvalues, and matrix decompositions for ML."},
            {"skill": "Pandas & NumPy", "canonical": "Pandas", "category": "Data Engineering", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 85, "desc": "Data manipulation, feature engineering, and numerical computing."},
            {"skill": "SQL & Databases", "canonical": "SQL", "category": "Data Engineering", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 75, "desc": "Data extraction, joins, aggregations, and window functions for feature pipelines."},
            {"skill": "Scikit-learn", "canonical": "Scikit-learn", "category": "AI/ML", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 80, "desc": "Classical ML algorithms, model evaluation, and pipelines."},
            {"skill": "PyTorch", "canonical": "PyTorch", "category": "AI/ML", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 82, "desc": "Deep learning, neural networks, and tensor operations for production models."},
            {"skill": "TensorFlow", "canonical": "TensorFlow", "category": "AI/ML", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 72, "desc": "Alternative deep learning framework for model serving and TFX pipelines."},
            {"skill": "Docker & Containerization", "canonical": "Docker", "category": "DevOps & MLOps", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 72, "desc": "Containerize models for reproducible deployments."},
            {"skill": "MLflow / Model Registry", "canonical": "MLflow", "category": "DevOps & MLOps", "importance": "High", "level": "Intermediate", "demand": "Medium", "avg": 65, "desc": "Experiment tracking, model versioning, and deployment workflows."},
            {"skill": "AWS/GCP/Azure", "canonical": "Cloud Platforms", "category": "DevOps & MLOps", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 70, "desc": "Sagemaker, Vertex AI, or Azure ML for managed model training and deployment."},
            {"skill": "FastAPI for Model Serving", "canonical": "FastAPI", "category": "DevOps & MLOps", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 68, "desc": "Build REST APIs to serve ML model predictions at scale."},
            {"skill": "Git & Version Control", "canonical": "Git", "category": "DevOps & MLOps", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 82, "desc": "Branching, collaboration, and CI/CD for ML projects."}
        ]
    },
    "Data Scientist": {
        "description": "Analyzes data, builds predictive models, and communicates insights to drive business decisions. Focuses on statistical analysis and modeling.",
        "experience_levels": ["Entry Level (0-2 years)", "Mid Level (2-5 years)", "Senior Level (5+ years)"],
        "industries": ["All Industries", "Tech & SaaS", "Healthcare & Biotech", "Fintech", "Research"],
        "roles_analyzed": "9,200+ job postings benchmark",
        "last_updated": "May 25, 2026",
        "top_5": [
            {"name": "Python", "category": "Programming", "demand_level": "Very High", "importance": "Core"},
            {"name": "Statistics & Probability", "category": "Mathematics", "demand_level": "Very High", "importance": "Core"},
            {"name": "Machine Learning", "category": "AI/ML", "demand_level": "Very High", "importance": "Core"},
            {"name": "SQL", "category": "Data", "demand_level": "High", "importance": "Core"},
            {"name": "Data Visualization", "category": "Analytics", "demand_level": "High", "importance": "High"}
        ],
        "guidance": [
            {"title": "Build strong statistical foundations", "desc": "Understanding distributions, hypothesis testing, and causality is critical."},
            {"title": "Master exploratory data analysis", "desc": "EDA reveals patterns that guide modeling decisions."},
            {"title": "Communicate findings clearly", "desc": "Storytelling with data is what distinguishes senior data scientists."}
        ],
        "requirements": [
            {"skill": "Python", "canonical": "Python", "category": "Programming Languages", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 88, "desc": "Primary language for data analysis and ML."},
            {"skill": "Statistics & Probability", "canonical": "Statistics", "category": "Mathematics", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 88, "desc": "Core skill for analyzing data and validating findings."},
            {"skill": "SQL", "canonical": "SQL", "category": "Data Engineering", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 85, "desc": "Extract and join data from relational databases for analysis."},
            {"skill": "Pandas & NumPy", "canonical": "Pandas", "category": "Data Engineering", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 88, "desc": "Data manipulation, cleaning, and transformation at scale."},
            {"skill": "Data Visualization (Matplotlib/Seaborn)", "canonical": "Data Visualization", "category": "Analytics", "importance": "Core", "level": "Advanced", "demand": "High", "avg": 78, "desc": "Communicate insights through clear visualizations."},
            {"skill": "Machine Learning", "canonical": "Machine Learning", "category": "AI/ML", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 82, "desc": "Build predictive models using scikit-learn and other libraries."},
            {"skill": "Deep Learning Basics", "canonical": "Deep Learning", "category": "AI/ML", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 72, "desc": "Neural networks for image, text, and time-series data."},
            {"skill": "A/B Testing & Experimentation", "canonical": "A/B Testing", "category": "Analytics", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 70, "desc": "Design and analyze controlled experiments for product decisions."},
            {"skill": "Jupyter Notebooks", "canonical": "Jupyter", "category": "Tools", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 85, "desc": "Interactive analysis and reproducible research."},
            {"skill": "Git & Version Control", "canonical": "Git", "category": "Tools", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 72, "desc": "Version control for notebooks and analysis scripts."},
            {"skill": "NLP / LLMs", "canonical": "NLP", "category": "AI/ML", "importance": "High", "level": "Intermediate", "demand": "Very High", "avg": 78, "desc": "Modern NLP using transformers and large language models."}
        ]
    },
    "DevOps Engineer": {
        "description": "Builds and maintains infrastructure, CI/CD pipelines, and deployment automation. Ensures reliable and scalable systems.",
        "experience_levels": ["Entry Level (0-2 years)", "Mid Level (2-5 years)", "Senior Level (5+ years)"],
        "industries": ["All Industries", "Tech & SaaS", "Cloud Computing", "Fintech", "Enterprise Software"],
        "roles_analyzed": "7,500+ job postings benchmark",
        "last_updated": "May 25, 2026",
        "top_5": [
            {"name": "Linux & Bash", "category": "Systems", "demand_level": "Very High", "importance": "Core"},
            {"name": "Docker", "category": "Containers", "demand_level": "Very High", "importance": "Core"},
            {"name": "Kubernetes", "category": "Containers", "demand_level": "Very High", "importance": "Core"},
            {"name": "AWS/GCP/Azure", "category": "Cloud", "demand_level": "Very High", "importance": "Core"},
            {"name": "CI/CD Pipelines", "category": "Automation", "demand_level": "High", "importance": "Core"}
        ],
        "guidance": [
            {"title": "Master Linux fundamentals", "desc": "Strong command-line skills are the foundation of DevOps work."},
            {"title": "Automate everything", "desc": "If you do it twice, write a script or pipeline for it."},
            {"title": "Learn Infrastructure as Code", "desc": "Terraform and Ansible enable reproducible infrastructure."}
        ],
        "requirements": [
            {"skill": "Linux & Bash", "canonical": "Linux", "category": "Systems & Networking", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 90, "desc": "Command-line operations, shell scripting, and system administration."},
            {"skill": "Networking Fundamentals", "canonical": "Networking", "category": "Systems & Networking", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 78, "desc": "TCP/IP, DNS, HTTP, load balancing, and firewalls."},
            {"skill": "Docker", "canonical": "Docker", "category": "Containers", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 88, "desc": "Container builds, multi-stage Dockerfiles, and Docker Compose."},
            {"skill": "Kubernetes", "canonical": "Kubernetes", "category": "Containers", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 85, "desc": "Container orchestration, deployments, services, and Helm charts."},
            {"skill": "AWS", "canonical": "AWS", "category": "Cloud Platforms", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 85, "desc": "EC2, S3, RDS, Lambda, IAM, and VPC networking."},
            {"skill": "Terraform / IaC", "canonical": "Terraform", "category": "Cloud Platforms", "importance": "Core", "level": "Intermediate", "demand": "Very High", "avg": 78, "desc": "Infrastructure as Code for reproducible cloud deployments."},
            {"skill": "CI/CD (GitHub Actions / Jenkins)", "canonical": "CI/CD", "category": "Automation", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 82, "desc": "Automated testing, building, and deployment pipelines."},
            {"skill": "Ansible / Configuration Mgmt", "canonical": "Ansible", "category": "Automation", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 68, "desc": "Configuration management and infrastructure automation."},
            {"skill": "Monitoring (Prometheus/Grafana)", "canonical": "Monitoring", "category": "Operations", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 72, "desc": "Metrics, alerting, and observability for production systems."},
            {"skill": "Python or Go Scripting", "canonical": "Python", "category": "Programming Languages", "importance": "High", "level": "Intermediate", "demand": "High", "avg": 72, "desc": "Scripting for automation and tooling."},
            {"skill": "Git & Version Control", "canonical": "Git", "category": "Tools", "importance": "Core", "level": "Advanced", "demand": "Very High", "avg": 82, "desc": "Branching, collaboration, and version control."},
            {"skill": "Security Best Practices", "canonical": "Security", "category": "Operations", "importance": "Core", "level": "Intermediate", "demand": "High", "avg": 75, "desc": "Secrets management, IAM policies, and security scanning."}
        ]
    }
}


def build_target_role_benchmark(
    role_name: str,
    experience_level: str = "Entry Level (0-2 years)",
    industry: str = "All Industries"
) -> TargetRoleMappingResponse:
    """
    Synthesizes the curated role requirement benchmark profile.
    Calculates exact counts, category breakdowns, donut chart stats, and normalized requirements.
    """
    # Lookup benchmark or fallback to Full-Stack Developer
    normalized_key = "Full-Stack Developer"
    for k in CURATED_ROLE_BENCHMARKS.keys():
        if k.lower() in role_name.lower() or role_name.lower() in k.lower():
            normalized_key = k
            break

    benchmark = CURATED_ROLE_BENCHMARKS[normalized_key]
    raw_reqs = benchmark["requirements"]

    # Transform into RoleSkillRequirementItem objects
    req_items: List[RoleSkillRequirementItem] = []
    category_counts: Dict[str, int] = {}

    for r in raw_reqs:
        cat = r["category"]
        category_counts[cat] = category_counts.get(cat, 0) + 1

        req_items.append(
            RoleSkillRequirementItem(
                id=str(uuid.uuid4()),
                skill=r["skill"],
                canonical_name=r["canonical"],
                category=cat,
                importance=r["importance"],
                required_proficiency=r["level"],
                demand=r["demand"],
                industry_avg_proficiency=r["avg"],
                description=r["desc"],
                source="Curated Industry Benchmark"
            )
        )

    total_skills = len(req_items)
    core_count = sum(1 for r in req_items if r.importance == "Core")
    tools_count = sum(1 for r in req_items if "Tools" in r.category or "DevOps" in r.category)
    important_count = sum(1 for r in req_items if r.importance in ["High", "Medium", "Nice-to-Have"] and ("Tools" not in r.category and "DevOps" not in r.category))

    # Category Colors
    CAT_COLORS = {
        "Frontend Development": "#818CF8",   # Indigo / Purple
        "Backend Development": "#38BDF8",    # Sky Blue
        "Databases": "#10B981",              # Emerald Green
        "DevOps & Tools": "#F59E0B",         # Amber / Orange
        "Other Important Skills": "#F43F5E"  # Rose / Pink
    }

    category_breakdown: List[RoleCategoryBreakdownItem] = []
    for cat, count in category_counts.items():
        pct = int(round((count / max(total_skills, 1)) * 100))
        category_breakdown.append(
            RoleCategoryBreakdownItem(
                category=cat,
                count=count,
                percentage=pct,
                color=CAT_COLORS.get(cat, "#C084FC")
            )
        )

    # Top 5 in-demand skills
    top_5_items: List[TopDemandSkillItem] = []
    for idx, item in enumerate(benchmark.get("top_5", [])):
        top_5_items.append(
            TopDemandSkillItem(
                rank=idx + 1,
                name=item["name"],
                category=item["category"],
                demand_level=item["demand_level"],
                importance=item["importance"]
            )
        )

    role_overview = RoleOverviewInfo(
        role_title=normalized_key,
        description=benchmark["description"],
        experience_level=experience_level,
        industry=industry,
        roles_analyzed=benchmark.get("roles_analyzed", "12,543+ job postings benchmark"),
        last_updated=benchmark.get("last_updated", "May 25, 2026")
    )

    demand_trend = {
        "trend_direction": "increasing",
        "percentage_change": "+24% this month",
        "monthly_data": [
            {"month": "Jan", "level": "Low", "value": 35},
            {"month": "Feb", "level": "Medium", "value": 55},
            {"month": "Mar", "level": "Medium", "value": 52},
            {"month": "Apr", "level": "High", "value": 72},
            {"month": "May", "level": "Very High", "value": 88}
        ],
        "provenance": "Curated occupational skill demand benchmark"
    }

    return TargetRoleMappingResponse(
        role=normalized_key,
        experience_level=experience_level,
        industry=industry,
        role_overview=role_overview,
        total_skills_required=total_skills,
        core_count=core_count,
        important_count=important_count,
        tools_count=tools_count,
        category_breakdown=category_breakdown,
        top_demand_skills=top_5_items,
        demand_trend=demand_trend,
        guidance=benchmark.get("guidance", []),
        requirements=req_items,
        version="1.0.0",
        updated_at=datetime.utcnow()
    )


@router.get("/mapping", response_model=TargetRoleMappingResponse)
def get_target_role_mapping(
    role: Optional[str] = Query(None),
    experience_level: str = Query("Entry Level (0-2 years)"),
    industry: str = Query("All Industries"),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Fetch structured industry requirement benchmark profile for target role.
    """
    # If no role provided, look up user profile's onboarding target role
    target_role_name = role
    if not target_role_name and email:
        user = _in_memory_users.get(email, {})
        target_role_name = user.get("target_role")

    if not target_role_name:
        target_role_name = "Full-Stack Developer"

    try:
        return build_target_role_benchmark(
            role_name=target_role_name,
            experience_level=experience_level,
            industry=industry
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load target role mapping: {str(e)}"
        )


@router.get("/roles")
def get_available_target_roles():
    """
    List all available curated industry target roles.
    """
    return [
        {
            "role_name": k,
            "description": v["description"],
            "experience_levels": v["experience_levels"],
            "industries": v["industries"],
            "total_skills": len(v["requirements"])
        }
        for k, v in CURATED_ROLE_BENCHMARKS.items()
    ]


@router.get("/export-report")
def export_target_role_report(
    role: str = Query("Full-Stack Developer"),
    experience_level: str = Query("Entry Level (0-2 years)"),
    industry: str = Query("All Industries")
):
    """
    Export structured requirement benchmark profile as downloadable JSON report.
    """
    data = build_target_role_benchmark(role, experience_level, industry)
    return JSONResponse(
        content=data.model_dump(mode="json"),
        headers={
            "Content-Disposition": f"attachment; filename=skilltwin_role_benchmark_{role.replace(' ', '_').lower()}.json"
        }
    )
