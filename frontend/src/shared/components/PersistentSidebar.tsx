import React from 'react';
import {
  User,
  ChevronDown,
  FileText,
  Cpu,
  Compass,
  Award,
  Settings,
  Shield,
  GraduationCap,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';

interface PersistentSidebarProps {
  userProfile?: UserProfile | null;
  activeStep?: number; // 1 = Onboarding, 2 = Evidence, 3 = SkillTwin, 4 = Target Role, 5 = Gap Analysis, 6 = Roadmap
  activeView?: 'onboarding' | 'evidence' | 'profile' | 'settings' | 'help' | 'skilltwin' | 'target_role' | 'gap' | 'roadmap';
  onNavigateToOnboarding?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToSkillTwin?: () => void;
  onNavigateToTargetRole?: () => void;
  onNavigateToGapAnalysis?: () => void;
  onNavigateToRoadmap?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: () => void;
  onOpenSecurityModal?: () => void;
}

export const PersistentSidebar: React.FC<PersistentSidebarProps> = ({
  userProfile,
  activeStep = 2,
  activeView = 'evidence',
  onNavigateToOnboarding,
  onNavigateToEvidence,
  onNavigateToSkillTwin,
  onNavigateToTargetRole,
  onNavigateToGapAnalysis,
  onNavigateToRoadmap,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToHelp,
  onOpenSecurityModal
}) => {
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

  return (
    <aside style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: '100%',
      minWidth: '240px',
      maxWidth: '260px',
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
            {activeStep > 1 ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">1</span>
            )}
          </div>

          {/* Step 2: Evidence Collection */}
          <div
            className={`nav-item ${activeView === 'evidence' ? 'active' : ''}`}
            onClick={onNavigateToEvidence}
            style={{ cursor: onNavigateToEvidence ? 'pointer' : 'default' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={16} />
              <span>Evidence Collection</span>
            </div>
            {activeStep > 2 ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">2</span>
            )}
          </div>

          {/* Step 3: SkillTwin */}
          <div
            className={`nav-item ${activeView === 'skilltwin' ? 'active' : ''}`}
            onClick={onNavigateToSkillTwin}
            style={{
              opacity: activeStep >= 3 ? 1 : 0.55,
              cursor: activeStep >= 3 && onNavigateToSkillTwin ? 'pointer' : 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={16} />
              <span>SkillTwin</span>
            </div>
            {activeStep > 3 ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">3</span>
            )}
          </div>

          {/* Step 4: Target Role / Industry Mapping */}
          <div
            className={`nav-item ${activeView === 'target_role' ? 'active' : ''}`}
            onClick={onNavigateToTargetRole}
            style={{
              opacity: activeStep >= 4 ? 1 : 0.55,
              cursor: activeStep >= 4 && onNavigateToTargetRole ? 'pointer' : 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraduationCap size={16} color="#C084FC" />
              <span>Target Role / Industry</span>
            </div>
            {activeStep > 4 ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">4</span>
            )}
          </div>

          {/* Step 5: Gap Analysis */}
          <div
            className={`nav-item ${activeView === 'gap' ? 'active' : ''}`}
            onClick={onNavigateToGapAnalysis}
            style={{
              opacity: activeStep >= 5 ? 1 : 0.55,
              cursor: activeStep >= 5 && onNavigateToGapAnalysis ? 'pointer' : 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Compass size={16} />
              <span>Gap Analysis</span>
            </div>
            {activeStep > 5 ? (
              <span className="badge badge-analyzed" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>✓</span>
            ) : (
              <span className="nav-badge-pill">5</span>
            )}
          </div>

          {/* Step 6: Roadmap */}
          <div
            className={`nav-item ${activeView === 'roadmap' ? 'active' : ''}`}
            onClick={onNavigateToRoadmap}
            style={{
              opacity: activeStep >= 6 ? 1 : 0.55,
              cursor: activeStep >= 6 && onNavigateToRoadmap ? 'pointer' : 'default'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={16} />
              <span>Roadmap</span>
            </div>
            <span className="nav-badge-pill">6</span>
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
            Skills are proven,<br />
            not promised.<br />
            <span style={{ color: '#C084FC', fontWeight: 600 }}>We trust evidence.</span>
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
