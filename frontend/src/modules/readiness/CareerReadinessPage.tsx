import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCw,
  Loader2,
  Award,
  Layers,
  ArrowRight,
  X,
  Trophy,
  FileText,
  Compass,
  Cpu,
  Zap,
  Code,
  ChevronRight
} from 'lucide-react';
import {
  UserProfile,
  CareerReadinessResponse
} from '../../shared/types';
import { apiClient } from '../../shared/apiClient';
import PersistentSidebar from '../../shared/components/PersistentSidebar';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';

interface CareerReadinessPageProps {
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

export const CareerReadinessPage: React.FC<CareerReadinessPageProps> = ({
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
  const [readinessData, setReadinessData] = useState<CareerReadinessResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [activeSkillCategoryModal, setActiveSkillCategoryModal] = useState<'strong' | 'developing' | 'gaps' | null>(null);

  // Fetch Career Readiness Data from Backend
  const fetchReadiness = async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getCareerReadiness(userProfile?.id);
      setReadinessData(data);
    } catch (err: any) {
      console.error('[Career Readiness] Fetch failed:', err);
      setError(err?.message || 'Failed to load Career Readiness metrics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    localStorage.setItem('skilltwin_readiness_completed', 'true');
    fetchReadiness(true);
  }, [userProfile?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await apiClient.recalculateCareerReadiness(userProfile?.id);
      setReadinessData(refreshed);
    } catch (err: any) {
      console.error('[Career Readiness] Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownloadReport = () => {
    const url = apiClient.downloadCareerReadinessReportUrl(userProfile?.id);
    window.open(url, '_blank');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px 24px 32px' }}>
      {/* TOP HEADER & 9-STAGE PROGRESS STEPPER */}
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

        {/* Top 9-Stage Stepper */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '6px 10px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflowX: 'auto'
        }}>
          {/* Step 1 */}
          <div onClick={onNavigateToOnboarding} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.68rem', color: '#F8FAFC', fontWeight: 600 }}>Onboarding</span>
          </div>
          <div style={{ width: '6px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 2 */}
          <div onClick={onNavigateToEvidence} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.68rem', color: '#F8FAFC', fontWeight: 600 }}>Evidence</span>
          </div>
          <div style={{ width: '6px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 3 */}
          <div onClick={onNavigateToSkillTwin} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.68rem', color: '#F8FAFC', fontWeight: 600 }}>SkillTwin</span>
          </div>
          <div style={{ width: '6px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 4 */}
          <div onClick={onNavigateToTargetRole} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.68rem', color: '#F8FAFC', fontWeight: 600 }}>Target Role</span>
          </div>
          <div style={{ width: '6px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 5 */}
          <div onClick={onNavigateToGapAnalysis} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.68rem', color: '#F8FAFC', fontWeight: 600 }}>Gap Analysis</span>
          </div>
          <div style={{ width: '6px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 6 */}
          <div onClick={onNavigateToRoadmap} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.68rem', color: '#F8FAFC', fontWeight: 600 }}>Roadmap</span>
          </div>
          <div style={{ width: '6px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 7 */}
          <div onClick={onNavigateToVerification} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.68rem', color: '#34D399', fontWeight: 600 }}>Verified</span>
          </div>
          <div style={{ width: '6px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 8 */}
          <div onClick={onNavigateToSkillTwinUpdated} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
              ✓
            </div>
            <span style={{ fontSize: '0.68rem', color: '#34D399', fontWeight: 600 }}>Updated</span>
          </div>
          <div style={{ width: '6px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 9: Active Career Readiness */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)' }}>
              9
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: '#C084FC', fontWeight: 800 }}>Career Readiness</span>
              <span style={{ fontSize: '0.58rem', color: '#C084FC' }}>Your Journey</span>
            </div>
          </div>
        </div>

        {/* Right Header: Report Download & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>Last refreshed: {readinessData?.last_refreshed_label || 'Just now'}</span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              title="Recalculate Career Readiness"
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
          activeStep={9}
          activeView="readiness"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={onNavigateToEvidence}
          onNavigateToSkillTwin={onNavigateToSkillTwin}
          onNavigateToTargetRole={onNavigateToTargetRole}
          onNavigateToGapAnalysis={onNavigateToGapAnalysis}
          onNavigateToRoadmap={onNavigateToRoadmap}
          onNavigateToVerification={onNavigateToVerification}
          onNavigateToSkillTwinUpdated={onNavigateToSkillTwinUpdated}
          onNavigateToCareerReadiness={onNavigateToCareerReadiness || (() => {})}
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

          {isLoading ? (
            <div className="glass-panel" style={{ padding: '80px 20px', textAlign: 'center' }}>
              <Loader2 size={36} color="#818CF8" style={{ animation: 'spin 1.2s linear infinite', margin: '0 auto 14px' }} />
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                Calculating Career Readiness & Continuous Loop...
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Evaluating verified evidence, target-role alignment, and milestone progression.
              </p>
            </div>
          ) : (
            <>
              {/* PAGE HEADING */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    Your Career Readiness ✨
                  </h1>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
                  Based on your verified skills, projects, and continuous growth.
                </p>
              </div>

          {/* TOP 4 PRIMARY METRIC CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px'
          }}>
            {/* 1. Career Readiness Score */}
            <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Career Readiness Score
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                {/* Circular Score Ring */}
                <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
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
                      strokeDasharray={`${readinessData?.career_readiness_score || 76}, 100`}
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
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                      {readinessData?.career_readiness_score || 76}%
                    </div>
                    <div style={{ fontSize: '0.5rem', color: '#34D399', fontWeight: 700 }}>
                      {readinessData?.career_readiness_label || 'Good'}
                    </div>
                  </div>
                </div>

                {/* Delta Badge */}
                <div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34D399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'inline-block',
                    marginBottom: '4px'
                  }}>
                    ↑ {readinessData?.career_readiness_change_pct || 18}%
                  </span>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    since last update
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                {readinessData?.career_readiness_explanation || "You're on the right track! Keep building and verifying."}
              </div>
            </div>

            {/* 2. Industry Alignment */}
            <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Industry Alignment
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                {/* Circular Ring */}
                <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
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
                      stroke="#A855F7"
                      strokeWidth="3.6"
                      strokeDasharray={`${readinessData?.industry_alignment_pct || 78}, 100`}
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
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                      {readinessData?.industry_alignment_pct || 78}%
                    </div>
                    <div style={{ fontSize: '0.5rem', color: '#C084FC', fontWeight: 700 }}>
                      {readinessData?.industry_alignment_label || 'High'}
                    </div>
                  </div>
                </div>

                {/* Delta Badge */}
                <div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#C084FC',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    display: 'inline-block',
                    marginBottom: '4px'
                  }}>
                    ↑ {readinessData?.industry_alignment_change_pct || 16}%
                  </span>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    since last update
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                {readinessData?.industry_alignment_explanation || "Strong alignment with Full Stack Developer role."}
              </div>
            </div>

            {/* 3. Overall Progress (Mini Chart) */}
            <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overall Progress</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.62rem' }}>
                  <span style={{ color: '#C084FC' }}>● This Journey</span>
                  <span style={{ color: '#38BDF8' }}>● Industry</span>
                </div>
              </div>

              {/* Mini SVG Progress Sparkline */}
              {(() => {
                const progressPoints = readinessData?.overall_progress_points && readinessData.overall_progress_points.length > 0
                  ? readinessData.overall_progress_points
                  : [
                      { date_label: 'Stage 1', this_journey_pct: 20, industry_benchmark_pct: 40 },
                      { date_label: 'Stage 2', this_journey_pct: 35, industry_benchmark_pct: 48 },
                      { date_label: 'Stage 3', this_journey_pct: 48, industry_benchmark_pct: 55 },
                      { date_label: 'Stage 4', this_journey_pct: 56, industry_benchmark_pct: 60 },
                      { date_label: 'Stage 6', this_journey_pct: 65, industry_benchmark_pct: 65 },
                      { date_label: 'Current', this_journey_pct: readinessData?.career_readiness_score || 70, industry_benchmark_pct: 72 }
                    ];

                const benchPointsStr = progressPoints.map((pt, i) => {
                  const x = 10 + i * (185 / Math.max(progressPoints.length - 1, 1));
                  const y = 50 - (pt.industry_benchmark_pct / 100) * 40;
                  return `${x},${y}`;
                }).join(' ');

                const journeyPointsStr = progressPoints.map((pt, i) => {
                  const x = 10 + i * (185 / Math.max(progressPoints.length - 1, 1));
                  const y = 50 - (pt.this_journey_pct / 100) * 40;
                  return `${x},${y}`;
                }).join(' ');

                const lastJourneyPt = progressPoints[progressPoints.length - 1];
                const lastX = 10 + (progressPoints.length - 1) * (185 / Math.max(progressPoints.length - 1, 1));
                const lastY = 50 - (lastJourneyPt.this_journey_pct / 100) * 40;

                return (
                  <>
                    <div style={{ height: '55px', width: '100%', margin: '4px 0' }}>
                      <svg viewBox="0 0 200 60" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        {/* Industry Benchmark line (Blue) */}
                        <polyline
                          fill="none"
                          stroke="#38BDF8"
                          strokeWidth="1.8"
                          strokeDasharray="2 2"
                          points={benchPointsStr}
                        />
                        {/* This Journey line (Purple) */}
                        <polyline
                          fill="none"
                          stroke="#A855F7"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          points={journeyPointsStr}
                        />
                        {/* End Dot */}
                        <circle cx={lastX} cy={lastY} r="3" fill="#A855F7" stroke="#FFF" strokeWidth="1" />
                      </svg>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                      {progressPoints.map((pt, idx) => (
                        <span key={idx}>{pt.date_label}</span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 4. Total Verified Projects */}
            <div className="glass-card" style={{ padding: '16px 18px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Total Verified Projects
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10B981',
                  flexShrink: 0
                }}>
                  <Award size={22} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                      {readinessData?.total_verified_projects ?? 0}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Projects</span>
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#34D399', fontWeight: 600, marginTop: '2px' }}>
                    {readinessData && readinessData.total_verified_projects > 0 ? `↑ ${readinessData.verified_projects_change_count} verified` : 'Awaiting project submissions'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                {readinessData?.verified_projects_explanation || "Submit and verify GitHub repositories on Page 7 to earn verified skill credibility."}
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: 4-COLUMN SKILL STATUS GRID + RECOMMENDED ACTION PANEL */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)',
            gap: '20px',
            alignItems: 'start'
          }}>
            {/* LEFT: 4-COLUMN SKILL STATUS CARDS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '12px'
            }}>
              {/* Card 1: Strong Skills */}
              <div className="glass-panel" style={{ padding: '14px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34D399' }}>Strong Skills</span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {readinessData?.strong_skills.length || 12}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>SKILL</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>PROF</span>
                    <span>CONF</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(readinessData?.strong_skills.slice(0, 5) || []).map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981' }} />
                        <span style={{ color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                          {s.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem' }}>
                        <span style={{ color: '#34D399', fontWeight: 600 }}>{s.proficiency_pct}%</span>
                        <span style={{ color: 'var(--text-muted)' }}>{s.confidence_pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSkillCategoryModal('strong')}
                  style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  <span>View all strong skills</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              {/* Card 2: Developing Skills */}
              <div className="glass-panel" style={{ padding: '14px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FCD34D' }}>Developing Skills</span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {readinessData?.developing_skills.length || 8}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>SKILL</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>PROF</span>
                    <span>CONF</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(readinessData?.developing_skills.slice(0, 5) || []).map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#F59E0B' }} />
                        <span style={{ color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                          {s.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem' }}>
                        <span style={{ color: '#FCD34D', fontWeight: 600 }}>{s.proficiency_pct}%</span>
                        <span style={{ color: 'var(--text-muted)' }}>{s.confidence_pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSkillCategoryModal('developing')}
                  style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  <span>View all developing skills</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              {/* Card 3: Critical Gaps */}
              <div className="glass-panel" style={{ padding: '14px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F87171' }}>Critical Gaps</span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {readinessData?.critical_gaps.length || 5}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>SKILL</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span>PROF</span>
                    <span>CONF</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(readinessData?.critical_gaps.slice(0, 5) || []).map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#EF4444' }} />
                        <span style={{ color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                          {s.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem' }}>
                        <span style={{ color: '#F87171', fontWeight: 600 }}>{s.proficiency_pct}%</span>
                        <span style={{ color: 'var(--text-muted)' }}>{s.confidence_pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToGapAnalysis?.()}
                  style={{ background: 'none', border: 'none', color: '#F87171', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  <span>View all gaps & recommendations</span>
                  <ChevronRight size={12} />
                </button>
              </div>

              {/* Card 4: Recently Verified */}
              <div className="glass-panel" style={{ padding: '14px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34D399' }}>Recently Verified</span>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    {readinessData?.recently_verified.length || 4}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(readinessData?.recently_verified.slice(0, 4) || []).map((r, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={12} color="#10B981" />
                        <span style={{ color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85px' }}>
                          {r.name}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>
                        {r.verified_date}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToVerification?.()}
                  style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  <span>View all verified projects</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>

            {/* RIGHT: RECOMMENDED NEXT ACTION PANEL */}
            <div className="glass-panel" style={{
              padding: '18px',
              borderRadius: '14px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(168, 85, 247, 0.25)'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '12px' }}>
                Recommended Next Action
              </div>

              <div style={{
                padding: '12px',
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C084FC' }}>
                    <Zap size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Next Skill to Focus</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F8FAFC' }}>
                      {readinessData?.recommended_action.title || 'System Design Fundamentals'}
                    </div>
                  </div>
                  <span style={{
                    marginLeft: 'auto',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#F87171',
                    fontSize: '0.62rem',
                    fontWeight: 700
                  }}>
                    {readinessData?.recommended_action.priority_label || 'High Impact'}
                  </span>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                  <strong style={{ color: '#F8FAFC' }}>Why?</strong> {readinessData?.recommended_action.why_text || 'High demand skill with major impact on your target role.'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onNavigateToRoadmap}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '9px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span>Continue Roadmap</span>
                  <ArrowRight size={14} />
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  Or
                </div>

                <button
                  type="button"
                  onClick={onNavigateToVerification}
                  className="btn btn-outline"
                  style={{ width: '100%', padding: '7px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span>↑ Verify New Project</span>
                </button>
              </div>
            </div>
          </div>

          {/* MIDDLE-LOWER SECTION: 3 COLUMNS + FAR RIGHT JOURNEY TIMELINE */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.1fr) minmax(0, 1fr)',
            gap: '16px',
            alignItems: 'start'
          }}>
            {/* 1. Skill Growth Over Time Chart */}
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px' }}>
                Skill Growth Over Time
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.62rem', marginBottom: '8px' }}>
                <span style={{ color: '#A855F7' }}>● Proficiency</span>
                <span style={{ color: '#38BDF8' }}>● Confidence</span>
                <span style={{ color: '#10B981' }}>● Alignment</span>
              </div>

              {/* Triple-Line Interactive Chart */}
              {(() => {
                const skillGrowth = readinessData?.skill_growth_points && readinessData.skill_growth_points.length > 0
                  ? readinessData.skill_growth_points
                  : [
                      { date_label: 'Stage 1', proficiency_pct: 25, confidence_pct: 30, alignment_pct: 20 },
                      { date_label: 'Stage 2', proficiency_pct: 38, confidence_pct: 42, alignment_pct: 32 },
                      { date_label: 'Stage 3', proficiency_pct: 48, confidence_pct: 52, alignment_pct: 45 },
                      { date_label: 'Stage 4', proficiency_pct: 52, confidence_pct: 58, alignment_pct: 50 },
                      { date_label: 'Stage 6', proficiency_pct: 58, confidence_pct: 62, alignment_pct: 55 },
                      { date_label: 'Current', proficiency_pct: readinessData?.industry_alignment_pct || 60, confidence_pct: 70, alignment_pct: readinessData?.industry_alignment_pct || 65 }
                    ];

                const profPtsStr = skillGrowth.map((pt, i) => {
                  const x = 30 + i * (250 / Math.max(skillGrowth.length - 1, 1));
                  const y = 75 - (pt.proficiency_pct / 100) * 60;
                  return `${x},${y}`;
                }).join(' ');

                const confPtsStr = skillGrowth.map((pt, i) => {
                  const x = 30 + i * (250 / Math.max(skillGrowth.length - 1, 1));
                  const y = 75 - (pt.confidence_pct / 100) * 60;
                  return `${x},${y}`;
                }).join(' ');

                const alignPtsStr = skillGrowth.map((pt, i) => {
                  const x = 30 + i * (250 / Math.max(skillGrowth.length - 1, 1));
                  const y = 75 - (pt.alignment_pct / 100) * 60;
                  return `${x},${y}`;
                }).join(' ');

                const lastGrowth = skillGrowth[skillGrowth.length - 1];
                const lastX = 30 + (skillGrowth.length - 1) * (250 / Math.max(skillGrowth.length - 1, 1));

                return (
                  <>
                    <div style={{ position: 'relative', height: '110px', width: '100%' }}>
                      <svg viewBox="0 0 300 90" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        {/* Grid Lines */}
                        <line x1="20" y1="10" x2="290" y2="10" stroke="rgba(255,255,255,0.05)" />
                        <line x1="20" y1="40" x2="290" y2="40" stroke="rgba(255,255,255,0.05)" />
                        <line x1="20" y1="70" x2="290" y2="70" stroke="rgba(255,255,255,0.05)" />

                        {/* Line 1: Proficiency (Purple) */}
                        <polyline
                          fill="none"
                          stroke="#A855F7"
                          strokeWidth="2"
                          points={profPtsStr}
                        />
                        {/* Line 2: Confidence (Blue) */}
                        <polyline
                          fill="none"
                          stroke="#38BDF8"
                          strokeWidth="2"
                          points={confPtsStr}
                        />
                        {/* Line 3: Alignment (Green) */}
                        <polyline
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="2"
                          points={alignPtsStr}
                        />

                        {/* End Dots */}
                        <circle cx={lastX} cy={75 - (lastGrowth.proficiency_pct / 100) * 60} r="3" fill="#A855F7" stroke="#FFF" strokeWidth="1" />
                        <circle cx={lastX} cy={75 - (lastGrowth.confidence_pct / 100) * 60} r="3" fill="#38BDF8" stroke="#FFF" strokeWidth="1" />
                        <circle cx={lastX} cy={75 - (lastGrowth.alignment_pct / 100) * 60} r="3" fill="#10B981" stroke="#FFF" strokeWidth="1" />

                        {/* X Axis Ticks */}
                        {skillGrowth.map((pt, idx) => {
                          const x = 30 + idx * (250 / Math.max(skillGrowth.length - 1, 1));
                          return (
                            <text key={idx} x={x - 10} y="85" fill="var(--text-muted)" fontSize="7">{pt.date_label}</text>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Tooltip Summary */}
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                      {lastGrowth?.date_label || 'Current'}: <span style={{ color: '#A855F7' }}>Prof {lastGrowth?.proficiency_pct || 0}%</span> • <span style={{ color: '#38BDF8' }}>Conf {lastGrowth?.confidence_pct || 0}%</span> • <span style={{ color: '#10B981' }}>Align {lastGrowth?.alignment_pct || 0}%</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 2. Latest SkillTwin Update */}
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px' }}>
                Latest SkillTwin Update
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '0.65rem' }}>
                  ✓
                </div>
                <div style={{ fontSize: '0.74rem', color: '#34D399', fontWeight: 700 }}>
                  {readinessData?.latest_update?.updated_date ? `Updated on ${readinessData.latest_update.updated_date}` : 'Recently Synchronized'}
                </div>
              </div>

              <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.3 }}>
                {readinessData?.latest_update?.description || 'New evidence has improved your proficiency, confidence and alignment.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.68rem', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A855F7' }}>
                  <span>● Proficiency</span>
                  <strong>+{readinessData?.latest_update?.proficiency_change_pct || 0}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38BDF8' }}>
                  <span>● Confidence</span>
                  <strong>+{readinessData?.latest_update?.confidence_change_pct || 0}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                  <span>● Alignment</span>
                  <strong>+{readinessData?.latest_update?.alignment_change_pct || 0}%</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={onNavigateToSkillTwinUpdated}
                className="btn btn-outline"
                style={{ width: '100%', padding: '5px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <span>View Update Details</span>
                <ChevronRight size={12} />
              </button>
            </div>

            {/* 3. Top Skills by Proficiency */}
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px' }}>
                Top Skills by Proficiency
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(readinessData?.top_skills_by_proficiency || []).length === 0 ? (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', padding: '10px 0', textAlign: 'center' }}>
                    No skills categorized yet.
                  </div>
                ) : (
                  (readinessData?.top_skills_by_proficiency || []).map((t, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#F8FAFC' }}>
                        <span>{t.name}</span>
                        <span style={{ color: '#C084FC', fontWeight: 700 }}>{t.proficiency_pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px' }}>
                        <div style={{ width: `${t.proficiency_pct}%`, height: '100%', background: 'linear-gradient(90deg, #4F46E5, #9333EA)', borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={onNavigateToSkillTwin}
                style={{ background: 'none', border: 'none', color: '#38BDF8', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                <span>View all skills</span>
                <ChevronRight size={12} />
              </button>
            </div>

            {/* 4. Your Journey So Far */}
            <div className="glass-panel" style={{ padding: '16px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px' }}>
                Your Journey So Far
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {(readinessData?.journey_milestones || []).map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
                    <strong style={{ color: '#F8FAFC' }}>{m.value}</strong>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.64rem', color: '#C084FC', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                Keep building. You're doing amazing! 🚀
              </div>
            </div>
          </div>

          {/* LOWER SECTION: THE SKILLTWIN LOOP CONTINUOUS CYCLE */}
          <div className="glass-panel" style={{
            padding: '18px 20px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.75)'
          }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '2px' }}>
              The SkillTwin Loop
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 14px' }}>
              Continue this cycle to grow, verify and achieve your goals.
            </p>

            {/* 9-Node Continuous Flow Diagram */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              overflowX: 'auto',
              padding: '6px 0',
              gap: '6px'
            }}>
              {[
                { label: 'Collect Evidence', icon: <FileText size={14} />, color: '#38BDF8', action: onNavigateToEvidence },
                { label: 'AI Analysis', icon: <Cpu size={14} />, color: '#818CF8', action: onNavigateToEvidence },
                { label: 'SkillTwin Created', icon: <Layers size={14} />, color: '#A855F7', action: onNavigateToSkillTwin },
                { label: 'Gap Analysis', icon: <Compass size={14} />, color: '#F59E0B', action: onNavigateToGapAnalysis },
                { label: 'Personalized Roadmap', icon: <Award size={14} />, color: '#10B981', action: onNavigateToRoadmap },
                { label: 'Build Projects', icon: <Code size={14} />, color: '#38BDF8', action: onNavigateToRoadmap },
                { label: 'Verify Projects', icon: <CheckCircle2 size={14} />, color: '#10B981', action: onNavigateToVerification },
                { label: 'SkillTwin Updated', icon: <Zap size={14} />, color: '#C084FC', action: onNavigateToSkillTwinUpdated },
                { label: 'Repeat', icon: <RotateCw size={14} />, color: '#34D399', action: handleRefresh }
              ].map((node, i, arr) => (
                <React.Fragment key={i}>
                  <div
                    onClick={node.action}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      minWidth: '85px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: `1px solid ${node.color}40`,
                      color: node.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 10px ${node.color}20`
                    }}>
                      {node.icon}
                    </div>
                    <span style={{ fontSize: '0.64rem', color: '#F8FAFC', fontWeight: 600, lineHeight: 1.15 }}>
                      {node.label}
                    </span>
                  </div>

                  {i < arr.length - 1 && (
                    <div style={{ width: '12px', height: '1px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* FINAL MOTIVATIONAL & SECURITY PANEL */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: '16px',
            alignItems: 'center',
            padding: '16px 20px',
            borderRadius: '14px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(168, 85, 247, 0.1) 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(168, 85, 247, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C084FC',
                flexShrink: 0
              }}>
                <Trophy size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF' }}>
                  You're making real progress!
                </div>
                <p style={{ fontSize: '0.74rem', color: '#E2E8F0', margin: '2px 0 0' }}>
                  Consistency + Real Projects + Continuous Verification = Career Success
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateToRoadmap}
              className="btn btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              Continue to Roadmap →
            </button>
          </div>

          {/* ALL SKILLS MODAL (FOR STRONG / DEVELOPING / GAPS) */}
          {activeSkillCategoryModal && (
            <div className="modal-backdrop" onClick={() => setActiveSkillCategoryModal(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: 0, textTransform: 'capitalize' }}>
                    {activeSkillCategoryModal === 'strong' ? 'Strong Demonstrated Skills' : (activeSkillCategoryModal === 'developing' ? 'Developing Skills' : 'Critical Gaps')}
                  </h3>
                  <button onClick={() => setActiveSkillCategoryModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                  {(
                    activeSkillCategoryModal === 'strong'
                      ? readinessData?.strong_skills
                      : (activeSkillCategoryModal === 'developing' ? readinessData?.developing_skills : readinessData?.critical_gaps)
                  )?.map((s, idx) => (
                    <div key={idx} style={{ padding: '10px 12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                      <span style={{ fontWeight: 700, color: '#F8FAFC' }}>{s.name} ({s.category})</span>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <span style={{ color: '#34D399' }}>Proficiency: {s.proficiency_pct}%</span>
                        <span style={{ color: '#38BDF8' }}>Confidence: {s.confidence_pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" className="btn btn-primary" onClick={() => setActiveSkillCategoryModal(null)} style={{ padding: '6px 16px', fontSize: '0.78rem' }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        )}
        </main>
      </div>
    </div>
  );
};

export default CareerReadinessPage;
