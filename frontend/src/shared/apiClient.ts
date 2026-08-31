/**
 * SkillTwin API Client
 * Facilitates typed communication between React Frontend and FastAPI Backend.
 */

import {
  HealthCheckResponse,
  SystemInfoResponse,
  RouterStatusResponse,
  IndustryRole,
  OnboardingFormData,
  UserProfile,
  AuthResponse,
  LoginRequest,
  SignUpRequest,
  ResumeAnalysisResponse,
  GitHubConnectPayload,
  GitHubAnalysisResponse,
  ProjectAddPayload,
  ProjectAnalysisResponse,
  EvidenceSummaryResponse,
  FinalizeEvidencePayload,
  SkillTwinSummaryResponse,
  TargetRoleMappingResponse,
  GapAnalysisSummaryResponse,
  PersonalizedRoadmapResponse,
  VerificationSummaryResponse,
  ProjectVerificationItem,
  SkillTwinUpdatedResponse,
  CareerReadinessResponse
} from './types';

// In production the API is served from the same origin as the UI (FastAPI mounts
// the built frontend), so an empty base URL yields relative /api/... requests and
// no CORS. In dev, Vite runs on 5173 and the API on 8000, hence the explicit
// default. VITE_API_URL overrides both when the API lives elsewhere.
// Note: `??`, not `||` -- VITE_API_URL="" is a meaningful value (same origin).
const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getToken(): string | null {
    return localStorage.getItem('skilltwin_auth_token');
  }

  public getUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem('skilltwin_auth_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public setToken(token: string | null): void {
    if (token) {
      localStorage.setItem('skilltwin_auth_token', token);
    } else {
      localStorage.removeItem('skilltwin_auth_token');
    }
  }

  private async fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options?.headers as Record<string, string>) || {})
    };
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errJson = await response.json();
          errorDetail = errJson.detail || errJson.message || errorDetail;
        } catch {
          // ignore json parse error
        }
        throw new Error(errorDetail || `HTTP Error ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`[ApiClient] Request to ${url} failed:`, error);
      throw error;
    }
  }

  /**
   * Register a new user account.
   */
  public async signup(payload: SignUpRequest): Promise<AuthResponse> {
    const res = await this.fetchJson<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res.token) {
      this.setToken(res.token);
      localStorage.setItem('skilltwin_auth_user', JSON.stringify(res.user));
    }
    return res;
  }

  /**
   * Authenticate an existing user account.
   */
  public async login(payload: LoginRequest): Promise<AuthResponse> {
    const res = await this.fetchJson<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res && res.token) {
      this.setToken(res.token);
      localStorage.setItem('skilltwin_auth_user', JSON.stringify(res.user));
    }
    return res;
  }

  /**
   * Fetch current authenticated user.
   */
  public async getMe(): Promise<UserProfile> {
    return this.fetchJson<UserProfile>('/api/auth/me');
  }

  /**
   * Log out current user and clear tokens.
   */
  public async logout(): Promise<void> {
    try {
      await this.fetchJson('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    } finally {
      this.setToken(null);
      localStorage.removeItem('skilltwin_auth_user');
    }
  }

  /**
   * Check backend system and database health.
   */
  public async getHealth(): Promise<HealthCheckResponse> {
    return this.fetchJson<HealthCheckResponse>('/api/health');
  }

  /**
   * Get basic system information.
   */
  public async getSystemInfo(): Promise<SystemInfoResponse> {
    return this.fetchJson<SystemInfoResponse>('/');
  }

  /**
   * Check Evidence Router readiness.
   */
  public async getEvidenceStatus(): Promise<RouterStatusResponse> {
    return this.fetchJson<RouterStatusResponse>('/api/evidence/status');
  }

  /**
   * Check Roadmap Router readiness.
   */
  public async getRoadmapStatus(): Promise<RouterStatusResponse> {
    return this.fetchJson<RouterStatusResponse>('/api/roadmap/status');
  }

  /**
   * Fetch target career roles from PostgreSQL industry_roles table.
   */
  public async getRoles(): Promise<IndustryRole[]> {
    return this.fetchJson<IndustryRole[]>('/api/evidence/roles');
  }

  /**
   * Submit student onboarding information and persist to PostgreSQL users table.
   */
  public async submitOnboarding(data: OnboardingFormData): Promise<UserProfile> {
    return this.fetchJson<UserProfile>('/api/evidence/onboarding', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Retrieve student profile by email.
   */
  public async getProfile(email: string): Promise<UserProfile> {
    return this.fetchJson<UserProfile>(`/api/evidence/onboarding/profile?email=${encodeURIComponent(email)}`);
  }

  /**
   * Update student profile in PostgreSQL users table and backend cache.
   */
  public async updateProfile(profile: Partial<UserProfile> & { email: string; name: string }): Promise<UserProfile> {
    return this.fetchJson<UserProfile>('/api/evidence/onboarding/profile', {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
  }

  // =========================================================
  // Page 2: Evidence Collection Endpoints
  // =========================================================

  /**
   * Upload and analyze real PDF/DOCX resume.
   */
  public async uploadResume(
    file: File,
    email?: string,
    userId?: string
  ): Promise<ResumeAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (email) formData.append('email', email);
    if (userId) formData.append('user_id', userId);

    const url = `${this.baseUrl}/api/evidence/resume/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      let errorDetail = response.statusText;
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errJson.message || errorDetail;
      } catch {
        // ignore
      }
      throw new Error(errorDetail || `Upload failed with HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Connect to real public GitHub username & analyze repositories.
   */
  public async connectGithub(data: GitHubConnectPayload): Promise<GitHubAnalysisResponse> {
    return this.fetchJson<GitHubAnalysisResponse>('/api/evidence/github/connect', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Resync connected GitHub profile repositories.
   */
  public async resyncGithub(data: GitHubConnectPayload): Promise<GitHubAnalysisResponse> {
    return this.fetchJson<GitHubAnalysisResponse>('/api/evidence/github/resync', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Add a project URL and extract architectural & demonstrated skills.
   */
  public async addProject(data: ProjectAddPayload): Promise<ProjectAnalysisResponse> {
    return this.fetchJson<ProjectAnalysisResponse>('/api/evidence/project/add', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get dynamic aggregated evidence summary.
   */
  public async getEvidenceSummary(email?: string, userId?: string): Promise<EvidenceSummaryResponse> {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (userId) params.append('user_id', userId);
    return this.fetchJson<EvidenceSummaryResponse>(`/api/evidence/summary?${params.toString()}`);
  }

  /**
   * Commit structured evidence into Living SkillTwin table.
   */
  public async finalizeEvidence(data: FinalizeEvidencePayload): Promise<{ status: string; message: string; skills_count: number }> {
    return this.fetchJson('/api/evidence/finalize', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Permanently reset user's profile and evidence state while preserving authentication account.
   */
  public async resetProfileData(email?: string, userId?: string): Promise<{ status: string; message: string }> {
    return this.fetchJson('/api/evidence/reset-profile', {
      method: 'POST',
      body: JSON.stringify({ email, user_id: userId })
    });
  }

  // =========================================================
  // Page 3: Living SkillTwin Endpoints
  // =========================================================

  /**
   * Fetch the candidate's Living SkillTwin profile synthesized from Page 2 evidence.
   */
  public async getSkillTwinProfile(
    email?: string,
    userId?: string,
    targetRole?: string
  ): Promise<SkillTwinSummaryResponse> {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (userId) params.append('user_id', userId);
    if (targetRole) params.append('target_role', targetRole);
    return this.fetchJson<SkillTwinSummaryResponse>(`/api/skilltwin/profile?${params.toString()}`);
  }

  /**
   * Trigger real-time recalculation of the Living SkillTwin.
   */
  public async recalculateSkillTwin(
    email: string,
    userId?: string
  ): Promise<SkillTwinSummaryResponse> {
    return this.fetchJson<SkillTwinSummaryResponse>('/api/skilltwin/recalculate', {
      method: 'POST',
      body: JSON.stringify({ email, user_id: userId })
    });
  }

  // =========================================================
  // Page 4: Target Role / Industry Mapping Endpoints
  // =========================================================

  /**
   * Fetch target role industry benchmark requirements, category breakdown, and top in-demand skills.
   */
  public async getTargetRoleMapping(
    role?: string,
    experienceLevel: string = "Entry Level (0-2 years)",
    industry: string = "All Industries",
    email?: string
  ): Promise<TargetRoleMappingResponse> {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (experienceLevel) params.append('experience_level', experienceLevel);
    if (industry) params.append('industry', industry);
    if (email) params.append('email', email);
    return this.fetchJson<TargetRoleMappingResponse>(`/api/target-role/mapping?${params.toString()}`);
  }

  /**
   * Fetch list of available curated target roles.
   */
  public async getTargetRolesList(): Promise<any[]> {
    return this.fetchJson<any[]>('/api/target-role/roles');
  }

  /**
   * Get direct download URL for target role requirement benchmark report.
   */
  public downloadTargetRoleReportUrl(
    role: string = "Full-Stack Developer",
    experienceLevel: string = "Entry Level (0-2 years)",
    industry: string = "All Industries"
  ): string {
    const params = new URLSearchParams({
      role,
      experience_level: experienceLevel,
      industry
    });
    return `${this.baseUrl}/api/target-role/export-report?${params.toString()}`;
  }

  /**
   * Fetch complete Skill Gap Analysis comparing Living SkillTwin with Target Role requirements.
   */
  public async getGapAnalysis(
    role: string = "Full-Stack Developer",
    experienceLevel: string = "Entry Level (0-2 years)",
    industry: string = "All Industries",
    userId?: string
  ): Promise<GapAnalysisSummaryResponse> {
    const params = new URLSearchParams({
      role,
      experience: experienceLevel,
      industry
    });
    if (userId) params.append('user_id', userId);
    return this.fetchJson<GapAnalysisSummaryResponse>(`/api/gap-analysis/analysis?${params.toString()}`);
  }

  /**
   * Trigger live recalculation of Skill Gap Analysis.
   */
  public async recalculateGapAnalysis(
    role: string = "Full-Stack Developer",
    experienceLevel: string = "Entry Level (0-2 years)",
    industry: string = "All Industries",
    userId?: string
  ): Promise<GapAnalysisSummaryResponse> {
    const params = new URLSearchParams({
      role,
      experience: experienceLevel,
      industry
    });
    if (userId) params.append('user_id', userId);
    return this.fetchJson<GapAnalysisSummaryResponse>(`/api/gap-analysis/recalculate?${params.toString()}`, {
      method: 'POST'
    });
  }

  /**
   * Get direct download URL for Gap Analysis summary report.
   */
  public downloadGapReportUrl(
    role: string = "Full-Stack Developer",
    experienceLevel: string = "Entry Level (0-2 years)",
    industry: string = "All Industries"
  ): string {
    const params = new URLSearchParams({
      role,
      experience: experienceLevel,
      industry
    });
    return `${this.baseUrl}/api/gap-analysis/export-report?${params.toString()}`;
  }

  /**
   * Fetch generated personalized roadmap.
   */
  public async getPersonalizedRoadmap(
    role: string = "Full-Stack Developer",
    experienceLevel: string = "Entry Level (0-2 years)",
    dailyEffort: string = "1-2 hours/day",
    userId?: string
  ): Promise<PersonalizedRoadmapResponse> {
    const params = new URLSearchParams({
      role,
      experience: experienceLevel,
      daily_effort: dailyEffort
    });
    if (userId) params.append('user_id', userId);
    return this.fetchJson<PersonalizedRoadmapResponse>(`/api/roadmap/plan?${params.toString()}`);
  }

  /**
   * Toggle task completion state and persist updated progress.
   */
  public async toggleRoadmapTask(
    taskId: string,
    isCompleted: boolean,
    role: string = "Full-Stack Developer",
    experienceLevel: string = "Entry Level (0-2 years)",
    dailyEffort: string = "1-2 hours/day",
    userId?: string
  ): Promise<PersonalizedRoadmapResponse> {
    const params = new URLSearchParams({
      role,
      experience: experienceLevel,
      daily_effort: dailyEffort
    });
    return this.fetchJson<PersonalizedRoadmapResponse>(`/api/roadmap/task/toggle?${params.toString()}`, {
      method: 'POST',
      body: JSON.stringify({
        task_id: taskId,
        is_completed: isCompleted,
        user_id: userId
      })
    });
  }

  /**
   * Recalculate personalized roadmap.
   */
  public async recalculateRoadmap(
    role: string = "Full-Stack Developer",
    experienceLevel: string = "Entry Level (0-2 years)",
    dailyEffort: string = "1-2 hours/day",
    userId?: string
  ): Promise<PersonalizedRoadmapResponse> {
    const params = new URLSearchParams({
      role,
      experience: experienceLevel,
      daily_effort: dailyEffort
    });
    if (userId) params.append('user_id', userId);
    return this.fetchJson<PersonalizedRoadmapResponse>(`/api/roadmap/recalculate?${params.toString()}`, {
      method: 'POST'
    });
  }

  /**
   * Get direct download URL for personalized roadmap export report.
   */
  public downloadRoadmapUrl(
    role: string = "Full-Stack Developer",
    experienceLevel: string = "Entry Level (0-2 years)",
    dailyEffort: string = "1-2 hours/day",
    userId?: string
  ): string {
    const params = new URLSearchParams({
      role,
      experience: experienceLevel,
      daily_effort: dailyEffort
    });
    if (userId) params.append('user_id', userId);
    return `${this.baseUrl}/api/roadmap/export?${params.toString()}`;
  }

  /**
   * Fetch AI-curated learning resources for a single skill.
   */
  public async getAiResources(
    skillName: string,
    userLevel: string = 'intermediate'
  ): Promise<{
    skill_name: string;
    user_level: string;
    resources: Array<{ title: string; url: string; type: string; provider?: string }>;
    generated_by: string;
  }> {
    const params = new URLSearchParams({ user_level: userLevel });
    return this.fetchJson(
      `/api/roadmap/ai-resources/${encodeURIComponent(skillName)}?${params.toString()}`
    );
  }

  /**
   * Fetch candidate's submitted projects and verification summary.
   */
  public async getProjectVerifications(userId?: string): Promise<VerificationSummaryResponse> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    return this.fetchJson<VerificationSummaryResponse>(`/api/verification/projects?${params.toString()}`);
  }

  /**
   * Submit a new GitHub project repository for implementation analysis.
   */
  public async submitProjectForVerification(
    repoUrl: string,
    primarySkill: string,
    userId?: string
  ): Promise<VerificationSummaryResponse> {
    return this.fetchJson<VerificationSummaryResponse>('/api/verification/submit', {
      method: 'POST',
      body: JSON.stringify({
        repo_url: repoUrl,
        primary_skill: primarySkill,
        user_id: userId
      })
    });
  }

  /**
   * Fetch deep-dive evidence details for a specific verified project.
   */
  public async getProjectVerificationDetails(
    projectId: string,
    userId?: string
  ): Promise<ProjectVerificationItem> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    return this.fetchJson<ProjectVerificationItem>(`/api/verification/project/${projectId}?${params.toString()}`);
  }

  /**
   * Get direct download URL for project verification summary report.
   */
  public downloadVerificationReportUrl(userId?: string): string {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    return `${this.baseUrl}/api/verification/export-report?${params.toString()}`;
  }

  /**
   * Fetch refreshed SkillTwin state after project verification.
   */
  public async getSkillTwinUpdated(userId?: string): Promise<SkillTwinUpdatedResponse> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    return this.fetchJson<SkillTwinUpdatedResponse>(`/api/skilltwin/updated?${params.toString()}`);
  }

  /**
   * Apply a verified project evidence into the living SkillTwin profile.
   */
  public async applyProjectVerificationToSkillTwin(
    projectId: string,
    targetRole: string = "Full-Stack Developer",
    userId?: string
  ): Promise<SkillTwinUpdatedResponse> {
    return this.fetchJson<SkillTwinUpdatedResponse>('/api/skilltwin/apply-verification', {
      method: 'POST',
      body: JSON.stringify({
        project_id: projectId,
        target_role: targetRole,
        user_id: userId
      })
    });
  }

  /**
   * Get direct download URL for refreshed SkillTwin update report.
   */
  public downloadSkillTwinUpdatedReportUrl(userId?: string): string {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    return `${this.baseUrl}/api/skilltwin/updated/export-report?${params.toString()}`;
  }

  /**
   * Fetch candidate's Career Readiness dashboard data.
   */
  public async getCareerReadiness(userId?: string): Promise<CareerReadinessResponse> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    return this.fetchJson<CareerReadinessResponse>(`/api/readiness/dashboard?${params.toString()}`);
  }

  /**
   * Recalculate Career Readiness metrics.
   */
  public async recalculateCareerReadiness(userId?: string): Promise<CareerReadinessResponse> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    return this.fetchJson<CareerReadinessResponse>(`/api/readiness/recalculate?${params.toString()}`, {
      method: 'POST'
    });
  }

  /**
   * Get direct download URL for Career Readiness summary report.
   */
  public downloadCareerReadinessReportUrl(userId?: string): string {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    return `${this.baseUrl}/api/readiness/export-report?${params.toString()}`;
  }

  // =========================================================
  // Quiz System API Methods
  // =========================================================

  /**
   * Quiz question response type
   */
  public async getQuizQuestions(
    taskId: string,
    questionCount: number = 5,
    userLevel: string = 'intermediate'
  ): Promise<{
    questions: Array<{
      id: string;
      question_text: string;
      options: Array<{ id: number; text: string }>;
      difficulty: string;
      skill_name: string;
    }>;
    total_questions: number;
    passing_score: number;
  }> {
    const params = new URLSearchParams({
      question_count: String(questionCount),
      user_level: userLevel
    });
    return this.fetchJson(`/api/quiz/generate/${taskId}?${params.toString()}`);
  }

  /**
   * Quiz validation request type
   */
  public async validateQuiz(
    userId: string,
    taskId: string,
    submissions: Array<{ question_id: string; selected_answer_index: number }>,
    timeTakenSeconds?: number
  ): Promise<{
    passed: boolean;
    score_percentage: number;
    correct_answers: number;
    total_questions: number;
    results: Array<{
      question_id: string;
      is_correct: boolean;
      correct_answer_index: number;
      explanation: string | null;
    }>;
    task_unlocked: boolean;
    next_task_id: string | null;
    message: string;
  }> {
    return this.fetchJson('/api/quiz/validate', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        task_id: taskId,
        submissions,
        time_taken_seconds: timeTakenSeconds
      })
    });
  }

  /**
   * Get quiz status for a specific task
   */
  public async getQuizStatus(
    taskId: string,
    userId: string
  ): Promise<{
    task_id: string;
    skill_name: string;
    is_unlocked: boolean;
    is_completed: boolean;
    best_score: number | null;
    total_quizzes_taken: number;
  }> {
    const params = new URLSearchParams({ user_id: userId });
    return this.fetchJson(`/api/quiz/status/${taskId}?${params.toString()}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
