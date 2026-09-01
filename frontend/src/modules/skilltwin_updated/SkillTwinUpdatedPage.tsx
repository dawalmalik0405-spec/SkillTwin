import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCw,
  Loader2,
  TrendingUp,
  Award,
  FileCode,
  Layers,
  ArrowRight,
  ArrowDown,
  X,
  Eye,
  Zap,
  Target,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Code,
  Database,
  Cpu,
  Terminal,
  Globe
} from 'lucide-react';
import {
  UserProfile,
  SkillTwinUpdatedResponse,
  SkillTwinUpdatedSkillChange,
  ProjectVerificationItem
} from '../../shared/types';
import { apiClient } from '../../shared/apiClient';
import PersistentSidebar from '../../shared/components/PersistentSidebar';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';

interface SkillTwinUpdatedPageProps {
  userProfile: UserProfile | null;
  onNavigateToOnboarding?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToSkillTwin?: () => void;
  onNavigateToTargetRole?: () => void;
  onNavigateToGapAnalysis?: () => void;
  onNavigateToRoadmap?: () => void;
  onNavigateToVerification?: () => void;
  onNavigateToSkillTwinUpdated?: () => void;
  onNavigateToCareerReadiness?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: () => void;
}

export const SkillTwinUpdatedPage: React.FC<SkillTwinUpdatedPageProps> = ({
  userProfile,
  onNavigateToOnboarding,
  onNavigateToEvidence,
  onNavigateToSkillTwin,
  onNavigateToTargetRole,
  onNavigateToGapAnalysis,
  onNavigateToRoadmap,
  onNavigateToVerification,
  onNavigateToSkillTwinUpdated,
  onNavigateToCareerReadiness,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToHelp
}) => {
  // Data & Loading States
  const [updatedData, setUpdatedData] = useState<SkillTwinUpdatedResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination for "What Changed?" Table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Modals & Details State
  const [selectedSkillForDetail, setSelectedSkillForDetail] = useState<SkillTwinUpdatedSkillChange | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [selectedProjectForEvidence, setSelectedProjectForEvidence] = useState<ProjectVerificationItem | null>(null);

  // Tooltip state for Growth Chart
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(5); // default last point

  // Ref for smooth scroll to "What Changed"
  const whatChangedRef = useRef<HTMLDivElement>(null);

  // Fetch Page 8 Data from Backend
  const fetchUpdatedState = async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getSkillTwinUpdated(userProfile?.id);
      setUpdatedData(data);
      if (data.latest_verified_project) {
        setSelectedProjectForEvidence(data.latest_verified_project);
      }
    } catch (err: any) {
      console.error('[SkillTwin Updated] Fetch failed:', err);
      setError(err?.message || 'Failed to load updated SkillTwin profile.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // Automatically mark SkillTwin Updated (Page 8) as complete to unlock Career Readiness (Page 9)
    localStorage.setItem('skilltwin_skilltwin_updated_completed', 'true');
    fetchUpdatedState(true);
  }, [userProfile?.id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUpdatedState(false);
  };

  const handleDownloadReport = () => {
    const url = apiClient.downloadSkillTwinUpdatedReportUrl(userProfile?.id);
    window.open(url, '_blank');
  };

  const scrollToWhatChanged = () => {
    if (whatChangedRef.current) {
      whatChangedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Pagination logic
  const allSkills = updatedData?.skill_changes || [];
  const totalPages = Math.ceil(allSkills.length / pageSize) || 1;
  const paginatedSkills = allSkills.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Skill icon helper
  const getSkillIcon = (name: string, category: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('react')) return <Code size={16} color="#61DAFB" />;
    if (lower.includes('node')) return <Terminal size={16} color="#68A063" />;
    if (lower.includes('mongo')) return <Database size={16} color="#4DB33D" />;
    if (lower.includes('js') || lower.includes('javascript')) return <Code size={16} color="#F7DF1E" />;
    if (lower.includes('git')) return <Globe size={16} color="#F05032" />;
    if (lower.includes('html') || lower.includes('css')) return <Code size={16} color="#E34F26" />;
    if (lower.includes('python')) return <Terminal size={16} color="#3776AB" />;
    if (lower.includes('fastapi')) return <Zap size={16} color="#05998B" />;
    if (lower.includes('sql') || lower.includes('postgres')) return <Database size={16} color="#336791" />;
    if (lower.includes('docker')) return <Layers size={16} color="#2496ED" />;
    if (category === 'Database') return <Database size={16} color="#38BDF8" />;
    if (category === 'Backend') return <Terminal size={16} color="#818CF8" />;
    return <Cpu size={16} color="#C084FC" />;
  };

  return (
    <div className="page-container">
      {/* TOP HEADER & WORKFLOW STEPPER (1 to 8) */}
      <header className="dashboard-header">
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

        {/* Top 8-Stage Stepper */}
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
          <div style={{ width: '8px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 2 */}
          <div onClick={onNavigateToEvidence} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>Evidence</span>
          </div>
          <div style={{ width: '8px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 3 */}
          <div onClick={onNavigateToSkillTwin} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>SkillTwin</span>
          </div>
          <div style={{ width: '8px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 4 */}
          <div onClick={onNavigateToTargetRole} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>Target Role</span>
          </div>
          <div style={{ width: '8px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 5 */}
          <div onClick={onNavigateToGapAnalysis} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>Gap Analysis</span>
          </div>
          <div style={{ width: '8px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 6 */}
          <div onClick={onNavigateToRoadmap} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>Roadmap</span>
          </div>
          <div style={{ width: '8px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 7 */}
          <div onClick={onNavigateToVerification} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.7rem', color: '#34D399', fontWeight: 600 }}>Verification</span>
          </div>
          <div style={{ width: '8px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 8: Active SkillTwin Updated */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)' }}>
              8
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#C084FC', fontWeight: 800 }}>SkillTwin Updated</span>
              <span style={{ fontSize: '0.6rem', color: '#C084FC' }}>Your Progress</span>
            </div>
          </div>

          <div style={{ width: '8px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 9: Career Readiness */}
          <div
            onClick={onNavigateToCareerReadiness}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: onNavigateToCareerReadiness ? 'pointer' : 'default', opacity: 1 }}
            title="Step 9: Career Readiness"
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.25)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#818CF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 700
            }}>
              9
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: '#F8FAFC', fontWeight: 600 }}>Career Readiness</span>
              <span style={{ fontSize: '0.58rem', color: '#34D399' }}>Ready</span>
            </div>
          </div>
        </div>

        {/* Right Header: Report Download & Last Updated */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>Last updated: {updatedData?.last_updated_label || 'Just now'}</span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              title="Refresh SkillTwin State"
            >
              <RotateCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

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
          activeStep={8}
          activeView="skilltwin_updated"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={onNavigateToEvidence}
          onNavigateToSkillTwin={onNavigateToSkillTwin}
          onNavigateToTargetRole={onNavigateToTargetRole}
          onNavigateToGapAnalysis={onNavigateToGapAnalysis}
          onNavigateToRoadmap={onNavigateToRoadmap}
          onNavigateToVerification={onNavigateToVerification}
          onNavigateToSkillTwinUpdated={onNavigateToSkillTwinUpdated || (() => {})}
          onNavigateToCareerReadiness={onNavigateToCareerReadiness}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToSettings={onNavigateToSettings}
          onNavigateToHelp={onNavigateToHelp}
        />

        {/* Center Main Work Area */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* PAGE HEADING */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                SkillTwin Updated
              </h1>
              <Sparkles size={20} color="#C084FC" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
              Your SkillTwin has been updated with new verified evidence!
            </p>
          </div>

          {/* SUCCESS BANNER */}
          <div className="glass-panel" style={{
            padding: '14px 20px',
            borderRadius: '14px',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(16, 185, 129, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
                flexShrink: 0
              }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#F8FAFC' }}>
                  Great work! Your recently verified project has improved your skills, confidence, and alignment.
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  SkillTwin has been refreshed with new evidence.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToWhatChanged}
              className="btn btn-outline"
              style={{
                padding: '6px 14px',
                fontSize: '0.76rem',
                color: '#F8FAFC',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Eye size={14} color="#818CF8" /> See What Changed
            </button>
          </div>

          {/* 4 SUMMARY METRIC CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px'
          }}>
            {/* Card 1: Overall Alignment */}
            <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Target size={15} color="#C084FC" />
                  <span>Overall Alignment</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                  {updatedData?.overall_alignment_pct || 78}%
                </span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  ↑ {updatedData?.overall_alignment_change_pct || 14}%
                </span>
              </div>

              <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden', margin: '8px 0' }}>
                <div style={{ width: `${updatedData?.overall_alignment_pct || 78}%`, height: '100%', background: 'linear-gradient(90deg, #4F46E5, #9333EA)', borderRadius: '2px' }} />
              </div>

              <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                <strong style={{ color: '#F8FAFC' }}>Good Alignment</strong> — You're getting closer to your target role!
              </div>
            </div>

            {/* Card 2: Average Proficiency */}
            <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <TrendingUp size={15} color="#38BDF8" />
                  <span>Average Proficiency</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                  {updatedData?.average_proficiency_pct || 61}%
                </span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  ↑ {updatedData?.average_proficiency_change_pct || 12}%
                </span>
              </div>

              <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden', margin: '8px 0' }}>
                <div style={{ width: `${updatedData?.average_proficiency_pct || 61}%`, height: '100%', background: 'linear-gradient(90deg, #38BDF8, #6366F1)', borderRadius: '2px' }} />
              </div>

              <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                <strong style={{ color: '#F8FAFC' }}>Intermediate</strong> — Keep building and verifying!
              </div>
            </div>

            {/* Card 3: Average Confidence */}
            <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={15} color="#34D399" />
                  <span>Average Confidence</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                  {updatedData?.average_confidence_pct || 72}%
                </span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  ↑ {updatedData?.average_confidence_change_pct || 16}%
                </span>
              </div>

              <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden', margin: '8px 0' }}>
                <div style={{ width: `${updatedData?.average_confidence_pct || 72}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #6366F1)', borderRadius: '2px' }} />
              </div>

              <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                <strong style={{ color: '#F8FAFC' }}>High</strong> — Your confidence is growing!
              </div>
            </div>

            {/* Card 4: Verified Projects */}
            <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Award size={15} color="#F59E0B" />
                  <span>Verified Projects</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                  {updatedData?.verified_projects_count || 5}
                </span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  ↑ {updatedData?.verified_projects_change_count || 1}
                </span>
              </div>

              <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden', margin: '8px 0' }}>
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #A855F7, #9333EA)', borderRadius: '2px' }} />
              </div>

              <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                <strong style={{ color: '#F8FAFC' }}>Total Verified</strong> — Keep adding real evidence!
              </div>
            </div>
          </div>

          {/* MAIN TWO-COLUMN WORK AREA */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
            gap: '20px',
            alignItems: 'start'
          }}>
            {/* LEFT COLUMN: WHAT CHANGED TABLE + HOW YOUR SKILLTWIN WAS UPDATED */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div ref={whatChangedRef} className="glass-panel" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    What Changed?
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Skill-by-skill before & after comparison backed by verified evidence
                  </span>
                </div>
              </div>

              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '110px 95px 95px 65px minmax(0, 1fr)',
                gap: '10px',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
                marginBottom: '8px'
              }}>
                <span>SKILL</span>
                <span>BEFORE</span>
                <span>AFTER</span>
                <span>CHANGE</span>
                <span>REASON</span>
              </div>

              {/* Skill Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isLoading ? (
                  <div style={{ padding: '30px', textAlign: 'center' }}>
                    <Loader2 size={24} color="#818CF8" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Loading updated skills...</span>
                  </div>
                ) : (
                  paginatedSkills.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedSkillForDetail(item)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 95px 95px 65px minmax(0, 1fr)',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'rgba(15, 23, 42, 0.65)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)')}
                    >
                      {/* 1. Skill Name & Icon */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getSkillIcon(item.skill_name, item.category)}
                        <span style={{ fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.skill_name}
                        </span>
                      </div>

                      {/* 2. Before */}
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                          {item.before_level} <span style={{ color: 'var(--text-muted)' }}>({item.before_pct}%)</span>
                        </div>
                        <div style={{ width: '70px', height: '3px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px' }}>
                          <div style={{ width: `${item.before_pct}%`, height: '100%', background: '#64748B', borderRadius: '2px' }} />
                        </div>
                      </div>

                      {/* 3. After */}
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#C084FC', fontWeight: 600, marginBottom: '2px' }}>
                          {item.after_level} <span style={{ color: '#A855F7' }}>({item.after_pct}%)</span>
                        </div>
                        <div style={{ width: '70px', height: '3px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px' }}>
                          <div style={{ width: `${item.after_pct}%`, height: '100%', background: '#A855F7', borderRadius: '2px' }} />
                        </div>
                      </div>

                      {/* 4. Change */}
                      <div>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#34D399',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.25)'
                        }}>
                          ↑ {item.change_pct}%
                        </span>
                      </div>

                      {/* 5. Reason */}
                      <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {item.reason}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {allSkills.length > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: totalPages > 1 ? 'space-between' : 'flex-start',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, allSkills.length)} of {allSkills.length} skills
                  </span>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="btn btn-outline"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          opacity: currentPage === 1 ? 0.4 : 1,
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <ChevronLeft size={12} />
                        <span>Previous</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.72rem',
                            minWidth: '28px',
                            fontWeight: currentPage === pageNum ? 700 : 500
                          }}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="btn btn-outline"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          opacity: currentPage === totalPages ? 0.4 : 1,
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <span>Next</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 🔮 HOW YOUR SKILLTWIN WAS UPDATED (4-STEP VISUAL PROCESS CARD UNDER WHAT CHANGED?) */}
            <div className="glass-panel" style={{
              padding: '20px 22px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(99, 102, 241, 0.06) 50%, rgba(15, 23, 42, 0.9) 100%)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
            }}>
              {/* Header */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
                    🔮 How Your SkillTwin Was Updated
                  </h3>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                  See how verified project evidence influences your digital twin.
                </p>
              </div>

              {/* 2-Row Spacious Process Flow: Steps 01 & 02 -> Down Arrow -> Steps 03 & 04 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Row 1: Step 01 & Step 02 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  {/* Step 01: Evidence Verified */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.65)',
                    borderRadius: '12px',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    height: '100%'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%)',
                        border: '1.5px solid rgba(168, 85, 247, 0.5)',
                        color: '#C084FC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        01
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                        Evidence Verified
                      </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      Your submitted repositories were analyzed for actual implementation.
                    </p>
                  </div>

                  {/* Connector Arrow Right */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                    <ArrowRight size={16} color="#C084FC" />
                  </div>

                  {/* Step 02: Skills Detected */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.65)',
                    borderRadius: '12px',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    height: '100%'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%)',
                        border: '1.5px solid rgba(56, 189, 248, 0.5)',
                        color: '#38BDF8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        02
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                        Skills Detected
                      </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      Technologies and capabilities demonstrated through the code were identified.
                    </p>
                  </div>
                </div>

                {/* Down Arrow Divider between Row 1 and Row 2 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '2px 0'
                }}>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(129, 140, 248, 0.2), transparent)' }} />
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818CF8'
                  }}>
                    <ArrowDown size={13} />
                  </div>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(129, 140, 248, 0.2), transparent)' }} />
                </div>

                {/* Row 2: Step 03 & Step 04 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  {/* Step 03: Evidence Weighted */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.65)',
                    borderRadius: '12px',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    height: '100%'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(234, 88, 12, 0.2) 100%)',
                        border: '1.5px solid rgba(245, 158, 11, 0.5)',
                        color: '#FBBF24',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        03
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                        Evidence Weighted
                      </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      Implementation quality, consistency, documentation and project evidence were considered.
                    </p>
                  </div>

                  {/* Connector Arrow Right */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                    <ArrowRight size={16} color="#34D399" />
                  </div>

                  {/* Step 04: SkillTwin Recalibrated */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.65)',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    height: '100%'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.2) 100%)',
                        border: '1.5px solid rgba(16, 185, 129, 0.5)',
                        color: '#34D399',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        flexShrink: 0
                      }}>
                        04
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                        SkillTwin Recalibrated
                      </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      Your existing skill profile was updated using the new verified evidence.
                    </p>
                  </div>
                </div>
              </div>

              {/* Subtle Centered Footer Note */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '14px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)'
              }}>
                <span>🔒 Only verified evidence affects your SkillTwin</span>
              </div>
            </div>
          </div>

            {/* RIGHT COLUMN: UPDATE SUMMARY & NEW EVIDENCE & TARGET ROLE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. UPDATE SUMMARY PANEL */}
              <div className="glass-panel" style={{ padding: '18px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '12px' }}>
                  Update Summary
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                  {/* Donut Gauge */}
                  <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
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
                        stroke="#10B981"
                        strokeWidth="3.6"
                        strokeDasharray="78, 100"
                        strokeLinecap="round"
                      />
                    </svg>

                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#34D399', lineHeight: 1 }}>
                        +{updatedData?.overall_alignment_change_pct || 18}%
                      </div>
                      <div style={{ fontSize: '0.52rem', color: 'var(--text-muted)' }}>
                        Overall Improvement
                      </div>
                    </div>
                  </div>

                  {/* Legend & Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#38BDF8' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Previous (Before)</span>
                      </div>
                      <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{updatedData?.overall_alignment_before_pct || 60}%</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>Current (After)</span>
                      </div>
                      <span style={{ color: '#34D399', fontWeight: 700 }}>{updatedData?.overall_alignment_pct || 78}%</span>
                    </div>
                  </div>
                </div>

                {/* Metric breakdown list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px', fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Skills Improved</span>
                    <strong style={{ color: '#F8FAFC' }}>{updatedData?.skills_improved_count || 12}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Proficiency Increase</span>
                    <strong style={{ color: '#34D399' }}>+{updatedData?.average_proficiency_change_pct || 12}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Confidence Increase</span>
                    <strong style={{ color: '#34D399' }}>+{updatedData?.average_confidence_change_pct || 16}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Alignment Increase</span>
                    <strong style={{ color: '#34D399' }}>+{updatedData?.overall_alignment_change_pct || 14}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>New Evidence Added</span>
                    <strong style={{ color: '#C084FC' }}>{updatedData?.new_evidence_count || 1} Project</strong>
                  </div>
                </div>
              </div>

              {/* 2. LATEST VERIFIED PROJECT EVIDENCE */}
              <div className="glass-panel" style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '10px' }}>
                  Latest Verified Evidence
                </div>

                {updatedData?.latest_verified_project ? (
                  <div style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    {/* Project Header Banner */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 4px',
                      marginBottom: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <FileCode size={18} color="#818CF8" />
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {updatedData.latest_verified_project.repo_url.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                        </div>
                      </div>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '0.65rem', flexShrink: 0 }}>
                        ✓
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.86rem', color: '#F8FAFC' }}>
                        {updatedData.latest_verified_project.name}
                      </strong>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34D399',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        {updatedData.latest_verified_project.status}
                      </span>
                    </div>

                    {/* Technology Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                      {(updatedData.latest_verified_project.detected_technologies || []).map((t, i) => (
                        <span key={i} style={{ padding: '1px 5px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.05)', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
                          {t}
                        </span>
                      ))}
                    </div>

                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span>{updatedData.latest_verified_project.submission_date}</span>
                      <span style={{ color: '#34D399', fontWeight: 600 }}>Score {updatedData.latest_verified_project.score_pct}% ({updatedData.latest_verified_project.score_label})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (updatedData?.latest_verified_project) {
                          setSelectedProjectForEvidence(updatedData.latest_verified_project);
                          setIsEvidenceModalOpen(true);
                        }
                      }}
                      className="btn btn-outline"
                      style={{ width: '100%', padding: '5px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <span>View Verification Details</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    <FileCode size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>No verified projects yet.</p>
                    <p style={{ fontSize: '0.68rem', margin: '4px 0 0' }}>Submit repository on Page 7 to verify evidence.</p>
                  </div>
                )}
              </div>

              {/* 3. IMPACT ON TARGET ROLE */}
              <div className="glass-panel" style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px' }}>
                  Impact on Target Role
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8' }}>
                    <Target size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                      {updatedData?.target_role || 'Full Stack Developer'}
                    </div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                      {updatedData?.experience_level || 'Entry Level (0-2 years)'}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#34D399',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px'
                }}>
                  <CheckCircle2 size={14} />
                  <span>Alignment Improved {updatedData?.overall_alignment_before_pct || 64}% → {updatedData?.overall_alignment_pct || 78}%</span>
                </div>

                <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.35, margin: 0 }}>
                  {updatedData?.target_role_impact_explanation || "You're now better aligned with the requirements for Full Stack Developer role."}
                </p>
              </div>

              {/* 4. WHAT'S NEXT? PANEL */}
              <div className="glass-panel" style={{ padding: '16px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px' }}>
                  What's Next?
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  {[
                    'Keep building and verifying projects',
                    'Strengthen remaining skill gaps',
                    'Stay consistent on your roadmap',
                    'Track your growth regularly'
                  ].map((text, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={13} color="#10B981" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onNavigateToCareerReadiness}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%)',
                    boxShadow: '0 4px 18px rgba(124, 58, 237, 0.45)',
                    cursor: 'pointer'
                  }}
                  title="Proceed to Career Readiness"
                >
                  <span>Career Readiness →</span>
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: SKILL GROWTH OVER TIME + RECENT ACTIVITY */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
            gap: '20px',
            alignItems: 'start'
          }}>
            {/* 1. SKILL GROWTH OVER TIME (INTERACTIVE DUAL LINE CHART) */}
            <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Skill Growth Over Time
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.7rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A855F7' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Proficiency</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Alignment</span>
                  </div>
                </div>
              </div>

              {/* Interactive SVG Chart Container */}
              <div style={{ position: 'relative', height: '170px', width: '100%' }}>
                {(() => {
                  const timeline = updatedData?.growth_timeline && updatedData.growth_timeline.length > 0
                    ? updatedData.growth_timeline
                    : [
                        { date_label: 'Stage 1', proficiency_pct: 20, alignment_pct: 20 },
                        { date_label: 'Stage 2', proficiency_pct: 35, alignment_pct: 30 },
                        { date_label: 'Stage 3', proficiency_pct: 45, alignment_pct: 40 },
                        { date_label: 'Stage 4', proficiency_pct: 50, alignment_pct: 50 },
                        { date_label: 'Stage 6', proficiency_pct: 55, alignment_pct: 55 },
                        { date_label: 'Current', proficiency_pct: updatedData?.average_proficiency_pct || 60, alignment_pct: updatedData?.overall_alignment_pct || 65 }
                      ];

                  const profPointsStr = timeline.map((pt, i) => {
                    const x = 70 + i * (390 / Math.max(timeline.length - 1, 1));
                    const y = 135 - (pt.proficiency_pct / 100) * 110;
                    return `${x},${y}`;
                  }).join(' ');

                  const alignPointsStr = timeline.map((pt, i) => {
                    const x = 70 + i * (390 / Math.max(timeline.length - 1, 1));
                    const y = 135 - (pt.alignment_pct / 100) * 110;
                    return `${x},${y}`;
                  }).join(' ');

                  return (
                    <svg viewBox="0 0 500 150" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <line x1="40" y1="55" x2="480" y2="55" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <line x1="40" y1="90" x2="480" y2="90" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                      <line x1="40" y1="125" x2="480" y2="125" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                      {/* Y Axis Labels */}
                      <text x="10" y="23" fill="var(--text-muted)" fontSize="9">100%</text>
                      <text x="15" y="58" fill="var(--text-muted)" fontSize="9">75%</text>
                      <text x="15" y="93" fill="var(--text-muted)" fontSize="9">50%</text>
                      <text x="15" y="128" fill="var(--text-muted)" fontSize="9">25%</text>

                      {/* Polyline 1: Proficiency (Purple) */}
                      <polyline
                        fill="none"
                        stroke="#A855F7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={profPointsStr}
                      />

                      {/* Polyline 2: Alignment (Green) */}
                      <polyline
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={alignPointsStr}
                      />

                      {/* Dots for Proficiency */}
                      {timeline.map((pt, idx) => {
                        const x = 70 + idx * (390 / Math.max(timeline.length - 1, 1));
                        const y = 135 - (pt.proficiency_pct / 100) * 110;
                        return (
                          <circle
                            key={`prof-${idx}`}
                            cx={x}
                            cy={y}
                            r={hoveredPointIndex === idx ? 5 : 3.5}
                            fill="#A855F7"
                            stroke="#FFFFFF"
                            strokeWidth={hoveredPointIndex === idx ? 2 : 1}
                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            onMouseEnter={() => setHoveredPointIndex(idx)}
                          />
                        );
                      })}

                      {/* Dots for Alignment */}
                      {timeline.map((pt, idx) => {
                        const x = 70 + idx * (390 / Math.max(timeline.length - 1, 1));
                        const y = 135 - (pt.alignment_pct / 100) * 110;
                        return (
                          <circle
                            key={`align-${idx}`}
                            cx={x}
                            cy={y}
                            r={hoveredPointIndex === idx ? 5 : 3.5}
                            fill="#10B981"
                            stroke="#FFFFFF"
                            strokeWidth={hoveredPointIndex === idx ? 2 : 1}
                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                            onMouseEnter={() => setHoveredPointIndex(idx)}
                          />
                        );
                      })}

                      {/* X Axis Labels */}
                      {timeline.map((pt, idx) => {
                        const x = 70 + idx * (390 / Math.max(timeline.length - 1, 1));
                        return (
                          <text key={idx} x={x - 14} y="148" fill="var(--text-muted)" fontSize="8">
                            {pt.date_label}
                          </text>
                        );
                      })}
                    </svg>
                  );
                })()}

                {/* Hover Tooltip Box */}
                {hoveredPointIndex !== null && updatedData?.growth_timeline && updatedData.growth_timeline[hoveredPointIndex] && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '30px',
                    padding: '8px 12px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.68rem',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                    pointerEvents: 'none'
                  }}>
                    <div style={{ color: '#F8FAFC', fontWeight: 700, marginBottom: '2px' }}>
                      {updatedData.growth_timeline[hoveredPointIndex].date_label}
                    </div>
                    <div style={{ color: '#C084FC' }}>
                      Proficiency: {updatedData.growth_timeline[hoveredPointIndex].proficiency_pct}%
                    </div>
                    <div style={{ color: '#34D399' }}>
                      Alignment: {updatedData.growth_timeline[hoveredPointIndex].alignment_pct}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. RECENT ACTIVITY PANEL */}
            <div className="glass-panel" style={{ padding: '18px 20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '14px' }}>
                Recent Activity
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(updatedData?.recent_activity || []).length === 0 ? (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                    No recent activity records yet.
                  </div>
                ) : (
                  (updatedData?.recent_activity || []).map((act, idx) => (
                    <div
                      key={act.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <CheckCircle2 size={15} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#F8FAFC' }}>
                            {act.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                            {act.subtitle}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        {act.timestamp_label}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM INSPIRATIONAL & ACTION BANNER */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.2) 0%, rgba(15, 23, 42, 0.9) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34D399',
                flexShrink: 0
              }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#F8FAFC' }}>
                  SkillTwin Updated Successfully!
                </div>
                <p style={{ fontSize: '0.72rem', color: '#34D399', margin: '2px 0 0' }}>
                  Your digital twin is refreshed with verified evidence. Ready to evaluate your overall Career Readiness score.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateToCareerReadiness}
              className="btn btn-primary"
              style={{
                padding: '9px 20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
              title="Proceed to Career Readiness"
            >
              <span>Career Readiness →</span>
            </button>
          </div>

          {/* Bottom Pagination / Stage Navigation Links */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onNavigateToVerification}
              className="btn btn-outline"
              style={{ padding: '6px 14px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>← Previous: Project Verification</span>
            </button>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Stage 8 of 9: SkillTwin Updated
            </div>

            <button
              type="button"
              onClick={onNavigateToCareerReadiness}
              className="btn btn-primary"
              style={{
                padding: '7px 18px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
                cursor: 'pointer'
              }}
            >
              <span>Career Readiness →</span>
            </button>
          </div>

          {/* DETAIL MODAL FOR CLICKED SKILL */}
          {selectedSkillForDetail && (
            <div className="modal-backdrop" onClick={() => setSelectedSkillForDetail(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '660px', padding: '30px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {getSkillIcon(selectedSkillForDetail.skill_name, selectedSkillForDetail.category)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {selectedSkillForDetail.skill_name}
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                        {selectedSkillForDetail.category} Skill Evolution
                      </span>
                    </div>
                  </div>

                  <button onClick={() => setSelectedSkillForDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Before / After Delta Box */}
                <div style={{ padding: '16px 20px', background: 'rgba(15, 23, 42, 0.75)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>PREVIOUS LEVEL</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '3px' }}>
                        {selectedSkillForDetail.before_level} ({selectedSkillForDetail.before_pct}%)
                      </div>
                    </div>

                    <div style={{
                      padding: '6px 14px',
                      borderRadius: '10px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34D399',
                      fontSize: '0.82rem',
                      fontWeight: 800
                    }}>
                      +{selectedSkillForDetail.change_pct}% Improvement
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>REFRESHED LEVEL</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#C084FC', marginTop: '3px' }}>
                        {selectedSkillForDetail.after_level} ({selectedSkillForDetail.after_pct}%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence & Reasoning */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  <div style={{ padding: '16px 18px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <strong style={{ color: '#F8FAFC', display: 'block', marginBottom: '6px' }}>Evidence-Based Reasoning:</strong>
                    <p style={{ margin: 0, lineHeight: 1.55 }}>{selectedSkillForDetail.reason}</p>
                  </div>

                  <div style={{ padding: '16px 18px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <strong style={{ color: '#F8FAFC', display: 'block', marginBottom: '6px' }}>Demonstrated Implementation:</strong>
                    <p style={{ margin: 0, lineHeight: 1.55 }}>{selectedSkillForDetail.evidence_text}</p>
                  </div>

                  {selectedSkillForDetail.file_citations && selectedSkillForDetail.file_citations.length > 0 && (
                    <div style={{ fontSize: '0.74rem', color: '#818CF8', padding: '6px 2px' }}>
                      📁 <strong>Verified File Citations:</strong> {selectedSkillForDetail.file_citations.join(', ')}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-primary" onClick={() => setSelectedSkillForDetail(null)} style={{ padding: '8px 22px', fontSize: '0.82rem' }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PROJECT EVIDENCE DETAILS MODAL */}
          {isEvidenceModalOpen && selectedProjectForEvidence && (
            <div className="modal-backdrop" onClick={() => setIsEvidenceModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', padding: '30px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8', flexShrink: 0 }}>
                      <FileCode size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {selectedProjectForEvidence.name}
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '3px' }}>
                        Verified GitHub Repository Evidence
                      </span>
                    </div>
                  </div>

                  <button onClick={() => setIsEvidenceModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ padding: '16px 20px', background: 'rgba(15, 23, 42, 0.75)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '18px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Score: <strong style={{ color: '#34D399' }}>{selectedProjectForEvidence.score_pct}% ({selectedProjectForEvidence.score_label})</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>Commits: <strong style={{ color: '#F8FAFC' }}>{selectedProjectForEvidence.commits_count}</strong></span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{selectedProjectForEvidence.description}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '2px' }}>Verified Skills in this Repository:</div>
                  {selectedProjectForEvidence.verified_skills.map((vs, i) => (
                    <div key={i} style={{ padding: '12px 16px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', fontSize: '0.76rem', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F8FAFC', fontWeight: 700, marginBottom: '4px' }}>
                        <span>{vs.skill_name}</span>
                        <span style={{ color: '#34D399' }}>{vs.status}</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>{vs.evidence}</p>
                      {vs.file_locations && (
                        <div style={{ fontSize: '0.7rem', color: '#818CF8', marginTop: '6px' }}>📁 {vs.file_locations.join(', ')}</div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-primary" onClick={() => setIsEvidenceModalOpen(false)} style={{ padding: '8px 22px', fontSize: '0.82rem' }}>
                    Close
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

export default SkillTwinUpdatedPage;
