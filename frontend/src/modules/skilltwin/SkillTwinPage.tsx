import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  FileText,
  Github,
  FolderGit2,
  Info,
  X,
  ArrowUpRight,
  AlertCircle,
  HelpCircle,
  Play,
  RotateCw,
  Loader2,
  Code2,
  Cpu,
  Database,
  Terminal
} from 'lucide-react';
import {
  UserProfile,
  SkillTwinSkillItem,
  SkillTwinSummaryResponse,
  ProficiencyLevel
} from '../../shared/types';
import { apiClient } from '../../shared/apiClient';
import PersistentSidebar from '../../shared/components/PersistentSidebar';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';

interface SkillTwinPageProps {
  userProfile: UserProfile | null;
  onNavigateToOnboarding?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToTargetRole?: () => void;
  onNavigateToGapAnalysis?: () => void;
  onNavigateToRoadmap?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: () => void;
}

export const SkillTwinPage: React.FC<SkillTwinPageProps> = ({
  userProfile,
  onNavigateToOnboarding,
  onNavigateToEvidence,
  onNavigateToTargetRole,
  onNavigateToGapAnalysis,
  onNavigateToRoadmap,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToHelp
}) => {
  const userEmail = userProfile?.email || 'layeeba@skilltwin.dev';
  const userId = userProfile?.id;
  const targetRole = userProfile?.target_role || 'Full-Stack Developer';

  // Data & State
  const [skillTwinData, setSkillTwinData] = useState<SkillTwinSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'proficiency' | 'confidence' | 'name'>('proficiency');
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // Modals
  const [selectedSkill, setSelectedSkill] = useState<SkillTwinSkillItem | null>(null);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);

  // Fetch SkillTwin Profile from Backend
  const loadSkillTwinProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getSkillTwinProfile(userEmail, userId, targetRole);
      setSkillTwinData(data);
    } catch (err: any) {
      console.error('Error loading SkillTwin profile:', err);
      setError(err.message || 'Failed to synthesize SkillTwin profile. Please check evidence.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    localStorage.setItem('skilltwin_skilltwin_completed', 'true');
    loadSkillTwinProfile();
  }, [userEmail, userId, targetRole]);

  // Recalculate SkillTwin on demand
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const updated = await apiClient.recalculateSkillTwin(userEmail, userId);
      setSkillTwinData(updated);
    } catch (err: any) {
      console.error('Recalculation error:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Filter & Sort Skills
  const filteredSkills = useMemo(() => {
    if (!skillTwinData?.skills) return [];

    return skillTwinData.skills
      .filter(skill => {
        // Category Filter
        if (selectedCategory === 'Technical' && skill.category !== 'Technical') return false;
        if (selectedCategory === 'Tools' && skill.category !== 'Tools') return false;
        if (selectedCategory === 'Others' && (skill.category === 'Technical' || skill.category === 'Tools')) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = skill.name.toLowerCase().includes(q);
          const matchReason = skill.reasoning.toLowerCase().includes(q);
          const matchCat = skill.category.toLowerCase().includes(q);
          if (!matchName && !matchReason && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'proficiency') {
          return b.numeric_proficiency - a.numeric_proficiency;
        }
        if (sortBy === 'confidence') {
          return b.confidence_score - a.confidence_score;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [skillTwinData, selectedCategory, searchQuery, sortBy]);

  // Tech Badge Icon Helper
  const renderTechIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('javascript') || n === 'js') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#F7DF1E', color: '#000', fontWeight: 800, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          JS
        </div>
      );
    }
    if (n.includes('react')) {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(97, 218, 251, 0.15)', border: '1px solid rgba(97, 218, 251, 0.4)', color: '#61DAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Code2 size={16} />
        </div>
      );
    }
    if (n.includes('node')) {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(51, 153, 51, 0.15)', border: '1px solid rgba(51, 153, 51, 0.4)', color: '#68A063', fontWeight: 800, fontSize: '0.68rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          [N]
        </div>
      );
    }
    if (n.includes('python')) {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #3776AB 0%, #FFD43B 100%)', color: '#FFF', fontWeight: 800, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Py
        </div>
      );
    }
    if (n.includes('postgres') || n.includes('sql')) {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(51, 103, 145, 0.2)', border: '1px solid rgba(51, 103, 145, 0.4)', color: '#336791', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Database size={16} />
        </div>
      );
    }
    if (n.includes('git')) {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(240, 80, 50, 0.2)', border: '1px solid rgba(240, 80, 50, 0.4)', color: '#F05032', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FolderGit2 size={16} />
        </div>
      );
    }
    if (n.includes('type') || n === 'ts') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#3178C6', color: '#FFF', fontWeight: 800, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          TS
        </div>
      );
    }
    if (n.includes('fastapi')) {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(0, 150, 136, 0.2)', border: '1px solid rgba(0, 150, 136, 0.4)', color: '#009688', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Cpu size={16} />
        </div>
      );
    }
    if (n.includes('docker') || n.includes('cloud')) {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(36, 150, 237, 0.2)', border: '1px solid rgba(36, 150, 237, 0.4)', color: '#2496ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Terminal size={16} />
        </div>
      );
    }
    return (
      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#C084FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={14} />
      </div>
    );
  };

  // Helper for Circular Confidence Mini SVG Gauge
  const renderMiniConfidenceRing = (confidence: number) => {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (confidence / 100) * circumference;

    let strokeColor = '#10B981'; // Green (>=85)
    if (confidence < 70) strokeColor = '#FB923C'; // Orange (<70)
    else if (confidence < 85) strokeColor = '#FBBF24'; // Gold (<85)

    return (
      <div style={{ position: 'relative', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="38" height="38" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="19"
            cy="19"
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="3"
            fill="transparent"
          />
          <circle
            cx="19"
            cy="19"
            r={radius}
            stroke={strokeColor}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <span style={{ position: 'absolute', fontSize: '0.68rem', fontWeight: 700, color: '#F8FAFC' }}>
          {Math.round(confidence)}%
        </span>
      </div>
    );
  };

  // Proficiency Color Helper
  const getProficiencyColor = (level: ProficiencyLevel) => {
    if (level === 'Advanced') return '#10B981'; // Green
    if (level === 'Intermediate') return '#F59E0B'; // Amber
    return '#F97316'; // Orange
  };

  // Career Readiness Arched Semicircle Math
  const overallScore = skillTwinData?.overall_score || 72;
  const gaugeRadius = 64;
  const gaugeCircumference = Math.PI * gaugeRadius; // Semicircle
  const gaugeOffset = gaugeCircumference - (overallScore / 100) * gaugeCircumference;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px 24px 32px' }}>
      {/* Top Header & 5-Step Progress Stepper */}
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

        {/* 6-Step Stepper: Steps 1 & 2 Completed, Step 3 Active (SkillTwin), Step 4 Target Role */}
        <div className="stepper-container" style={{ maxWidth: '720px', flex: 1 }}>
          {/* Step 1: Onboarding */}
          <div
            className="step-item completed"
            onClick={onNavigateToOnboarding}
            style={{ cursor: onNavigateToOnboarding ? 'pointer' : 'default' }}
            title="Onboarding Completed"
          >
            <div className="step-circle"><Check size={14} /></div>
            <span className="step-title" style={{ color: '#34D399' }}>Onboarding</span>
            <span className="step-subtitle">Completed</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: '#10B981' }} />

          {/* Step 2: Evidence Collection */}
          <div
            className="step-item completed"
            onClick={onNavigateToEvidence}
            style={{ cursor: onNavigateToEvidence ? 'pointer' : 'default' }}
            title="Evidence Collection Completed"
          >
            <div className="step-circle"><Check size={14} /></div>
            <span className="step-title" style={{ color: '#34D399' }}>Evidence Collection</span>
            <span className="step-subtitle">Completed</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: '#10B981' }} />

          {/* Step 3: SkillTwin (Active) */}
          <div className="step-item active">
            <div className="step-circle">3</div>
            <span className="step-title" style={{ color: '#C084FC' }}>SkillTwin</span>
            <span className="step-subtitle" style={{ color: 'var(--text-secondary)' }}>Your Profile</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Step 4: Target Role / Industry Mapping */}
          <div
            className="step-item"
            onClick={onNavigateToTargetRole}
            style={{
              opacity: onNavigateToTargetRole ? 0.9 : 0.6,
              cursor: onNavigateToTargetRole ? 'pointer' : 'default'
            }}
            title="Target Role / Industry Mapping"
          >
            <div className="step-circle">4</div>
            <span className="step-title">Target Role</span>
            <span className="step-subtitle">Pending</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Step 5: Gap Analysis */}
          <div
            className="step-item"
            onClick={onNavigateToGapAnalysis}
            style={{ opacity: 0.6, cursor: 'default' }}
          >
            <div className="step-circle">5</div>
            <span className="step-title">Gap Analysis</span>
            <span className="step-subtitle">Pending</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Step 6: Roadmap */}
          <div
            className="step-item"
            onClick={onNavigateToRoadmap}
            style={{ opacity: 0.6, cursor: 'default' }}
          >
            <div className="step-circle">6</div>
            <span className="step-title">Roadmap</span>
            <span className="step-subtitle">Pending</span>
          </div>
        </div>

        {/* Top Right Header Badge */}
        <GlobalHeaderBadge />
      </header>

      {/* Main Dashboard Layout */}
      <div className="dashboard-layout">
        {/* Left Persistent Dashboard Sidebar */}
        <PersistentSidebar
          userProfile={userProfile}
          activeStep={3}
          activeView="skilltwin"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={onNavigateToEvidence}
          onNavigateToSkillTwin={() => {}}
          onNavigateToTargetRole={onNavigateToTargetRole}
          onNavigateToGapAnalysis={onNavigateToGapAnalysis}
          onNavigateToRoadmap={onNavigateToRoadmap}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToSettings={onNavigateToSettings}
          onNavigateToHelp={onNavigateToHelp}
        />

        {/* Center/Main Content Work Area */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Page Title & How It Works Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  Your SkillTwin
                </h1>
                <span style={{ fontSize: '1.25rem' }}>✨</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
                An evidence-backed view of your skills and proficiency.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsHowItWorksOpen(true)}
                style={{ fontSize: '0.8rem', padding: '7px 14px' }}
              >
                <Play size={13} fill="#818CF8" color="#818CF8" /> How SkillTwin Works
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={handleRecalculate}
                disabled={isRecalculating}
                style={{ fontSize: '0.8rem', padding: '7px 12px' }}
                title="Recalculate SkillTwin from latest evidence"
              >
                <RotateCw size={13} className={isRecalculating ? 'animated-glow' : ''} style={{ animation: isRecalculating ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </div>

          {/* Main 2-Column Grid: Skills Table (Left) + Analytical Summary Panel (Right) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 340px',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Left Column: Filter Tabs, Controls & Skills Table */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Filter Tabs & Search / Sort Controls Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '14px'
              }}>
                {/* Category Filter Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: selectedCategory === 'All' ? 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)' : 'transparent',
                      color: selectedCategory === 'All' ? '#FFFFFF' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    All Skills ({skillTwinData?.total_skills || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Technical')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: selectedCategory === 'Technical' ? 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)' : 'transparent',
                      color: selectedCategory === 'Technical' ? '#FFFFFF' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Technical ({skillTwinData?.technical_count || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Tools')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: selectedCategory === 'Tools' ? 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)' : 'transparent',
                      color: selectedCategory === 'Tools' ? '#FFFFFF' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Tools ({skillTwinData?.tools_count || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Others')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      background: selectedCategory === 'Others' ? 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)' : 'transparent',
                      color: selectedCategory === 'Others' ? '#FFFFFF' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Others ({skillTwinData?.others_count || 0})
                  </button>
                </div>

                {/* Search & Sort Dropdowns */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative', minWidth: '180px' }}>
                    <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search skills..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: '32px', paddingRight: '10px', height: '34px', fontSize: '0.78rem' }}
                    />
                  </div>

                  {/* Sort Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <select
                      className="form-input"
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      style={{ height: '34px', fontSize: '0.78rem', paddingRight: '24px', cursor: 'pointer' }}
                    >
                      <option value="proficiency">Sort by: Proficiency</option>
                      <option value="confidence">Sort by: Confidence</option>
                      <option value="name">Sort by: Name</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Skills Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1.1fr 0.8fr 1.1fr 1.6fr',
                padding: '8px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <div>Skill</div>
                <div>Proficiency</div>
                <div>Confidence</div>
                <div>Evidence</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Reasoning <Info size={12} />
                </div>
              </div>

              {/* Skills Table Body */}
              {isLoading ? (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <Loader2 size={32} color="#C084FC" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F8FAFC' }}>Synthesizing Living SkillTwin...</div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Evaluating multi-source evidence from Resume, GitHub & Projects
                  </p>
                </div>
              ) : error ? (
                <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                  <AlertCircle size={32} color="#EF4444" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>SkillTwin Synthesis Error</div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '360px', margin: '4px auto 14px' }}>
                    {error}
                  </p>
                  <button type="button" className="btn btn-primary" onClick={loadSkillTwinProfile} style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
                    Retry Synthesis
                  </button>
                </div>
              ) : (skillTwinData?.skills.length || 0) === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 0 20px rgba(168, 85, 247, 0.25)'
                  }}>
                    <FileText size={28} color="#C084FC" />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '6px' }}>
                    Evidence needed
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                    Add your resume, GitHub profile, or projects to build your SkillTwin.
                  </p>
                  {onNavigateToEvidence && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={onNavigateToEvidence}
                      style={{ padding: '8px 20px', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      ← Go to Evidence Collection
                    </button>
                  )}
                </div>
              ) : filteredSkills.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                  <AlertCircle size={32} color="#818CF8" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>No matching skills found</div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '360px', margin: '4px auto 14px' }}>
                    Try clearing your search query or selecting a different category.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredSkills.slice(0, visibleCount).map((skill) => {
                    const profColor = getProficiencyColor(skill.proficiency);
                    const profWidthPct = (skill.numeric_proficiency / 5.0) * 100;

                    return (
                      <div
                        key={skill.id}
                        onClick={() => setSelectedSkill(skill)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.4fr 1.1fr 0.8fr 1.1fr 1.6fr',
                          alignItems: 'center',
                          padding: '12px 14px',
                          background: 'rgba(15, 23, 42, 0.65)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        className="skill-table-row"
                      >
                        {/* Skill Column */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          {renderTechIcon(skill.name)}
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap' }}>
                              {skill.name}
                            </div>
                            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', display: 'inline-block', marginTop: '1px' }}>
                              {skill.category}
                            </span>
                          </div>
                        </div>

                        {/* Proficiency Column */}
                        <div style={{ paddingRight: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: profColor }} />
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: profColor }}>
                              {skill.proficiency}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {skill.numeric_proficiency} / 5
                            </span>
                            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${profWidthPct}%`, height: '100%', background: profColor, borderRadius: '2px' }} />
                            </div>
                          </div>
                        </div>

                        {/* Confidence Column */}
                        <div>
                          {renderMiniConfidenceRing(skill.confidence_score)}
                        </div>

                        {/* Evidence Column */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            {skill.has_resume_evidence && <span title="Found in Resume"><FileText size={13} color="#818CF8" /></span>}
                            {skill.has_github_evidence && <span title="Found in GitHub"><Github size={13} color="#34D399" /></span>}
                            {skill.has_project_evidence && <span title="Found in Projects"><FolderGit2 size={13} color="#38BDF8" /></span>}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {skill.evidence_sources.join(', ')}
                          </div>
                        </div>

                        {/* Reasoning Column */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <p style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.35,
                            margin: 0,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {skill.reasoning}
                          </p>
                          <ChevronRight size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        </div>
                      </div>
                    );
                  })}

                  {/* Show More Skills Button */}
                  {filteredSkills.length > visibleCount && (
                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setVisibleCount(prev => prev + 6)}
                        style={{ padding: '6px 18px', fontSize: '0.78rem' }}
                      >
                        Show {filteredSkills.length - visibleCount} More Skills <ChevronDown size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Analytical Summary Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Card 1: Career Readiness Score */}
              <div className="glass-panel" style={{ padding: '22px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Career Readiness Score
                  </span>
                  <span title="Explainable score calculated from evidence strength and role requirements">
                    <HelpCircle size={14} color="var(--text-muted)" />
                  </span>
                </div>

                {/* Semicircle Rainbow Arched Gauge */}
                <div style={{ position: 'relative', width: '160px', height: '90px', margin: '0 auto 10px', overflow: 'hidden' }}>
                  <svg width="160" height="160" style={{ transform: 'rotate(-180deg)' }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="35%" stopColor="#38BDF8" />
                        <stop offset="70%" stopColor="#818CF8" />
                        <stop offset="100%" stopColor="#C084FC" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="80"
                      cy="80"
                      r={gaugeRadius}
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={gaugeCircumference}
                      strokeDashoffset="0"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r={gaugeRadius}
                      stroke="url(#scoreGradient)"
                      strokeWidth="10"
                      strokeDasharray={gaugeCircumference}
                      strokeDashoffset={gaugeOffset}
                      strokeLinecap="round"
                      fill="transparent"
                      style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                  </svg>

                  {/* Centered Large Number */}
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
                      {overallScore}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, marginTop: '2px' }}>
                      {skillTwinData?.rating_label || 'Good'}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '8px 0 0' }}>
                  {skillTwinData?.encouragement_message || "You're on the right track! Keep strengthening your weak areas."}
                </p>
              </div>

              {/* Card 2: Score Breakdown */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '14px' }}>
                  Score Breakdown
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Technical Skills */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Technical Skills</span>
                      <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{skillTwinData?.breakdown.technical_score || 76}%</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${skillTwinData?.breakdown.technical_score || 76}%`, height: '100%', background: '#10B981', borderRadius: '3px' }} />
                    </div>
                  </div>

                  {/* Tools & Technologies */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tools & Technologies</span>
                      <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{skillTwinData?.breakdown.tools_score || 68}%</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${skillTwinData?.breakdown.tools_score || 68}%`, height: '100%', background: '#F59E0B', borderRadius: '3px' }} />
                    </div>
                  </div>

                  {/* Projects */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Projects</span>
                      <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{skillTwinData?.breakdown.projects_score || 70}%</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${skillTwinData?.breakdown.projects_score || 70}%`, height: '100%', background: '#38BDF8', borderRadius: '3px' }} />
                    </div>
                  </div>

                  {/* Evidence Strength */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Evidence Strength</span>
                      <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{skillTwinData?.breakdown.evidence_strength || 81}%</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${skillTwinData?.breakdown.evidence_strength || 81}%`, height: '100%', background: '#818CF8', borderRadius: '3px' }} />
                    </div>
                  </div>

                  {/* Role Alignment */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Role Alignment</span>
                      <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{skillTwinData?.breakdown.role_alignment || 69}%</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${skillTwinData?.breakdown.role_alignment || 69}%`, height: '100%', background: '#C084FC', borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Dynamic Evidence-Backed Insights */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '12px' }}>
                  Insights
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {skillTwinData?.insights.map((ins) => {
                    let iconColor = '#10B981';
                    let iconBg = 'rgba(16, 185, 129, 0.15)';
                    if (ins.type === 'warning') {
                      iconColor = '#F59E0B';
                      iconBg = 'rgba(245, 158, 11, 0.15)';
                    } else if (ins.type === 'recommendation') {
                      iconColor = '#38BDF8';
                      iconBg = 'rgba(56, 189, 248, 0.15)';
                    }

                    return (
                      <div
                        key={ins.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div style={{
                          padding: '4px',
                          borderRadius: '6px',
                          background: iconBg,
                          color: iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}>
                          {ins.type === 'strength' && <ArrowUpRight size={14} />}
                          {ins.type === 'warning' && <AlertCircle size={14} />}
                          {ins.type === 'recommendation' && <Info size={14} />}
                        </div>
                        <p style={{ fontSize: '0.74rem', color: '#E2E8F0', lineHeight: 1.35, margin: 0 }}>
                          {ins.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Primary CTA: Continue to Target Role Mapping */}
              {onNavigateToTargetRole && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onNavigateToTargetRole}
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      borderRadius: '12px',
                      boxShadow: '0 0 20px rgba(124, 58, 237, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    Continue to Target Role Mapping →
                  </button>
                  <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Next: Compare with industry standards
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Explainer Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '12px',
            marginTop: '8px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              flexShrink: 0
            }}>
              <Cpu size={16} />
            </div>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', marginRight: '6px' }}>
                What is SkillTwin?
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Your SkillTwin is a living profile that evolves as you add more evidence and complete projects.
              </span>
            </div>
          </div>

          {/* Modal: Interactive Skill Detail Inspector */}
          {selectedSkill && (
            <div className="modal-backdrop" onClick={() => setSelectedSkill(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {renderTechIcon(selectedSkill.name)}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF' }}>
                          {selectedSkill.name}
                        </h2>
                        <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                          {selectedSkill.category}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Evidence Status:</span>
                        <span className="badge badge-analyzed" style={{ fontSize: '0.68rem' }}>
                          ● {selectedSkill.evidence_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedSkill(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Score & Confidence Overview Banner */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '12px',
                  marginBottom: '18px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Estimated Proficiency</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: getProficiencyColor(selectedSkill.proficiency), marginTop: '2px' }}>
                      {selectedSkill.proficiency} ({selectedSkill.numeric_proficiency}/5)
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Evidence Confidence</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34D399', marginTop: '2px' }}>
                      {selectedSkill.confidence_score}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Evidence Sources</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#C084FC', marginTop: '2px' }}>
                      {selectedSkill.evidence_sources.join(', ')}
                    </div>
                  </div>
                </div>

                {/* Detailed Sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {/* Reasoning */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>
                      AI Assessment Reasoning
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                      {selectedSkill.reasoning}
                    </p>
                  </div>

                  {/* Exact Evidence Citations */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '8px' }}>
                      Traceable Evidence Citations
                    </div>
                    {selectedSkill.evidence_details.resume_quotes.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#818CF8', fontWeight: 600 }}>📄 Resume Citations:</div>
                        {selectedSkill.evidence_details.resume_quotes.map((q, idx) => (
                          <div key={idx} style={{ fontSize: '0.74rem', color: '#CBD5E1', fontStyle: 'italic', marginTop: '2px', paddingLeft: '8px', borderLeft: '2px solid #818CF8' }}>
                            "{q}"
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedSkill.evidence_details.github_repos.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#34D399', fontWeight: 600 }}>🐙 GitHub Repositories:</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {selectedSkill.evidence_details.github_repos.map((r, idx) => (
                            <span key={idx} className="badge badge-analyzed" style={{ fontSize: '0.68rem' }}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedSkill.evidence_details.project_refs.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#38BDF8', fontWeight: 600 }}>📁 Verified Projects:</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {selectedSkill.evidence_details.project_refs.map((p, idx) => (
                            <span key={idx} className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontSize: '0.68rem' }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Strengths & Limitations */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34D399', marginBottom: '4px' }}>
                        Strengths
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.72rem', color: '#CBD5E1', lineHeight: 1.4 }}>
                        {selectedSkill.evidence_details.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F59E0B', marginBottom: '4px' }}>
                        Evidence Gaps
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.72rem', color: '#CBD5E1', lineHeight: 1.4 }}>
                        {selectedSkill.evidence_details.limitations.map((l, idx) => (
                          <li key={idx}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818CF8', marginBottom: '4px' }}>
                      Recommended Action to Level Up
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#E2E8F0', margin: 0 }}>
                      {selectedSkill.evidence_details.recommendations[0] || `Build an end-to-end full stack component using ${selectedSkill.name}.`}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" className="btn btn-primary" onClick={() => setSelectedSkill(null)} style={{ padding: '6px 18px', fontSize: '0.8rem' }}>
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: How SkillTwin Works */}
          {isHowItWorksOpen && (
            <div className="modal-backdrop" onClick={() => setIsHowItWorksOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '10px', color: '#C084FC' }}>
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>How SkillTwin Is Synthesized</h3>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Evidence extraction & dynamic confidence scoring</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsHowItWorksOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>1. Multi-Source Ingestion:</strong>
                    <p style={{ margin: '2px 0 0' }}>We parse candidate resumes, analyze public GitHub code repositories & language statistics, and inspect registered project architectures.</p>
                  </div>
                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>2. Canonical Skill Mapping:</strong>
                    <p style={{ margin: '2px 0 0' }}>Extracted technologies are mapped to normalized industry taxonomies to eliminate duplicate variations.</p>
                  </div>
                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>3. Evidence-Based Proficiency & Confidence:</strong>
                    <p style={{ margin: '2px 0 0' }}>Proficiency is derived strictly from demonstrated code rather than unsupported self-claims. Confidence increases when multiple independent sources agree.</p>
                  </div>
                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>4. Career Readiness Calculation:</strong>
                    <p style={{ margin: '2px 0 0' }}>We compare your evidence profile against live market requirements for your target role ({targetRole}) to identify readiness and highlight growth areas.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                  <button className="btn btn-primary" onClick={() => setIsHowItWorksOpen(false)}>
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

export default SkillTwinPage;
