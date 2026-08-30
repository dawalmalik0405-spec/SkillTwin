import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Github,
  Download,
  HelpCircle,
  RotateCw,
  Loader2,
  ArrowLeft,
  ArrowRight,
  X,
  Send,
  FileCode,
  Award,
  ChevronRight,
  GitCommit
} from 'lucide-react';
import {
  UserProfile,
  VerificationSummaryResponse,
  ProjectVerificationItem
} from '../../shared/types';
import { apiClient } from '../../shared/apiClient';
import PersistentSidebar from '../../shared/components/PersistentSidebar';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';

interface ProjectVerificationPageProps {
  userProfile: UserProfile | null;
  onNavigateToOnboarding?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToSkillTwin?: () => void;
  onNavigateToTargetRole?: () => void;
  onNavigateToGapAnalysis?: () => void;
  onNavigateToRoadmap?: () => void;
  onNavigateToVerification?: () => void;
  onNavigateToSkillTwinUpdated?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: () => void;
}

export const ProjectVerificationPage: React.FC<ProjectVerificationPageProps> = ({
  userProfile,
  onNavigateToOnboarding,
  onNavigateToEvidence,
  onNavigateToSkillTwin,
  onNavigateToTargetRole,
  onNavigateToGapAnalysis,
  onNavigateToRoadmap,
  onNavigateToVerification,
  onNavigateToSkillTwinUpdated,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToHelp
}) => {
  // Submission Form State
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<string>('React.js');
  const [formError, setFormError] = useState<string | null>(null);

  // Data & Loading States
  const [summaryData, setSummaryData] = useState<VerificationSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingStep, setAnalyzingStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort State
  const [activeFilter, setActiveFilter] = useState<'All' | 'Verified' | 'In Review' | 'Needs Improvement' | 'Rejected'>('All');
  const [sortBy, setSortBy] = useState<'latest' | 'score' | 'name'>('latest');

  // Modals State
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<ProjectVerificationItem | null>(null);
  const [selectedProjectForFeedback, setSelectedProjectForFeedback] = useState<ProjectVerificationItem | null>(null);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);

  // Available skills list
  const availableSkills = [
    'HTML/CSS',
    'JavaScript',
    'React.js',
    'TypeScript',
    'Node.js',
    'Express.js',
    'Python',
    'FastAPI',
    'Java',
    'REST APIs',
    'PostgreSQL',
    'MongoDB',
    'SQL',
    'Git & GitHub',
    'Docker',
    'Testing'
  ];

  // Fetch Verification Data from Backend
  const fetchVerifications = async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const userKey = userProfile?.id || userProfile?.email;
      const data = await apiClient.getProjectVerifications(userKey);
      setSummaryData(data);
    } catch (err: any) {
      console.error('[Verification] Fetch failed:', err);
      setError(err?.message || 'Failed to load project verification data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    fetchVerifications(true);

    const handleSync = () => {
      fetchVerifications(false);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [userProfile?.id, userProfile?.email]);

  // Minimum required verified projects to unlock Page 8
  const REQUIRED_VERIFIED_PROJECTS = 3;

  // Single source of truth: genuine projects from backend
  const currentProjects = summaryData?.projects || [];
  const verifiedProjectsCount = currentProjects.filter(p => p.status === 'Verified').length;
  const inReviewCount = currentProjects.filter(p => p.status === 'In Review').length;
  const needsImprovementCount = currentProjects.filter(p => p.status === 'Needs Improvement').length;
  const rejectedCount = currentProjects.filter(p => p.status === 'Rejected').length;

  // Helper to read GitHub repository data dynamically from localStorage
  const getDynamicGithubData = () => {
    try {
      const stored = localStorage.getItem('skilltwin_github_data');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  // Helper to read manual projects data dynamically from localStorage
  const getDynamicProjectsData = () => {
    try {
      const stored = localStorage.getItem('skilltwin_projects_data');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  // Dynamically compute total available projects/repositories count
  // Combines connected GitHub repository count, manual project records, and submitted project URLs without duplicates
  const computeTotalAvailableProjects = (): number => {
    const githubData = getDynamicGithubData();
    const manualProjects = getDynamicProjectsData();
    const knownUrls = new Set<string>();

    if (githubData && Array.isArray(githubData.repos)) {
      githubData.repos.forEach((r: any) => {
        const u = (r.html_url || r.url || r.name || '').trim().toLowerCase().replace(/\/$/, '');
        if (u) knownUrls.add(u);
      });
    }

    if (Array.isArray(manualProjects)) {
      manualProjects.forEach((p: any) => {
        const u = (p.url || p.title || p.name || '').trim().toLowerCase().replace(/\/$/, '');
        if (u) knownUrls.add(u);
      });
    }

    currentProjects.forEach(p => {
      const u = (p.repo_url || p.name || '').trim().toLowerCase().replace(/\/$/, '');
      if (u) knownUrls.add(u);
    });

    const cachedGithubCount = typeof githubData?.total_repositories === 'number'
      ? githubData.total_repositories
      : (Array.isArray(githubData?.repos) ? githubData.repos.length : 0);

    const manualCount = Array.isArray(manualProjects) ? manualProjects.length : 0;
    const backendTotal = summaryData?.total_repositories || 0;

    return Math.max(
      knownUrls.size,
      cachedGithubCount,
      backendTotal,
      manualCount,
      currentProjects.length
    );
  };

  const totalAvailableProjects = computeTotalAvailableProjects();

  const isVerificationCompleted = verifiedProjectsCount >= REQUIRED_VERIFIED_PROJECTS;

  // Automatically sync completion status to localStorage
  useEffect(() => {
    if (isVerificationCompleted) {
      localStorage.setItem('skilltwin_verification_completed', 'true');
    } else {
      localStorage.removeItem('skilltwin_verification_completed');
    }
  }, [isVerificationCompleted]);

  // Handle Form Submission
  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUrl = repoUrl.trim();
    if (!trimmedUrl) {
      setFormError('Please enter a GitHub repository URL.');
      return;
    }

    // GitHub URL regex validation
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/)?$/;
    if (!githubRegex.test(trimmedUrl)) {
      setFormError('Invalid URL format. Please enter a valid GitHub repository (e.g. https://github.com/username/repository).');
      return;
    }

    // Start multi-step analyzing simulation & backend submission
    setIsAnalyzing(true);
    setAnalyzingStep(1);

    try {
      setTimeout(() => setAnalyzingStep(2), 700);
      setTimeout(() => setAnalyzingStep(3), 1400);
      setTimeout(() => setAnalyzingStep(4), 2100);

      const userKey = userProfile?.id || userProfile?.email;
      const updated = await apiClient.submitProjectForVerification(
        trimmedUrl,
        selectedSkill,
        userKey
      );

      setTimeout(() => {
        setSummaryData(updated);
        setIsAnalyzing(false);
        setRepoUrl('');
        const newVerifiedCount = (updated.projects || []).filter(p => p.status === 'Verified').length;
        if (newVerifiedCount >= REQUIRED_VERIFIED_PROJECTS) {
          localStorage.setItem('skilltwin_verification_completed', 'true');
        } else {
          localStorage.removeItem('skilltwin_verification_completed');
        }
        // Open details modal for the freshly verified project
        if (updated.projects.length > 0) {
          setSelectedProjectForDetail(updated.projects[0]);
        }
      }, 2600);
    } catch (err: any) {
      console.error('[Verification] Submit failed:', err);
      setIsAnalyzing(false);
      setFormError(err?.message || 'Failed to analyze repository. Please check URL accessibility.');
    }
  };

  // Download Verification Report
  const handleDownloadReport = () => {
    const userKey = userProfile?.id || userProfile?.email;
    const url = apiClient.downloadVerificationReportUrl(userKey);
    window.open(url, '_blank');
  };

  // Filter & Sort Projects
  const filteredProjects = (summaryData?.projects || []).filter(p => {
    if (activeFilter === 'All') return true;
    return p.status.toLowerCase() === activeFilter.toLowerCase();
  }).sort((a, b) => {
    if (sortBy === 'score') return b.score_pct - a.score_pct;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0; // default latest order
  });

  // Score badge helper
  const getScoreColor = (score: number, status: string) => {
    if (status === 'In Review') return '#38BDF8';
    if (status === 'Needs Improvement') return '#F59E0B';
    if (status === 'Rejected') return '#EF4444';
    if (score >= 85) return '#10B981';
    if (score >= 70) return '#34D399';
    return '#F59E0B';
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Verified':
        return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#34D399', icon: '✓' };
      case 'In Review':
        return { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)', color: '#38BDF8', icon: '◷' };
      case 'Needs Improvement':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#FCD34D', icon: '!' };
      case 'Rejected':
      default:
        return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#F87171', icon: '✕' };
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px 24px 32px' }}>
      {/* Top Header & Workflow Stepper (1 to 7) */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '20px',
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

        {/* Top Workflow Stepper (1 to 7) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '6px 12px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflowX: 'auto'
        }}>
          {/* Step 1 */}
          <div onClick={onNavigateToOnboarding} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>Onboarding</span>
          </div>
          <div style={{ width: '10px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 2 */}
          <div onClick={onNavigateToEvidence} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>Evidence</span>
          </div>
          <div style={{ width: '10px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 3 */}
          <div onClick={onNavigateToSkillTwin} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>SkillTwin</span>
          </div>
          <div style={{ width: '10px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 4 */}
          <div onClick={onNavigateToTargetRole} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>Target Role</span>
          </div>
          <div style={{ width: '10px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 5 */}
          <div onClick={onNavigateToGapAnalysis} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>Gap Analysis</span>
          </div>
          <div style={{ width: '10px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 6 */}
          <div onClick={onNavigateToRoadmap} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>Roadmap</span>
          </div>
          <div style={{ width: '10px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 7: Active Project Verification */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)' }}>
              7
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#C084FC', fontWeight: 800 }}>Project Verification</span>
              <span style={{ fontSize: '0.6rem', color: '#C084FC' }}>Your Projects</span>
            </div>
          </div>

          <div style={{ width: '10px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 8: SkillTwin Updated */}
          <div
            onClick={() => {
              if (isVerificationCompleted) {
                localStorage.setItem('skilltwin_verification_completed', 'true');
                if (onNavigateToSkillTwinUpdated) onNavigateToSkillTwinUpdated();
              } else {
                alert(`Project Verification Incomplete: ${verifiedProjectsCount} of ${totalAvailableProjects} projects verified. Please verify at least ${REQUIRED_VERIFIED_PROJECTS} projects before proceeding to SkillTwin Updated.`);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: isVerificationCompleted ? 'pointer' : 'not-allowed',
              opacity: isVerificationCompleted ? 1 : 0.45
            }}
            title={isVerificationCompleted ? "Step 8: SkillTwin Updated" : `Verify at least ${REQUIRED_VERIFIED_PROJECTS} projects to unlock SkillTwin Updated (${verifiedProjectsCount} of ${totalAvailableProjects} verified)`}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: isVerificationCompleted ? '#10B981' : 'rgba(255, 255, 255, 0.1)',
              color: isVerificationCompleted ? '#FFFFFF' : '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700
            }}>
              {isVerificationCompleted ? '✓' : '8'}
            </div>
            <span style={{ fontSize: '0.7rem', color: isVerificationCompleted ? '#F8FAFC' : '#94A3B8', fontWeight: 600 }}>
              SkillTwin Updated
            </span>
          </div>
        </div>

        {/* Right Header: Download Report & Global Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleDownloadReport}
            style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Download Report
          </button>
          <GlobalHeaderBadge />
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="dashboard-layout">
        {/* Left Persistent Dashboard Sidebar */}
        <PersistentSidebar
          userProfile={userProfile}
          activeStep={7}
          activeView="verification"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={onNavigateToEvidence}
          onNavigateToSkillTwin={onNavigateToSkillTwin}
          onNavigateToTargetRole={onNavigateToTargetRole}
          onNavigateToGapAnalysis={onNavigateToGapAnalysis}
          onNavigateToRoadmap={onNavigateToRoadmap}
          onNavigateToVerification={onNavigateToVerification || (() => {})}
          onNavigateToSkillTwinUpdated={onNavigateToSkillTwinUpdated}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToSettings={onNavigateToSettings}
          onNavigateToHelp={() => {
            setIsHowItWorksOpen(true);
            onNavigateToHelp?.();
          }}
        />

        {/* Center Main Work Area */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Page Header Bar */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  Project Verification
                </h1>
                <Sparkles size={20} color="#C084FC" />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
                Submit your GitHub projects to verify real implementation and earn skill credibility.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsHowItWorksOpen(true)}
              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <HelpCircle size={14} color="#818CF8" /> How it works
            </button>
          </div>

          {/* Informational Banner */}
          <div className="glass-panel" style={{
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(99, 102, 241, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8', flexShrink: 0 }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                We verify actual implementation, not just repository existence.
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                Our AI analyzes code, documentation, features, and deployment evidence.
              </p>
            </div>
          </div>

          {/* PROJECT SUBMISSION CARD */}
          <div className="glass-card" style={{
            padding: '20px 22px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(15, 23, 42, 0.8)'
          }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '14px' }}>
              Submit a GitHub Project for Verification
            </div>

            <form onSubmit={handleSubmitProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr) auto',
                gap: '14px',
                alignItems: 'start'
              }}>
                {/* 1. GitHub Repository URL Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    GitHub Repository URL
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Github size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="url"
                      placeholder="https://github.com/username/repository"
                      value={repoUrl}
                      onChange={(e) => {
                        setRepoUrl(e.target.value);
                        setFormError(null);
                      }}
                      className="form-input"
                      style={{ paddingLeft: '34px', fontSize: '0.8rem', width: '100%' }}
                      disabled={isAnalyzing}
                    />
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Make sure the repository is public for verification
                  </span>
                </div>

                {/* 2. Select Primary Skill / Technology Dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    What is this project?
                  </label>
                  <select
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    className="form-select"
                    style={{ fontSize: '0.8rem', width: '100%' }}
                    disabled={isAnalyzing}
                  >
                    {availableSkills.map((skill, idx) => (
                      <option key={idx} value={skill}>{skill}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    You can select multiple skills later
                  </span>
                </div>

                {/* 3. Submit Button */}
                <div style={{ paddingTop: '22px' }}>
                  <button
                    type="submit"
                    disabled={isAnalyzing}
                    className="btn btn-primary"
                    style={{
                      padding: '8px 20px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Submit for Verification</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {formError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171', fontSize: '0.74rem', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}
            </form>
          </div>

          {/* FILTER TABS & SORTING */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setActiveFilter('All')}
                className={`btn ${activeFilter === 'All' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
              >
                All Projects ({currentProjects.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('Verified')}
                className={`btn ${activeFilter === 'Verified' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
              >
                Verified ({verifiedProjectsCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('In Review')}
                className={`btn ${activeFilter === 'In Review' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
              >
                In Review ({inReviewCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('Needs Improvement')}
                className={`btn ${activeFilter === 'Needs Improvement' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
              >
                Needs Improvement ({needsImprovementCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('Rejected')}
                className={`btn ${activeFilter === 'Rejected' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
              >
                Rejected ({rejectedCount})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="form-select"
                style={{ padding: '5px 24px 5px 10px', fontSize: '0.76rem' }}
              >
                <option value="latest">Latest</option>
                <option value="score">Verification Score</option>
                <option value="name">Project Name</option>
              </select>
            </div>
          </div>

          {/* TWO COLUMN LAYOUT: PROJECT LIST + RIGHT SUMMARY */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: '20px',
            alignItems: 'start'
          }}>
            {/* LEFT: PROJECT LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isLoading ? (
                <div className="glass-panel" style={{ padding: '50px 20px', textAlign: 'center' }}>
                  <Loader2 size={32} color="#818CF8" style={{ animation: 'spin 1.2s linear infinite', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>Loading verified projects...</div>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <FileCode size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC' }}>No projects match this filter.</div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Submit a GitHub project URL above to verify skills and build credibility.
                  </p>
                </div>
              ) : (
                filteredProjects.map((project) => {
                  const sBadge = getStatusBadgeStyle(project.status);
                  const scoreColor = getScoreColor(project.score_pct, project.status);

                  return (
                    <div
                      key={project.id}
                      className="glass-panel"
                      style={{
                        padding: '18px 20px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(15, 23, 42, 0.75)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Left: Project Info */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                        {/* Thumbnail Icon */}
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#818CF8',
                          flexShrink: 0
                        }}>
                          <FileCode size={20} />
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                              {project.name}
                            </h3>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: sBadge.bg,
                              border: `1px solid ${sBadge.border}`,
                              color: sBadge.color,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span>{sBadge.icon}</span> {project.status}
                            </span>
                          </div>

                          {/* Technology Tags */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '6px 0' }}>
                            {project.detected_technologies.map((tech, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '1px 7px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  borderRadius: '4px',
                                  fontSize: '0.66rem',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}
                              >
                                {tech}
                              </span>
                            ))}
                          </div>

                          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.35 }}>
                            {project.description}
                          </p>

                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>{project.submission_date}</span>
                            <span>•</span>
                            <span>{project.commits_count} Commit(s)</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Score Gauge & Action Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Score Circular Gauge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.08)"
                                strokeWidth="3.6"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={scoreColor}
                                strokeWidth="3.6"
                                strokeDasharray={`${project.score_pct}, 100`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              color: '#FFFFFF'
                            }}>
                              {project.score_pct}%
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: scoreColor }}>
                              {project.score_label}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', maxWidth: '130px', lineHeight: 1.2 }}>
                              {project.score_explanation}
                            </span>
                          </div>
                        </div>

                        {/* Action Trigger */}
                        {project.status === 'Needs Improvement' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProjectForFeedback(project)}
                            className="btn btn-outline"
                            style={{ padding: '6px 14px', fontSize: '0.76rem', color: '#FCD34D', borderColor: 'rgba(245, 158, 11, 0.35)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>View Feedback</span>
                            <ChevronRight size={14} />
                          </button>
                        ) : project.status === 'In Review' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProjectForDetail(project)}
                            className="btn btn-outline"
                            style={{ padding: '6px 14px', fontSize: '0.76rem', color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.35)' }}
                          >
                            View Progress
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedProjectForDetail(project)}
                            className="btn btn-outline"
                            style={{ padding: '6px 14px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>View Details</span>
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Bottom Card Banner: Build Credibility & Next Stage CTA */}
              <div className="glass-panel" style={{
                padding: '18px 22px',
                borderRadius: '16px',
                border: isVerificationCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: isVerificationCompleted
                  ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.3) 0%, rgba(15, 23, 42, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(99, 102, 241, 0.08) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: isVerificationCompleted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isVerificationCompleted ? '#34D399' : '#818CF8'
                  }}>
                    {isVerificationCompleted ? <CheckCircle2 size={20} /> : <Shield size={20} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#F8FAFC' }}>
                      {isVerificationCompleted
                        ? '🎉 Project Verification Complete!'
                        : 'Unlock Next Stage: SkillTwin Updated'}
                    </div>
                    <p style={{ fontSize: '0.74rem', color: isVerificationCompleted ? '#34D399' : 'var(--text-muted)', margin: '2px 0 0' }}>
                      {isVerificationCompleted
                        ? `All requirements met (${verifiedProjectsCount} of ${totalAvailableProjects} projects verified). Ready to view your updated SkillTwin.`
                        : `${verifiedProjectsCount} of ${totalAvailableProjects} projects verified. Successfully verify at least ${REQUIRED_VERIFIED_PROJECTS} projects to unlock Page 8.`}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={onNavigateToRoadmap}
                      className="btn btn-outline"
                      style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                    >
                      ← Roadmap
                    </button>
                    <button
                      type="button"
                      disabled={!isVerificationCompleted}
                      onClick={() => {
                        if (isVerificationCompleted) {
                          localStorage.setItem('skilltwin_verification_completed', 'true');
                          if (onNavigateToSkillTwinUpdated) onNavigateToSkillTwinUpdated();
                        }
                      }}
                      className={`btn ${isVerificationCompleted ? 'btn-primary' : 'btn-outline'}`}
                      style={{
                        padding: '8px 20px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        background: isVerificationCompleted
                          ? 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        boxShadow: isVerificationCompleted ? '0 4px 18px rgba(16, 185, 129, 0.4)' : 'none',
                        color: isVerificationCompleted ? '#FFFFFF' : 'var(--text-muted)',
                        border: isVerificationCompleted ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: isVerificationCompleted ? 'pointer' : 'not-allowed',
                        opacity: isVerificationCompleted ? 1 : 0.55,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title={isVerificationCompleted ? 'Proceed to SkillTwin Updated' : `Verify at least ${REQUIRED_VERIFIED_PROJECTS} projects to unlock`}
                    >
                      <span>Continue to SkillTwin Updated →</span>
                    </button>
                  </div>
                  <span style={{ fontSize: '0.66rem', color: isVerificationCompleted ? '#34D399' : 'var(--text-muted)' }}>
                    {isVerificationCompleted
                      ? '✓ Page 8 is unlocked and accessible'
                      : `🔒 Locked: Verify at least ${REQUIRED_VERIFIED_PROJECTS} projects to proceed (${verifiedProjectsCount} of ${totalAvailableProjects} verified)`}
                  </span>
                </div>
              </div>

              {/* Bottom Pagination / Stage Navigation Links */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onNavigateToRoadmap}
                  className="btn btn-outline"
                  style={{ padding: '6px 14px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ArrowLeft size={14} /> Previous: Roadmap
                </button>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Stage 7 of 9: Project Verification ({verifiedProjectsCount} of {totalAvailableProjects} Verified)
                </div>

                <button
                  type="button"
                  disabled={!isVerificationCompleted}
                  onClick={() => {
                    if (isVerificationCompleted) {
                      localStorage.setItem('skilltwin_verification_completed', 'true');
                      if (onNavigateToSkillTwinUpdated) onNavigateToSkillTwinUpdated();
                    }
                  }}
                  className="btn btn-outline"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.76rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: isVerificationCompleted ? '#C084FC' : 'var(--text-muted)',
                    borderColor: isVerificationCompleted ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                    cursor: isVerificationCompleted ? 'pointer' : 'not-allowed',
                    opacity: isVerificationCompleted ? 1 : 0.45
                  }}
                >
                  <span>Next: SkillTwin Updated</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* RIGHT: SUMMARY PANELS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. Verification Summary Donut */}
              <div className="glass-panel" style={{ padding: '18px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '14px' }}>
                  Verification Summary
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                  {/* SVG Donut */}
                  <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="3.8"
                      />
                      {currentProjects.length > 0 && verifiedProjectsCount > 0 && (
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="3.8"
                          strokeDasharray={`${Math.round((verifiedProjectsCount / currentProjects.length) * 100)}, 100`}
                          strokeDashoffset="0"
                        />
                      )}
                      {currentProjects.length > 0 && inReviewCount > 0 && (
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#38BDF8"
                          strokeWidth="3.8"
                          strokeDasharray={`${Math.round((inReviewCount / currentProjects.length) * 100)}, 100`}
                          strokeDashoffset={`-${Math.round((verifiedProjectsCount / currentProjects.length) * 100)}`}
                        />
                      )}
                      {currentProjects.length > 0 && needsImprovementCount > 0 && (
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="3.8"
                          strokeDasharray={`${Math.round((needsImprovementCount / currentProjects.length) * 100)}, 100`}
                          strokeDashoffset={`-${Math.round(((verifiedProjectsCount + inReviewCount) / currentProjects.length) * 100)}`}
                        />
                      )}
                      {currentProjects.length > 0 && rejectedCount > 0 && (
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="3.8"
                          strokeDasharray={`${Math.round((rejectedCount / currentProjects.length) * 100)}, 100`}
                          strokeDashoffset={`-${Math.round(((verifiedProjectsCount + inReviewCount + needsImprovementCount) / currentProjects.length) * 100)}`}
                        />
                      )}
                    </svg>

                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                        {currentProjects.length}
                      </div>
                      <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>
                        Total Projects
                      </div>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10B981' }} />
                        <span style={{ color: '#F8FAFC' }}>Verified</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {verifiedProjectsCount} ({currentProjects.length > 0 ? Math.round((verifiedProjectsCount / currentProjects.length) * 100) : 0}%)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#38BDF8' }} />
                        <span style={{ color: '#F8FAFC' }}>In Review</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {inReviewCount} ({currentProjects.length > 0 ? Math.round((inReviewCount / currentProjects.length) * 100) : 0}%)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#F59E0B' }} />
                        <span style={{ color: '#F8FAFC' }}>Needs Improvement</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {needsImprovementCount} ({currentProjects.length > 0 ? Math.round((needsImprovementCount / currentProjects.length) * 100) : 0}%)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#EF4444' }} />
                        <span style={{ color: '#F8FAFC' }}>Rejected</span>
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {rejectedCount} ({currentProjects.length > 0 ? Math.round((rejectedCount / currentProjects.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Portfolio Verification Progress */}
                <div style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Portfolio Progress</span>
                  <span style={{ color: isVerificationCompleted ? '#34D399' : '#818CF8', fontWeight: 700 }}>
                    {verifiedProjectsCount} of {totalAvailableProjects} verified
                  </span>
                </div>
              </div>

              {/* 2. Skills Credibility Score */}
              <div className="glass-panel" style={{ padding: '18px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '10px' }}>
                  Skills Credibility
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C084FC',
                    flexShrink: 0
                  }}>
                    <Award size={22} />
                  </div>

                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
                      {summaryData?.overall_credibility_score || 78}%
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Overall Credibility Score ⓘ
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#34D399', fontWeight: 600, marginTop: '2px' }}>
                      {summaryData?.credibility_trend || '↑ 12% from last month'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Why Verify Projects? */}
              <div className="glass-panel" style={{ padding: '18px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '10px' }}>
                  Why Verify Projects?
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    'Proves real implementation',
                    'Builds skill credibility',
                    'Improves job readiness',
                    'Strengthens your portfolio',
                    'Recommended by employers'
                  ].map((text, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={13} color="#10B981" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Next Stage Status Panel */}
              <div className="glass-panel" style={{
                padding: '16px',
                borderRadius: '14px',
                border: isVerificationCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isVerificationCompleted
                  ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)'
                  : 'rgba(15, 23, 42, 0.75)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isVerificationCompleted ? '#34D399' : '#F8FAFC' }}>
                    {isVerificationCompleted ? '🎉 Verification Complete' : 'Next: SkillTwin Updated'}
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: isVerificationCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                    color: isVerificationCompleted ? '#34D399' : '#F59E0B',
                    border: isVerificationCompleted ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    {isVerificationCompleted ? 'Unlocked' : 'Locked'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!isVerificationCompleted}
                  onClick={() => {
                    if (isVerificationCompleted) {
                      localStorage.setItem('skilltwin_verification_completed', 'true');
                      if (onNavigateToSkillTwinUpdated) onNavigateToSkillTwinUpdated();
                    }
                  }}
                  className={`btn ${isVerificationCompleted ? 'btn-primary' : 'btn-outline'}`}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: isVerificationCompleted
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    boxShadow: isVerificationCompleted ? '0 4px 15px rgba(16, 185, 129, 0.35)' : 'none',
                    color: isVerificationCompleted ? '#FFFFFF' : 'var(--text-muted)',
                    border: isVerificationCompleted ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: isVerificationCompleted ? 'pointer' : 'not-allowed',
                    opacity: isVerificationCompleted ? 1 : 0.55,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  title={isVerificationCompleted ? 'Proceed to SkillTwin Updated' : `Verify at least ${REQUIRED_VERIFIED_PROJECTS} projects to unlock`}
                >
                  <span>Continue to SkillTwin Updated →</span>
                </button>

                <div style={{ fontSize: '0.68rem', color: isVerificationCompleted ? '#34D399' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>
                  {isVerificationCompleted
                    ? `All requirements met (${verifiedProjectsCount} of ${totalAvailableProjects} projects verified). Click to see your updated SkillTwin.`
                    : `${verifiedProjectsCount} of ${totalAvailableProjects} projects verified (Need at least ${REQUIRED_VERIFIED_PROJECTS} verified to unlock).`}
                </div>
              </div>
            </div>
          </div>

          {/* ANALYZING REPOSITORY MODAL */}
          {isAnalyzing && (
            <div className="modal-backdrop">
              <div className="modal-content" style={{ maxWidth: '480px', padding: '30px', textAlign: 'center' }}>
                <Loader2 size={42} color="#818CF8" style={{ animation: 'spin 1.2s linear infinite', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Analyzing Repository...
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                  SkillTwin is inspecting repository structure, source code, dependencies, features and implementation evidence.
                </p>

                {/* Step Progress Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px', textAlign: 'left', fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: analyzingStep >= 1 ? '#34D399' : 'var(--text-muted)' }}>
                    {analyzingStep > 1 ? <CheckCircle2 size={15} color="#10B981" /> : <RotateCw size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                    <span>1. Validating GitHub access and repository identity</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: analyzingStep >= 2 ? '#34D399' : 'var(--text-muted)' }}>
                    {analyzingStep > 2 ? <CheckCircle2 size={15} color="#10B981" /> : (analyzingStep === 2 ? <RotateCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <span style={{ width: '15px' }} />)}
                    <span>2. Inspecting project structure & dependency packages</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: analyzingStep >= 3 ? '#34D399' : 'var(--text-muted)' }}>
                    {analyzingStep > 3 ? <CheckCircle2 size={15} color="#10B981" /> : (analyzingStep === 3 ? <RotateCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <span style={{ width: '15px' }} />)}
                    <span>3. Evaluating AST patterns & code implementation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: analyzingStep >= 4 ? '#34D399' : 'var(--text-muted)' }}>
                    {analyzingStep === 4 ? <RotateCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <span style={{ width: '15px' }} />}
                    <span>4. Extracting evidence & calculating credibility score</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW DETAILS MODAL */}
          {selectedProjectForDetail && (
            <div className="modal-backdrop" onClick={() => setSelectedProjectForDetail(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8' }}>
                      <FileCode size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {selectedProjectForDetail.name}
                      </h3>
                      <a href={selectedProjectForDetail.repo_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: '#818CF8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{selectedProjectForDetail.repo_url}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <button onClick={() => setSelectedProjectForDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Score & Assessment Explanation */}
                <div style={{ padding: '12px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: getScoreColor(selectedProjectForDetail.score_pct, selectedProjectForDetail.status) }}>
                      {selectedProjectForDetail.score_label} ({selectedProjectForDetail.score_pct}%)
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {selectedProjectForDetail.commits_count} commits analyzed
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                    {selectedProjectForDetail.score_explanation}
                  </p>
                </div>

                {/* Verified Skills Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Demonstrated Skills & Evidence
                  </div>
                  {selectedProjectForDetail.verified_skills.map((skill, idx) => (
                    <div key={idx} style={{ padding: '10px 12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '0.74rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ color: '#F8FAFC' }}>{skill.skill_name}</strong>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          background: skill.status === 'Demonstrated' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: skill.status === 'Demonstrated' ? '#34D399' : '#FCD34D'
                        }}>
                          {skill.status}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.3 }}>
                        {skill.evidence}
                      </p>
                      {skill.file_locations && skill.file_locations.length > 0 && (
                        <div style={{ fontSize: '0.68rem', color: '#818CF8', marginTop: '4px' }}>
                          📁 <strong>Files:</strong> {skill.file_locations.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Real Commits from Submitted Repository */}
                {selectedProjectForDetail.recent_commits && selectedProjectForDetail.recent_commits.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GitCommit size={14} color="#818CF8" />
                        <span>Analyzed Repository Commits ({selectedProjectForDetail.commits_count})</span>
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Latest {selectedProjectForDetail.recent_commits.length} commits
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      maxHeight: '170px',
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}>
                      {selectedProjectForDetail.recent_commits.map((commit, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 10px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            fontSize: '0.72rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'monospace', color: '#818CF8', fontWeight: 700, fontSize: '0.68rem' }}>
                                {commit.sha}
                              </span>
                              <strong style={{ color: '#F8FAFC' }}>{commit.author}</strong>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              {commit.date ? new Date(commit.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                            </span>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.7rem', lineHeight: 1.3 }}>
                            {commit.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {selectedProjectForDetail.recommendations && selectedProjectForDetail.recommendations.length > 0 && (
                  <div style={{ padding: '10px 12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '14px', fontSize: '0.74rem' }}>
                    <strong style={{ color: '#C084FC' }}>Recommendations:</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: '16px', color: 'var(--text-secondary)' }}>
                      {selectedProjectForDetail.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn btn-primary" onClick={() => setSelectedProjectForDetail(null)} style={{ padding: '6px 16px', fontSize: '0.78rem' }}>
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW FEEDBACK MODAL (NEEDS IMPROVEMENT) */}
          {selectedProjectForFeedback && (
            <div className="modal-backdrop" onClick={() => setSelectedProjectForFeedback(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        Improvement Feedback
                      </h3>
                      <p style={{ fontSize: '0.72rem', color: '#FCD34D', margin: '1px 0 0' }}>
                        {selectedProjectForFeedback.name}
                      </p>
                    </div>
                  </div>

                  <button onClick={() => setSelectedProjectForFeedback(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <strong style={{ color: '#F87171' }}>Missing Evidence:</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
                      {selectedProjectForFeedback.missing_evidence.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <strong style={{ color: '#34D399' }}>Actionable Next Steps:</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
                      {selectedProjectForFeedback.recommendations.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setSelectedProjectForFeedback(null)} style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedProjectForFeedback(null);
                      onNavigateToRoadmap?.();
                    }}
                    style={{ padding: '6px 16px', fontSize: '0.78rem' }}
                  >
                    Return to Roadmap
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OVERLAY MODAL: HOW PROJECT VERIFICATION WORKS */}
          {isHowItWorksOpen && (
            <div className="modal-backdrop" onClick={() => setIsHowItWorksOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '10px', color: '#C084FC' }}>
                      <HelpCircle size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                        How Project Verification Works
                      </h3>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        5-Stage Evidence Extraction Engine
                      </p>
                    </div>
                  </div>

                  <button onClick={() => setIsHowItWorksOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>1. Submit GitHub Project:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      Provide a public repository URL and designate the primary skill you intend to demonstrate.
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>2. AST & Code Analysis:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      SkillTwin inspects directory trees, package dependencies, imports, route endpoints, models, and test suites.
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>3. Evidence Extraction:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      We distinguish between technology merely mentioned in a README versus code actively executing in source files.
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>4. Explainable Scoring:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      Projects receive clear statuses (Verified, In Review, Needs Improvement) accompanied by specific file citations.
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>5. SkillTwin Update Input:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      Verified evidence feeds into the subsequent SkillTwin Update phase to strengthen your confidence scores.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                  <button type="button" className="btn btn-primary" onClick={() => setIsHowItWorksOpen(false)} style={{ padding: '6px 18px', fontSize: '0.8rem' }}>
                    Got it!
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProjectVerificationPage;
