import React from 'react';
import {
  User,
  ChevronDown,
  FileText,
  Cpu,
  Compass,
  Award,
  CheckCircle2,
  Settings,
  Shield,
  GraduationCap,
  HelpCircle
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
  // Map views to 1-indexed steps
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

  // Extract user details dynamically from onboarding state
  const userName = userProfile?.name?.trim() || 'Layeeba Haram';
  const userRole = userProfile?.target_role?.trim() || 'Full-Stack Developer';
  const avatarImage = userProfile?.avatar_base64 || userProfile?.avatar_url;

  // Compute initials dynamically (e.g. "Layeeba Haram" -> "LH")
  const getInitials = (name: string): string => {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(userName);

  // Real stage completion status based on actual work performed
  const isCompleted = (key: string): boolean => {
    if (completedStages && typeof (completedStages as any)[key] === 'boolean') {
      return Boolean((completedStages as any)[key]);
    }
    if (key === 'onboarding') {
      return Boolean((userProfile && (userProfile.id || userProfile.email)) || localStorage.getItem('skilltwin_onboarding_completed') === 'true');
    }
    if (key === 'evidence') {
      const hasEvData = Boolean(localStorage.getItem('skilltwin_resume_data') || localStorage.getItem('skilltwin_github_data') || localStorage.getItem('skilltwin_projects_data'));
      return hasEvData || localStorage.getItem('skilltwin_evidence_completed') === 'true';
    }
    if (key === 'skilltwin') {
      const evDone = isCompleted('evidence');
      return Boolean(localStorage.getItem('skilltwin_skilltwin_completed') === 'true' || (evDone && (currentStep >= 3 || localStorage.getItem('skilltwin_gap_completed') === 'true' || localStorage.getItem('skilltwin_target_role_completed') === 'true')));
    }
    if (key === 'target_role') {
      const evDone = isCompleted('evidence');
      return Boolean(localStorage.getItem('skilltwin_target_role_completed') === 'true' || (evDone && (currentStep >= 4 || localStorage.getItem('skilltwin_gap_completed') === 'true' || Boolean(userProfile?.target_role))));
    }
    if (key === 'gap') {
      return localStorage.getItem('skilltwin_gap_completed') === 'true' || currentStep >= 5;
    }
    if (key === 'roadmap') {
      return localStorage.getItem('skilltwin_roadmap_completed') === 'true';
    }
    if (key === 'verification') {
      return localStorage.getItem('skilltwin_verification_completed') === 'true';
    }
    if (key === 'skilltwin_updated') {
      return localStorage.getItem('skilltwin_skilltwin_updated_completed') === 'true' || currentStep >= 8;
    }
    if (key === 'readiness') {
      return localStorage.getItem('skilltwin_readiness_completed') === 'true';
    }
    return localStorage.getItem(`skilltwin_${key}_completed`) === 'true';
  };

  // Stage availability based on true prerequisites
  const isAvailable = (key: string): boolean => {
    if (key === 'onboarding') return true;
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

  const handleStageClick = (key: string, callback?: () => void, prerequisiteMsg?: string) => {
    if (!callback) return;
    if (!isAvailable(key)) {
      alert(prerequisiteMsg || 'Please complete the prerequisite steps first.');
      return;
    }
    callback();
  };

  return (
    <aside className="app-persistent-sidebar" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%',
      gap: '24px'
    }}>
      <div>
        {/* Compact User Profile Card */}
        <div
          onClick={onNavigateToProfile}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: activeView === 'profile' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(15, 23, 42, 0.85)',
            border: activeView === 'profile' ? '1px solid #818CF8' : '1px solid rgba(255, 255, 255, 0.09)',
            borderRadius: '14px',
            marginBottom: '20px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)',
            cursor: onNavigateToProfile ? 'pointer' : 'default',
            transition: 'all 0.2s ease'
          }}
          title="Click to view & edit Profile"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            {/* Avatar: Custom Image or Dynamic Initials */}
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.82rem',
              color: '#FFFFFF',
              boxShadow: '0 0 12px rgba(124, 58, 237, 0.45)',
              flexShrink: 0,
              overflow: 'hidden'
            }}>
              {avatarImage ? (
                <img
                  src={avatarImage}
                  alt={userName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>

            {/* Name and Role */}
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#F8FAFC',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {userName}
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: '#C084FC',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '1px'
              }}>
                {userRole}
              </div>
            </div>
          </div>

          <div style={{ color: 'var(--text-muted)', flexShrink: 0, paddingLeft: '4px' }}>
            <ChevronDown size={15} />
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Step 1: Onboarding */}
          <div
            className={`nav-item ${activeView === 'onboarding' ? 'active' : ''}`}
            onClick={onNavigateToOnboarding}
            style={{ cursor: onNavigateToOnboarding ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraduationCap size={16} />
              <span>Onboarding</span>
            </div>
            {isCompleted('onboarding') ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">1</span>
            )}
          </div>

          {/* Step 2: Evidence Collection */}
          <div
            className={`nav-item ${activeView === 'evidence' ? 'active' : ''}`}
            onClick={() => handleStageClick('evidence', onNavigateToEvidence, 'Please complete onboarding first.')}
            style={{
              opacity: isAvailable('evidence') ? 1 : 0.45,
              cursor: isAvailable('evidence') && onNavigateToEvidence ? 'pointer' : 'not-allowed'
            }}
            title={!isAvailable('evidence') ? 'Complete Onboarding first' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={16} />
              <span>Evidence Collection</span>
            </div>
            {isCompleted('evidence') ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">2</span>
            )}
          </div>

          {/* Step 3: SkillTwin */}
          <div
            className={`nav-item ${activeView === 'skilltwin' ? 'active' : ''}`}
            onClick={() => handleStageClick('skilltwin', onNavigateToSkillTwin, 'Evidence needed: Add your resume, GitHub profile, or projects in Evidence Collection to synthesize your SkillTwin.')}
            style={{
              opacity: isAvailable('skilltwin') ? 1 : 0.45,
              cursor: isAvailable('skilltwin') && onNavigateToSkillTwin ? 'pointer' : 'not-allowed'
            }}
            title={!isAvailable('skilltwin') ? 'Evidence needed: Add your resume, GitHub profile, or projects in Evidence Collection first.' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={16} />
              <span>SkillTwin</span>
            </div>
            {isCompleted('skilltwin') ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">3</span>
            )}
          </div>

          {/* Step 4: Target Role / Industry Mapping */}
          <div
            className={`nav-item ${activeView === 'target_role' ? 'active' : ''}`}
            onClick={() => handleStageClick('target_role', onNavigateToTargetRole, 'Evidence needed: Add your resume, GitHub profile, or projects in Evidence Collection first.')}
            style={{
              opacity: isAvailable('target_role') ? 1 : 0.45,
              cursor: isAvailable('target_role') && onNavigateToTargetRole ? 'pointer' : 'not-allowed'
            }}
            title={!isAvailable('target_role') ? 'Evidence needed: Complete Evidence Collection first.' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraduationCap size={16} color="#C084FC" />
              <span>Target Role / Industry</span>
            </div>
            {isCompleted('target_role') ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">4</span>
            )}
          </div>

          {/* Step 5: Gap Analysis */}
          <div
            className={`nav-item ${activeView === 'gap' ? 'active' : ''}`}
            onClick={() => handleStageClick('gap', onNavigateToGapAnalysis, 'Please select your Target Role first.')}
            style={{
              opacity: isAvailable('gap') ? 1 : 0.45,
              cursor: isAvailable('gap') && onNavigateToGapAnalysis ? 'pointer' : 'not-allowed'
            }}
            title={!isAvailable('gap') ? 'Please select your Target Role first.' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Compass size={16} />
              <span>Gap Analysis</span>
            </div>
            {isCompleted('gap') ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">5</span>
            )}
          </div>

          {/* Step 6: Roadmap */}
          <div
            className={`nav-item ${activeView === 'roadmap' ? 'active' : ''}`}
            onClick={() => handleStageClick('roadmap', onNavigateToRoadmap, 'Please complete Gap Analysis first.')}
            style={{
              opacity: isAvailable('roadmap') ? 1 : 0.45,
              cursor: isAvailable('roadmap') && onNavigateToRoadmap ? 'pointer' : 'not-allowed'
            }}
            title={!isAvailable('roadmap') ? 'Please complete Gap Analysis first.' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={16} />
              <span>Roadmap</span>
            </div>
            {isCompleted('roadmap') ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">6</span>
            )}
          </div>

          {/* Step 7: Project Verification */}
          <div
            className={`nav-item ${activeView === 'verification' ? 'active' : ''}`}
            onClick={() => handleStageClick('verification', onNavigateToVerification, 'Please review your Roadmap and prepare a project first.')}
            style={{
              opacity: isAvailable('verification') ? 1 : 0.45,
              cursor: isAvailable('verification') && onNavigateToVerification ? 'pointer' : 'not-allowed'
            }}
            title={!isAvailable('verification') ? 'Please complete Roadmap first.' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={16} />
              <span>Project Verification</span>
            </div>
            {isCompleted('verification') ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">7</span>
            )}
          </div>

          {/* Step 8: SkillTwin Updated */}
          <div
            className={`nav-item ${activeView === 'skilltwin_updated' ? 'active' : ''}`}
            onClick={() => handleStageClick('skilltwin_updated', onNavigateToSkillTwinUpdated, 'Please verify a project in Step 7 first.')}
            style={{
              opacity: isAvailable('skilltwin_updated') ? 1 : 0.45,
              cursor: isAvailable('skilltwin_updated') && onNavigateToSkillTwinUpdated ? 'pointer' : 'not-allowed'
            }}
            title={!isAvailable('skilltwin_updated') ? 'Please complete Project Verification first.' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={16} />
              <span>SkillTwin Updated</span>
            </div>
            {isCompleted('skilltwin_updated') ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">8</span>
            )}
          </div>

          {/* Step 9: Career Readiness */}
          <div
            className={`nav-item ${activeView === 'readiness' ? 'active' : ''}`}
            onClick={() => handleStageClick('readiness', onNavigateToCareerReadiness, 'Please review your updated SkillTwin in Step 8 first.')}
            style={{
              opacity: isAvailable('readiness') ? 1 : 0.45,
              cursor: isAvailable('readiness') && onNavigateToCareerReadiness ? 'pointer' : 'not-allowed'
            }}
            title={!isAvailable('readiness') ? 'Please complete SkillTwin Updated first.' : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={16} />
              <span>Career Readiness</span>
            </div>
            {isCompleted('readiness') ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">9</span>
            )}
          </div>
        </nav>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '16px 0 12px' }} />

        {/* Secondary Navigation: Profile, Settings, Help & About */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            className={`nav-item ${activeView === 'profile' ? 'active' : ''}`}
            onClick={onNavigateToProfile}
            style={{ cursor: onNavigateToProfile ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} />
              <span>Profile</span>
            </div>
          </div>

          <div
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={onNavigateToSettings}
            style={{ cursor: onNavigateToSettings ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={16} />
              <span>Settings</span>
            </div>
          </div>

          <div
            className={`nav-item ${activeView === 'help' ? 'active' : ''}`}
            onClick={onNavigateToHelp}
            style={{ cursor: onNavigateToHelp ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HelpCircle size={16} />
              <span>Help & About</span>
            </div>
          </div>
        </nav>
      </div>

      {/* Bottom Cards: Quote Card + Security Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Quote / Inspiration Card */}
        <div className="glass-card" style={{
          padding: '16px 14px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          borderRadius: '14px',
          position: 'relative',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            fontSize: '1.75rem',
            lineHeight: 1,
            color: '#A855F7',
            fontWeight: 800,
            fontFamily: 'serif',
            marginBottom: '4px'
          }}>
            “
          </div>
          <p style={{
            fontSize: '0.78rem',
            color: '#E2E8F0',
            lineHeight: 1.45,
            fontWeight: 500,
            letterSpacing: '-0.01em'
          }}>
            You're building your future<br />
            with every verified step you take.<br />
            <span style={{ color: '#C084FC', fontWeight: 600 }}>Keep going! 💜</span>
          </p>
        </div>

        {/* Security / Privacy Card */}
        <div className="glass-card" style={{
          padding: '14px',
          background: 'rgba(13, 19, 36, 0.85)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              padding: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              borderRadius: '8px',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={16} />
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
              Your data is secure
            </span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.35, marginBottom: '8px' }}>
            We use encryption to keep your data safe and private.
          </p>
          <a
            href="#learn-more"
            onClick={(e) => {
              e.preventDefault();
              if (onOpenSecurityModal) onOpenSecurityModal();
            }}
            style={{
              fontSize: '0.72rem',
              color: '#38BDF8',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            Learn more →
          </a>
        </div>
      </div>
    </aside>
  );
};

export default PersistentSidebar;
