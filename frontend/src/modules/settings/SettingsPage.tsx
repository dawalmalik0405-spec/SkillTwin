import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bell,
  Shield,
  Download,
  Trash2,
  RefreshCw,
  Check,
  AlertTriangle,
  X,
  UserCheck,
  LogOut
} from 'lucide-react';
import { UserProfile, UserPreferences } from '../../shared/types';
import PersistentSidebar from '../../shared/components/PersistentSidebar';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';

interface SettingsPageProps {
  userProfile: UserProfile | null;
  onNavigateToOnboarding?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToSkillTwin?: () => void;
  onNavigateToTargetRole?: () => void;
  onNavigateToGapAnalysis?: () => void;
  onNavigateToRoadmap?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHelp?: () => void;
  onOpenDiagnostics?: () => void;
  onResetAllData?: () => void;
  onSignOut?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  userProfile,
  onNavigateToOnboarding,
  onNavigateToEvidence,
  onNavigateToSkillTwin,
  onNavigateToTargetRole,
  onNavigateToGapAnalysis,
  onNavigateToRoadmap,
  onNavigateToProfile,
  onNavigateToHelp,
  onResetAllData,
  onSignOut
}) => {
  // Preferences State
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('skilltwin_user_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback to defaults
      }
    }
    return {
      dark_mode: true,
      animations_enabled: true,
      analysis_notifications: true,
      roadmap_reminders: true,
      project_updates: true
    };
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('skilltwin_user_preferences', JSON.stringify(preferences));
  }, [preferences]);

  const togglePref = (key: keyof UserPreferences) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      setToastMessage('Preference saved ✓');
      setTimeout(() => setToastMessage(null), 3000);
      return updated;
    });
  };

  const handleExportData = () => {
    const exportPayload = {
      profile: userProfile,
      preferences: preferences,
      evidence_session: localStorage.getItem('skilltwin_evidence_session') || 'active',
      exported_at: new Date().toISOString(),
      system: 'SkillTwin Operating System v1.0.0'
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `skilltwin_data_export_${userProfile?.name?.toLowerCase().replace(/\s+/g, '_') || 'student'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setToastMessage('User data successfully exported as JSON ✓');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    setIsClearModalOpen(false);
    setToastMessage('Local cache cleared successfully ✓');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeleteProfile = () => {
    setIsDeleteModalOpen(false);
    if (onResetAllData) {
      onResetAllData();
    } else {
      localStorage.removeItem('skilltwin_active_profile');
      localStorage.removeItem('skilltwin_current_view');
      window.location.reload();
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px 24px 32px' }}>
      {/* Top Header */}
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

        {/* Top Right Header Badge */}
        <GlobalHeaderBadge />
      </header>

      {/* Main Dashboard Layout */}
      <div className="dashboard-layout">
        {/* Left Persistent Dashboard Sidebar */}
        <PersistentSidebar
          userProfile={userProfile}
          activeView="settings"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={onNavigateToEvidence}
          onNavigateToSkillTwin={onNavigateToSkillTwin}
          onNavigateToTargetRole={onNavigateToTargetRole}
          onNavigateToGapAnalysis={onNavigateToGapAnalysis}
          onNavigateToRoadmap={onNavigateToRoadmap}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToSettings={() => {}}
          onNavigateToHelp={onNavigateToHelp}
        />

        {/* Center Main Work Area */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Page Title */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Settings
              </h1>
              <span style={{ fontSize: '1.25rem' }}>⚙️</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
              Customize your SkillTwin experience.
            </p>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '10px',
              color: '#C084FC',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} />
                <span>{toastMessage}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                style={{ background: 'none', border: 'none', color: '#C084FC', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Grouped Settings Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* Section 1: Appearance */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ padding: '6px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px', color: '#C084FC' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Appearance</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Theme & visual interface effects</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Visual Experience (Informational) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>Visual Experience</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                      Premium glassmorphism interface<br />
                      Designed for a focused career-development experience.
                    </div>
                  </div>
                </div>

                {/* Interface Animations */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>Interface Animations</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Orbital galaxy & micro-interaction effects</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePref('animations_enabled')}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: preferences.animations_enabled ? 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)' : 'rgba(255,255,255,0.1)',
                      color: preferences.animations_enabled ? '#FFFFFF' : 'var(--text-muted)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {preferences.animations_enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Section 2: Notifications */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ padding: '6px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '8px', color: '#38BDF8' }}>
                  <Bell size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Notifications</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Evidence parsing & roadmap alerts</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Analysis notifications */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Analysis Notifications</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Alert when resume & repo extraction completes</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePref('analysis_notifications')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: preferences.analysis_notifications ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF'
                    }}
                  >
                    {preferences.analysis_notifications ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Learning roadmap reminders */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Roadmap Reminders</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Daily study goals & skill milestone updates</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePref('roadmap_reminders')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: preferences.roadmap_reminders ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF'
                    }}
                  >
                    {preferences.roadmap_reminders ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Project analysis updates */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Project Analysis Updates</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GitHub resync and tech detection alerts</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePref('project_updates')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      background: preferences.project_updates ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                      color: '#FFFFFF'
                    }}
                  >
                    {preferences.project_updates ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Privacy & Data */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#F87171' }}>
                  <Shield size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Privacy & Data</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Export, cache, and profile management</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Export Data */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Export My Data</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Download your complete profile and evidence history</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleExportData}
                    style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                  >
                    <Download size={13} /> Export JSON
                  </button>
                </div>

                {/* Clear Local Data */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Clear Cache</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Purge temporary session storage</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsClearModalOpen(true)}
                    style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                  >
                    <RefreshCw size={13} /> Clear Cache
                  </button>
                </div>

                {/* Delete Profile Data */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F87171' }}>Delete Profile Data</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Permanently reset your SkillTwin profile & evidence state</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsDeleteModalOpen(true)}
                    style={{ padding: '5px 12px', fontSize: '0.75rem', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.35)' }}
                  >
                    <Trash2 size={13} /> Delete Profile Data
                  </button>
                </div>

                {/* Sign Out */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Sign Out</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Securely sign out of your account</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsSignOutModalOpen(true)}
                    style={{ padding: '5px 14px', fontSize: '0.75rem', color: '#F8FAFC', borderColor: 'rgba(255, 255, 255, 0.25)' }}
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              </div>
            </div>

            {/* Section 4: Account Details */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', color: '#34D399' }}>
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Account Overview</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Registered credentials & session status</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF', marginTop: '2px' }}>
                    {userProfile?.email || 'layeeba@skilltwin.dev'}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span className="pulse-dot green" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34D399' }}>
                      Active • Verified Evidence
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Profile Created</div>
                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginTop: '2px' }}>
                    {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'August 2026 (Active Session)'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clear Cache Confirmation Modal */}
          {isClearModalOpen && (
            <div className="modal-backdrop" onClick={() => setIsClearModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '10px', color: '#38BDF8' }}>
                    <RefreshCw size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>Clear Cache?</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px' }}>
                  This will purge temporary browser session items. Your profile and uploaded evidence in PostgreSQL will remain safe.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className="btn btn-outline" onClick={() => setIsClearModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleClearCache}>
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Profile Confirmation Dialog */}
          {isDeleteModalOpen && (
            <div className="modal-backdrop" onClick={() => setIsDeleteModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', color: '#F87171' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>Delete your profile data?</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px' }}>
                  This will permanently remove your SkillTwin profile data, evidence, analysis and progress. Your login account will remain active.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className="btn btn-outline" onClick={() => setIsDeleteModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn"
                    onClick={handleDeleteProfile}
                    style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#FFFFFF', border: 'none', padding: '8px 18px', fontWeight: 600, borderRadius: '8px' }}
                  >
                    Delete Profile Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sign Out Confirmation Dialog */}
          {isSignOutModalOpen && (
            <div className="modal-backdrop" onClick={() => setIsSignOutModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', color: '#F87171' }}>
                    <LogOut size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>Are you sure you want to sign out?</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px' }}>
                  You will be signed out of your SkillTwin account and returned to the landing page. You can sign back in anytime using your registered credentials.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button className="btn btn-outline" onClick={() => setIsSignOutModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setIsSignOutModalOpen(false);
                      if (onSignOut) onSignOut();
                    }}
                    style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#FFFFFF', border: 'none', padding: '8px 18px', fontWeight: 600, borderRadius: '8px' }}
                  >
                    Sign Out
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

export default SettingsPage;
