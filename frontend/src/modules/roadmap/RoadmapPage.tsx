import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  Download,
  AlertCircle,
  HelpCircle,
  RotateCw,
  Loader2,
  Code2,
  Cpu,
  Database,
  Terminal,
  X,
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  FolderGit2,
  ExternalLink,
  Zap,
  CheckSquare,
  Square,
  Trophy,
  BarChart2,
  Layers,
  Bot,
  GitGraph
} from 'lucide-react';
import {
  UserProfile,
  PersonalizedRoadmapResponse,
  RoadmapPhaseItem
} from '../../shared/types';
import { apiClient } from '../../shared/apiClient';
import PersistentSidebar from '../../shared/components/PersistentSidebar';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';
import { VisualRoadmap } from './VisualRoadmap';
import { QuizModal } from './QuizModal';

interface RoadmapPageProps {
  userProfile: UserProfile | null;
  onNavigateToOnboarding?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToSkillTwin?: () => void;
  onNavigateToTargetRole?: () => void;
  onNavigateToGapAnalysis?: () => void;
  onNavigateToRoadmap?: () => void;
  onNavigateToVerification?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: () => void;
}

export const RoadmapPage: React.FC<RoadmapPageProps> = ({
  userProfile,
  onNavigateToOnboarding,
  onNavigateToEvidence,
  onNavigateToSkillTwin,
  onNavigateToTargetRole,
  onNavigateToGapAnalysis,
  onNavigateToRoadmap,
  onNavigateToVerification,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToHelp
}) => {
  // Target role configuration & daily effort from onboarding profile
  const targetRole = userProfile?.target_role || 'Full-Stack Developer';
  const experienceLevel = 'Entry Level (0-2 years)';
  const dailyEffort = userProfile?.study_time_per_day || '1-2 hours/day';

  // Data & Loading States
  const [roadmapData, setRoadmapData] = useState<PersonalizedRoadmapResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active View Tab: Roadmap View vs Calendar View vs Visual Graph
  const [activeTab, setActiveTab] = useState<'roadmap' | 'calendar' | 'visual'>('visual');

  // Expanded Phases State (Phase 1 expanded by default)
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({
    1: true,
    2: true
  });

  // Modals & Details
  const [selectedPhaseForDetail, setSelectedPhaseForDetail] = useState<RoadmapPhaseItem | null>(null);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [isMilestonesModalOpen, setIsMilestonesModalOpen] = useState<boolean>(false);

  // Quiz Modal State
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);
  const [currentQuizTaskId, setCurrentQuizTaskId] = useState<string>('');
  const [currentQuizSkillName, setCurrentQuizSkillName] = useState<string>('');

  const phase1Ref = useRef<HTMLDivElement | null>(null);

  // Handle starting a quiz for a specific task
  const handleStartQuiz = (taskId: string, skillName: string) => {
    setCurrentQuizTaskId(taskId);
    setCurrentQuizSkillName(skillName);
    setIsQuizModalOpen(true);
  };

  // Handle quiz completion - refresh roadmap data
  const handleQuizComplete = async (passed: boolean, score: number) => {
    console.log(`Quiz completed: passed=${passed}, score=${score}%`);
    // Refresh roadmap data to reflect updated task status
    await fetchRoadmap(false);
  };

  // Fetch Roadmap from Backend
  const fetchRoadmap = async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getPersonalizedRoadmap(
        targetRole,
        experienceLevel,
        dailyEffort,
        userProfile?.id
      );
      setRoadmapData(data);
    } catch (err: any) {
      console.error('[Roadmap] Fetch failed:', err);
      setError(err?.message || 'Failed to load personalized roadmap. Please ensure backend is running.');
    } finally {
      setIsLoading(false);
      setIsRecalculating(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    fetchRoadmap(true);
  }, [targetRole, dailyEffort, userProfile?.id]);

  // Recalculate Roadmap
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const updated = await apiClient.recalculateRoadmap(
        targetRole,
        experienceLevel,
        dailyEffort,
        userProfile?.id
      );
      setRoadmapData(updated);
    } catch (err: any) {
      console.error('[Roadmap] Recalculate failed:', err);
      await fetchRoadmap(false);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Derive task & phase counts dynamically across all roadmap phases
  const allTasks = roadmapData?.phases.flatMap(p => p.tasks) || [];
  const totalTasksCount = allTasks.length;
  const completedTasksCount = allTasks.filter(t => t.is_completed).length;
  const isAllCompleted = totalTasksCount > 0 && completedTasksCount === totalTasksCount;

  // Determine active/unlocked in-progress tasks dynamically
  const inProgressTasksCount = ((): number => {
    let count = 0;
    let foundActive = false;
    allTasks.forEach((task, idx) => {
      if (!task.is_completed && !foundActive) {
        const prevCompleted = idx === 0 || allTasks[idx - 1].is_completed;
        if (prevCompleted) {
          count++;
          foundActive = true;
        }
      }
    });
    return count > 0 ? count : (completedTasksCount < totalTasksCount ? 1 : 0);
  })();

  const notStartedTasksCount = Math.max(0, totalTasksCount - completedTasksCount - inProgressTasksCount);

  // Overall completion percentage computed dynamically from completed tasks
  const overallCompletionPct = totalTasksCount > 0
    ? Math.round((completedTasksCount / totalTasksCount) * 100)
    : (roadmapData?.summary?.overall_completion_pct || 0);

  // Sync completion state to localStorage
  useEffect(() => {
    if (isAllCompleted) {
      localStorage.setItem('skilltwin_roadmap_completed', 'true');
    } else {
      localStorage.removeItem('skilltwin_roadmap_completed');
    }
  }, [isAllCompleted]);

  // Toggle Task Completion State & Persist
  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    // Optimistic UI update
    if (!roadmapData) return;
    const nextCompleted = !currentCompleted;

    try {
      const updated = await apiClient.toggleRoadmapTask(
        taskId,
        nextCompleted,
        targetRole,
        experienceLevel,
        dailyEffort,
        userProfile?.id
      );
      setRoadmapData(updated);

      const updatedAllTasks = updated.phases.flatMap(p => p.tasks);
      if (updatedAllTasks.length > 0 && updatedAllTasks.every(t => t.is_completed)) {
        localStorage.setItem('skilltwin_roadmap_completed', 'true');
      } else {
        localStorage.removeItem('skilltwin_roadmap_completed');
      }

      // If phase detail modal is open, refresh its selected phase
      if (selectedPhaseForDetail) {
        const updatedPhase = updated.phases.find(p => p.phase_number === selectedPhaseForDetail.phase_number);
        if (updatedPhase) setSelectedPhaseForDetail(updatedPhase);
      }
    } catch (err) {
      console.error('[Roadmap] Task toggle error:', err);
      await fetchRoadmap(false);
    }
  };

  // Toggle Phase Accordion
  const togglePhase = (phaseNum: number) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseNum]: !prev[phaseNum]
    }));
  };

  // Download Roadmap Action
  const handleDownloadRoadmap = () => {
    const url = apiClient.downloadRoadmapUrl(targetRole, experienceLevel, dailyEffort, userProfile?.id);
    window.open(url, '_blank');
  };

  // Icon mapping helper
  const getTaskIcon = (title: string, type: string) => {
    const t = title.toLowerCase();
    if (t.includes('html') || t.includes('css')) return <Code2 size={16} color="#F87171" />;
    if (t.includes('javascript') || t.includes('js')) return <Code2 size={16} color="#FCD34D" />;
    if (t.includes('react')) return <Code2 size={16} color="#38BDF8" />;
    if (t.includes('node') || t.includes('express') || t.includes('fastapi') || t.includes('python')) return <Cpu size={16} color="#34D399" />;
    if (t.includes('postgres') || t.includes('sql') || t.includes('mongo') || t.includes('database')) return <Database size={16} color="#818CF8" />;
    if (t.includes('docker') || t.includes('ci/cd') || t.includes('github') || t.includes('deploy')) return <Terminal size={16} color="#F59E0B" />;
    if (t.includes('portfolio') || t.includes('e-commerce') || t.includes('capstone') || type === 'Project') return <FolderGit2 size={16} color="#C084FC" />;
    return <BookOpen size={16} color="#A855F7" />;
  };

  // Task type badge styling
  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'Course':
        return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', color: '#34D399' };
      case 'Project':
        return { bg: 'rgba(129, 140, 248, 0.15)', border: 'rgba(129, 140, 248, 0.35)', color: '#818CF8' };
      case 'Practice':
      default:
        return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#FCD34D' };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', color: '#F87171' };
      case 'High':
        return { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)', color: '#FB923C' };
      case 'Medium':
      default:
        return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', color: '#FCD34D' };
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px 24px 32px' }}>
      {/* Top Header & Workflow Progress (Steps 1 to 6) */}
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
          <div onClick={onNavigateToOnboarding} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
              ✓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600 }}>Onboarding</span>
              <span style={{ fontSize: '0.62rem', color: '#34D399' }}>Completed</span>
            </div>
          </div>

          <div style={{ width: '14px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 2 */}
          <div onClick={onNavigateToEvidence} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
              ✓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600 }}>Evidence</span>
              <span style={{ fontSize: '0.62rem', color: '#34D399' }}>Completed</span>
            </div>
          </div>

          <div style={{ width: '14px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 3 */}
          <div onClick={onNavigateToSkillTwin} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
              ✓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600 }}>SkillTwin</span>
              <span style={{ fontSize: '0.62rem', color: '#34D399' }}>Completed</span>
            </div>
          </div>

          <div style={{ width: '14px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 4 */}
          <div onClick={onNavigateToTargetRole} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
              ✓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600 }}>Target Role</span>
              <span style={{ fontSize: '0.62rem', color: '#34D399' }}>Completed</span>
            </div>
          </div>

          <div style={{ width: '14px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 5 */}
          <div onClick={onNavigateToGapAnalysis} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
              ✓
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#F8FAFC', fontWeight: 600 }}>Gap Analysis</span>
              <span style={{ fontSize: '0.62rem', color: '#34D399' }}>Completed</span>
            </div>
          </div>

          <div style={{ width: '14px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 6: Active Roadmap */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)' }}>
              6
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: '#C084FC', fontWeight: 800 }}>Roadmap</span>
              <span style={{ fontSize: '0.62rem', color: '#C084FC' }}>Your Plan</span>
            </div>
          </div>

          <div style={{ width: '14px', height: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Step 7: Project Verification */}
          <div
            onClick={() => {
              if (isAllCompleted) {
                localStorage.setItem('skilltwin_roadmap_completed', 'true');
                if (onNavigateToVerification) onNavigateToVerification();
              } else {
                alert('Roadmap Incomplete: Please mark all required roadmap skills as completed before proceeding to Project Verification.');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isAllCompleted ? 'pointer' : 'not-allowed',
              opacity: isAllCompleted ? 1 : 0.45
            }}
            title={isAllCompleted ? "Step 7: Project Verification" : "Complete all roadmap skills to unlock Project Verification"}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: isAllCompleted ? '#10B981' : 'rgba(255, 255, 255, 0.12)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700
            }}>
              {isAllCompleted ? '✓' : '7'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.72rem', color: isAllCompleted ? '#F8FAFC' : '#94A3B8', fontWeight: 600 }}>Verification</span>
              <span style={{ fontSize: '0.62rem', color: isAllCompleted ? '#34D399' : 'var(--text-muted)' }}>
                {isAllCompleted ? 'Ready' : 'Locked'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Header: Download Roadmap & Global Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleDownloadRoadmap}
            style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Download Roadmap
          </button>
          <GlobalHeaderBadge />
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="dashboard-layout">
        {/* Left Persistent Dashboard Sidebar */}
        <PersistentSidebar
          userProfile={userProfile}
          activeStep={6}
          activeView="roadmap"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={onNavigateToEvidence}
          onNavigateToSkillTwin={onNavigateToSkillTwin}
          onNavigateToTargetRole={onNavigateToTargetRole}
          onNavigateToGapAnalysis={onNavigateToGapAnalysis}
          onNavigateToRoadmap={onNavigateToRoadmap || (() => {})}
          onNavigateToVerification={onNavigateToVerification}
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
                  Your Personalized Roadmap
                </h1>
                <Sparkles size={20} color="#C084FC" />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
                A step-by-step plan designed to close your skill gaps and help you become a{' '}
                <span style={{ color: '#C084FC', fontWeight: 600 }}>{targetRole} ({experienceLevel})</span>
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleRecalculate}
                disabled={isRecalculating}
                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Recalculate roadmap from latest SkillTwin"
              >
                <RotateCw size={13} style={{ animation: isRecalculating ? 'spin 1s linear infinite' : 'none' }} />
                <span>Adjust Plan</span>
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
                Generating your personalized roadmap...
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Structuring phases, practice tasks, and project milestones based on your Skill Gap Analysis.
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="glass-panel" style={{ padding: '30px', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertCircle size={24} color="#F87171" />
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F87171' }}>Generation Error</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{error}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fetchRoadmap(true)}
                style={{ marginTop: '16px', padding: '6px 16px', fontSize: '0.8rem' }}
              >
                Retry Generation
              </button>
            </div>
          )}

          {/* Main Dashboard Content */}
          {!isLoading && !error && roadmapData && (
            <>
              {/* TOP 4 SUMMARY CARDS */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '14px'
              }}>
                {/* Card 1: Target Role */}
                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.25)', background: 'rgba(15, 23, 42, 0.75)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '6px' }}>
                    <Code2 size={15} color="#818CF8" />
                    <span>Target Role</span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {roadmapData.target_role}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#C084FC', marginTop: '2px' }}>Career Target</div>
                </div>

                {/* Card 2: Experience Level */}
                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.25)', background: 'rgba(15, 23, 42, 0.75)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '6px' }}>
                    <BarChart2 size={15} color="#34D399" />
                    <span>Experience Level</span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC' }}>
                    {roadmapData.experience_level}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#34D399', marginTop: '2px' }}>Benchmark Tier</div>
                </div>

                {/* Card 3: Estimated Duration */}
                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.25)', background: 'rgba(15, 23, 42, 0.75)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '6px' }}>
                    <Clock size={15} color="#F59E0B" />
                    <span>Estimated Duration</span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC' }}>
                    {roadmapData.estimated_duration}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>Recommended time</div>
                </div>

                {/* Card 4: Daily Effort */}
                <div className="glass-card" style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(56, 189, 248, 0.25)', background: 'rgba(15, 23, 42, 0.75)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '6px' }}>
                    <CalendarIcon size={15} color="#38BDF8" />
                    <span>Weekly Commitment</span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC' }}>
                    {roadmapData.weekly_commitment}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#38BDF8', marginTop: '2px' }}>
                    {roadmapData.daily_effort}
                  </div>
                </div>
              </div>

              {/* TAB SWITCHER: ROADMAP VIEW VS CALENDAR VIEW VS VISUAL GRAPH */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Visual Graph Tab - NEW! */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('visual')}
                    style={{
                      padding: '8px 16px',
                      background: activeTab === 'visual' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                      border: activeTab === 'visual' ? '1px solid #818CF8' : '1px solid transparent',
                      borderRadius: '10px',
                      color: activeTab === 'visual' ? '#FFFFFF' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <GitGraph size={15} /> Visual Graph
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('roadmap')}
                    style={{
                      padding: '8px 16px',
                      background: activeTab === 'roadmap' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                      border: activeTab === 'roadmap' ? '1px solid #818CF8' : '1px solid transparent',
                      borderRadius: '10px',
                      color: activeTab === 'roadmap' ? '#FFFFFF' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Layers size={15} /> Roadmap Plan
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('calendar')}
                    style={{
                      padding: '8px 16px',
                      background: activeTab === 'calendar' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                      border: activeTab === 'calendar' ? '1px solid #818CF8' : '1px solid transparent',
                      borderRadius: '10px',
                      color: activeTab === 'calendar' ? '#FFFFFF' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <CalendarIcon size={15} /> Calendar View
                  </button>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total {roadmapData.summary.total_phases} Phases • {roadmapData.summary.total_items} Action Items
                </div>
              </div>

              {/* TWO COLUMN LAYOUT: MAIN ROADMAP / CALENDAR + RIGHT SUMMARY */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 300px',
                gap: '20px',
                alignItems: 'start'
              }}>
                {/* LEFT WORKSPACE: VISUAL GRAPH OR ROADMAP PLAN OR CALENDAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeTab === 'visual' ? (
                    /* ----------------- VISUAL GRAPH VIEW (NEW!) ----------------- */
                    <div className="glass-panel" style={{ padding: '20px' }}>
                      <VisualRoadmap
                        roadmapData={roadmapData}
                        onStartQuiz={handleStartQuiz}
                      />
                    </div>
                  ) : activeTab === 'roadmap' ? (
                    /* ----------------- ROADMAP VIEW ----------------- */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {roadmapData.phases.map((phase) => {
                        const isExpanded = !!expandedPhases[phase.phase_number];
                        const pStyle = getPriorityStyle(phase.priority);

                        return (
                          <div
                            key={phase.phase_number}
                            ref={phase.phase_number === 1 ? phase1Ref : undefined}
                            className="glass-panel"
                            style={{
                              padding: '18px 20px',
                              borderRadius: '16px',
                              border: phase.status === 'In Progress' ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                              background: phase.status === 'In Progress' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.75)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {/* Phase Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Milestone Number Badge */}
                                <div style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '10px',
                                  background: phase.status === 'Completed'
                                    ? '#10B981'
                                    : (phase.phase_number === 1 ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' : 'rgba(99, 102, 241, 0.15)'),
                                  color: '#FFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.9rem',
                                  flexShrink: 0
                                }}>
                                  {phase.status === 'Completed' ? '✓' : phase.phase_number}
                                </div>

                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                                      {phase.title}
                                    </h3>
                                    <span style={{
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      background: pStyle.bg,
                                      border: `1px solid ${pStyle.border}`,
                                      color: pStyle.color
                                    }}>
                                      {phase.priority}
                                    </span>
                                  </div>
                                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                                    {phase.subtitle}
                                  </p>
                                </div>
                              </div>

                              {/* Progress & Duration Meta & Expand Chevron */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  <Clock size={13} />
                                  <span>{phase.estimated_duration_weeks}</span>
                                </div>

                                <div style={{ width: '90px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '3px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                                    <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{phase.progress_pct}%</span>
                                  </div>
                                  <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${phase.progress_pct}%`, height: '100%', background: 'linear-gradient(90deg, #4F46E5 0%, #A855F7 100%)', borderRadius: '3px' }} />
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setSelectedPhaseForDetail(phase)}
                                  className="btn btn-outline"
                                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                  title="View phase details"
                                >
                                  Details
                                </button>

                                <button
                                  type="button"
                                  onClick={() => togglePhase(phase.phase_number)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                >
                                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                              </div>
                            </div>

                            {/* Expandable Phase Tasks */}
                            {isExpanded && (
                              <div style={{
                                marginTop: '16px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                paddingTop: '14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                              }}>
                                {phase.tasks.map((task) => {
                                  const tBadge = getTaskTypeBadge(task.type);

                                  return (
                                    <div
                                      key={task.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 14px',
                                        background: task.is_completed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(15, 23, 42, 0.5)',
                                        border: task.is_completed ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                                        borderRadius: '10px',
                                        transition: 'all 0.15s ease',
                                        gap: '12px',
                                        flexWrap: 'wrap'
                                      }}
                                    >
                                      {/* Checkbox + Icon + Title + Description */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleTask(task.id, task.is_completed)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: task.is_completed ? '#10B981' : 'var(--text-muted)',
                                            padding: '0',
                                            display: 'flex'
                                          }}
                                          title={task.is_completed ? 'Mark incomplete' : 'Mark complete'}
                                        >
                                          {task.is_completed ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>

                                        <div style={{
                                          width: '26px',
                                          height: '26px',
                                          borderRadius: '6px',
                                          background: 'rgba(15, 23, 42, 0.9)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0
                                        }}>
                                          {getTaskIcon(task.title, task.type)}
                                        </div>

                                        <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{
                                              fontSize: '0.82rem',
                                              fontWeight: 700,
                                              color: task.is_completed ? '#34D399' : '#F8FAFC',
                                              textDecoration: task.is_completed ? 'line-through' : 'none'
                                            }}>
                                              {task.title}
                                            </span>
                                            <span style={{
                                              fontSize: '0.65rem',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              fontWeight: 700,
                                              background: tBadge.bg,
                                              border: `1px solid ${tBadge.border}`,
                                              color: tBadge.color
                                            }}>
                                              {task.type}
                                            </span>
                                          </div>
                                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.3 }}>
                                            {task.description}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Task Progress & Est Hours */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '80px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '2px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                                            <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{task.progress_pct}%</span>
                                          </div>
                                          <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ width: `${task.progress_pct}%`, height: '100%', background: task.is_completed ? '#10B981' : '#818CF8', borderRadius: '2px' }} />
                                          </div>
                                        </div>

                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '65px', textAlign: 'right' }}>
                                          Est. {task.estimated_hours} hrs
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Milestone Achievement Bar */}
                      <div className="glass-panel" style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: '14px',
                        border: isAllCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(168, 85, 247, 0.3)',
                        background: isAllCompleted
                          ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.3) 0%, rgba(15, 23, 42, 0.9) 100%)'
                          : 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(99, 102, 241, 0.1) 100%)',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: isAllCompleted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(168, 85, 247, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isAllCompleted ? '#34D399' : '#C084FC'
                          }}>
                            {isAllCompleted ? <CheckCircle2 size={18} /> : <Trophy size={18} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#F8FAFC' }}>
                              {isAllCompleted ? 'All Roadmap Milestones Completed!' : 'Milestone Achievement'}
                            </div>
                            <p style={{ fontSize: '0.72rem', color: isAllCompleted ? '#34D399' : 'var(--text-muted)', margin: '1px 0 0' }}>
                              {isAllCompleted
                                ? 'All required skills completed. Proceed to verify your projects.'
                                : `${completedTasksCount} of ${totalTasksCount} skills completed. Mark each item to unlock Step 7.`}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                          <div style={{ width: '130px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '3px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Overall Progress</span>
                              <span style={{ color: isAllCompleted ? '#34D399' : '#C084FC', fontWeight: 700 }}>
                                {roadmapData.summary.overall_completion_pct}%
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${roadmapData.summary.overall_completion_pct}%`, height: '100%', background: isAllCompleted ? '#10B981' : 'linear-gradient(90deg, #4F46E5 0%, #A855F7 100%)', borderRadius: '3px' }} />
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!isAllCompleted}
                            onClick={() => {
                              if (isAllCompleted) {
                                localStorage.setItem('skilltwin_roadmap_completed', 'true');
                                if (onNavigateToVerification) onNavigateToVerification();
                              }
                            }}
                            className={`btn ${isAllCompleted ? 'btn-primary' : 'btn-outline'}`}
                            style={{
                              padding: '8px 18px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              background: isAllCompleted
                                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                                : 'rgba(255, 255, 255, 0.05)',
                              color: isAllCompleted ? '#FFFFFF' : 'var(--text-muted)',
                              border: isAllCompleted ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                              cursor: isAllCompleted ? 'pointer' : 'not-allowed',
                              opacity: isAllCompleted ? 1 : 0.55,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title={isAllCompleted ? 'Proceed to Project Verification' : 'Complete all roadmap skills to unlock'}
                          >
                            Verify Projects →
                          </button>
                        </div>
                      </div>

                      {/* Tip Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        <span style={{ color: '#F59E0B', fontWeight: 700 }}>ⓘ Tip:</span>
                        <span>Follow the roadmap in order for the best learning experience. Each phase builds on the previous one.</span>
                      </div>
                    </div>
                  ) : (
                    /* ----------------- CALENDAR VIEW ----------------- */
                    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                            Calendar Schedule
                          </h3>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            Tasks organized by study weeks according to your {roadmapData.daily_effort} commitment
                          </p>
                        </div>
                        <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                          {roadmapData.weekly_commitment}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                        {roadmapData.calendar_events.map((event) => {
                          const tBadge = getTaskTypeBadge(event.type);

                          return (
                            <div
                              key={event.id}
                              style={{
                                padding: '12px 14px',
                                background: event.is_completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.7)',
                                border: event.is_completed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.68rem', color: '#C084FC', fontWeight: 700 }}>
                                  {event.week}
                                </span>
                                <span style={{
                                  fontSize: '0.62rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: tBadge.bg,
                                  border: `1px solid ${tBadge.border}`,
                                  color: tBadge.color,
                                  fontWeight: 700
                                }}>
                                  {event.type}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: event.is_completed ? '#34D399' : '#F8FAFC' }}>
                                {event.title}
                              </div>

                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {event.phase_title} • {event.estimated_hours} hrs
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleTask(event.task_id, event.is_completed)}
                                  className="btn btn-outline"
                                  style={{ padding: '3px 8px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  {event.is_completed ? <Check size={12} color="#10B981" /> : null}
                                  <span>{event.is_completed ? 'Done' : 'Mark Done'}</span>
                                </button>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                  {event.progress_pct}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: SUMMARY PANEL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* A. Roadmap Summary Donut */}
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '14px' }}>
                      Roadmap Summary
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                      {/* Donut Chart */}
                      <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
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
                            stroke="#10B981"
                            strokeWidth="3.8"
                            strokeDasharray={`${overallCompletionPct}, 100`}
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
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
                            {overallCompletionPct}%
                          </div>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                            Completed
                          </div>
                        </div>
                      </div>

                      {/* Legend */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, fontSize: '0.72rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10B981' }} />
                            <span style={{ color: '#F8FAFC' }}>Completed</span>
                          </div>
                          <span style={{ color: '#34D399', fontWeight: 700 }}>{completedTasksCount}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#38BDF8' }} />
                            <span style={{ color: '#F8FAFC' }}>In Progress</span>
                          </div>
                          <span style={{ color: '#38BDF8', fontWeight: 700 }}>{inProgressTasksCount}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#64748B' }} />
                            <span style={{ color: '#F8FAFC' }}>Not Started</span>
                          </div>
                          <span style={{ color: 'var(--text-muted)' }}>{notStartedTasksCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats List */}
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Phases</span>
                        <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{roadmapData.summary.total_phases}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Duration</span>
                        <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{roadmapData.summary.total_duration}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Projects</span>
                        <span style={{ color: '#C084FC', fontWeight: 600 }}>{roadmapData.summary.total_projects}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total Resources</span>
                        <span style={{ color: '#38BDF8', fontWeight: 600 }}>{roadmapData.summary.total_resources}</span>
                      </div>
                    </div>
                  </div>

                  {/* B. Top Skills You Will Gain */}
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '12px' }}>
                      Top Skills You Will Gain
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {roadmapData.top_skills_you_will_gain.map((skill, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: '#F8FAFC',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span style={{ color: '#C084FC' }}>✦</span> {skill.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* C. Why This Roadmap? */}
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '10px' }}>
                      Why This Roadmap?
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {roadmapData.why_this_roadmap_reasons.map((reason, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <CheckCircle2 size={14} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                            {reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* D. AI Mentor Tip */}
                  <div className="glass-panel" style={{
                    padding: '16px',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(99, 102, 241, 0.08) 100%)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Bot size={16} color="#C084FC" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                        AI Mentor Tip
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                      Consistency beats intensity. Follow this roadmap step by step. Build projects, practice regularly, and you'll reach your goal with confidence!
                    </p>
                  </div>

                  {/* E. Next Stage CTA Card: Verify Projects */}
                  <div className="glass-panel" style={{
                    padding: '16px',
                    borderRadius: '14px',
                    border: isAllCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isAllCompleted ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)' : 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isAllCompleted ? '#34D399' : '#F8FAFC' }}>
                        {isAllCompleted ? '🎉 Roadmap Completed!' : 'Next Stage: Project Verification'}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: isAllCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                        color: isAllCompleted ? '#34D399' : '#F59E0B',
                        border: isAllCompleted ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.3)'
                      }}>
                        {isAllCompleted ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!isAllCompleted}
                      onClick={() => {
                        if (isAllCompleted) {
                          localStorage.setItem('skilltwin_roadmap_completed', 'true');
                          if (onNavigateToVerification) {
                            onNavigateToVerification();
                          }
                        }
                      }}
                      className={`btn ${isAllCompleted ? 'btn-primary' : 'btn-outline'}`}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        background: isAllCompleted
                          ? 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                        boxShadow: isAllCompleted ? '0 4px 20px rgba(16, 185, 129, 0.4)' : 'none',
                        color: isAllCompleted ? '#FFFFFF' : 'var(--text-muted)',
                        border: isAllCompleted ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: isAllCompleted ? 'pointer' : 'not-allowed',
                        opacity: isAllCompleted ? 1 : 0.55,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      title={isAllCompleted ? 'Proceed to Project Verification' : 'Complete all roadmap skills to unlock'}
                    >
                      Verify Projects →
                    </button>

                    <div style={{ fontSize: '0.7rem', color: isAllCompleted ? '#34D399' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.35 }}>
                      {isAllCompleted
                        ? 'All roadmap skills completed! Ready for Project Verification.'
                        : `${completedTasksCount} of ${totalTasksCount} skills completed (${Math.round((completedTasksCount / (totalTasksCount || 1)) * 100)}%)`}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* DETAIL MODAL FOR SELECTED PHASE */}
          {selectedPhaseForDetail && createPortal(
            <div className="modal-backdrop" onClick={() => setSelectedPhaseForDetail(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', padding: '30px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818CF8', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                      {selectedPhaseForDetail.phase_number}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {selectedPhaseForDetail.title}
                      </h3>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        {selectedPhaseForDetail.subtitle}
                      </p>
                    </div>
                  </div>

                  <button onClick={() => setSelectedPhaseForDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Why Selected & Gap Addressed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px', fontSize: '0.8rem' }}>
                  <div style={{ padding: '16px 18px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#C084FC', fontWeight: 700, marginBottom: '6px' }}>
                      <Sparkles size={15} /> Why this phase was selected
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                      {selectedPhaseForDetail.why_it_matters}
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '0.74rem', color: '#38BDF8', fontWeight: 600 }}>
                      🎯 <strong>Gap Addressed:</strong> {selectedPhaseForDetail.exact_gap_addressed}
                    </div>
                  </div>

                  {/* Curated Resources */}
                  <div style={{ padding: '16px 18px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399', fontWeight: 700, marginBottom: '10px' }}>
                      <BookOpen size={15} /> Curated Learning Resources
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedPhaseForDetail.tasks.flatMap(t => t.resources).slice(0, 4).map((res, idx) => (
                        <a
                          key={idx}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: 'rgba(15, 23, 42, 0.5)',
                            borderRadius: '8px',
                            color: '#F8FAFC',
                            textDecoration: 'none',
                            fontSize: '0.76rem',
                            border: '1px solid rgba(255, 255, 255, 0.04)'
                          }}
                        >
                          <span>{res.title}</span>
                          <ExternalLink size={13} color="#818CF8" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Tasks & Practice Checkpoints */}
                  <div style={{ padding: '16px 18px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FCD34D', fontWeight: 700, marginBottom: '10px' }}>
                      <Zap size={15} /> Action Checklist & Practice
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedPhaseForDetail.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(task.id, task.is_completed)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 12px',
                            background: task.is_completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.4)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: '1px solid rgba(255, 255, 255, 0.03)'
                          }}
                        >
                          {task.is_completed ? <CheckSquare size={16} color="#10B981" /> : <Square size={16} color="var(--text-muted)" />}
                          <span style={{ fontSize: '0.76rem', color: task.is_completed ? '#34D399' : '#F8FAFC', textDecoration: task.is_completed ? 'line-through' : 'none', lineHeight: 1.4 }}>
                            [{task.type}] {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setSelectedPhaseForDetail(null)} style={{ padding: '8px 18px', fontSize: '0.82rem' }}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedPhaseForDetail(null);
                      if (onNavigateToVerification) {
                        onNavigateToVerification();
                      } else {
                        alert('Project deliverables from this phase are saved. You can submit them for Phase 7 Project Verification upon completion!');
                      }
                    }}
                    style={{ padding: '8px 20px', fontSize: '0.82rem' }}
                  >
                    Prepare for Verification →
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* FULL MILESTONES MODAL */}
          {isMilestonesModalOpen && roadmapData && (
            <div className="modal-backdrop" onClick={() => setIsMilestonesModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: '30px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Trophy size={22} color="#C084FC" />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      Career Milestones
                    </h3>
                  </div>
                  <button onClick={() => setIsMilestonesModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {roadmapData.milestones.map((m) => (
                    <div
                      key={m.milestone_number}
                      style={{
                        padding: '16px 18px',
                        background: m.is_achieved ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.7)',
                        border: m.is_achieved ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: m.is_achieved ? '#10B981' : 'rgba(255, 255, 255, 0.1)',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {m.is_achieved ? '✓' : m.milestone_number}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: m.is_achieved ? '#34D399' : '#F8FAFC' }}>
                          {m.title}
                        </div>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.45 }}>
                          {m.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="btn btn-primary" onClick={() => setIsMilestonesModalOpen(false)} style={{ padding: '8px 22px', fontSize: '0.82rem' }}>
                    Got it
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OVERLAY MODAL: HOW PERSONALIZED ROADMAP WORKS */}
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
                        How Your Roadmap Is Built
                      </h3>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        Learn → Practice → Build cycle
                      </p>
                    </div>
                  </div>

                  <button onClick={() => setIsHowItWorksOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>1. Evidence-Backed Personalization:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      We do not give you a generic tutorial list. Your roadmap is prioritized according to your actual Page 5 Skill Gap Analysis and target role demands.
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>2. Learn → Practice → Build Cycle:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      Every phase combines verified theoretical concepts, concrete coding exercises, and portfolio build projects.
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>3. Paced to Your Schedule:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      Milestones and calendar tasks automatically scale according to your daily study commitment ({dailyEffort}).
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px' }}>
                    <strong style={{ color: '#F8FAFC' }}>4. Bridge to Project Verification:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      Completed builds prepare repositories for Page 7 Project Verification to update your Living SkillTwin.
                    </p>
                  </div>

                  <div style={{ padding: '10px 14px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                    <strong style={{ color: '#C084FC' }}>5. Visual Graph & Quiz System:</strong>
                    <p style={{ margin: '2px 0 0' }}>
                      Click on nodes in the Visual Graph tab to see YouTube tutorials and documentation. Complete a quick quiz (70% to pass) to unlock the next node!
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

          {/* QUIZ MODAL */}
          <QuizModal
            isOpen={isQuizModalOpen}
            onClose={() => setIsQuizModalOpen(false)}
            taskId={currentQuizTaskId}
            skillName={currentQuizSkillName}
            userId={userProfile?.id || ''}
            onQuizComplete={handleQuizComplete}
            userProfile={userProfile}
          />
        </main>
      </div>
    </div>
  );
};

export default RoadmapPage;
