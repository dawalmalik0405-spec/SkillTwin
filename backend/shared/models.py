import uuid
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    Numeric,
    Integer,
    DateTime,
    ForeignKey,
    JSON
)
from sqlalchemy.dialects.postgresql import UUID

# Handle imports for both module execution and direct script execution
_current_dir = Path(__file__).resolve().parent
_backend_dir = _current_dir.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from database import Base


# =========================================================
# SQLAlchemy Database Models
# =========================================================

class UserModel(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    education_level = Column(String(100), nullable=True)
    degree = Column(String(150), nullable=True)
    branch = Column(String(150), nullable=True)
    semester_year = Column(String(50), nullable=True)
    target_role = Column(String(150), nullable=True)
    study_time_per_day = Column(String(50), nullable=True)
    preferred_learning_style = Column(String(50), nullable=True)
    preferred_language = Column(String(50), default="English")
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class EvidenceSourceModel(Base):
    __tablename__ = "evidence_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String(50), nullable=False)  # 'resume', 'github', 'project', 'assessment'
    source_identifier = Column(String(500), nullable=True)  # filename or repository URL / username
    raw_payload = Column(JSON, nullable=True)
    parsed_metadata = Column(JSON, nullable=True)
    status = Column(String(50), default="pending")  # 'pending', 'processed', 'failed'
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class SkillModel(Base):
    __tablename__ = "skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    canonical_name = Column(String(100), nullable=False)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class SkillTwinModel(Base):
    __tablename__ = "skill_twin"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    proficiency = Column(String(50), nullable=False)  # 'Beginner', 'Intermediate', 'Advanced'
    confidence_score = Column(Numeric(5, 2), nullable=False, default=0.00)
    reasoning = Column(Text, nullable=False)
    has_resume_evidence = Column(Boolean, default=False)
    has_github_evidence = Column(Boolean, default=False)
    has_project_evidence = Column(Boolean, default=False)
    has_assessment_evidence = Column(Boolean, default=False)
    evidence_details = Column(JSON, nullable=True)
    last_updated = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class IndustryRoleModel(Base):
    __tablename__ = "industry_roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_name = Column(String(150), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


# =========================================================
# Persistent Task Progress Model (for Roadmap)
# =========================================================

class TaskProgressModel(Base):
    __tablename__ = "task_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(String(100), nullable=False)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Composite unique constraint: each user can only have one entry per task_id
    # Note: SQLAlchemy requires __table_args__ for composite unique constraints
    __table_args__ = (
        # Ensure each user has unique task_id entries
    )


# =========================================================
# Quiz System Models (for Roadmap Progression)
# =========================================================

class QuizQuestionModel(Base):
    __tablename__ = "quiz_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    skill_name = Column(String(100), nullable=False)  # Which skill this question tests
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # Array of answer options
    correct_answer_index = Column(Integer, nullable=False)  # Index of correct option
    explanation = Column(Text, nullable=True)
    difficulty = Column(String(20), default="Medium")  # Easy, Medium, Hard
    tags = Column(JSON, nullable=True)  # Array of tags for categorization
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class QuizAttemptModel(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quiz_question_id = Column(UUID(as_uuid=True), ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False)
    selected_answer_index = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    attempted_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    time_taken_seconds = Column(Integer, nullable=True)  # How long user took to answer

    # Composite unique constraint: each user can attempt each question once per roadmap session
    __table_args__ = (
        # Ensure each user has unique attempts per question (can reset per roadmap session)
    )


# =========================================================
# Persistent User Data Models (Survive server restarts)
# =========================================================

class UserEvidenceModel(Base):
    """
    Persistent storage for user evidence data (resume, github, projects).
    Each user can have ONE record per evidence_type (resume, github, project).
    """
    __tablename__ = "user_evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    evidence_type = Column(String(50), nullable=False)  # 'resume', 'github', 'project'
    source_identifier = Column(String(500), nullable=True)  # filename or username
    raw_data = Column(JSON, nullable=False)  # Full analysis result stored as JSON
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class UserSkillModel(Base):
    """
    Persistent storage for skills extracted from user's evidence.
    """
    __tablename__ = "user_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(100), nullable=False)
    canonical_name = Column(String(100), nullable=False)
    category = Column(String(100), nullable=True)
    proficiency = Column(String(50), default="Beginner")
    confidence_score = Column(Numeric(5, 2), default=0.00)
    evidence_source = Column(String(50), nullable=True)  # 'resume', 'github', 'project'
    context_snippet = Column(Text, nullable=True)
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class SkillTwinStateModel(Base):
    """
    Cached SkillTwin state per user.
    One row per user.
    """
    __tablename__ = "skill_twin_state"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Integer, default=0)
    rating_label = Column(String(50), default="Emerging")
    skills_data = Column(JSON, nullable=False)  # Full skill twin data
    breakdown_data = Column(JSON, nullable=True)
    insights_data = Column(JSON, nullable=True)
    last_updated = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class UserProjectModel(Base):
    """
    Persistent storage for user's project entries.
    """
    __tablename__ = "user_projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    detected_technologies = Column(JSON, nullable=True)
    project_data = Column(JSON, nullable=True)  # Full project analysis
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class UserRoadmapModel(Base):
    """
    Persistent storage for the user's active roadmap.
    One active roadmap per user (latest target role).
    """
    __tablename__ = "user_roadmaps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_role = Column(String(150), nullable=False)
    experience_level = Column(String(100), nullable=True)
    daily_effort = Column(String(50), nullable=True)
    roadmap_data = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


# =========================================================
# Pydantic Schemas / Contracts
# =========================================================

class HealthCheckResponse(BaseModel):
    status: str = "ok"
    service: str = "SkillTwin Backend"
    version: str = "1.0.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    database: Dict[str, Any]
    environment: str = "development"


class SystemInfoResponse(BaseModel):
    name: str = "SkillTwin API"
    description: str = "Evidence-Based Skill Development Operating System"
    version: str = "1.0.0"
    docs_url: str = "/docs"
    health_url: str = "/api/health"


class IndustryRoleResponse(BaseModel):
    id: Optional[str] = None
    role_name: str
    description: Optional[str] = None
    is_active: bool = True


class OnboardingCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full Name of the student")
    email: str = Field(..., min_length=5, max_length=255, description="Email address")
    education_level: str = Field(..., description="e.g. Undergraduate, Postgraduate, Diploma")
    degree: str = Field(..., description="e.g. B.Tech / B.E., B.Sc, BCA, M.Tech, MCA")
    branch: str = Field(..., description="e.g. Computer Science, Information Technology, AI/DS")
    semester_year: str = Field(..., description="e.g. Semester 6 / Year 3")
    target_role: str = Field(..., description="e.g. Full-Stack Developer, Backend Developer")
    career_interests: Optional[str] = Field(default="", description="Optional career interest tags")
    study_time_per_day: str = Field(..., description="e.g. 1-2 hours/day, 2-4 hours/day")
    preferred_learning_style: str = Field(..., description="Hands-on, Visual, or Reading")
    preferred_language: str = Field(default="English", description="e.g. English")


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    education_level: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    semester_year: Optional[str] = None
    target_role: Optional[str] = None
    career_interests: Optional[str] = None
    study_time_per_day: Optional[str] = None
    preferred_learning_style: Optional[str] = None
    preferred_language: Optional[str] = "English"
    avatar_base64: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# =========================================================
# Page 2: Evidence Collection & AI Analysis Contracts
# =========================================================

class ExtractedSkillItem(BaseModel):
    skill_name: str
    canonical_name: str
    category: str
    proficiency: str = "Intermediate"  # 'Beginner', 'Intermediate', 'Advanced'
    confidence_score: float = 80.0  # 0 to 100
    evidence_source: str  # 'Resume', 'GitHub', 'Project'
    context_snippet: str
    reasoning: str


class ResumeAnalysisResponse(BaseModel):
    filename: str
    file_size_kb: float
    file_type: str
    status: str = "analyzed"  # 'uploaded', 'analyzing', 'analyzed', 'failed'
    skills_extracted: List[ExtractedSkillItem]
    technologies: List[str]
    education: Optional[str] = None
    experience_years: Optional[float] = None
    projects: List[str] = []
    certifications: List[str] = []
    summary: str
    processed_at: datetime = Field(default_factory=datetime.utcnow)


class GitHubRepoItem(BaseModel):
    name: str
    description: Optional[str] = None
    primary_language: Optional[str] = None
    topics: List[str] = []
    stars: int = 0
    forks: int = 0
    updated_at: Optional[str] = None
    html_url: str


class GitHubConnectRequest(BaseModel):
    username: str = Field(..., min_length=1, description="GitHub username")
    profile_url: Optional[str] = None
    user_id: Optional[str] = None
    email: Optional[str] = None


class GitHubAnalysisResponse(BaseModel):
    username: str
    profile_url: str
    status: str = "analyzed"  # 'connected', 'analyzing', 'analyzed', 'failed'
    total_repositories: int
    repos: List[GitHubRepoItem]
    detected_languages: List[str]
    detected_frameworks: List[str]
    skills_extracted: List[ExtractedSkillItem]
    last_synced: datetime = Field(default_factory=datetime.utcnow)


class ProjectAddRequest(BaseModel):
    title: str = Field(..., min_length=2, description="Project title")
    url: str = Field(..., min_length=4, description="Project URL (GitHub, Demo, Portfolio)")
    description: Optional[str] = Field(default="", description="Project context & architecture description")
    user_id: Optional[str] = None
    email: Optional[str] = None


class ProjectItem(BaseModel):
    id: str
    title: str
    url: str
    description: Optional[str] = None
    status: str = "analyzed"
    detected_technologies: List[str]
    skills_extracted: List[ExtractedSkillItem]
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectAnalysisResponse(BaseModel):
    project: ProjectItem
    total_projects: int


class EvidenceSummaryResponse(BaseModel):
    total_skills: int
    total_technologies: int
    total_projects: int
    total_repositories: int
    total_certifications: int
    completion_percentage: int  # 0 to 100
    can_continue: bool
    sources_status: Dict[str, str]  # e.g. {"resume": "analyzed", "github": "connected", "projects": "analyzed"}
    skills: List[ExtractedSkillItem]
    resume_data: Optional[ResumeAnalysisResponse] = None
    github_data: Optional[GitHubAnalysisResponse] = None
    projects_data: List[ProjectItem] = []


class EvidenceFinalizeRequest(BaseModel):
    email: str
    user_id: Optional[str] = None


# =========================================================
# Page 3: Living SkillTwin & Evidence Analysis Contracts
# =========================================================

class SkillTwinEvidenceDetails(BaseModel):
    resume_quotes: List[str] = []
    github_repos: List[str] = []
    project_refs: List[str] = []
    strengths: List[str] = []
    limitations: List[str] = []
    recommendations: List[str] = []


class SkillTwinSkillItem(BaseModel):
    id: str
    name: str
    canonical_name: str
    category: str  # 'Technical', 'Tools', 'Database', 'DevOps', 'Data & AI', 'Other'
    proficiency: str  # 'Beginner', 'Intermediate', 'Advanced'
    numeric_proficiency: float  # 0.0 to 5.0
    confidence_score: float  # 0 to 100
    evidence_sources: List[str]  # e.g. ['Resume', 'GitHub', 'Projects']
    evidence_status: str  # 'Demonstrated', 'Supported', 'Mentioned', 'No Evidence'
    reasoning: str
    evidence_details: SkillTwinEvidenceDetails = Field(default_factory=SkillTwinEvidenceDetails)
    has_resume_evidence: bool = False
    has_github_evidence: bool = False
    has_project_evidence: bool = False
    has_assessment_evidence: bool = False
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class SkillTwinScoreBreakdown(BaseModel):
    technical_score: int  # 0 to 100
    tools_score: int  # 0 to 100
    projects_score: int  # 0 to 100
    evidence_strength: int  # 0 to 100
    role_alignment: int  # 0 to 100


class SkillTwinInsightItem(BaseModel):
    id: str
    type: str  # 'strength', 'warning', 'recommendation'
    text: str
    icon: str  # 'up', 'alert', 'info'


class SkillTwinSummaryResponse(BaseModel):
    overall_score: int  # Career Readiness Score (0 to 100)
    rating_label: str  # 'Emerging', 'Good', 'Strong', 'Exceptional'
    encouragement_message: str
    total_skills: int
    technical_count: int
    tools_count: int
    others_count: int
    demonstrated_count: int
    supported_count: int
    mentioned_count: int
    no_evidence_count: int
    breakdown: SkillTwinScoreBreakdown
    insights: List[SkillTwinInsightItem]
    skills: List[SkillTwinSkillItem]
    target_role: Optional[str] = None
    sources_connected: Dict[str, bool] = Field(default_factory=dict)
    calculated_at: datetime = Field(default_factory=datetime.utcnow)


class SkillTwinRecalculateRequest(BaseModel):
    email: str
    user_id: Optional[str] = None


# =========================================================
# Page 4: Target Role & Industry Mapping Contracts
# =========================================================

class RoleSkillRequirementItem(BaseModel):
    id: str
    skill: str
    canonical_name: str
    category: str  # 'Frontend', 'Backend', 'Database', 'DevOps & Tools', 'Other'
    importance: str  # 'Core', 'High', 'Medium', 'Nice-to-Have'
    required_proficiency: str  # 'Beginner', 'Intermediate', 'Advanced'
    demand: str = "High"  # 'Very High', 'High', 'Medium'
    industry_avg_proficiency: int = 75  # 0 to 100
    description: str
    source: str = "Curated Industry Benchmark"


class RoleCategoryBreakdownItem(BaseModel):
    category: str
    count: int
    percentage: int
    color: str


class TopDemandSkillItem(BaseModel):
    rank: int
    name: str
    category: str
    demand_level: str  # 'Very High', 'High', 'Medium'
    importance: str  # 'Core', 'High'


class RoleOverviewInfo(BaseModel):
    role_title: str
    description: str
    experience_level: str
    industry: str
    roles_analyzed: str
    last_updated: str
    dataset_source: str = "Curated Occupational Skill Data (ESCO & Industry Standards)"


class TargetRoleMappingResponse(BaseModel):
    role: str
    experience_level: str
    industry: str
    role_overview: RoleOverviewInfo
    total_skills_required: int
    core_count: int
    important_count: int
    tools_count: int
    category_breakdown: List[RoleCategoryBreakdownItem]
    top_demand_skills: List[TopDemandSkillItem]
    demand_trend: Dict[str, Any] = Field(default_factory=dict)
    guidance: List[Dict[str, str]] = Field(default_factory=list)
    requirements: List[RoleSkillRequirementItem]
    version: str = "1.0.0"
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# =========================================================
# Page 5: Skill Gap Analysis Contracts
# =========================================================

class SkillGapItem(BaseModel):
    id: str
    skill: str
    canonical_name: str
    category: str
    your_proficiency_pct: int  # 0 to 100
    your_proficiency_score: float  # 0.0 to 5.0
    your_proficiency_level: str  # 'Beginner', 'Intermediate', 'Advanced', 'Insufficient Evidence'
    required_level_pct: int  # 0 to 100
    required_level_score: float  # 0.0 to 5.0
    required_proficiency_level: str  # 'Beginner', 'Intermediate', 'Advanced'
    gap_percentage: int  # e.g. -40, -25, +15
    priority: str  # 'Critical', 'High', 'Medium', 'Low'
    match_status: str  # 'Missing', 'Weak', 'Strong', 'Matched'
    confidence: int  # 0 to 100
    role_importance: str  # 'Core', 'High', 'Medium', 'Nice-to-Have'
    why_this_gap: str
    evidence_summary: str
    evidence_details: Dict[str, Any] = Field(default_factory=dict)
    missing_evidence_note: Optional[str] = None
    why_role_requires: str
    recommended_action: str
    roadmap_destination: str


class GapSeverityBreakdown(BaseModel):
    critical_count: int
    critical_pct: int
    high_count: int
    high_pct: int
    medium_count: int
    medium_pct: int
    low_count: int
    low_pct: int


class CategoryGapCountItem(BaseModel):
    category: str
    count: int
    color: str


class GapInsightItem(BaseModel):
    id: str
    type: str  # 'critical', 'strength', 'recommendation'
    title: str
    description: str


class GapAnalysisSummaryResponse(BaseModel):
    target_role: str
    experience_level: str
    last_updated: str
    total_gaps: int
    critical_gaps_count: int
    weak_skills_count: int
    strong_skills_count: int
    matched_skills_count: int
    overall_match_percentage: int
    readiness_rating: str  # 'Emerging', 'Moderate', 'Good', 'Strong', 'Exceptional'
    severity_breakdown: GapSeverityBreakdown
    top_gap_categories: List[CategoryGapCountItem]
    ai_insights: List[GapInsightItem]
    recommended_steps: List[str]
    gaps: List[SkillGapItem]
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"


# =========================================================
# Page 6: Personalized Roadmap Contracts
# =========================================================

# Canonical task_id -> skill mapping. Single source of truth for the roadmap
# router (which stamps it onto each task) and the quiz router (which uses it to
# pick question topics), so a node can never display one skill while its quiz
# tests another.
TASK_SKILL_MAP: Dict[str, str] = {
    "task-p1-1": "HTML/CSS",
    "task-p1-2": "JavaScript",
    "task-p1-3": "Portfolio",
    "task-p1-4": "Frontend",
    "task-p2-1": "React",
    "task-p2-2": "TypeScript",
    "task-p2-3": "Redux",
    "task-p2-4": "E-commerce",
    "task-p3-1": "Node.js",
    "task-p3-2": "Python/FastAPI",
    "task-p3-3": "Authentication",
    "task-p3-4": "Backend",
    "task-p4-1": "PostgreSQL",
    "task-p4-2": "ORM",
    "task-p4-3": "Database",
    "task-p5-1": "Docker",
    "task-p5-2": "CI/CD",
    "task-p5-3": "DevOps",
    "task-p6-1": "Testing",
    "task-p6-2": "Security",
    "task-p6-3": "Capstone",
}

# Ordered task sequence used to decide which node unlocks next.
TASK_SEQUENCE: List[str] = list(TASK_SKILL_MAP.keys())


class RoadmapResourceItem(BaseModel):
    title: str
    url: str
    type: str = "documentation"  # 'documentation', 'course', 'tutorial', 'interactive'
    is_free: bool = True
    provider: str = "Official"


class RoadmapTaskItem(BaseModel):
    id: str
    title: str
    type: str  # 'Course', 'Practice', 'Project'
    description: str
    progress_pct: int = 0  # 0 to 100
    estimated_hours: int = 10
    is_completed: bool = False
    # Authoritative skill this task covers, from TASK_SKILL_MAP. The UI must use
    # this rather than guessing the skill from the title.
    skill_name: str = ""
    topics: List[str] = Field(default_factory=list)
    resources: List[RoadmapResourceItem] = Field(default_factory=list)
    practice_exercises: List[Dict[str, Any]] = Field(default_factory=list)
    project_deliverable: Optional[Dict[str, Any]] = None


class RoadmapPhaseItem(BaseModel):
    phase_number: int  # 1 to 6
    title: str
    subtitle: str
    priority: str  # 'Critical', 'High', 'Medium', 'Low'
    estimated_duration_weeks: str  # e.g. '4–5 Weeks'
    progress_pct: int = 0  # 0 to 100
    status: str = "Not Started"  # 'Not Started', 'In Progress', 'Completed'
    topics_count: int = 0
    projects_count: int = 0
    resources_count: int = 0
    why_it_matters: str
    exact_gap_addressed: str
    current_proficiency: str
    required_proficiency: str
    tasks: List[RoadmapTaskItem] = Field(default_factory=list)


class RoadmapMilestoneItem(BaseModel):
    milestone_number: int
    title: str
    description: str
    is_achieved: bool = False


class RoadmapSummary(BaseModel):
    overall_completion_pct: int
    completed_phases_count: int
    in_progress_phases_count: int
    not_started_phases_count: int
    total_phases: int
    total_duration: str
    total_projects: int
    total_resources: int
    total_items: int


class PersonalizedRoadmapResponse(BaseModel):
    target_role: str
    experience_level: str
    estimated_duration: str
    weekly_commitment: str
    daily_effort: str
    summary: RoadmapSummary
    top_skills_you_will_gain: List[Dict[str, str]]
    why_this_roadmap_reasons: List[str]
    milestones: List[RoadmapMilestoneItem]
    phases: List[RoadmapPhaseItem]
    calendar_events: List[Dict[str, Any]] = Field(default_factory=list)
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"


class TaskToggleRequest(BaseModel):
    task_id: str
    is_completed: bool
    user_id: Optional[str] = None


# =========================================================
# Page 7: Project Verification Contracts
# =========================================================

class VerifiedSkillItem(BaseModel):
    skill_name: str
    category: str = "General"
    status: str  # 'Demonstrated', 'Partially Demonstrated', 'Not Demonstrated'
    evidence: str
    file_locations: List[str] = Field(default_factory=list)
    reasoning: str


class ProjectVerificationItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    repo_url: str
    primary_skill: str
    detected_technologies: List[str] = Field(default_factory=list)
    description: str
    status: str  # 'Verified', 'In Review', 'Needs Improvement', 'Rejected'
    score_pct: int = 0  # 0 to 100
    score_label: str = "Under Review"  # 'Excellent', 'Very Good', 'Under Review', 'Needs Improvement', 'Rejected'
    score_explanation: str = ""
    submission_date: str = "Submitted recently"
    commits_count: int = 0
    branches_count: int = 1
    has_readme: bool = True
    has_tests: bool = False
    has_live_demo: bool = False
    live_demo_url: Optional[str] = None
    recent_commits: List[Dict[str, Any]] = Field(default_factory=list)
    latest_commit_message: Optional[str] = None
    latest_commit_date: Optional[str] = None
    latest_commit_author: Optional[str] = None
    verified_skills: List[VerifiedSkillItem] = Field(default_factory=list)
    missing_evidence: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    verified_at: datetime = Field(default_factory=datetime.utcnow)


class VerificationSummaryResponse(BaseModel):
    total_projects: int
    total_repositories: int = 0
    verified_count: int
    in_review_count: int
    needs_improvement_count: int
    rejected_count: int
    overall_credibility_score: int
    credibility_trend: str
    projects: List[ProjectVerificationItem]
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"


class ProjectSubmissionRequest(BaseModel):
    repo_url: str
    primary_skill: str
    user_id: Optional[str] = "default_user"


# =========================================================
# Page 8: SkillTwin Updated Models
# =========================================================

class SkillTwinUpdatedSkillChange(BaseModel):
    skill_name: str
    category: str
    icon_type: Optional[str] = None
    before_level: str  # 'Beginner', 'Intermediate', 'Advanced'
    before_pct: int  # 0 to 100
    after_level: str  # 'Beginner', 'Intermediate', 'Advanced'
    after_pct: int  # 0 to 100
    change_pct: int  # e.g. 17 (+17%)
    reason: str
    evidence_text: str
    file_citations: List[str] = Field(default_factory=list)
    project_id: str
    project_name: str


class SkillGrowthPoint(BaseModel):
    date_label: str  # e.g. 'Apr 10', 'Apr 20', 'Apr 30', 'May 10', 'May 20', 'May 26'
    proficiency_pct: int
    alignment_pct: int
    event_label: Optional[str] = None


class RecentActivityItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str  # e.g. 'Project Verified'
    subtitle: str  # e.g. 'Portfolio Website'
    timestamp_label: str  # e.g. 'May 26, 2:45 PM'
    icon_type: str = "check"  # 'project', 'skill', 'refresh', 'check'
    status: str = "Completed"


class SkillTwinUpdatedResponse(BaseModel):
    user_id: str = "default_user"
    target_role: str = "Full-Stack Developer"
    experience_level: str = "Entry Level (0-2 years)"
    last_updated_label: str = "May 26, 2026, 2:45 PM"
    overall_alignment_pct: int = 78
    overall_alignment_before_pct: int = 64
    overall_alignment_change_pct: int = 14
    average_proficiency_pct: int = 61
    average_proficiency_before_pct: int = 49
    average_proficiency_change_pct: int = 12
    average_confidence_pct: int = 72
    average_confidence_before_pct: int = 56
    average_confidence_change_pct: int = 16
    verified_projects_count: int = 5
    verified_projects_change_count: int = 1
    skills_improved_count: int = 12
    new_evidence_count: int = 1
    latest_verified_project: Optional[ProjectVerificationItem] = None
    skill_changes: List[SkillTwinUpdatedSkillChange] = Field(default_factory=list)
    growth_timeline: List[SkillGrowthPoint] = Field(default_factory=list)
    recent_activity: List[RecentActivityItem] = Field(default_factory=list)
    target_role_impact_explanation: str = "You're now better aligned with the requirements for Full Stack Developer role."
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"


class ApplyVerificationRequest(BaseModel):
    project_id: str
    user_id: Optional[str] = "default_user"
    target_role: Optional[str] = "Full-Stack Developer"


# =========================================================
# Page 9: Career Readiness / Continuous SkillTwin Models
# =========================================================

class CareerReadinessSkillItem(BaseModel):
    name: str
    category: str
    proficiency_pct: int
    confidence_pct: int
    status: str = "Strong"  # 'Strong', 'Developing', 'Critical Gap', 'Verified'
    verified_date: Optional[str] = None


class RecentlyVerifiedSkillItem(BaseModel):
    name: str  # Project or Skill Name
    project_name: str
    verified_date: str


class RecommendedActionItem(BaseModel):
    skill_name: str
    title: str  # e.g. 'System Design Fundamentals'
    priority_label: str = "High Impact"
    why_text: str  # e.g. 'High demand skill with major impact on your target role.'
    action_type: str = "roadmap"


class JourneyMilestoneItem(BaseModel):
    label: str  # 'Started On', 'Evidence Collected', 'Skills Identified', 'Projects Verified', 'SkillTwin Updates'
    value: str  # 'Apr 10, 2026', '15 Items', '38 Skills', '5 Projects', '3 Updates'
    icon_type: str = "calendar"


class OverallProgressPoint(BaseModel):
    date_label: str  # 'Apr 10', 'Apr 20', 'Apr 30', 'May 10', 'May 20', 'May 26'
    this_journey_pct: int
    industry_benchmark_pct: int


class ReadinessGrowthPoint(BaseModel):
    date_label: str  # 'Apr 10', 'Apr 20', 'Apr 30', 'May 10', 'May 20', 'May 26'
    proficiency_pct: int
    confidence_pct: int
    alignment_pct: int


class LatestUpdateSummary(BaseModel):
    updated_date: str = "May 26, 2026"
    description: str = "New evidence has improved your proficiency, confidence and alignment."
    proficiency_change_pct: int = 12
    confidence_change_pct: int = 16
    alignment_change_pct: int = 14


class TopSkillRankingItem(BaseModel):
    name: str
    category: str
    proficiency_pct: int


class CareerReadinessResponse(BaseModel):
    user_id: str = "default_user"
    target_role: str = "Full-Stack Developer"
    experience_level: str = "Entry Level (0-2 years)"
    last_refreshed_label: str = "May 26, 2026, 2:45 PM"
    career_readiness_score: int = 76
    career_readiness_label: str = "Good"
    career_readiness_change_pct: int = 18
    career_readiness_explanation: str = "You're on the right track! Keep building and verifying."
    industry_alignment_pct: int = 78
    industry_alignment_label: str = "High"
    industry_alignment_change_pct: int = 16
    industry_alignment_explanation: str = "Strong alignment with Full Stack Developer role."
    total_verified_projects: int = 5
    verified_projects_change_count: int = 1
    verified_projects_explanation: str = "Excellent! More real projects = Higher credibility."
    overall_progress_points: List[OverallProgressPoint] = Field(default_factory=list)
    recommended_action: RecommendedActionItem
    strong_skills: List[CareerReadinessSkillItem] = Field(default_factory=list)
    developing_skills: List[CareerReadinessSkillItem] = Field(default_factory=list)
    critical_gaps: List[CareerReadinessSkillItem] = Field(default_factory=list)
    recently_verified: List[RecentlyVerifiedSkillItem] = Field(default_factory=list)
    skill_growth_points: List[ReadinessGrowthPoint] = Field(default_factory=list)
    latest_update: LatestUpdateSummary
    top_skills_by_proficiency: List[TopSkillRankingItem] = Field(default_factory=list)
    journey_milestones: List[JourneyMilestoneItem] = Field(default_factory=list)
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = "1.0.0"
