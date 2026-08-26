import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    Numeric,
    DateTime,
    ForeignKey,
    JSON
)
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base


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
    study_time_per_day: Optional[str] = None
    preferred_learning_style: Optional[str] = None
    preferred_language: Optional[str] = "English"
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

