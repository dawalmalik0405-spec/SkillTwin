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
