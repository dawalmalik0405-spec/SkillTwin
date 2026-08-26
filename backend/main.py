import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import check_db_connection, init_db
from backend.shared.llm_client import llm_client
from backend.shared.models import HealthCheckResponse, SystemInfoResponse
from backend.routers import evidence, roadmap, skilltwin, target_role


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

# Configure CORS for Frontend integration
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Feature Routers
app.include_router(evidence.router)
app.include_router(roadmap.router)
app.include_router(skilltwin.router)
app.include_router(target_role.router)


@app.get("/", response_model=SystemInfoResponse, tags=["System"])
def root():
    """SkillTwin API root endpoint."""
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


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
