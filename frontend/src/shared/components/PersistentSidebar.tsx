import React from 'react';
import {
  User,
  FileText,
  Cpu,
  Compass,
  Award,
  CheckCircle2,
  Settings,
  Shield,
  GraduationCap,
  HelpCircle,
  Lock,
  Map,
  ShieldCheck,
  Rocket
} from 'lucide-react';
import { UserProfile } from '../types';

interface PersistentSidebarProps {
  userProfile?: UserProfile | null;
  activeStep?: number; // 1 = Onboarding, 2 = Evidence, 3 = SkillTwin, 4 = Target Role, 5 = Gap Analysis, 6 = Roadmap, 7 = Project Verification, 8 = SkillTwin Updated, 9 = Career Readiness
  activeView?: 'onboarding' | 'evidence' | 'profile' | 'settings' | 'help' | 'skilltwin' | 'target_role' | 'gap' | 'roadmap' | 'verification' | 'skilltwin_updated' | 'readiness';
  completedStages?: {
    onboarding?: boolean;
    evidence?: boolean;
    skilltwin?: boolean;
    target_role?: boolean;
    gap?: boolean;
    roadmap?: boolean;
    verification?: boolean;
    skilltwin_updated?: boolean;
    readiness?: boolean;
  };
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
  onOpenSecurityModal?: () => void;
}

/** One entry per journey step. Replaces nine near-identical JSX blocks. */
interface StageDef {
  key: string;
  step: number;
  label: string;
  icon: React.ReactNode;
  /** Shown when the user clicks a step they have not unlocked yet. */
  blockedMsg: string;
}

const STAGES: StageDef[] = [
  { key: 'onboarding', step: 1, label: 'Onboarding', icon: <GraduationCap size={15} />, blockedMsg: 'Onboarding is completed and locked.' },
  { key: 'evidence', step: 2, label: 'Evidence', icon: <FileText size={15} />, blockedMsg: 'Complete onboarding first.' },
  { key: 'skilltwin', step: 3, label: 'Your SkillTwin', icon: <Cpu size={15} />, blockedMsg: 'Add your resume, GitHub profile or projects in Evidence first.' },
  { key: 'target_role', step: 4, label: 'Target Role', icon: <Compass size={15} />, blockedMsg: 'Complete Evidence Collection first.' },
  { key: 'gap', step: 5, label: 'Skill Gaps', icon: <Award size={15} />, blockedMsg: 'Pick your target role first.' },
  { key: 'roadmap', step: 6, label: 'Roadmap', icon: <Map size={15} />, blockedMsg: 'Run your gap analysis first.' },
  { key: 'verification', step: 7, label: 'Verify Projects', icon: <ShieldCheck size={15} />, blockedMsg: 'Start your roadmap first.' },
  { key: 'skilltwin_updated', step: 8, label: 'Twin Update', icon: <Cpu size={15} />, blockedMsg: 'Verify a project first.' },
  { key: 'readiness', step: 9, label: 'Career Readiness', icon: <Rocket size={15} />, blockedMsg: 'Update your twin first.' }
];

export const PersistentSidebar: React.FC<PersistentSidebarProps> = ({
  userProfile,
  activeStep,
  activeView = 'evidence',
  completedStages,
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
  onNavigateToHelp,
  onOpenSecurityModal
}) => {
  const viewToStep: Record<string, number> = {
    onboarding: 1,
    evidence: 2,
    skilltwin: 3,
    target_role: 4,
    gap: 5,
    roadmap: 6,
    verification: 7,
    skilltwin_updated: 8,
    readiness: 9
  };
  const currentStep = activeStep ?? (viewToStep[activeView] || 1);

  const userName = userProfile?.name?.trim() || 'Your Profile';
  const userRole = userProfile?.target_role?.trim() || 'Full-Stack Developer';
  const avatarImage = userProfile?.avatar_base64 || userProfile?.avatar_url;

  const getInitials = (name: string): string => {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isCompleted = (key: string): boolean => {
    if (completedStages && typeof (completedStages as any)[key] === 'boolean') {
      return Boolean((completedStages as any)[key]);
    }
    if (key === 'onboarding') {
      return Boolean(
        (userProfile && Boolean(userProfile.target_role && (userProfile.education_level || userProfile.degree))) ||
        localStorage.getItem('skilltwin_onboarding_completed') === 'true'
      );
    }
    if (key === 'evidence') {
      const hasEvData = Boolean(
        localStorage.getItem('skilltwin_resume_data') ||
        localStorage.getItem('skilltwin_github_data') ||
        localStorage.getItem('skilltwin_projects_data')
      );
      return hasEvData || localStorage.getItem('skilltwin_evidence_completed') === 'true';
    }
    if (key === 'skilltwin') {
      return localStorage.getItem('skilltwin_skilltwin_completed') === 'true';
    }
    if (key === 'target_role') {
      return localStorage.getItem('skilltwin_target_role_completed') === 'true';
    }
    if (key === 'gap') {
      return localStorage.getItem('skilltwin_gap_completed') === 'true';
    }
    if (key === 'roadmap') {
      return localStorage.getItem('skilltwin_roadmap_completed') === 'true';
    }
    if (key === 'verification') {
      return localStorage.getItem('skilltwin_verification_completed') === 'true';
    }
    if (key === 'skilltwin_updated') {
      return localStorage.getItem('skilltwin_skilltwin_updated_completed') === 'true';
    }
    if (key === 'readiness') {
      return localStorage.getItem('skilltwin_readiness_completed') === 'true';
    }
    return localStorage.getItem(`skilltwin_${key}_completed`) === 'true';
  };

  const isAvailable = (key: string): boolean => {
    if (key === 'onboarding') {
      if (currentStep > 1 || localStorage.getItem('skilltwin_evidence_entered') === 'true') {
        return false;
      }
      return true;
    }
    if (key === 'evidence') return isCompleted('onboarding');
    if (key === 'skilltwin') return isCompleted('evidence');
    if (key === 'target_role') return isCompleted('evidence');
    if (key === 'gap') return isCompleted('target_role') || isCompleted('evidence');
    if (key === 'roadmap') return isCompleted('gap') || isCompleted('evidence');
    if (key === 'verification') return isCompleted('roadmap');
    if (key === 'skilltwin_updated') return isCompleted('verification');
    if (key === 'readiness') return isCompleted('skilltwin_updated');
    return true;
  };

  const navHandlers: Record<string, (() => void) | undefined> = {
    onboarding: onNavigateToOnboarding,
    evidence: onNavigateToEvidence,
    skilltwin: onNavigateToSkillTwin,
    target_role: onNavigateToTargetRole,
    gap: onNavigateToGapAnalysis,
    roadmap: onNavigateToRoadmap,
    verification: onNavigateToVerification,
    skilltwin_updated: onNavigateToSkillTwinUpdated,
    readiness: onNavigateToCareerReadiness
  };

  const handleStageClick = (stage: StageDef) => {
    const callback = navHandlers[stage.key];
    if (!callback) return;
    if (!isAvailable(stage.key)) {
      alert(stage.blockedMsg || 'Please complete the earlier steps first.');
      return;
    }
    callback();
  };

  const doneCount = STAGES.filter(s => isCompleted(s.key)).length;
  const pct = Math.round((doneCount / STAGES.length) * 100);

  return (
    <aside className="psb">
      {/* Profile chip */}
      <button
        type="button"
        className={`psb-profile${activeView === 'profile' ? ' psb-profile--active' : ''}`}
        onClick={onNavigateToProfile}
        title="View and edit your profile"
      >
        <span className="psb-avatar">
          {avatarImage ? <img src={avatarImage} alt={userName} /> : getInitials(userName)}
        </span>
        <span className="psb-profile-text">
          <span className="psb-profile-name">{userName}</span>
          <span className="psb-profile-role">{userRole}</span>
        </span>
      </button>

      {/* Progress summary */}
      <div className="psb-progress">
        <div className="psb-progress-top">
          <span className="psb-progress-label">Your progress</span>
          <span className="psb-progress-count">{doneCount}/{STAGES.length}</span>
        </div>
        <div className="psb-progress-track">
          <div className="psb-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Journey rail. One row per step, states: done / current / open / locked. */}
      <nav className="psb-rail" aria-label="Your career journey">
        {STAGES.map(stage => {
          const done = isCompleted(stage.key);
          const current = currentStep === stage.step;
          const open = isAvailable(stage.key);
          const state = current ? 'current' : done ? 'done' : open ? 'open' : 'locked';

          return (
            <button
              type="button"
              key={stage.key}
              className={`psb-step psb-step--${state}`}
              onClick={() => handleStageClick(stage)}
              disabled={!open}
              aria-current={current ? 'step' : undefined}
              title={!open ? stage.blockedMsg : stage.label}
            >
              <span className="psb-step-marker">
                {done && !current ? (
                  <CheckCircle2 size={15} />
                ) : !open ? (
                  <Lock size={12} />
                ) : (
                  <span className="psb-step-num">{stage.step}</span>
                )}
              </span>
              <span className="psb-step-icon">{stage.icon}</span>
              <span className="psb-step-label">{stage.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Career Motivation / SkillTwin Insight */}
      <div className="psb-insight-box">
        <div className="psb-insight-header">
          <span className="psb-insight-star">✦</span>
          <span className="psb-insight-tag">BUILD YOUR SKILLTWIN</span>
        </div>

        <div className="psb-insight-quote-container">
          <div className="psb-quote-mark psb-quote-mark--open">“</div>
          <p className="psb-insight-quote-text">
            Your career is built<br />one skill at a time.
          </p>
          <div className="psb-quote-mark psb-quote-mark--close">”</div>
        </div>

        <div className="psb-insight-mantra">
          Keep learning.<br />Keep building.<br />Keep proving.
        </div>
      </div>

      {/* Utility row: kept to icons so it reads as a footer, not another menu. */}
      <div className="psb-utils">
        <button
          type="button"
          className={`psb-util${activeView === 'profile' ? ' psb-util--active' : ''}`}
          onClick={onNavigateToProfile}
          title="Profile"
        >
          <User size={15} />
        </button>
        <button
          type="button"
          className={`psb-util${activeView === 'settings' ? ' psb-util--active' : ''}`}
          onClick={onNavigateToSettings}
          title="Settings"
        >
          <Settings size={15} />
        </button>
        <button
          type="button"
          className={`psb-util${activeView === 'help' ? ' psb-util--active' : ''}`}
          onClick={onNavigateToHelp}
          title="Help"
        >
          <HelpCircle size={15} />
        </button>
        {onOpenSecurityModal && (
          <button
            type="button"
            className="psb-util"
            onClick={onOpenSecurityModal}
            title="Privacy & security"
          >
            <Shield size={15} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default PersistentSidebar;
