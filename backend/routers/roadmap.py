from fastapi import APIRouter

router = APIRouter(
    prefix="/api/roadmap",
    tags=["Personalized Roadmap & Verification"]
)


@router.get("/status")
def get_roadmap_status():
    """Foundational status endpoint for Roadmap Engine."""
    return {
        "status": "ready",
        "loop_stages": ["Learn", "Practice", "Build", "Verify"],
        "phase": "Phase 0 - Foundation Ready"
    }
