# Security Policy — SkillTwin

## Overview

SkillTwin takes data privacy, evidence integrity, and user data security seriously. As an evidence-based skill intelligence platform, SkillTwin processes user-submitted profiles, resumes, and GitHub account metadata.

This document outlines our security practices, data handling policies, and responsible vulnerability disclosure process in accordance with Omnikon Hackathon requirements.

---

## Data Handling & Protection Practices

### 1. User Evidence & Resume Processing
- **Resume Files**: Resumes uploaded for skill parsing (PDF/DOCX) are processed in-memory for entity extraction and text normalization. Uploaded files are handled strictly within authenticated user sessions.
- **GitHub Metadata**: GitHub integration uses fine-grained, read-only public repository tokens via the GitHub REST API. No private user code or write access is ever requested or stored.
- **Skill Profile Data**: Extracted skills, confidence scores, and roadmap progress are stored in a dedicated PostgreSQL database.

### 2. Authentication & Session Security
- **JWT Authentication**: User sessions are authenticated using JSON Web Tokens (JWT) signed with `HS256` encryption using a server-side `SECRET_KEY`.
- **Password Hashing**: User credentials are hashed using `passlib` with `bcrypt` / `pbkdf2_sha256` before persistence.
- **Secret Isolation**: Application secrets (`SECRET_KEY`, `OPENROUTER_API_KEY`, `DATABASE_URL`) are strictly injected via environment variables (`.env`) and are excluded from source control (`.gitignore`, `.dockerignore`).

### 3. Production Environment & Container Security
- **TLS/SSL Encryption**: In production deployments (e.g., Render single service), all API traffic is served over HTTPS/TLS. Database connections automatically rewrite and enforce `sslmode=require`.
- **Container Isolation**: The production Docker image uses multi-stage builds (`node:20-alpine` build + `python:3.11-slim` runtime) and executes processes under an unprivileged non-root user account.

---

## Reporting a Vulnerability

If you discover a security vulnerability within SkillTwin, please report it responsibly:

1. **Email**: Contact the lead developer at `layeebaharam14@gmail.com` or raise a private security issue.
2. **Details**: Provide a detailed description of the vulnerability, steps to reproduce, and potential impact.
3. **Response Time**: We aim to acknowledge receipt of security reports within 24 hours and provide a resolution timeline within 48 hours.


---

## Third-Party Security Attributions

SkillTwin relies on the following vetted external libraries and APIs:
- **FastAPI / Uvicorn**: High-performance Python web framework with built-in input validation via Pydantic.
- **SQLAlchemy 2.0**: Parameterized SQL query building to prevent SQL Injection.
- **OpenRouter API**: Encrypted HTTPS AI model endpoint communication.
