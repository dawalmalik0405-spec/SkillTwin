# =========================================================
# SkillTwin — single-service image
# =========================================================
# One container serves both the API and the UI, so the deploy has a single URL
# and no CORS configuration. Stage 1 builds the Vite bundle with Node; stage 2
# runs FastAPI on Python and mounts that bundle (see backend/main.py).

# ---------- Stage 1: build the frontend ----------
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy manifests first so `npm ci` is cached until dependencies actually change.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Empty VITE_API_URL => the client uses relative /api/... paths against whatever
# origin serves it. Do not set this to a hostname for the single-service deploy.
ENV VITE_API_URL=""
RUN npm run build


# ---------- Stage 2: runtime ----------
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# psycopg2-binary ships its own libpq, so no apt packages are needed here.
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/

# main.py looks for the bundle at <repo>/frontend/dist.
COPY --from=frontend-build /app/frontend/dist frontend/dist

# Run as a non-root user.
RUN useradd --create-home --uid 10001 skilltwin && chown -R skilltwin:skilltwin /app
USER skilltwin

EXPOSE 8000

# Render injects $PORT; the default keeps `docker run` working locally.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
