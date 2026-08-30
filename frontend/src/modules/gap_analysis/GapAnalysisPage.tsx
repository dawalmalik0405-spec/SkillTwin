import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  ChevronRight,
  ChevronLeft,
  FileText,
  Download,
  AlertCircle,
  TrendingUp,
  Award,
  CheckCircle2,
  HelpCircle,
  RotateCw,
  Loader2,
  Code2,
  Cpu,
  Database,
  Terminal,
  ArrowRight,
  X,
  LayoutGrid,
  List,
  Zap
} from 'lucide-react';
import {
  UserProfile,
  GapAnalysisSummaryResponse,
  SkillGapItem,
  GapPriority,
  MatchStatus
} from '../../shared/types';
import { apiClient } from '../../shared/apiClient';
import PersistentSidebar from '../../shared/components/PersistentSidebar';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';

interface GapAnalysisPageProps {
  userProfile: UserProfile | null;
  onNavigateToOnboarding?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToSkillTwin?: () => void;
  onNavigateToTargetRole?: () => void;
  onNavigateToGapAnalysis?: () => void;
  onNavigateToRoadmap?: (gapData?: GapAnalysisSummaryResponse) => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: () => void;
}

export const GapAnalysisPage: React.FC<GapAnalysisPageProps> = ({
  userProfile,
  onNavigateToOnboarding,
  onNavigateToEvidence,
  onNavigateToSkillTwin,
  onNavigateToTargetRole,
  onNavigateToGapAnalysis,
  onNavigateToRoadmap,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToHelp
}) => {
  // Target role configuration
  const targetRole = userProfile?.target_role || 'Full-Stack Developer';
  const experienceLevel = 'Entry Level (0-2 years)';
  const industry = 'All Industries';

  // Analysis Data & Loading States
  const [analysisData, setAnalysisData] = useState<GapAnalysisSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search States
  const [activeFilter, setActiveFilter] = useState<'All' | 'Critical' | 'Weak' | 'Strong' | 'Matched'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Sorting
  const [sortBy, setSortBy] = useState<'priority' | 'gap' | 'req' | 'prof'>('priority');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals
  const [selectedSkillForDetail, setSelectedSkillForDetail] = useState<SkillGapItem | null>(null);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);

  // Fetch Gap Analysis from Backend
  const fetchAnalysis = async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getGapAnalysis(
        targetRole,
        experienceLevel,
        industry,
        userProfile?.id
      );
      setAnalysisData(data);
    } catch (err: any) {
      console.error('[GapAnalysis] Fetch failed:', err);
      setError(err?.message || 'Failed to load skill gap analysis. Please ensure backend is running.');
    } finally {
      setIsLoading(false);
      setIsRecalculating(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    localStorage.setItem('skilltwin_gap_completed', 'true');
    fetchAnalysis(true);
  }, [targetRole, userProfile?.id]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const updated = await apiClient.recalculateGapAnalysis(
        targetRole,
        experienceLevel,
        industry,
        userProfile?.id
      );
      setAnalysisData(updated);
    } catch (err: any) {
      console.error('[GapAnalysis] Recalculate failed:', err);
      // Fallback to fetch
      await fetchAnalysis(false);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleDownloadReport = () => {
    const url = apiClient.downloadGapReportUrl(targetRole, experienceLevel, industry);
    window.open(url, '_blank');
  };

  // Helper for skill icon
  const getSkillIcon = (skillName: string, category: string) => {
    const s = skillName.toLowerCase();
    const c = category.toLowerCase();
    if (s.includes('react') || s.includes('vue') || s.includes('angular') || s.includes('next')) return <Code2 size={16} color="#38BDF8" />;
    if (s.includes('python') || s.includes('node') || s.includes('fastapi') || s.includes('express')) return <Cpu size={16} color="#34D399" />;
    if (s.includes('sql') || s.includes('postgres') || s.includes('mongo') || s.includes('redis') || c.includes('database')) return <Database size={16} color="#818CF8" />;
    if (s.includes('docker') || s.includes('git') || s.includes('linux') || s.includes('ci/cd') || c.includes('devops')) return <Terminal size={16} color="#F59E0B" />;
    if (s.includes('typescript') || s.includes('javascript') || s.includes('html') || s.includes('css')) return <Code2 size={16} color="#C084FC" />;
    return <Sparkles size={16} color="#A855F7" />;
  };

  // Categories list for dropdown
  const allCategories = useMemo(() => {
    if (!analysisData?.gaps) return ['All Categories'];
    const cats = new Set(analysisData.gaps.map(g => g.category));
    return ['All Categories', ...Array.from(cats)];
  }, [analysisData]);

  // Filter & Search & Sort Logic
  const filteredGaps = useMemo(() => {
    if (!analysisData?.gaps) return [];

    let list = analysisData.gaps.filter(item => {
      // 1. Status Filter
      if (activeFilter === 'Critical' && item.priority !== 'Critical') return false;
      if (activeFilter === 'Weak' && item.match_status !== 'Weak') return false;
      if (activeFilter === 'Strong' && item.match_status !== 'Strong') return false;
      if (activeFilter === 'Matched' && item.match_status !== 'Matched') return false;

      // 2. Category Filter
      if (selectedCategory !== 'All Categories' && item.category !== selectedCategory) return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.skill.toLowerCase().includes(q) || item.canonical_name.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        const matchesWhy = item.why_this_gap.toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesWhy) return false;
      }

      return true;
    });

    // Sort order
    const priorityWeight: Record<GapPriority, number> = {
      'Critical': 4,
      'High': 3,
      'Medium': 2,
      'Low': 1
    };

    list.sort((a, b) => {
      if (sortBy === 'priority') {
        const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (pDiff !== 0) return pDiff;
        return a.gap_percentage - b.gap_percentage; // largest negative gap first
      }
      if (sortBy === 'gap') return a.gap_percentage - b.gap_percentage;
      if (sortBy === 'req') return b.required_level_pct - a.required_level_pct;
      if (sortBy === 'prof') return b.your_proficiency_pct - a.your_proficiency_pct;
      return 0;
    });

    return list;
  }, [analysisData, activeFilter, selectedCategory, searchQuery, sortBy]);

  // Pagination calculation
  const totalItems = filteredGaps.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedGaps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGaps.slice(start, start + pageSize);
  }, [filteredGaps, currentPage, pageSize]);

  // Reset page if filtered results change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, selectedCategory, searchQuery, pageSize]);

  // Color helpers for Priority and Match Status
  const getPriorityStyle = (priority: GapPriority) => {
    switch (priority) {
      case 'Critical':
        return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#F87171' };
      case 'High':
        return { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)', color: '#FB923C' };
      case 'Medium':
        return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#FCD34D' };
      case 'Low':
      default:
        return { bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)', color: '#38BDF8' };
    }
  };

  const getMatchStatusDot = (status: MatchStatus) => {
    switch (status) {
      case 'Missing':
        return { dotColor: '#EF4444', text: 'Missing', textColor: '#FCA5A5' };
      case 'Weak':
        return { dotColor: '#F59E0B', text: 'Weak', textColor: '#FCD34D' };
      case 'Strong':
        return { dotColor: '#10B981', text: 'Strong', textColor: '#6EE7B7' };
      case 'Matched':
      default:
        return { dotColor: '#34D399', text: 'Matched', textColor: '#34D399' };
    }
  };

  const getProficiencyBarColor = (pct: number) => {
    if (pct < 35) return 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)';
    if (pct < 65) return 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)';
    return 'linear-gradient(90deg, #10B981 0%, #059669 100%)';
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px 24px 32px' }}>
      {/* Top Header & Workflow Progress */}
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

        {/* Top Workflow Stepper (1 to 6) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '6px 14px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflowX: 'auto'
        }}>
          {/* Step 1 */}
          <div
            onClick={onNavigateToOnboarding}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            title="Step 1: Onboarding"
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
              ✓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600 }}>Onboarding</span>
              <span style={{ fontSize: '0.62rem', color: '#34D399' }}>Completed</span>
            </div>
          </div>

          <div style={{ width: '16px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 2 */}
          <div
            onClick={onNavigateToEvidence}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            title="Step 2: Evidence Collection"
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
              ✓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600 }}>Evidence</span>
              <span style={{ fontSize: '0.62rem', color: '#34D399' }}>Completed</span>
            </div>
          </div>

          <div style={{ width: '16px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 3 */}
          <div
            onClick={onNavigateToSkillTwin}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            title="Step 3: Living SkillTwin"
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
              ✓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600 }}>SkillTwin</span>
              <span style={{ fontSize: '0.62rem', color: '#34D399' }}>Completed</span>
            </div>
          </div>

          <div style={{ width: '16px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 4 */}
          <div
            onClick={onNavigateToTargetRole}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            title="Step 4: Target Role"
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
              ✓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600 }}>Target Role</span>
              <span style={{ fontSize: '0.62rem', color: '#34D399' }}>Completed</span>
            </div>
          </div>

          <div style={{ width: '16px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 5: Active Gap Analysis */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)' }}>
              5
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#C084FC', fontWeight: 800 }}>Gap Analysis</span>
              <span style={{ fontSize: '0.62rem', color: '#C084FC' }}>Your Gaps</span>
            </div>
          </div>

          <div style={{ width: '16px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 6: Personalized Roadmap */}
          <div
            onClick={() => onNavigateToRoadmap?.(analysisData || undefined)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: 1 }}
            title="Step 6: Personalized Roadmap"
          >
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.25)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#818CF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
              6
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600 }}>Roadmap</span>
              <span style={{ fontSize: '0.62rem', color: '#38BDF8' }}>Ready</span>
            </div>
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
          activeStep={5}
          activeView="gap"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={onNavigateToEvidence}
          onNavigateToSkillTwin={onNavigateToSkillTwin}
          onNavigateToTargetRole={onNavigateToTargetRole}
          onNavigateToGapAnalysis={onNavigateToGapAnalysis || (() => {})}
          onNavigateToRoadmap={() => onNavigateToRoadmap?.(analysisData || undefined)}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToSettings={onNavigateToSettings}
          onNavigateToHelp={() => {
            setIsHowItWorksOpen(true);
            onNavigateToHelp?.();
          }}
        />

        {/* Center Main Work Area */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Page Header Bar */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  Skill Gap Analysis
                </h1>
                <Sparkles size={20} color="#C084FC" />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
                Compare your current skills with industry requirements for{' '}
                <span style={{ color: '#C084FC', fontWeight: 600 }}>{targetRole} (0-2 years)</span>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Last updated: {analysisData?.last_updated || 'May 25, 2026, 11:30 AM'}
              </span>

              <button
                type="button"
                className="btn btn-outline"
                onClick={handleRecalculate}
                disabled={isRecalculating}
                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                title="Refresh gap calculations"
              >
                <RotateCw size={13} style={{ animation: isRecalculating ? 'spin 1s linear infinite' : 'none' }} />
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsHowItWorksOpen(true)}
                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <HelpCircle size={14} color="#818CF8" /> How it works
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Loader2 size={36} color="#818CF8" style={{ animation: 'spin 1.2s linear infinite', margin: '0 auto 16px' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                Analyzing your SkillTwin against role requirements...
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Synthesizing current evidence proficiencies against {targetRole} industry benchmarks.
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="glass-panel" style={{ padding: '30px', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertCircle size={24} color="#F87171" />
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F87171' }}>Calculation Error</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{error}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fetchAnalysis(true)}
                style={{ marginTop: '16px', padding: '6px 16px', fontSize: '0.8rem' }}
              >
                Retry Analysis
              </button>
            </div>
          )}

          {/* Main Dashboard Content */}
          {!isLoading && !error && analysisData && (
            <>
              {/* TOP 5 SUMMARY CARDS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px'
              }}>
                {/* Card 1: Critical Gaps */}
                <div
                  className="glass-card"
                  onClick={() => setActiveFilter('Critical')}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    border: activeFilter === 'Critical' ? '1px solid #F43F5E' : '1px solid rgba(244, 63, 94, 0.25)',
                    background: activeFilter === 'Critical' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(15, 23, 42, 0.75)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#F43F5E', fontWeight: 700 }}>Critical Gaps</span>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F43F5E' }}>
                      <AlertCircle size={14} />
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F43F5E', lineHeight: 1 }}>
                    {analysisData.critical_gaps_count}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    High priority skills to improve
                  </p>
                </div>

                {/* Card 2: Weak Skills */}
                <div
                  className="glass-card"
                  onClick={() => setActiveFilter('Weak')}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    border: activeFilter === 'Weak' ? '1px solid #F59E0B' : '1px solid rgba(245, 158, 11, 0.25)',
                    background: activeFilter === 'Weak' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(15, 23, 42, 0.75)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#F59E0B', fontWeight: 700 }}>Weak Skills</span>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                      <TrendingUp size={14} />
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F59E0B', lineHeight: 1 }}>
                    {analysisData.weak_skills_count}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Skills that need improvement
                  </p>
                </div>

                {/* Card 3: Strong Skills */}
                <div
                  className="glass-card"
                  onClick={() => setActiveFilter('Strong')}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    border: activeFilter === 'Strong' ? '1px solid #38BDF8' : '1px solid rgba(56, 189, 248, 0.25)',
                    background: activeFilter === 'Strong' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.75)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#38BDF8', fontWeight: 700 }}>Strong Skills</span>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                      <Award size={14} />
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38BDF8', lineHeight: 1 }}>
                    {analysisData.strong_skills_count}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Skills you are good at
                  </p>
                </div>

                {/* Card 4: Matched Skills */}
                <div
                  className="glass-card"
                  onClick={() => setActiveFilter('Matched')}
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    border: activeFilter === 'Matched' ? '1px solid #10B981' : '1px solid rgba(16, 185, 129, 0.25)',
                    background: activeFilter === 'Matched' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.75)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 700 }}>Matched Skills</span>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                      <CheckCircle2 size={14} />
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10B981', lineHeight: 1 }}>
                    {analysisData.matched_skills_count}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Meet industry expectations
                  </p>
                </div>

                {/* Card 5: Overall Match */}
                <div
                  className="glass-card"
                  style={{
                    padding: '12px 18px',
                    borderRadius: '14px',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    background: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}
                >
                  {/* Circular Donut Indicator */}
                  <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="3.8"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="url(#matchGrad)"
                        strokeWidth="3.8"
                        strokeDasharray={`${analysisData.overall_match_percentage}, 100`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="matchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38BDF8" />
                          <stop offset="50%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#C084FC" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#C084FC', fontWeight: 700, display: 'block' }}>
                      Overall Match
                    </span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
                      {analysisData.overall_match_percentage}%
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Career Readiness:{' '}
                      <span style={{ color: '#F59E0B', fontWeight: 600 }}>{analysisData.readiness_rating}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* FILTER & SEARCH ROW */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                {/* Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('All')}
                    className={`btn ${activeFilter === 'All' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
                  >
                    All Gaps
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('Critical')}
                    className={`btn ${activeFilter === 'Critical' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
                  >
                    Critical ({analysisData.critical_gaps_count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('Weak')}
                    className={`btn ${activeFilter === 'Weak' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
                  >
                    Weak ({analysisData.weak_skills_count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('Strong')}
                    className={`btn ${activeFilter === 'Strong' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
                  >
                    Strong ({analysisData.strong_skills_count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('Matched')}
                    className={`btn ${activeFilter === 'Matched' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px' }}
                  >
                    Matched ({analysisData.matched_skills_count})
                  </button>
                </div>

                {/* Search & Category Dropdown & View Mode */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative', width: '190px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search skills..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ padding: '6px 10px 6px 30px', fontSize: '0.78rem', width: '100%' }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Category Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="form-select"
                      style={{ padding: '6px 26px 6px 12px', fontSize: '0.78rem' }}
                    >
                      {allCategories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="form-select"
                      style={{ padding: '6px 26px 6px 12px', fontSize: '0.78rem' }}
                    >
                      <option value="priority">Sort: Priority</option>
                      <option value="gap">Sort: Gap Size</option>
                      <option value="req">Sort: Required Level</option>
                      <option value="prof">Sort: Proficiency</option>
                    </select>
                  </div>

                  {/* View Mode Toggle */}
                  <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      style={{
                        padding: '5px 8px',
                        background: viewMode === 'list' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: viewMode === 'list' ? '#C084FC' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                      title="List View"
                    >
                      <List size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      style={{
                        padding: '5px 8px',
                        background: viewMode === 'grid' ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: viewMode === 'grid' ? '#C084FC' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                      title="Grid View"
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* TWO COLUMN WORKSPACE: MAIN GAP TABLE + RIGHT INSIGHTS PANEL */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 300px',
                gap: '20px',
                alignItems: 'start'
              }}>
                {/* LEFT: MAIN SKILL GAP TABLE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            background: 'rgba(15, 23, 42, 0.85)',
                            color: 'var(--text-muted)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em'
                          }}>
                            <th style={{ padding: '12px 14px' }}>SKILL</th>
                            <th style={{ padding: '12px 12px', minWidth: '130px' }}>YOUR PROFICIENCY</th>
                            <th style={{ padding: '12px 12px', minWidth: '130px' }}>REQUIRED LEVEL</th>
                            <th style={{ padding: '12px 10px', textAlign: 'center' }}>GAP</th>
                            <th style={{ padding: '12px 10px', textAlign: 'center' }}>PRIORITY</th>
                            <th style={{ padding: '12px 12px' }}>MATCH STATUS</th>
                            <th style={{ padding: '12px 14px' }}>WHY THIS GAP?</th>
                          </tr>
                        </thead>

                        <tbody>
                          {paginatedGaps.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No skills match the selected filter or search query.
                              </td>
                            </tr>
                          ) : (
                            paginatedGaps.map((item, idx) => {
                              const pStyle = getPriorityStyle(item.priority);
                              const mDot = getMatchStatusDot(item.match_status);
                              const isNeg = item.gap_percentage < 0;

                              return (
                                <tr
                                  key={item.id || idx}
                                  onClick={() => setSelectedSkillForDetail(item)}
                                  style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s ease'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  {/* Skill Name & Category */}
                                  <td style={{ padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '7px',
                                        background: 'rgba(15, 23, 42, 0.9)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}>
                                        {getSkillIcon(item.skill, item.category)}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.82rem' }}>
                                          {item.skill}
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                          {item.category}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Your Proficiency */}
                                  <td style={{ padding: '12px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F8FAFC' }}>
                                        {item.your_proficiency_pct}%
                                      </span>
                                    </div>
                                    <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div
                                        style={{
                                          width: `${item.your_proficiency_pct}%`,
                                          height: '100%',
                                          background: getProficiencyBarColor(item.your_proficiency_pct),
                                          borderRadius: '3px'
                                        }}
                                      />
                                    </div>
                                  </td>

                                  {/* Required Level */}
                                  <td style={{ padding: '12px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F8FAFC' }}>
                                        {item.required_level_pct}%
                                      </span>
                                    </div>
                                    <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div
                                        style={{
                                          width: `${item.required_level_pct}%`,
                                          height: '100%',
                                          background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                                          borderRadius: '3px'
                                        }}
                                      />
                                    </div>
                                  </td>

                                  {/* Gap */}
                                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                    <span style={{
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      color: isNeg ? '#F87171' : '#34D399'
                                    }}>
                                      {item.gap_percentage > 0 ? `+${item.gap_percentage}%` : `${item.gap_percentage}%`}
                                    </span>
                                  </td>

                                  {/* Priority */}
                                  <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      background: pStyle.bg,
                                      border: `1px solid ${pStyle.border}`,
                                      color: pStyle.color
                                    }}>
                                      {item.priority}
                                    </span>
                                  </td>

                                  {/* Match Status */}
                                  <td style={{ padding: '12px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: mDot.dotColor }} />
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: mDot.textColor }}>
                                        {mDot.text}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Why This Gap? */}
                                  <td style={{ padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                      <span style={{
                                        fontSize: '0.74rem',
                                        color: 'var(--text-secondary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '220px'
                                      }}>
                                        {item.why_this_gap}
                                      </span>
                                      <ChevronRight size={14} color="var(--text-muted)" />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Footer */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      background: 'rgba(15, 23, 42, 0.6)',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(totalItems, currentPage * pageSize)} of {totalItems} skills
                      </div>

                      {/* Pagination Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            color: currentPage === 1 ? 'var(--text-muted)' : '#FFF',
                            cursor: currentPage === 1 ? 'default' : 'pointer'
                          }}
                        >
                          <ChevronLeft size={14} />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              border: p === currentPage ? '1px solid #818CF8' : '1px solid rgba(255, 255, 255, 0.08)',
                              background: p === currentPage ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' : 'rgba(15, 23, 42, 0.8)',
                              color: '#FFF',
                              fontSize: '0.75rem',
                              fontWeight: p === currentPage ? 700 : 500,
                              cursor: 'pointer'
                            }}
                          >
                            {p}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={currentPage === totalPages || totalPages === 0}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            color: currentPage === totalPages ? 'var(--text-muted)' : '#FFF',
                            cursor: currentPage === totalPages ? 'default' : 'pointer'
                          }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Page Size Dropdown */}
                      <div>
                        <select
                          value={pageSize}
                          onChange={e => setPageSize(Number(e.target.value))}
                          className="form-select"
                          style={{ padding: '4px 22px 4px 10px', fontSize: '0.75rem' }}
                        >
                          <option value={5}>5 / page</option>
                          <option value={8}>8 / page</option>
                          <option value={10}>10 / page</option>
                          <option value={20}>20 / page</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: INSIGHTS PANEL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* A. Gap Overview by Severity */}
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '14px' }}>
                      Gap Overview by Severity
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                      {/* Donut Chart with Center Total */}
                      <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#EF4444"
                            strokeWidth="4"
                            strokeDasharray={`${analysisData.severity_breakdown.critical_pct}, 100`}
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#F59E0B"
                            strokeWidth="4"
                            strokeDasharray={`${analysisData.severity_breakdown.high_pct}, 100`}
                            strokeDashoffset={`-${analysisData.severity_breakdown.critical_pct}`}
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#FCD34D"
                            strokeWidth="4"
                            strokeDasharray={`${analysisData.severity_breakdown.medium_pct}, 100`}
                            strokeDashoffset={`-${analysisData.severity_breakdown.critical_pct + analysisData.severity_breakdown.high_pct}`}
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#38BDF8"
                            strokeWidth="4"
                            strokeDasharray={`${analysisData.severity_breakdown.low_pct}, 100`}
                            strokeDashoffset={`-${analysisData.severity_breakdown.critical_pct + analysisData.severity_breakdown.high_pct + analysisData.severity_breakdown.medium_pct}`}
                          />
                        </svg>

                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                            {analysisData.total_gaps}
                          </div>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                            Total Gaps
                          </div>
                        </div>
                      </div>

                      {/* Legend */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, fontSize: '0.72rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#EF4444' }} />
                            <span style={{ color: '#F8FAFC' }}>Critical</span>
                          </div>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {analysisData.severity_breakdown.critical_count} ({analysisData.severity_breakdown.critical_pct}%)
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#F59E0B' }} />
                            <span style={{ color: '#F8FAFC' }}>High</span>
                          </div>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {analysisData.severity_breakdown.high_count} ({analysisData.severity_breakdown.high_pct}%)
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#FCD34D' }} />
                            <span style={{ color: '#F8FAFC' }}>Medium</span>
                          </div>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {analysisData.severity_breakdown.medium_count} ({analysisData.severity_breakdown.medium_pct}%)
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#38BDF8' }} />
                            <span style={{ color: '#F8FAFC' }}>Low</span>
                          </div>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {analysisData.severity_breakdown.low_count} ({analysisData.severity_breakdown.low_pct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* B. Top Gap Categories */}
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '12px' }}>
                      Top Gap Categories
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {analysisData.top_gap_categories.map((cat, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedCategory(cat.category)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            background: selectedCategory === cat.category ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.color }} />
                            <span style={{ fontSize: '0.74rem', color: '#F8FAFC' }}>
                              {cat.category}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: cat.color }}>
                            {cat.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* C. ✦ AI Insights */}
                  <div className="glass-panel" style={{ padding: '18px', border: '1px solid rgba(168, 85, 247, 0.25)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(99, 102, 241, 0.08) 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <Sparkles size={16} color="#C084FC" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
                        AI Insights
                      </span>
                    </div>

                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      {analysisData.ai_insights[0]?.description || 'Focus on closing critical gaps first. Improving React.js, TypeScript, and Docker skills will increase your match score by 25-30%.'}
                    </p>
                  </div>

                  {/* D. Recommended Next Steps */}
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '12px' }}>
                      Recommended Next Steps
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {analysisData.recommended_steps.map((step, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <CheckCircle2 size={15} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Primary CTA Button: Continue to Roadmap */}
                    <div style={{ marginTop: '20px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onNavigateToRoadmap?.(analysisData)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%)',
                          boxShadow: '0 4px 20px rgba(124, 58, 237, 0.45)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        Continue to Roadmap <ArrowRight size={16} />
                      </button>

                      <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Get your personalized learning plan
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* DETAIL MODAL / DRAWER FOR SELECTED SKILL */}
          {selectedSkillForDetail && (
            <div className="modal-backdrop" onClick={() => setSelectedSkillForDetail(null)}>
              <div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '600px', padding: '24px' }}
              >
                {/* Modal Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getSkillIcon(selectedSkillForDetail.skill, selectedSkillForDetail.category)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                          {selectedSkillForDetail.skill}
                        </h3>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          ...getPriorityStyle(selectedSkillForDetail.priority)
                        }}>
                          {selectedSkillForDetail.priority}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        {selectedSkillForDetail.category} • Role Importance: <strong style={{ color: '#F8FAFC' }}>{selectedSkillForDetail.role_importance}</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedSkillForDetail(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Side-by-Side Level & Gap Breakdown */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '12px',
                  padding: '14px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '16px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>YOUR LEVEL</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC', marginTop: '2px' }}>
                      {selectedSkillForDetail.your_proficiency_pct}%
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#38BDF8' }}>
                      {selectedSkillForDetail.your_proficiency_level}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>REQUIRED</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                      {selectedSkillForDetail.required_level_pct}%
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#34D399' }}>
                      {selectedSkillForDetail.required_proficiency_level}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>GAP SIZE</span>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: selectedSkillForDetail.gap_percentage < 0 ? '#F87171' : '#34D399',
                      marginTop: '2px'
                    }}>
                      {selectedSkillForDetail.gap_percentage > 0 ? `+${selectedSkillForDetail.gap_percentage}%` : `${selectedSkillForDetail.gap_percentage}%`}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Match: {selectedSkillForDetail.match_status}
                    </span>
                  </div>
                </div>

                {/* Explainable AI Reasoning */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem' }}>
                  <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#C084FC', fontWeight: 700, marginBottom: '4px' }}>
                      <Sparkles size={14} /> Why the role requires this skill
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                      {selectedSkillForDetail.why_role_requires}
                    </p>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontWeight: 700, marginBottom: '4px' }}>
                      <FileText size={14} /> Evidence Summary
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                      {selectedSkillForDetail.evidence_summary}
                    </p>
                    {selectedSkillForDetail.missing_evidence_note && (
                      <p style={{ color: '#FCD34D', fontSize: '0.72rem', marginTop: '6px', margin: '6px 0 0' }}>
                        ⚠️ {selectedSkillForDetail.missing_evidence_note}
                      </p>
                    )}
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34D399', fontWeight: 700, marginBottom: '4px' }}>
                      <Zap size={14} /> Recommended Action & Roadmap Bridge
                    </div>
                    <p style={{ color: '#E2E8F0', lineHeight: 1.45, margin: 0 }}>
                      {selectedSkillForDetail.recommended_action}
                    </p>
                    <div style={{ fontSize: '0.7rem', color: '#38BDF8', marginTop: '6px', fontWeight: 600 }}>
                      📍 {selectedSkillForDetail.roadmap_destination}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setSelectedSkillForDetail(null)}
                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedSkillForDetail(null);
                      onNavigateToRoadmap?.(analysisData || undefined);
                    }}
                    style={{ padding: '6px 16px', fontSize: '0.78rem' }}
                  >
                    View in Roadmap →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OVERLAY MODAL: HOW SKILL GAP ANALYSIS WORKS */}
          {isHowItWorksOpen && (
            <div className="modal-backdrop" onClick={() => setIsHowItWorksOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '10px', color: '#C084FC' }}>
                      <HelpCircle size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                        How Skill Gap Analysis Works
                      </h3>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        Evidence-backed gap derivation & priority engine
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsHowItWorksOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>1. Evidence vs. Industry Benchmark:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      We cross-reference your living SkillTwin (verified via resume parsing and GitHub code analysis) against curated occupational requirements for your selected target role ({targetRole}).
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>2. Gap Calculation (Required - Current):</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      Gaps are calculated quantitatively without artificial score inflation. Missing skills indicate insufficient evidence rather than an outright lack of ability.
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>3. Multi-Factor Priority Engine:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      Priority rankings (Critical, High, Medium, Low) are weighted by role importance, market demand, and prerequisite hierarchies to generate a sensible, structured learning order.
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>4. Actionable Roadmap Bridge:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      Each identified gap maps directly to curated practice exercises, project milestones, and verification targets in the personalized Roadmap.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsHowItWorksOpen(false)}
                    style={{ padding: '6px 18px', fontSize: '0.8rem' }}
                  >
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

export default GapAnalysisPage;
