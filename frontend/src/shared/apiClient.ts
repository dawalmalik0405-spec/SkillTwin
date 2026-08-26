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
  ResumeAnalysisResponse,
  GitHubConnectPayload,
  GitHubAnalysisResponse,
  ProjectAddPayload,
  ProjectAnalysisResponse,
  EvidenceSummaryResponse,
  FinalizeEvidencePayload,
  SkillTwinSummaryResponse,
  TargetRoleMappingResponse
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {})
        }
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
}

export const apiClient = new ApiClient();
export default apiClient;
