import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from backend.database import check_db_connection, init_db
from backend.shared.llm_client import llm_client
from backend.shared.models import HealthCheckResponse, SystemInfoResponse
from backend.routers import evidence, roadmap, skilltwin, target_role, gap_analysis, verification, skilltwin_update, readiness, auth, quiz


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: attempt to initialize DB schema if reachable
    init_db()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title="SkillTwin API",
    description="Evidence-Based Skill Development Operating System API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Frontend integration.
# In production this service serves the built UI itself (see the bottom of this
# file), so every request is same-origin and needs no CORS headers at all. CORS
# is only required in dev, where Vite runs on :5173 and the API on :8000.
#
# An empty origin list therefore means "allow no cross-origin requests" -- it
# must NOT fall back to allow_origins=["*"], because Starlette pairs a wildcard
# with allow_credentials=True by echoing back whichever Origin asked, which would
# let any website make authenticated calls against a user's session.
_dev_origins = "http://localhost:5173,http://127.0.0.1:5173"
_default_origins = "" if os.getenv("ENVIRONMENT") == "production" else _dev_origins
cors_origins_str = os.getenv("CORS_ORIGINS", _default_origins)
origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register Feature Routers
app.include_router(auth.router)
app.include_router(evidence.router)
app.include_router(roadmap.router)
app.include_router(skilltwin.router)
app.include_router(target_role.router)
app.include_router(gap_analysis.router)
app.include_router(verification.router)
app.include_router(skilltwin_update.router)
app.include_router(readiness.router)
app.include_router(quiz.router)


@app.get("/api", response_model=SystemInfoResponse, tags=["System"])
def root():
    """SkillTwin API root endpoint. `/` serves the built frontend in production."""
    return {
        "name": "SkillTwin API",
        "description": "Evidence-Based Skill Development Operating System",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }


@app.get("/api/health", response_model=HealthCheckResponse, tags=["System"])
def health_check():
    """
    Comprehensive System Health Check Endpoint.
    Validates API runtime, PostgreSQL database connectivity, and LLM configuration.
    """
    db_status = check_db_connection()
    env = os.getenv("ENVIRONMENT", "development")

    overall_status = "ok" if db_status.get("status") == "connected" else "degraded"

    return {
        "status": overall_status,
        "service": "SkillTwin Backend",
        "version": "1.0.0",
        "database": db_status,
        "environment": env
    }


@app.get("/api/llm/test", tags=["LLM"])
async def test_llm():
    """
    Test OpenRouter LLM connectivity.
    Sends a simple test message to verify the API key and connection work.
    """
    if not llm_client.is_configured:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "message": "OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env"
            }
        )

    result = await llm_client.chat(
        messages=[{"role": "user", "content": "Say 'SkillTwin LLM connection successful!' if you can hear me."}],
        temperature=0.7,
        max_tokens=50
    )

    if result.get("error"):
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"OpenRouter API error: {result['error']}",
                "model": llm_client.model
            }
        )

    return {
        "status": "success",
        "message": "OpenRouter LLM connected successfully!",
        "model": llm_client.model,
        "response": result.get("content"),
        "usage": result.get("usage")
    }


# =========================================================
# Frontend (single-service deploy)
# =========================================================
# In production this one service serves both the API and the UI, so there is a
# single URL and no CORS to configure. Registered LAST on purpose: FastAPI
# matches routes in registration order, so every /api route above still wins.

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

# Paths that must 404 as API calls rather than silently returning index.html --
# otherwise a typo'd endpoint returns HTML and the client fails with a confusing
# "Unexpected token '<'" JSON parse error instead of a clean 404.
_API_PREFIXES = ("api", "docs", "redoc", "openapi.json")

if FRONTEND_DIST.is_dir():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Serve built static files, falling back to index.html for client routes."""
        if full_path.split("/")[0] in _API_PREFIXES:
            raise HTTPException(status_code=404, detail="Not Found")

        if full_path:
            candidate = (FRONTEND_DIST / full_path).resolve()
            # Reject traversal attempts before touching the filesystem.
            if candidate.is_file() and candidate.is_relative_to(FRONTEND_DIST.resolve()):
                return FileResponse(candidate)

        return FileResponse(FRONTEND_DIST / "index.html")
else:
    print(f"[Startup] No frontend build at {FRONTEND_DIST}; serving API only.")


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
