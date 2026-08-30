import React, { useState, useEffect, useMemo } from 'react';
import {
  Code2,
  BarChart2,
  Building2,
  Download,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Target,
  Shield,
  ExternalLink,
  Loader2,
  AlertCircle,
  HelpCircle,
  X,
  Briefcase,
  Wrench,
  Bookmark
} from 'lucide-react';
import {
  UserProfile,
  TargetRoleMappingResponse,
  RoleSkillRequirementItem
} from '../../shared/types';
import { apiClient } from '../../shared/apiClient';
import PersistentSidebar from '../../shared/components/PersistentSidebar';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';

interface TargetRoleMappingPageProps {
  userProfile: UserProfile | null;
  onNavigateToOnboarding?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToSkillTwin?: () => void;
  onNavigateToGapAnalysis?: (roleData?: TargetRoleMappingResponse) => void;
  onNavigateToRoadmap?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: () => void;
}

export const TargetRoleMappingPage: React.FC<TargetRoleMappingPageProps> = ({
  userProfile,
  onNavigateToOnboarding,
  onNavigateToEvidence,
  onNavigateToSkillTwin,
  onNavigateToGapAnalysis,
  onNavigateToRoadmap,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToHelp
}) => {
  // Target Role State
  const initialRole = userProfile?.target_role || 'Full-Stack Developer';
  const [selectedRole, setSelectedRole] = useState<string>(initialRole);
  const [selectedExperience, setSelectedExperience] = useState<string>('Entry Level (0-2 years)');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All Industries');

  // Available Roles
  const [availableRoles, setAvailableRoles] = useState<string[]>([
    'Full-Stack Developer',
    'Frontend Developer',
    'Backend Developer'
  ]);

  // Data & Loading State
  const [mappingData, setMappingData] = useState<TargetRoleMappingResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Table Filters, Search & Pagination
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedLevel, setSelectedLevel] = useState<string>('All Levels');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Modals
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [isDemandModalOpen, setIsDemandModalOpen] = useState<boolean>(false);
  const [selectedRequirement, setSelectedRequirement] = useState<RoleSkillRequirementItem | null>(null);

  // Load available roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesList = await apiClient.getTargetRolesList();
        if (rolesList && rolesList.length > 0) {
          setAvailableRoles(rolesList.map((r: any) => r.role_name));
        }
      } catch (err) {
        console.error('Failed to fetch available target roles:', err);
      }
    };
    fetchRoles();
  }, []);

  // Fetch Target Role Benchmark Data
  const loadTargetRoleData = async (roleName: string, exp: string, ind: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTargetRoleMapping(roleName, exp, ind, userProfile?.email);
      setMappingData(data);
      setCurrentPage(1); // Reset page on role change
    } catch (err: any) {
      console.error('Error loading target role mapping:', err);
      setError(err.message || 'Failed to load industry role benchmark.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    localStorage.setItem('skilltwin_target_role_completed', 'true');
    loadTargetRoleData(selectedRole, selectedExperience, selectedIndustry);
  }, [selectedRole, selectedExperience, selectedIndustry]);

  // Filter & Search Requirements Table
  const filteredRequirements = useMemo(() => {
    if (!mappingData?.requirements) return [];

    return mappingData.requirements.filter((req) => {
      // Category Filter
      if (selectedCategory !== 'All Categories' && req.category !== selectedCategory) {
        return false;
      }
      // Level Filter
      if (selectedLevel !== 'All Levels' && req.required_proficiency !== selectedLevel) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = req.skill.toLowerCase().includes(q) || req.canonical_name.toLowerCase().includes(q);
        const matchDesc = req.description.toLowerCase().includes(q);
        const matchCat = req.category.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [mappingData, selectedCategory, selectedLevel, searchQuery]);

  // Pagination Math
  const totalPages = Math.ceil(filteredRequirements.length / pageSize) || 1;
  const paginatedRequirements = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequirements.slice(start, start + pageSize);
  }, [filteredRequirements, currentPage, pageSize]);

  // Donut Chart Math
  const totalDonutSkills = mappingData?.total_skills_required || 38;
  const breakdownList = mappingData?.category_breakdown || [];

  // Importance Badge Styling
  const renderImportanceBadge = (importance: string) => {
    if (importance === 'Core') {
      return <span className="badge badge-purple" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>Core</span>;
    }
    if (importance === 'High') {
      return <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', padding: '3px 8px', fontSize: '0.7rem' }}>High</span>;
    }
    if (importance === 'Medium') {
      return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '3px 8px', fontSize: '0.7rem' }}>Medium</span>;
    }
    return <span className="badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8', padding: '3px 8px', fontSize: '0.7rem' }}>Nice-to-Have</span>;
  };

  // Demand Badge Styling
  const renderDemandBadge = (demand: string) => {
    if (demand === 'Very High') {
      return <span className="badge badge-analyzed" style={{ padding: '3px 8px', fontSize: '0.7rem' }}>Very High</span>;
    }
    if (demand === 'High') {
      return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '3px 8px', fontSize: '0.7rem' }}>High</span>;
    }
    return <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', padding: '3px 8px', fontSize: '0.7rem' }}>Medium</span>;
  };

  // Download Report Action
  const handleDownloadReport = () => {
    const url = apiClient.downloadTargetRoleReportUrl(selectedRole, selectedExperience, selectedIndustry);
    window.open(url, '_blank');
  };

  // SVG Donut Chart Generator
  const renderDonutChart = () => {
    const size = 160;
    const strokeWidth = 22;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let accumulatedAngle = 0;

    return (
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {breakdownList.map((item, idx) => {
            const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedAngle / 100) * circumference);
            accumulatedAngle += item.percentage;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            );
          })}
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
            {totalDonutSkills}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
            Total Skills
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px 24px 32px' }}>
      {/* Top Header & 6-Step Progress Stepper */}
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

        {/* 6-Step Stepper: Steps 1, 2, 3 Completed, Step 4 Active (Target Role), Steps 5 & 6 Pending */}
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

          {/* Step 3: SkillTwin */}
          <div
            className="step-item completed"
            onClick={onNavigateToSkillTwin}
            style={{ cursor: onNavigateToSkillTwin ? 'pointer' : 'default' }}
            title="SkillTwin Profile Completed"
          >
            <div className="step-circle"><Check size={14} /></div>
            <span className="step-title" style={{ color: '#34D399' }}>SkillTwin</span>
            <span className="step-subtitle">Completed</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: '#10B981' }} />

          {/* Step 4: Target Role / Industry Mapping (Active) */}
          <div className="step-item active">
            <div className="step-circle">4</div>
            <span className="step-title" style={{ color: '#C084FC' }}>Target Role</span>
            <span className="step-subtitle" style={{ color: 'var(--text-secondary)' }}>In Progress</span>
          </div>
          <div style={{ height: '1px', width: '20px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Step 5: Gap Analysis */}
          <div
            className="step-item"
            onClick={() => onNavigateToGapAnalysis && onNavigateToGapAnalysis(mappingData || undefined)}
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

        {/* Top Actions: Download Report & Global Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleDownloadReport}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            <Download size={13} /> Download Report
          </button>
          <GlobalHeaderBadge />
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="dashboard-layout">
        {/* Left Persistent Dashboard Sidebar */}
        <PersistentSidebar
          userProfile={userProfile}
          activeStep={4}
          activeView="target_role"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={onNavigateToEvidence}
          onNavigateToSkillTwin={onNavigateToSkillTwin}
          onNavigateToTargetRole={() => {}}
          onNavigateToGapAnalysis={() => onNavigateToGapAnalysis && onNavigateToGapAnalysis(mappingData || undefined)}
          onNavigateToRoadmap={onNavigateToRoadmap}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToSettings={onNavigateToSettings}
          onNavigateToHelp={onNavigateToHelp}
        />

        {/* Center/Main Work Area */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Page Title & Subtitle */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Target Role / Industry Mapping
              </h1>
              <span
                onClick={() => setIsInfoModalOpen(true)}
                style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                title="Learn how industry role benchmarks are established"
              >
                <HelpCircle size={17} />
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
              Understand what skills, tools, and experience are required for your target role in today's industry.
            </p>
          </div>

          {/* Top Horizontal Target Role Selection Card */}
          <div className="glass-panel" style={{
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1fr',
            gap: '16px',
            alignItems: 'center'
          }}>
            {/* 1. Selected Role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#C084FC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Code2 size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>Selected Role</div>
                <select
                  id="target-role-select"
                  className="form-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '6px 30px 6px 12px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    lineHeight: '1.4',
                    color: '#F8FAFC',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r} style={{ background: '#0F172A', color: '#F8FAFC' }}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Experience Level */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <BarChart2 size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>Experience Level</div>
                <select
                  id="target-experience-select"
                  className="form-select"
                  value={selectedExperience}
                  onChange={(e) => setSelectedExperience(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '6px 30px 6px 12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    lineHeight: '1.4',
                    color: '#F8FAFC',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  <option value="Entry Level (0-2 years)" style={{ background: '#0F172A', color: '#F8FAFC' }}>Entry Level (0-2 years)</option>
                  <option value="Mid Level (2-5 years)" style={{ background: '#0F172A', color: '#F8FAFC' }}>Mid Level (2-5 years)</option>
                  <option value="Senior Level (5+ years)" style={{ background: '#0F172A', color: '#F8FAFC' }}>Senior Level (5+ years)</option>
                </select>
              </div>
            </div>

            {/* 3. Industry */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#34D399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Building2 size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>Industry</div>
                <select
                  id="target-industry-select"
                  className="form-select"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '6px 30px 6px 12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    lineHeight: '1.4',
                    color: '#F8FAFC',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    display: 'block',
                    width: '100%'
                  }}
                >
                  <option value="All Industries" style={{ background: '#0F172A', color: '#F8FAFC' }}>All Industries</option>
                  <option value="Tech & SaaS" style={{ background: '#0F172A', color: '#F8FAFC' }}>Tech & SaaS</option>
                  <option value="Fintech & Banking" style={{ background: '#0F172A', color: '#F8FAFC' }}>Fintech & Banking</option>
                  <option value="E-Commerce & Retail" style={{ background: '#0F172A', color: '#F8FAFC' }}>E-Commerce & Retail</option>
                  <option value="Healthcare" style={{ background: '#0F172A', color: '#F8FAFC' }}>Healthcare</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main 2-Column Grid: Center Content (Left 65%) + Right Sidebar (35%) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 340px',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Center Area: Overall Metrics, Breakdown/Top5, and All Required Skills Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. Overall Role Requirements (4 Stat Tiles) */}
              <div className="glass-panel" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '14px' }}>
                  Overall Role Requirements
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {/* Tile 1: Total Skills */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <div style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#C084FC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Target size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                        {mappingData?.total_skills_required || 0}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Total Skills Required
                      </div>
                    </div>
                  </div>

                  {/* Tile 2: Core (Must-Have) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <div style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Shield size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                        {mappingData?.core_count || 0}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Core (Must-Have)
                      </div>
                    </div>
                  </div>

                  {/* Tile 3: Important (Nice to Have) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <div style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38BDF8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Bookmark size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                        {mappingData?.important_count || 0}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Important (Nice to Have)
                      </div>
                    </div>
                  </div>

                  {/* Tile 4: Tools & Technologies */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <div style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#F59E0B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Wrench size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                        {mappingData?.tools_count || 0}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                        Tools & Technologies
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Middle Row: Required Skills Breakdown (Donut) + Top 5 In-Demand Skills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '20px' }}>
                {/* Left: Donut Breakdown */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
                      Required Skills Breakdown
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDemandModalOpen(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#818CF8',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      View Market Demand <ExternalLink size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* SVG Donut Chart */}
                    {renderDonutChart()}

                    {/* Dynamic Legend */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
                      {breakdownList.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{item.category}</span>
                          </div>
                          <span style={{ color: '#F8FAFC', fontWeight: 700 }}>
                            {item.count} ({item.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Top 5 In-Demand Skills */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '14px' }}>
                    Top 5 In-Demand Skills
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {mappingData?.top_demand_skills.map((skill) => (
                      <div
                        key={skill.rank}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', width: '14px' }}>
                            {skill.rank}
                          </span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                            {skill.name}
                          </span>
                        </div>
                        {renderDemandBadge(skill.demand_level)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Detailed Required Skills Table */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Table Header & Controls Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '14px'
                }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                    All Required Skills
                  </div>

                  {/* Filter & Search Dropdowns */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Category Filter */}
                    <select
                      className="form-input"
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{ height: '34px', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      <option value="All Categories">All Categories</option>
                      <option value="Frontend Development">Frontend Development</option>
                      <option value="Backend Development">Backend Development</option>
                      <option value="Databases">Databases</option>
                      <option value="DevOps & Tools">DevOps & Tools</option>
                      <option value="Other Important Skills">Other Important Skills</option>
                    </select>

                    {/* Level Filter */}
                    <select
                      className="form-input"
                      value={selectedLevel}
                      onChange={(e) => {
                        setSelectedLevel(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{ height: '34px', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      <option value="All Levels">All Levels</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Beginner">Beginner</option>
                    </select>

                    {/* Search Input */}
                    <div style={{ position: 'relative', minWidth: '180px' }}>
                      <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search skill..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        style={{ paddingLeft: '32px', paddingRight: '10px', height: '34px', fontSize: '0.78rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Table Header Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.3fr 1.2fr 0.8fr 0.8fr 1.3fr 1.8fr',
                  padding: '8px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <div>Skill</div>
                  <div>Category</div>
                  <div>Importance</div>
                  <div>Demand</div>
                  <div>Industry Avg. Proficiency</div>
                  <div>Description</div>
                </div>

                {/* Table Body */}
                {error ? (
                  <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                    <AlertCircle size={32} color="#EF4444" style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#EF4444' }}>{error}</div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Failed to load target role mapping. Please select another role or try again.
                    </p>
                  </div>
                ) : isLoading ? (
                  <div style={{ padding: '48px 0', textAlign: 'center' }}>
                    <Loader2 size={32} color="#C084FC" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#F8FAFC' }}>Loading role requirements...</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Retrieving curated industry requirement benchmarks for {selectedRole}
                    </p>
                  </div>
                ) : filteredRequirements.length === 0 ? (
                  <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                    <AlertCircle size={32} color="#818CF8" style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>No matching requirements found</div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Try adjusting your search query or selecting a different category/level filter.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {paginatedRequirements.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => setSelectedRequirement(req)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.3fr 1.2fr 0.8fr 0.8fr 1.3fr 1.8fr',
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
                        {/* Skill Name */}
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
                          {req.skill}
                        </div>

                        {/* Category */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {req.category.replace(' Development', '').replace(' Important Skills', '')}
                        </div>

                        {/* Importance */}
                        <div>
                          {renderImportanceBadge(req.importance)}
                        </div>

                        {/* Demand */}
                        <div>
                          {renderDemandBadge(req.demand)}
                        </div>

                        {/* Industry Avg. Proficiency */}
                        <div style={{ paddingRight: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${req.industry_avg_proficiency}%`, height: '100%', background: '#10B981', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F8FAFC', width: '30px', textAlign: 'right' }}>
                              {req.industry_avg_proficiency}%
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination Controls */}
                {filteredRequirements.length > pageSize && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRequirements.length)} of {filteredRequirements.length} skills
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <ChevronLeft size={14} />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: currentPage === page ? '#7C3AED' : 'rgba(255, 255, 255, 0.06)',
                            color: '#FFFFFF'
                          }}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar Column (340px) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. Role Overview Card */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC' }}>
                    <Briefcase size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Role Overview</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {mappingData?.role_overview.role_title || selectedRole}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '6px 0 14px' }}>
                  {mappingData?.role_overview.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Experience Level</span>
                    <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{mappingData?.role_overview.experience_level}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Industry</span>
                    <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{mappingData?.role_overview.industry}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Roles Analyzed</span>
                    <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{mappingData?.role_overview.roles_analyzed}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last Updated</span>
                    <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{mappingData?.role_overview.last_updated}</span>
                  </div>
                </div>
              </div>

              {/* 2. Industry Demand Trend Card */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Industry Demand Trend
                  </span>
                  <TrendingUp size={15} color="#34D399" />
                </div>

                {/* Trend Graph SVG */}
                <div style={{ margin: '14px 0 8px' }}>
                  <svg width="100%" height="80" viewBox="0 0 280 80" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#C084FC" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#C084FC" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 20 60 L 75 42 L 135 45 L 195 28 L 260 12"
                      fill="none"
                      stroke="#C084FC"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 20 60 L 75 42 L 135 45 L 195 28 L 260 12 L 260 75 L 20 75 Z"
                      fill="url(#trendGradient)"
                    />
                    {/* Data Points */}
                    <circle cx="20" cy="60" r="4" fill="#C084FC" stroke="#0F172A" strokeWidth="2" />
                    <circle cx="75" cy="42" r="4" fill="#C084FC" stroke="#0F172A" strokeWidth="2" />
                    <circle cx="135" cy="45" r="4" fill="#C084FC" stroke="#0F172A" strokeWidth="2" />
                    <circle cx="195" cy="28" r="4" fill="#C084FC" stroke="#0F172A" strokeWidth="2" />
                    <circle cx="260" cy="12" r="5" fill="#34D399" stroke="#0F172A" strokeWidth="2" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Demand is increasing</span>
                  <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700 }}>
                    ▲ 24% this month
                  </span>
                </div>
              </div>

              {/* 3. What This Means For You Card */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '12px' }}>
                  What This Means For You
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {mappingData?.guidance.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '8px 10px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <div style={{
                        padding: '4px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: '#818CF8',
                        marginTop: '2px',
                        flexShrink: 0
                      }}>
                        <Check size={12} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#F8FAFC' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '1px', lineHeight: 1.35 }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Primary Bottom CTA: Continue to Gap Analysis */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onNavigateToGapAnalysis && onNavigateToGapAnalysis(mappingData || undefined)}
                  disabled={isLoading || !mappingData}
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
                  Continue to Gap Analysis →
                </button>
                <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Next: See your skill gaps
                </div>
              </div>
            </div>
          </div>

          {/* Modal: About Industry Benchmarks */}
          {isInfoModalOpen && (
            <div className="modal-backdrop" onClick={() => setIsInfoModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px', color: '#C084FC' }}>
                      <HelpCircle size={18} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>Target Role Benchmarks</h3>
                  </div>
                  <button onClick={() => setIsInfoModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  This page establishes the target capability benchmark for your selected role. We synthesize normalized occupational skill requirements derived from industry frameworks (such as ESCO and O*NET standards).
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '8px' }}>
                  In the next phase (<strong>Page 5 — Gap Analysis</strong>), the engine will compare your evidence-backed SkillTwin profile directly against this requirement benchmark to identify your priority growth areas.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button className="btn btn-primary" onClick={() => setIsInfoModalOpen(false)}>
                    Understood
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Market Demand Overview */}
          {isDemandModalOpen && (
            <div className="modal-backdrop" onClick={() => setIsDemandModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '8px', color: '#38BDF8' }}>
                      <TrendingUp size={18} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>Market Demand Overview</h3>
                  </div>
                  <button onClick={() => setIsDemandModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Market demand rankings reflect hiring frequency across {mappingData?.role_overview.roles_analyzed} for {selectedRole}.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {mappingData?.top_demand_skills.map((s) => (
                    <div key={s.rank} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F8FAFC' }}>{s.rank}. {s.name} ({s.category})</span>
                      {renderDemandBadge(s.demand_level)}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button className="btn btn-primary" onClick={() => setIsDemandModalOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Single Requirement Detail Inspector */}
          {selectedRequirement && (
            <div className="modal-backdrop" onClick={() => setSelectedRequirement(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>{selectedRequirement.skill}</h3>
                    <span className="badge badge-purple" style={{ fontSize: '0.68rem', marginTop: '4px' }}>
                      {selectedRequirement.category}
                    </span>
                  </div>
                  <button onClick={() => setSelectedRequirement(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Importance</div>
                      <div style={{ marginTop: '2px' }}>{renderImportanceBadge(selectedRequirement.importance)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Required Level</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34D399', marginTop: '2px' }}>{selectedRequirement.required_proficiency}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Industry Avg</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38BDF8', marginTop: '2px' }}>{selectedRequirement.industry_avg_proficiency}%</div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Why this skill matters for {selectedRole}</div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                      {selectedRequirement.description}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button className="btn btn-primary" onClick={() => setSelectedRequirement(null)}>
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

export default TargetRoleMappingPage;
