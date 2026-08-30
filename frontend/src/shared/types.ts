/**
 * SkillTwin Shared TypeScript Type Definitions & API Contracts
 * Reference: SkillTwin Master Implementation Plan & Page 2 Specification
 */

export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'unexpected_result' | 'unknown';
  latency_ms?: number;
  database_url?: string;
  error?: string | null;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  database: DatabaseHealth;
  environment: string;
}

export interface SystemInfoResponse {
  name: string;
  description: string;
  version: string;
  docs_url: string;
  health_url: string;
}

export interface IndustryRole {
  id?: string;
  role_name: string;
  description?: string;
  is_active: boolean;
}

// Student Profile Contract (Phase 1)
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  avatar_base64?: string;
  education_level?: string;
  degree?: string;
  branch?: string;
  semester_year?: string;
  target_role?: string;
  career_interests?: string;
  study_time_per_day?: string;
  preferred_learning_style?: string;
  preferred_language?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferences {
  dark_mode: boolean;
  animations_enabled: boolean;
  analysis_notifications: boolean;
  roadmap_reminders: boolean;
  project_updates: boolean;
}

export interface AuthResponse {
  status: string;
  token: string;
  user: UserProfile;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
}

export interface OnboardingFormData {
  name: string;
  email: string;
  education_level: string;
  degree: string;
  branch: string;
  semester_year: string;
  target_role: string;
  career_interests?: string;
  study_time_per_day: string;
  preferred_learning_style: 'Hands-on' | 'Visual' | 'Reading' | string;
  preferred_language: string;
}

// Page 2: Evidence Collection & AI Analysis Types
export type EvidenceSourceType = 'Resume' | 'GitHub' | 'Project';
export type EvidenceCardStatus = 'not_added' | 'uploading' | 'analyzing' | 'analyzed' | 'pending' | 'failed' | 'connected';

export interface ExtractedSkillItem {
  skill_name: string;
  canonical_name: string;
  category: string;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced';
  confidence_score: number; // 0 - 100
  evidence_source: EvidenceSourceType;
  context_snippet: string;
  reasoning: string;
}

export interface ResumeAnalysisResponse {
  filename: string;
  file_size_kb: number;
  file_type: string;
  status: EvidenceCardStatus;
  skills_extracted: ExtractedSkillItem[];
  technologies: string[];
  education?: string | null;
  experience_years?: number | null;
  projects: string[];
  certifications: string[];
  summary: string;
  processed_at: string;
}

export interface GitHubRepoItem {
  name: string;
  description?: string | null;
  primary_language?: string | null;
  topics: string[];
  stars: number;
  forks: number;
  updated_at?: string | null;
  html_url: string;
}

export interface GitHubConnectPayload {
  username: string;
  profile_url?: string;
  user_id?: string;
  email?: string;
}

export interface GitHubAnalysisResponse {
  username: string;
  profile_url: string;
  status: EvidenceCardStatus;
  total_repositories: number;
  repos: GitHubRepoItem[];
  detected_languages: string[];
  detected_frameworks: string[];
  skills_extracted: ExtractedSkillItem[];
  last_synced: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  status: EvidenceCardStatus;
  detected_technologies: string[];
  skills_extracted: ExtractedSkillItem[];
  created_at: string;
}

export interface ProjectAddPayload {
  title: string;
  url: string;
  description?: string;
  user_id?: string;
  email?: string;
}

export interface ProjectAnalysisResponse {
  project: ProjectItem;
  total_projects: number;
}

export interface EvidenceSummaryResponse {
  total_skills: number;
  total_technologies: number;
  total_projects: number;
  total_repositories: number;
  total_certifications: number;
  completion_percentage: number;
  can_continue: boolean;
  sources_status: {
    resume: EvidenceCardStatus;
    github: EvidenceCardStatus;
    projects: EvidenceCardStatus;
  };
  skills: ExtractedSkillItem[];
  resume_data?: ResumeAnalysisResponse | null;
  github_data?: GitHubAnalysisResponse | null;
  projects_data: ProjectItem[];
}

export interface FinalizeEvidencePayload {
  email: string;
  user_id?: string;
}

// Router Foundation Status Contracts
export interface RouterStatusResponse {
  status: string;
  supported_sources?: string[];
  loop_stages?: string[];
  phase: string;
}

// =========================================================
// Page 3: Living SkillTwin & Evidence Analysis Contracts
// =========================================================

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type EvidenceStatus = 'Demonstrated' | 'Supported' | 'Mentioned' | 'No Evidence';

export interface SkillTwinEvidenceDetails {
  resume_quotes: string[];
  github_repos: string[];
  project_refs: string[];
  strengths: string[];
  limitations: string[];
  recommendations: string[];
}

export interface SkillTwinSkillItem {
  id: string;
  name: string;
  canonical_name: string;
  category: 'Technical' | 'Tools' | 'Database' | 'DevOps' | 'Data & AI' | 'Other' | string;
  proficiency: ProficiencyLevel;
  numeric_proficiency: number; // 0.0 to 5.0
  confidence_score: number; // 0 to 100
  evidence_sources: string[]; // e.g. ['Resume', 'GitHub', 'Projects']
  evidence_status: EvidenceStatus;
  reasoning: string;
  evidence_details: SkillTwinEvidenceDetails;
  has_resume_evidence: boolean;
  has_github_evidence: boolean;
  has_project_evidence: boolean;
  has_assessment_evidence: boolean;
  last_updated: string;
}

export interface SkillTwinScoreBreakdown {
  technical_score: number;
  tools_score: number;
  projects_score: number;
  evidence_strength: number;
  role_alignment: number;
}

export interface SkillTwinInsightItem {
  id: string;
  type: 'strength' | 'warning' | 'recommendation';
  text: string;
  icon: 'up' | 'alert' | 'info';
}

export interface SkillTwinSummaryResponse {
  overall_score: number;
  rating_label: string; // 'Emerging' | 'Good' | 'Strong' | 'Exceptional'
  encouragement_message: string;
  total_skills: number;
  technical_count: number;
  tools_count: number;
  others_count: number;
  demonstrated_count: number;
  supported_count: number;
  mentioned_count: number;
  no_evidence_count: number;
  breakdown: SkillTwinScoreBreakdown;
  insights: SkillTwinInsightItem[];
  skills: SkillTwinSkillItem[];
  target_role?: string;
  sources_connected: Record<string, boolean>;
  calculated_at: string;
}

// =========================================================
// Page 4: Target Role / Industry Mapping Contracts
// =========================================================

export type RequirementImportance = 'Core' | 'High' | 'Medium' | 'Nice-to-Have';
export type DemandLevel = 'Very High' | 'High' | 'Medium' | 'Moderate';

export interface RoleSkillRequirementItem {
  id: string;
  skill: string;
  canonical_name: string;
  category: string; // 'Frontend Development' | 'Backend Development' | 'Databases' | 'DevOps & Tools' | 'Other Important Skills'
  importance: RequirementImportance;
  required_proficiency: ProficiencyLevel;
  demand: DemandLevel;
  industry_avg_proficiency: number; // 0 to 100
  description: string;
  source: string;
}

export interface RoleCategoryBreakdownItem {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TopDemandSkillItem {
  rank: number;
  name: string;
  category: string;
  demand_level: DemandLevel;
  importance: string;
}

export interface RoleOverviewInfo {
  role_title: string;
  description: string;
  experience_level: string;
  industry: string;
  roles_analyzed: string;
  last_updated: string;
  dataset_source: string;
}

export interface RoleGuidanceItem {
  title: string;
  desc: string;
}

export interface TargetRoleMappingResponse {
  role: string;
  experience_level: string;
  industry: string;
  role_overview: RoleOverviewInfo;
  total_skills_required: number;
  core_count: number;
  important_count: number;
  tools_count: number;
  category_breakdown: RoleCategoryBreakdownItem[];
  top_demand_skills: TopDemandSkillItem[];
  demand_trend: {
    trend_direction: string;
    percentage_change: string;
    monthly_data: Array<{ month: string; level: string; value: number }>;
    provenance: string;
  };
  guidance: RoleGuidanceItem[];
  requirements: RoleSkillRequirementItem[];
  version: string;
  updated_at: string;
}

// =========================================================
// Page 5: Skill Gap Analysis Types
// =========================================================

export type GapPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type MatchStatus = 'Missing' | 'Weak' | 'Strong' | 'Matched';

export interface SkillGapItem {
  id: string;
  skill: string;
  canonical_name: string;
  category: string;
  your_proficiency_pct: number;
  your_proficiency_score: number;
  your_proficiency_level: string;
  required_level_pct: number;
  required_level_score: number;
  required_proficiency_level: string;
  gap_percentage: number;
  priority: GapPriority;
  match_status: MatchStatus;
  confidence: number;
  role_importance: string;
  why_this_gap: string;
  evidence_summary: string;
  evidence_details: {
    sources?: string[];
    repos?: string[];
    quotes?: string[];
    reasoning?: string;
  };
  missing_evidence_note?: string | null;
  why_role_requires: string;
  recommended_action: string;
  roadmap_destination: string;
}

export interface GapSeverityBreakdown {
  critical_count: number;
  critical_pct: number;
  high_count: number;
  high_pct: number;
  medium_count: number;
  medium_pct: number;
  low_count: number;
  low_pct: number;
}

export interface CategoryGapCountItem {
  category: string;
  count: number;
  color: string;
}

export interface GapInsightItem {
  id: string;
  type: 'critical' | 'strength' | 'recommendation' | string;
  title: string;
  description: string;
}

export interface GapAnalysisSummaryResponse {
  target_role: string;
  experience_level: string;
  last_updated: string;
  total_gaps: number;
  critical_gaps_count: number;
  weak_skills_count: number;
  strong_skills_count: number;
  matched_skills_count: number;
  overall_match_percentage: number;
  readiness_rating: 'Emerging' | 'Moderate' | 'Good' | 'Strong' | 'Exceptional' | string;
  severity_breakdown: GapSeverityBreakdown;
  top_gap_categories: CategoryGapCountItem[];
  ai_insights: GapInsightItem[];
  recommended_steps: string[];
  gaps: SkillGapItem[];
  calculated_at: string;
  version: string;
}

// =========================================================
// Page 6: Personalized Roadmap Types
// =========================================================

export interface RoadmapResourceItem {
  title: string;
  url: string;
  type: 'documentation' | 'course' | 'tutorial' | 'interactive' | string;
  is_free: boolean;
  provider: string;
}

export interface RoadmapTaskItem {
  id: string;
  title: string;
  type: 'Course' | 'Practice' | 'Project' | string;
  description: string;
  progress_pct: number;
  estimated_hours: number;
  is_completed: boolean;
  topics: string[];
  resources: RoadmapResourceItem[];
  practice_exercises: Array<{ id: string; title: string; is_done: boolean }>;
  project_deliverable?: {
    name: string;
    deliverable: string;
    key_technologies: string[];
  };
}

export interface RoadmapPhaseItem {
  phase_number: number;
  title: string;
  subtitle: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  estimated_duration_weeks: string;
  progress_pct: number;
  status: 'Not Started' | 'In Progress' | 'Completed' | string;
  topics_count: number;
  projects_count: number;
  resources_count: number;
  why_it_matters: string;
  exact_gap_addressed: string;
  current_proficiency: string;
  required_proficiency: string;
  tasks: RoadmapTaskItem[];
}

export interface RoadmapMilestoneItem {
  milestone_number: number;
  title: string;
  description: string;
  is_achieved: boolean;
}

export interface RoadmapSummary {
  overall_completion_pct: number;
  completed_phases_count: number;
  in_progress_phases_count: number;
  not_started_phases_count: number;
  total_phases: number;
  total_duration: string;
  total_projects: number;
  total_resources: number;
  total_items: number;
}

export interface CalendarEventItem {
  id: string;
  task_id: string;
  title: string;
  phase_number: number;
  phase_title: string;
  type: string;
  week: string;
  estimated_hours: number;
  is_completed: boolean;
  progress_pct: number;
}

export interface PersonalizedRoadmapResponse {
  target_role: string;
  experience_level: string;
  estimated_duration: string;
  weekly_commitment: string;
  daily_effort: string;
  summary: RoadmapSummary;
  top_skills_you_will_gain: Array<{ name: string; category: string }>;
  why_this_roadmap_reasons: string[];
  milestones: RoadmapMilestoneItem[];
  phases: RoadmapPhaseItem[];
  calendar_events: CalendarEventItem[];
  calculated_at: string;
  version: string;
}

// =========================================================
// Page 7: Project Verification Types
// =========================================================

export interface VerifiedSkillItem {
  skill_name: string;
  category: string;
  status: 'Demonstrated' | 'Partially Demonstrated' | 'Not Demonstrated' | string;
  evidence: string;
  file_locations: string[];
  reasoning: string;
}

export interface ProjectVerificationItem {
  id: string;
  name: string;
  repo_url: string;
  primary_skill: string;
  detected_technologies: string[];
  description: string;
  status: 'Verified' | 'In Review' | 'Needs Improvement' | 'Rejected' | string;
  score_pct: number;
  score_label: 'Excellent' | 'Very Good' | 'Under Review' | 'Needs Improvement' | 'Rejected' | string;
  score_explanation: string;
  submission_date: string;
  commits_count: number;
  branches_count: number;
  has_readme: boolean;
  has_tests: boolean;
  has_live_demo: boolean;
  live_demo_url?: string | null;
  recent_commits?: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
    url?: string;
  }>;
  latest_commit_message?: string;
  latest_commit_date?: string;
  latest_commit_author?: string;
  verified_skills: VerifiedSkillItem[];
  missing_evidence: string[];
  recommendations: string[];
  verified_at: string;
}

export interface VerificationSummaryResponse {
  total_projects: number;
  total_repositories?: number;
  verified_count: number;
  in_review_count: number;
  needs_improvement_count: number;
  rejected_count: number;
  overall_credibility_score: number;
  credibility_trend: string;
  projects: ProjectVerificationItem[];
  calculated_at: string;
  version: string;
}

export interface ProjectSubmissionRequest {
  repo_url: string;
  primary_skill: string;
  user_id?: string;
}

// =========================================================
// Page 8: SkillTwin Updated Types
// =========================================================

export interface SkillTwinUpdatedSkillChange {
  skill_name: string;
  category: string;
  icon_type?: string | null;
  before_level: string; // 'Beginner' | 'Intermediate' | 'Advanced'
  before_pct: number;
  after_level: string; // 'Beginner' | 'Intermediate' | 'Advanced'
  after_pct: number;
  change_pct: number;
  reason: string;
  evidence_text: string;
  file_citations: string[];
  project_id: string;
  project_name: string;
}

export interface SkillGrowthPoint {
  date_label: string;
  proficiency_pct: number;
  alignment_pct: number;
  event_label?: string | null;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  subtitle: string;
  timestamp_label: string;
  icon_type: string;
  status: string;
}

export interface SkillTwinUpdatedResponse {
  user_id: string;
  target_role: string;
  experience_level: string;
  last_updated_label: string;
  overall_alignment_pct: number;
  overall_alignment_before_pct: number;
  overall_alignment_change_pct: number;
  average_proficiency_pct: number;
  average_proficiency_before_pct: number;
  average_proficiency_change_pct: number;
  average_confidence_pct: number;
  average_confidence_before_pct: number;
  average_confidence_change_pct: number;
  verified_projects_count: number;
  verified_projects_change_count: number;
  skills_improved_count: number;
  new_evidence_count: number;
  latest_verified_project?: ProjectVerificationItem | null;
  skill_changes: SkillTwinUpdatedSkillChange[];
  growth_timeline: SkillGrowthPoint[];
  recent_activity: RecentActivityItem[];
  target_role_impact_explanation: string;
  calculated_at: string;
  version: string;
}

export interface ApplyVerificationRequest {
  project_id: string;
  user_id?: string;
  target_role?: string;
}

// =========================================================
// Page 9: Career Readiness / Continuous SkillTwin Types
// =========================================================

export interface CareerReadinessSkillItem {
  name: string;
  category: string;
  proficiency_pct: number;
  confidence_pct: number;
  status: 'Strong' | 'Developing' | 'Critical Gap' | 'Verified' | string;
  verified_date?: string | null;
}

export interface RecentlyVerifiedSkillItem {
  name: string;
  project_name: string;
  verified_date: string;
}

export interface RecommendedActionItem {
  skill_name: string;
  title: string;
  priority_label: string;
  why_text: string;
  action_type: string;
}

export interface JourneyMilestoneItem {
  label: string;
  value: string;
  icon_type: string;
}

export interface OverallProgressPoint {
  date_label: string;
  this_journey_pct: number;
  industry_benchmark_pct: number;
}

export interface ReadinessGrowthPoint {
  date_label: string;
  proficiency_pct: number;
  confidence_pct: number;
  alignment_pct: number;
}

export interface LatestUpdateSummary {
  updated_date: string;
  description: string;
  proficiency_change_pct: number;
  confidence_change_pct: number;
  alignment_change_pct: number;
}

export interface TopSkillRankingItem {
  name: string;
  category: string;
  proficiency_pct: number;
}

export interface CareerReadinessResponse {
  user_id: string;
  target_role: string;
  experience_level: string;
  last_refreshed_label: string;
  career_readiness_score: number;
  career_readiness_label: string;
  career_readiness_change_pct: number;
  career_readiness_explanation: string;
  industry_alignment_pct: number;
  industry_alignment_label: string;
  industry_alignment_change_pct: number;
  industry_alignment_explanation: string;
  total_verified_projects: number;
  verified_projects_change_count: number;
  verified_projects_explanation: string;
  overall_progress_points: OverallProgressPoint[];
  recommended_action: RecommendedActionItem;
  strong_skills: CareerReadinessSkillItem[];
  developing_skills: CareerReadinessSkillItem[];
  critical_gaps: CareerReadinessSkillItem[];
  recently_verified: RecentlyVerifiedSkillItem[];
  skill_growth_points: ReadinessGrowthPoint[];
  latest_update: LatestUpdateSummary;
  top_skills_by_proficiency: TopSkillRankingItem[];
  journey_milestones: JourneyMilestoneItem[];
  calculated_at: string;
  version: string;
}
