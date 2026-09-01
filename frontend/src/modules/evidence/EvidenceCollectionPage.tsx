import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Github,
  FolderGit2,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  ArrowRight,
  Info,
  X,
  Code2,
  Cpu,
  Award,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  Briefcase
} from 'lucide-react';
import { apiClient } from '../../shared/apiClient';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';
import {
  UserProfile,
  ResumeAnalysisResponse,
  GitHubAnalysisResponse,
  ProjectItem,
  EvidenceSummaryResponse,
  ExtractedSkillItem
} from '../../shared/types';
import PersistentSidebar from '../../shared/components/PersistentSidebar';

/**
 * Repository count from a GitHub analysis payload.
 *
 * `repos` has to be tested for length rather than truthiness. A fresh connect or
 * resync returns the full repo array, but the evidence summary endpoint rehydrates
 * an already-connected profile with `repos: []` and the real figure in
 * `total_repositories`. An empty array is truthy in JS, so `data.repos ?
 * data.repos.length : data.total_repositories` reports 0 repositories for every
 * account restored from the database.
 */
const getRepoCount = (
  data?: { repos?: unknown[] | null; total_repositories?: number | null } | null
): number => {
  if (!data) return 0;
  if (Array.isArray(data.repos) && data.repos.length > 0) return data.repos.length;
  return data.total_repositories ?? 0;
};

interface EvidenceCollectionPageProps {
  userProfile?: UserProfile | null;
  onNavigateToSkillTwin?: () => void;
  onNavigateToTargetRole?: () => void;
  onNavigateToOnboarding?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: () => void;
  onEvidenceUpdated?: (completed: boolean) => void;
}

export const EvidenceCollectionPage: React.FC<EvidenceCollectionPageProps> = ({
  userProfile,
  onNavigateToSkillTwin,
  onNavigateToTargetRole,
  onNavigateToOnboarding,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToHelp,
  onEvidenceUpdated
}) => {
  // Active email / user ID
  // Use authenticated token from backend if no userProfile
  const userEmail = userProfile?.email;
  const userId = userProfile?.id;

  // Real Evidence State with localStorage cache recovery
  const [resumeData, setResumeData] = useState<ResumeAnalysisResponse | null>(() => {
    try {
      const cached = localStorage.getItem('skilltwin_resume_data');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [githubData, setGithubData] = useState<GitHubAnalysisResponse | null>(() => {
    try {
      const cached = localStorage.getItem('skilltwin_github_data');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [projectsData, setProjectsData] = useState<ProjectItem[]>(() => {
    try {
      const cached = localStorage.getItem('skilltwin_projects_data');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [summaryData, setSummaryData] = useState<EvidenceSummaryResponse | null>(null);

  // Loading States
  const [isResumeUploading, setIsResumeUploading] = useState<boolean>(false);
  const [isGithubConnecting, setIsGithubConnecting] = useState<boolean>(false);
  const [isGithubResyncing, setIsGithubResyncing] = useState<boolean>(false);
  const [isProjectSubmitting, setIsProjectSubmitting] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  // Modals
  const [isGithubModalOpen, setIsGithubModalOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [detailsTab, setDetailsTab] = useState<'all' | 'resume' | 'github' | 'projects'>('all');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);

  // Form Inputs in Modals - Neutral defaults without prefilled personal account
  const [githubUsername, setGithubUsername] = useState<string>('');
  const [githubProfileUrl, setGithubProfileUrl] = useState<string>('');
  const [githubError, setGithubError] = useState<string | null>(null);

  const [projectTitle, setProjectTitle] = useState<string>('');
  const [projectUrl, setProjectUrl] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [projectError, setProjectError] = useState<string | null>(null);

  const [resumeError, setResumeError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current aggregated evidence on mount
  const refreshSummary = async () => {
    try {
      const summary = await apiClient.getEvidenceSummary(userEmail, userId);
      setSummaryData(summary);
      if (summary.resume_data) {
        setResumeData(summary.resume_data);
        localStorage.setItem('skilltwin_resume_data', JSON.stringify(summary.resume_data));
      }
      if (summary.github_data) {
        setGithubData(summary.github_data);
        localStorage.setItem('skilltwin_github_data', JSON.stringify(summary.github_data));
      }
      if (summary.projects_data && summary.projects_data.length > 0) {
        setProjectsData(summary.projects_data);
        localStorage.setItem('skilltwin_projects_data', JSON.stringify(summary.projects_data));
      }

      const hasAnyEvidence = Boolean(
        summary.can_continue ||
        summary.total_skills > 0 ||
        summary.resume_data ||
        summary.github_data ||
        (summary.projects_data && summary.projects_data.length > 0) ||
        resumeData ||
        githubData ||
        projectsData.length > 0
      );

      if (hasAnyEvidence) {
        localStorage.setItem('skilltwin_evidence_completed', 'true');
        if (onEvidenceUpdated) onEvidenceUpdated(true);
      }
    } catch (err) {
      console.warn('Could not fetch initial evidence summary:', err);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    refreshSummary();
  }, [userEmail, userId]);

  // Resume Upload Handler
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsResumeUploading(true);
    setResumeError(null);
    setActionSuccessMessage(null);

    try {
      const result = await apiClient.uploadResume(file, userEmail, userId);
      setResumeData(result);
      localStorage.setItem('skilltwin_resume_data', JSON.stringify(result));
      localStorage.setItem('skilltwin_evidence_completed', 'true');
      if (onEvidenceUpdated) onEvidenceUpdated(true);
      setActionSuccessMessage(`Resume "${file.name}" successfully parsed. Extracted ${result.skills_extracted.length} skills.`);
      await refreshSummary();
    } catch (err: any) {
      setResumeError(err.message || 'Failed to parse resume document. Please try a valid PDF or DOCX file.');
    } finally {
      setIsResumeUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (fileInputRef.current && !isResumeUploading) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // GitHub Connect Handler
  const handleConnectGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUsername.trim()) return;

    setIsGithubConnecting(true);
    setGithubError(null);

    try {
      const result = await apiClient.connectGithub({
        username: githubUsername.trim(),
        profile_url: githubProfileUrl.trim() || undefined,
        user_id: userId,
        email: userEmail
      });
      setGithubData(result);
      localStorage.setItem('skilltwin_github_data', JSON.stringify(result));
      localStorage.setItem('skilltwin_evidence_completed', 'true');
      if (onEvidenceUpdated) onEvidenceUpdated(true);
      setIsGithubModalOpen(false);
      const count = getRepoCount(result);
      setActionSuccessMessage(`Connected to GitHub @${result.username}. Extracted ${count} public ${count === 1 ? 'repository' : 'repositories'}.`);
      await refreshSummary();
    } catch (err: any) {
      setGithubError(err.message || 'Could not connect to GitHub profile. Please check the username.');
    } finally {
      setIsGithubConnecting(false);
    }
  };

  // GitHub Resync Handler
  const handleResyncGithub = async () => {
    if (!githubData?.username || isGithubResyncing) return;
    setIsGithubResyncing(true);
    setActionSuccessMessage(null);

    try {
      const result = await apiClient.resyncGithub({
        username: githubData.username,
        profile_url: githubData.profile_url,
        user_id: userId,
        email: userEmail
      });
      setGithubData(result);
      localStorage.setItem('skilltwin_github_data', JSON.stringify(result));
      localStorage.setItem('skilltwin_evidence_completed', 'true');
      if (onEvidenceUpdated) onEvidenceUpdated(true);
      const count = getRepoCount(result);
      setActionSuccessMessage(`Resynced ${count} public ${count === 1 ? 'repository' : 'repositories'} from GitHub @${result.username}.`);
      await refreshSummary();
    } catch (err: any) {
      console.error('GitHub resync error:', err);
    } finally {
      setIsGithubResyncing(false);
    }
  };

  // Add Project Handler
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !projectUrl.trim()) return;

    setIsProjectSubmitting(true);
    setProjectError(null);

    try {
      const result = await apiClient.addProject({
        title: projectTitle.trim(),
        url: projectUrl.trim(),
        description: projectDescription.trim(),
        user_id: userId,
        email: userEmail
      });

      const updated = [...projectsData, result.project];
      setProjectsData(updated);
      localStorage.setItem('skilltwin_projects_data', JSON.stringify(updated));
      localStorage.setItem('skilltwin_evidence_completed', 'true');
      if (onEvidenceUpdated) onEvidenceUpdated(true);
      setIsProjectModalOpen(false);
      setProjectTitle('');
      setProjectUrl('');
      setProjectDescription('');
      setActionSuccessMessage(`Project "${result.project.title}" analyzed and added to evidence.`);
      await refreshSummary();
    } catch (err: any) {
      setProjectError(err.message || 'Failed to add project. Please verify the URL.');
    } finally {
      setIsProjectSubmitting(false);
    }
  };

  // Finalize & Continue Handler
  const handleContinueToSkillTwin = async () => {
    if (!canContinue || isFinalizing) return;
    setIsFinalizing(true);

    try {
      await apiClient.finalizeEvidence({
        email: userEmail || "",
        user_id: userId || ""
      });
    } catch (err: any) {
      console.warn('Finalize notice (continuing with analyzed evidence):', err);
    } finally {
      localStorage.setItem('skilltwin_evidence_completed', 'true');
      if (onEvidenceUpdated) {
        onEvidenceUpdated(true);
      }
      if (onNavigateToSkillTwin) {
        onNavigateToSkillTwin();
      }
      setIsFinalizing(false);
    }
  };

  // Calculated Real Summary Values
  const skillsCount = summaryData?.total_skills || 0;
  const techCount = summaryData?.total_technologies || 0;
  const projectsCount = summaryData?.total_projects || (resumeData?.projects.length || 0) + (projectsData.length || 0);
  const repoCount = githubData ? getRepoCount(githubData) : (summaryData?.total_repositories ?? 0);
  const certCount = summaryData?.total_certifications || resumeData?.certifications.length || 0;
  const completionPercentage = summaryData?.completion_percentage || 0;
  const canContinue = summaryData?.can_continue || Boolean(resumeData || githubData || projectsData.length > 0);

  // SVG Circular Ring Math
  const circleRadius = 42;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (completionPercentage / 100) * circleCircumference;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px 24px 32px' }}>
      {/* Top Header & 5-Step Stepper (Matching Reference Mockup) */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.45)'
          }}>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#FFFFFF' }}>S</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                SkillTwin
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Evidence-Based Skill Development
            </p>
          </div>
        </div>

        {/* 6-Step Stepper: Step 1 Completed, Step 2 Active */}
        <div className="stepper-container" style={{ maxWidth: '720px', flex: 1 }}>
          <div
            className="step-item completed"
            onClick={onNavigateToOnboarding}
            style={{ cursor: 'not-allowed', opacity: 0.9 }}
            title="Onboarding is completed and locked"
          >
            <div className="step-circle"><Check size={14} /></div>
            <span className="step-title" style={{ color: '#34D399' }}>Onboarding</span>
            <span className="step-subtitle">Locked ✓</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: '#10B981' }} />

          <div className="step-item active">
            <div className="step-circle">2</div>
            <span className="step-title" style={{ color: '#C084FC' }}>Evidence Collection</span>
            <span className="step-subtitle" style={{ color: 'var(--text-secondary)' }}>In Progress</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: 'rgba(255,255,255,0.1)' }} />

          <div
            className="step-item"
            onClick={() => {
              if (canContinue) {
                localStorage.setItem('skilltwin_evidence_completed', 'true');
                if (onEvidenceUpdated) onEvidenceUpdated(true);
                if (onNavigateToSkillTwin) onNavigateToSkillTwin();
              } else {
                alert('Evidence needed: Please add and analyze your resume, GitHub profile, or projects first before proceeding to SkillTwin.');
              }
            }}
            style={{ opacity: canContinue ? 0.9 : 0.45, cursor: canContinue ? 'pointer' : 'not-allowed' }}
            title={!canContinue ? 'Evidence needed: Add resume, GitHub, or projects first' : 'Go to SkillTwin'}
          >
            <div className="step-circle">3</div>
            <span className="step-title">SkillTwin</span>
            <span className="step-subtitle">{canContinue ? 'Ready' : 'Locked'}</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: 'rgba(255,255,255,0.1)' }} />

          <div
            className="step-item"
            onClick={() => {
              if (canContinue) {
                localStorage.setItem('skilltwin_evidence_completed', 'true');
                if (onEvidenceUpdated) onEvidenceUpdated(true);
                if (onNavigateToTargetRole) onNavigateToTargetRole();
              } else {
                alert('Evidence needed: Please add and analyze your resume, GitHub profile, or projects first before proceeding.');
              }
            }}
            style={{ opacity: canContinue ? 0.9 : 0.45, cursor: canContinue ? 'pointer' : 'not-allowed' }}
            title={!canContinue ? 'Evidence needed: Add resume, GitHub, or projects first' : 'Target Role'}
          >
            <div className="step-circle">4</div>
            <span className="step-title">Target Role</span>
            <span className="step-subtitle">{canContinue ? 'Ready' : 'Locked'}</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: 'rgba(255,255,255,0.1)' }} />

          <div className="step-item" style={{ opacity: 0.45, cursor: 'not-allowed' }} title="Complete earlier stages first">
            <div className="step-circle">5</div>
            <span className="step-title">Gap Analysis</span>
            <span className="step-subtitle">Locked</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: 'rgba(255,255,255,0.1)' }} />

          <div className="step-item" style={{ opacity: 0.45, cursor: 'not-allowed' }} title="Complete earlier stages first">
            <div className="step-circle">6</div>
            <span className="step-title">Roadmap</span>
            <span className="step-subtitle">Locked</span>
          </div>
        </div>

        {/* Top Right Header Badge */}
        <GlobalHeaderBadge />
      </header>

      {/* Main Dashboard Layout (Left Sidebar + Center/Right Work Area) */}
      <div className="dashboard-layout">
        {/* Left Persistent Dashboard Sidebar */}
        <PersistentSidebar
          userProfile={userProfile}
          activeStep={2}
          activeView="evidence"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={() => {}}
          onNavigateToSkillTwin={onNavigateToSkillTwin}
          onNavigateToTargetRole={onNavigateToTargetRole}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToSettings={onNavigateToSettings}
          onNavigateToHelp={onNavigateToHelp}
          onOpenSecurityModal={() => setIsHowItWorksOpen(true)}
        />

        {/* Center & Right Main Work Area */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Page Title & How It Works Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  Evidence Collection & AI Analysis
                </h1>
                <span style={{ fontSize: '1.25rem' }}>✨</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px', maxWidth: '720px' }}>
                Upload your evidence sources. Our AI will analyze and extract your skills, experience, and projects to build your SkillTwin.
              </p>
            </div>

            <button
              className="btn btn-outline"
              onClick={() => setIsHowItWorksOpen(true)}
              style={{ fontSize: '0.8rem', padding: '7px 14px' }}
            >
              <Info size={15} /> How it works
            </button>
          </div>

          {/* Action Success or Error Notification */}
          {actionSuccessMessage && (
            <div style={{
              padding: '10px 16px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '10px',
              color: '#34D399',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{actionSuccessMessage}</span>
              </div>
              <button
                onClick={() => setActionSuccessMessage(null)}
                style={{ background: 'none', border: 'none', color: '#34D399', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {resumeError && (
            <div style={{
              padding: '10px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              color: '#F87171',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{resumeError}</span>
              </div>
              <button
                onClick={() => setResumeError(null)}
                style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Evidence Cards + AI Summary Grid */}
          <div className="evidence-page-grid">
            {/* Left 3 Evidence Cards Column */}
            <div>
              <div className="evidence-cards-row">
                {/* =========================================================
                    CARD 1: RESUME CARD
                   ========================================================= */}
                <div className="glass-panel evidence-card">
                  <div className="evidence-card-content">
                    {/* Top Header */}
                    <div className="evidence-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(147, 51, 234, 0.2)',
                          border: '1px solid rgba(147, 51, 234, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#C084FC',
                          flexShrink: 0
                        }}>
                          <FileText size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.95rem' }}>Resume</div>
                          <div style={{ fontSize: '0.68rem', color: '#C084FC', fontWeight: 600 }}>✦ AI-Powered Analysis</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>1</span>
                    </div>

                    <p className="evidence-card-desc">
                      Upload your resume (PDF or DOCX) and our AI will extract your skills, experience, and education.
                    </p>

                    {/* Upload Dropzone */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept=".pdf,.docx,.doc,.txt"
                      onClick={(e) => {
                        (e.target as HTMLInputElement).value = '';
                      }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />

                    {/* Resume Card Body: Analyzing State, Completed State, or Empty Dropzone */}
                    {isResumeUploading ? (
                      <div className="evidence-dropzone-box" style={{ borderColor: 'rgba(192, 132, 252, 0.4)', background: 'rgba(15, 23, 42, 0.7)' }}>
                        <Loader2 size={28} color="#C084FC" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F8FAFC' }}>Analyzing document...</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>AI extracting skills & context</div>
                      </div>
                    ) : resumeData ? (
                      /* Completed Evidence Card State */
                      <div className="evidence-card-body">
                        <div className="evidence-uploaded-box">
                          <div className="evidence-file-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <FileText size={18} color="#34D399" />
                              </div>
                              <div className="evidence-file-info">
                                <div className="evidence-file-name" title={resumeData.filename}>
                                  {resumeData.filename}
                                </div>
                                <div className="evidence-file-meta">
                                  {resumeData.file_size_kb} KB • {resumeData.file_type.toUpperCase()}
                                </div>
                              </div>
                            </div>
                            <span className="badge badge-connected" style={{ padding: '2px 8px', fontSize: '0.65rem', flexShrink: 0 }}>
                              <CheckCircle2 size={11} style={{ marginRight: '3px' }} /> Uploaded
                            </span>
                          </div>

                          <div className="evidence-stats-row">
                            <span>✓ {resumeData.skills_extracted.length} skills extracted</span>
                            {resumeData.technologies && resumeData.technologies.length > 0 && (
                              <span>• {resumeData.technologies.length} technologies</span>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                          Processed: {new Date(resumeData.processed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>

                        {/* Compact Replace Resume Action */}
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ width: '100%', padding: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          onClick={triggerFileInput}
                          title="Upload a different resume to replace the current evidence"
                        >
                          <RefreshCw size={13} /> Replace Resume
                        </button>
                      </div>
                    ) : (
                      /* Empty Dropzone State (before upload) */
                      <div
                        className="upload-dropzone evidence-dropzone-box"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={triggerFileInput}
                      >
                        <div style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
                          <UploadCloud size={28} color="#818CF8" />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Drag & drop your file here
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '4px 0 8px' }}>or</div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                          onClick={triggerFileInput}
                        >
                          Upload Resume
                        </button>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                          Supported formats: PDF, DOCX (Max 10MB)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Status */}
                  <div className="evidence-card-footer">
                    {resumeData ? (
                      <>
                        <div className="badge badge-analyzed">
                          <span className="pulse-dot green" /> Analyzed
                        </div>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '0.75rem', color: '#818CF8', cursor: 'pointer', padding: '4px 6px' }}
                          onClick={() => {
                            setDetailsTab('resume');
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          View Details →
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                          Not Added
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pending upload</span>
                      </>
                    )}
                  </div>
                </div>

                {/* =========================================================
                    CARD 2: GITHUB CARD
                   ========================================================= */}
                <div className="glass-panel evidence-card">
                  <div className="evidence-card-content">
                    {/* Top Header */}
                    <div className="evidence-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          flexShrink: 0
                        }}>
                          <Github size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.95rem' }}>GitHub</div>
                          <div style={{ fontSize: '0.68rem', color: '#38BDF8', fontWeight: 600 }}>✦ Repository Analysis</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>2</span>
                    </div>

                    <p className="evidence-card-desc">
                      Connect your GitHub account to analyze your repositories, code quality, and contributions.
                    </p>

                    {/* GitHub Connected Profile Box */}
                    {githubData ? (
                      <div className="evidence-card-body">
                        <div className="evidence-uploaded-box">
                          <div className="evidence-file-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                              <Github size={20} color="#34D399" style={{ flexShrink: 0 }} />
                              <span className="evidence-file-name">
                                {githubData.username}
                              </span>
                            </div>
                            <span className="badge badge-connected" style={{ padding: '2px 8px', fontSize: '0.65rem', flexShrink: 0 }}>
                              Connected
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600 }}>
                            {repoCount} {repoCount === 1 ? 'repository' : 'repositories'} analyzed
                          </div>
                        </div>

                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                          Last synced: {new Date(githubData.last_synced).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>

                        <div className="evidence-btn-group">
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ flex: 1, minWidth: '100px', padding: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            onClick={handleResyncGithub}
                            disabled={isGithubResyncing}
                            title="Resync the currently connected GitHub profile"
                          >
                            <RefreshCw size={13} className={isGithubResyncing ? 'animated-glow' : ''} style={{ animation: isGithubResyncing ? 'spin 1s linear infinite' : 'none' }} />
                            {isGithubResyncing ? 'Resyncing...' : 'Resync'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ flex: 1, minWidth: '110px', padding: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            onClick={() => {
                              setGithubUsername('');
                              setGithubProfileUrl('');
                              setGithubError(null);
                              setIsGithubModalOpen(true);
                            }}
                            title="Connect a different GitHub account"
                          >
                            <FolderGit2 size={13} /> Switch Account
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Not Connected State */
                      <div className="evidence-dropzone-box" onClick={() => setIsGithubModalOpen(true)}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>
                          <FolderGit2 size={28} color="#94A3B8" />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                          Link your GitHub profile for live repo inspection
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '7px 16px', fontSize: '0.78rem', background: 'rgba(255,255,255,0.08)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsGithubModalOpen(true);
                          }}
                        >
                          <Github size={14} /> Connect GitHub
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Status */}
                  <div className="evidence-card-footer">
                    {githubData ? (
                      <>
                        <div className="badge badge-analyzed">
                          <span className="pulse-dot green" /> Analyzed
                        </div>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '0.75rem', color: '#818CF8', cursor: 'pointer', padding: '4px 6px' }}
                          onClick={() => {
                            setDetailsTab('github');
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          View Details →
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                          Not Connected
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pending connection</span>
                      </>
                    )}
                  </div>
                </div>

                {/* =========================================================
                    CARD 3: PROJECTS CARD
                   ========================================================= */}
                <div className="glass-panel evidence-card">
                  <div className="evidence-card-content">
                    {/* Top Header */}
                    <div className="evidence-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(56, 189, 248, 0.2)',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#38BDF8',
                          flexShrink: 0
                        }}>
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.95rem' }}>Projects</div>
                          <div style={{ fontSize: '0.68rem', color: '#38BDF8', fontWeight: 600 }}>✦ Project Analysis</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>3</span>
                    </div>

                    <p className="evidence-card-desc">
                      Add your notable projects. Our AI will analyze them to identify skills and technologies used.
                    </p>

                    {/* Projects Content Box */}
                    {projectsData.length > 0 ? (
                      <div className="evidence-card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto', marginBottom: '12px' }}>
                          {projectsData.map(p => (
                            <div
                              key={p.id}
                              style={{
                                padding: '8px 10px',
                                background: 'rgba(15, 23, 42, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#F8FAFC' }}>{p.title}</span>
                                <a
                                  href={p.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: '#38BDF8' }}
                                  title="Open Project URL"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {p.detected_technologies.slice(0, 3).map(t => (
                                  <span key={t} style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', borderRadius: '4px' }}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ width: '100%', padding: '7px', fontSize: '0.78rem' }}
                          onClick={() => setIsProjectModalOpen(true)}
                        >
                          <Plus size={14} /> Add Another Project
                        </button>
                      </div>
                    ) : (
                      /* Empty Projects Add Zone */
                      <div
                        className="evidence-dropzone-box"
                        onClick={() => setIsProjectModalOpen(true)}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(56, 189, 248, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 8px',
                          color: '#38BDF8'
                        }}>
                          <Plus size={18} />
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '4px' }}>
                          Add Projects
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                          Add links to your projects (GitHub, Live Demo, etc.)
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsProjectModalOpen(true);
                          }}
                        >
                          + Add Project Link
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Status */}
                  <div className="evidence-card-footer">
                    {projectsData.length > 0 ? (
                      <>
                        <div className="badge badge-analyzed">
                          <span className="pulse-dot green" /> Analyzed
                        </div>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '0.75rem', color: '#818CF8', cursor: 'pointer', padding: '4px 6px' }}
                          onClick={() => {
                            setDetailsTab('projects');
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          View Details →
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="badge badge-pending">
                          <span className="pulse-dot amber" /> Pending
                        </div>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px' }}
                          onClick={() => setIsProjectModalOpen(true)}
                        >
                          Add Details →
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Guidance: Why Evidence Matters */}
              <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={18} color="#C084FC" />
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
                        Why Evidence Matters?
                      </span>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Skills with evidence are 3x more likely to be accurate. Our AI analyzes real data to give you the most accurate skill assessment.
                      </p>
                    </div>
                  </div>
                  <a
                    href="#why-evidence"
                    onClick={(e) => { e.preventDefault(); setIsHowItWorksOpen(true); }}
                    style={{ fontSize: '0.75rem', color: '#C084FC', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Learn More <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Tip Callout */}
              <div style={{
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                <Info size={16} color="#818CF8" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Tip:</strong> The more evidence you provide, the more accurate your SkillTwin will be. We recommend adding at least a resume and GitHub profile.
                </span>
              </div>
            </div>

            {/* =========================================================
                RIGHT COLUMN: AI EXTRACTION SUMMARY & NEXT STEPS PANEL
               ========================================================= */}
            <div className="evidence-summary-column">
              {/* AI Extraction Summary Panel */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
                  AI Extraction Summary
                </h3>

                {/* Metrics Table */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <Code2 size={15} color="#34D399" />
                      <span>Skills Identified</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#34D399', fontSize: '0.95rem' }}>
                      {skillsCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <Cpu size={15} color="#38BDF8" />
                      <span>Technologies</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#38BDF8', fontSize: '0.95rem' }}>
                      {techCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <Briefcase size={15} color="#C084FC" />
                      <span>Projects Found</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#C084FC', fontSize: '0.95rem' }}>
                      {projectsCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <FolderGit2 size={15} color="#FBBF24" />
                      <span>Total Repositories</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#FBBF24', fontSize: '0.95rem' }}>
                      {repoCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <Award size={15} color="#2DD4BF" />
                      <span>Certifications</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#2DD4BF', fontSize: '0.95rem' }}>
                      {certCount}
                    </span>
                  </div>
                </div>

                {/* Circular Completion Ring */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0 6px' }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r={circleRadius}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="7"
                        fill="transparent"
                      />
                      <circle
                        className="progress-ring-circle"
                        cx="50"
                        cy="50"
                        r={circleRadius}
                        stroke="url(#progressGradient)"
                        strokeWidth="7"
                        strokeDasharray={circleCircumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                      <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38BDF8" />
                          <stop offset="50%" stopColor="#818CF8" />
                          <stop offset="100%" stopColor="#C084FC" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                        {completionPercentage}%
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Analysis Complete
                  </div>
                </div>
              </div>

              {/* Next Steps Pipeline Card */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px' }}>
                  Next Steps
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: canContinue ? '#34D399' : '#C084FC' }}>
                    {canContinue ? (
                      <CheckCircle2 size={15} color="#34D399" />
                    ) : (
                      <Loader2 size={15} className="animated-glow" style={{ animation: 'spin 1s linear infinite' }} />
                    )}
                    <span>{canContinue ? 'Evidence analyzed & extracted' : 'AI is analyzing your evidence'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', margin: '0 4px' }} />
                    <span>Building your SkillTwin</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', margin: '0 4px' }} />
                    <span>Generating skill gaps</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', margin: '0 4px' }} />
                    <span>Creating your roadmap</span>
                  </div>
                </div>

                {/* Continue to SkillTwin Action */}
                <button
                  id="continue-to-skilltwin-btn"
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                  disabled={!canContinue || isFinalizing}
                  onClick={handleContinueToSkillTwin}
                >
                  {isFinalizing ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Building SkillTwin...
                    </>
                  ) : (
                    <>
                      Continue to SkillTwin <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                  {canContinue
                    ? 'Evidence ready for Living SkillTwin synthesis'
                    : 'Complete all evidence collection for better analysis results'}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* =========================================================
          MODAL 1: GITHUB CONNECT MODAL
         ========================================================= */}
      {isGithubModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsGithubModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Github size={22} color="#FFFFFF" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>Connect GitHub Account</h3>
              </div>
              <button
                onClick={() => setIsGithubModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConnectGithub} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Enter your public GitHub username. Our backend will fetch your repositories, detect languages, framework signals, and extract verifiable evidence.
              </p>

              {githubError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#F87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} />
                  <span>{githubError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="github-username-input">GitHub Username *</label>
                <input
                  id="github-username-input"
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. your-username"
                  value={githubUsername}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGithubUsername(val);
                    setGithubProfileUrl(val.trim() ? `https://github.com/${val.replace('@', '').trim()}` : '');
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="github-url-input">Profile URL</label>
                <input
                  id="github-url-input"
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/your-username"
                  value={githubProfileUrl}
                  onChange={(e) => setGithubProfileUrl(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsGithubModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isGithubConnecting || !githubUsername.trim()}
                >
                  {isGithubConnecting ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Fetching Repositories...
                    </>
                  ) : (
                    'Connect & Analyze Repos'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: ADD PROJECT MODAL
         ========================================================= */}
      {isProjectModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsProjectModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Briefcase size={22} color="#38BDF8" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>Add Notable Project</h3>
              </div>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProject} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Add your project link (GitHub repository, live demo, or portfolio). Our AI will analyze the tech stack and implementation signals.
              </p>

              {projectError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#F87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} />
                  <span>{projectError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="project-title-input">Project Title *</label>
                <input
                  id="project-title-input"
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. SkillTwin AI Platform"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="project-url-input">Project URL (GitHub / Demo) *</label>
                <input
                  id="project-url-input"
                  type="url"
                  required
                  className="form-input"
                  placeholder="https://github.com/username/project or https://myproject.dev"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="project-desc-input">Architecture & Technical Context</label>
                <textarea
                  id="project-desc-input"
                  className="form-input"
                  rows={3}
                  placeholder="Briefly describe the stack (e.g. Built with React, FastAPI, PostgreSQL, and Docker containerization)"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsProjectModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isProjectSubmitting || !projectTitle.trim() || !projectUrl.trim()}
                >
                  {isProjectSubmitting ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Analyzing Project...
                    </>
                  ) : (
                    'Add & Extract Skills'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: VIEW EVIDENCE DETAILS MODAL
         ========================================================= */}
      {isDetailsModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDetailsModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Extracted Evidence & Skill Proof
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Inspect the underlying sentences, repository files, and AI reasoning behind each detected skill.
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Filter */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', background: 'rgba(10, 15, 29, 0.7)', borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                className={`btn ${detailsTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                onClick={() => setDetailsTab('all')}
              >
                All Skills ({summaryData?.skills.length || 0})
              </button>
              {resumeData && (
                <button
                  className={`btn ${detailsTab === 'resume' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                  onClick={() => setDetailsTab('resume')}
                >
                  Resume ({resumeData.skills_extracted.length})
                </button>
              )}
              {githubData && (
                <button
                  className={`btn ${detailsTab === 'github' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                  onClick={() => setDetailsTab('github')}
                >
                  GitHub ({githubData.skills_extracted.length})
                </button>
              )}
              {projectsData.length > 0 && (
                <button
                  className={`btn ${detailsTab === 'projects' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                  onClick={() => setDetailsTab('projects')}
                >
                  Projects ({projectsData.reduce((acc, p) => acc + p.skills_extracted.length, 0)})
                </button>
              )}
            </div>

            {/* Skill List Content */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '55vh', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {summaryData?.skills && summaryData.skills.length > 0 ? (
                summaryData.skills
                  .filter((s: ExtractedSkillItem) => {
                    if (detailsTab === 'resume') return s.evidence_source === 'Resume';
                    if (detailsTab === 'github') return s.evidence_source === 'GitHub';
                    if (detailsTab === 'projects') return s.evidence_source === 'Project';
                    return true;
                  })
                  .map((skill: ExtractedSkillItem, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px 16px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.9rem' }}>
                            {skill.canonical_name}
                          </span>
                          <span style={{
                            padding: '2px 8px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: '#C084FC',
                            borderRadius: '9999px',
                            fontSize: '0.68rem',
                            fontWeight: 600
                          }}>
                            {skill.category}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '2px 8px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34D399',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}>
                            {skill.proficiency}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {skill.confidence_score}% confidence
                          </span>
                        </div>
                      </div>

                      {/* Source & Quote */}
                      <div style={{
                        padding: '8px 12px',
                        background: 'rgba(10, 15, 29, 0.8)',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        color: '#94A3B8',
                        fontStyle: 'italic',
                        marginBottom: '6px'
                      }}>
                        &ldquo;{skill.context_snippet}&rdquo;
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        <strong>Reasoning:</strong> {skill.reasoning}
                      </div>
                    </div>
                  ))
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                  No extracted skills found yet. Upload your resume or connect GitHub to view evidence.
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '7px 18px', fontSize: '0.8rem' }}
                onClick={() => setIsDetailsModalOpen(false)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 4: HOW IT WORKS MODAL
         ========================================================= */}
      {isHowItWorksOpen && (
        <div className="modal-backdrop" onClick={() => setIsHowItWorksOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} color="#C084FC" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>How Evidence Analysis Works</h3>
              </div>
              <button
                onClick={() => setIsHowItWorksOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <div>
                <strong style={{ color: '#F8FAFC', display: 'block', marginBottom: '4px' }}>
                  1. Evidence Ingestion & Parsing
                </strong>
                We parse your raw documents (PDF/DOCX resumes) and fetch your real public GitHub repositories using the official GitHub API.
              </div>

              <div>
                <strong style={{ color: '#F8FAFC', display: 'block', marginBottom: '4px' }}>
                  2. Canonical Skill Mapping & Strength Assessment
                </strong>
                Our AI maps detected programming languages, libraries, and frameworks into standardized canonical skills, linking every skill directly to supporting sentences or repository files.
              </div>

              <div>
                <strong style={{ color: '#F8FAFC', display: 'block', marginBottom: '4px' }}>
                  3. Living SkillTwin Synthesis
                </strong>
                The extracted evidence feeds directly into your verified SkillTwin profile for automated Gap Analysis and personalized Roadmap generation.
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '7px 18px', fontSize: '0.8rem' }}
                onClick={() => setIsHowItWorksOpen(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceCollectionPage;
