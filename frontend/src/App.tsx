import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Server,
  Layout,
  RefreshCw,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { apiClient } from './shared/apiClient';
import { HealthCheckResponse, UserProfile } from './shared/types';
import OnboardingPage from './modules/evidence/OnboardingPage';
import EvidenceCollectionPage from './modules/evidence/EvidenceCollectionPage';
import ProfilePage from './modules/profile/ProfilePage';
import SettingsPage from './modules/settings/SettingsPage';
import HelpPage from './modules/help/HelpPage';
import SkillTwinPage from './modules/skilltwin/SkillTwinPage';
import TargetRoleMappingPage from './modules/target_role/TargetRoleMappingPage';
import GapAnalysisPage from './modules/gap_analysis/GapAnalysisPage';
import RoadmapPage from './modules/roadmap/RoadmapPage';
import ProjectVerificationPage from './modules/verification/ProjectVerificationPage';
import SkillTwinUpdatedPage from './modules/skilltwin_updated/SkillTwinUpdatedPage';
import CareerReadinessPage from './modules/readiness/CareerReadinessPage';
import LandingPage from './modules/landing/LandingPage';
import SkillTwinLoadingScreen from './modules/landing/SkillTwinLoadingScreen';
import AuthModal from './modules/auth/AuthModal';
import DashboardParticles from './shared/components/DashboardParticles';

export type AppView =
  | 'landing'
  | 'onboarding'
  | 'evidence'
  | 'skilltwin'
  | 'target_role'
  | 'gap'
  | 'roadmap'
  | 'verification'
  | 'skilltwin_updated'
  | 'readiness'
  | 'profile'
  | 'settings'
  | 'help'
  | 'diagnostics';

export const App: React.FC = () => {
  // Navigation & User Profile State with LocalStorage Persistence
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const saved = localStorage.getItem('skilltwin_current_view');
    const inAppSession = sessionStorage.getItem('skilltwin_in_app_session') === 'true';
    if (inAppSession && saved && saved !== 'landing') {
      const validViews = ['landing', 'onboarding', 'evidence', 'skilltwin', 'target_role', 'gap', 'roadmap', 'verification', 'skilltwin_updated', 'readiness', 'profile', 'settings', 'help', 'diagnostics'];
      return validViews.includes(saved) ? (saved as AppView) : 'landing';
    }
    return 'landing';
  });

  // Initial loading splash screen (approx. 2 seconds)
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Authentication State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return apiClient.getToken();
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('skilltwin_active_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const isAuthenticated = Boolean(authToken || (activeProfile && (activeProfile.id || activeProfile.email)));

  // Save view and profile changes & reset scroll position globally
  useEffect(() => {
    localStorage.setItem('skilltwin_current_view', currentView);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const root = document.getElementById('root');
    if (root) root.scrollTop = 0;
    document.querySelectorAll('main, .dashboard-layout, .container, .app-container').forEach(el => {
      el.scrollTop = 0;
    });
  }, [currentView]);

  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem('skilltwin_active_profile', JSON.stringify(activeProfile));
    }
  }, [activeProfile]);

  const handleUpdateProfile = (updated: UserProfile) => {
    setActiveProfile(updated);
    localStorage.setItem('skilltwin_active_profile', JSON.stringify(updated));
    localStorage.setItem('skilltwin_onboarding_completed', 'true');
    apiClient.updateProfile(updated).catch(err => {
      console.warn('Backend profile update notice:', err);
    });
  };

  const isOnboardingCompleted = Boolean(
    (activeProfile && Boolean(activeProfile.target_role && (activeProfile.education_level || activeProfile.degree))) ||
    localStorage.getItem('skilltwin_onboarding_completed') === 'true'
  );

  // Track whether user has entered the Evidence Collection page (to lock Onboarding)
  const [hasEnteredEvidence, setHasEnteredEvidence] = useState<boolean>(() => {
    return localStorage.getItem('skilltwin_evidence_entered') === 'true';
  });

  useEffect(() => {
    if (currentView === 'evidence') {
      setHasEnteredEvidence(true);
      localStorage.setItem('skilltwin_evidence_entered', 'true');
    }
  }, [currentView]);

  const handleNavigateToOnboarding = () => {
    sessionStorage.setItem('skilltwin_in_app_session', 'true');
    if (hasEnteredEvidence || localStorage.getItem('skilltwin_evidence_entered') === 'true') {
      alert('Onboarding is completed and locked.');
      if (currentView === 'onboarding') {
        setCurrentView('evidence');
      }
      return;
    }
    setCurrentView('onboarding');
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (hasEnteredEvidence || localStorage.getItem('skilltwin_evidence_entered') === 'true') {
        sessionStorage.setItem('skilltwin_in_app_session', 'true');
        setCurrentView('evidence');
      } else {
        handleNavigateToOnboarding();
      }
    } else {
      setAuthModalMode('signup');
      setIsAuthModalOpen(true);
    }
  };

  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = async (user: UserProfile) => {
    let mergedProfile: UserProfile = { ...(activeProfile || {}), ...user };
    if (user.email) {
      try {
        const existingProfile = await apiClient.getProfile(user.email);
        if (existingProfile && (existingProfile.target_role || existingProfile.education_level || existingProfile.degree)) {
          mergedProfile = { ...existingProfile, ...user };
        }
      } catch (e) {
        console.warn('Profile recovery note:', e);
      }
    }
    setActiveProfile(mergedProfile);
    localStorage.setItem('skilltwin_active_profile', JSON.stringify(mergedProfile));
    setAuthToken(apiClient.getToken());
    setIsAuthModalOpen(false);

    // Reset evidence lock for fresh post-login session so onboarding page is always opened first
    setHasEnteredEvidence(false);
    localStorage.removeItem('skilltwin_evidence_entered');
    sessionStorage.setItem('skilltwin_in_app_session', 'true');
    setCurrentView('onboarding');
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (e) {
      console.warn('Logout notice:', e);
    }
    setAuthToken(null);
    setActiveProfile(null);
    setHasEnteredEvidence(false);
    setEvidenceCompleted(false);

    const pipelineKeys = [
      'skilltwin_auth_token',
      'skilltwin_auth_user',
      'skilltwin_active_profile',
      'skilltwin_onboarding_completed',
      'skilltwin_evidence_completed',
      'skilltwin_evidence_entered',
      'skilltwin_resume_data',
      'skilltwin_github_data',
      'skilltwin_projects_data',
      'skilltwin_skilltwin_completed',
      'skilltwin_target_role_completed',
      'skilltwin_gap_completed',
      'skilltwin_roadmap_completed',
      'skilltwin_verification_completed',
      'skilltwin_skilltwin_updated_completed',
      'skilltwin_readiness_completed',
      'skilltwin_active_gap_data',
      'skilltwin_evidence_session',
      'skilltwin_current_view'
    ];
    pipelineKeys.forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem('skilltwin_in_app_session');
    sessionStorage.removeItem('skilltwin_evidence_session');
    setCurrentView('landing');
  };

  const handleDeleteProfileData = async () => {
    try {
      await apiClient.resetProfileData(activeProfile?.email, activeProfile?.id);
    } catch (e) {
      console.warn('Backend profile reset warning:', e);
    }

    const pipelineKeys = [
      'skilltwin_onboarding_completed',
      'skilltwin_evidence_completed',
      'skilltwin_evidence_entered',
      'skilltwin_resume_data',
      'skilltwin_github_data',
      'skilltwin_projects_data',
      'skilltwin_skilltwin_completed',
      'skilltwin_target_role_completed',
      'skilltwin_gap_completed',
      'skilltwin_roadmap_completed',
      'skilltwin_verification_completed',
      'skilltwin_skilltwin_updated_completed',
      'skilltwin_readiness_completed',
      'skilltwin_active_gap_data',
      'skilltwin_evidence_session',
      'skilltwin_active_profile',
      'skilltwin_current_view'
    ];
    pipelineKeys.forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem('skilltwin_evidence_session');

    // Retain login account credentials while completely resetting profile and evidence
    setEvidenceCompleted(false);
    setHasEnteredEvidence(false);
    setActiveProfile(prev => prev ? { id: prev.id, name: prev.name, email: prev.email } : null);
    sessionStorage.setItem('skilltwin_in_app_session', 'true');
    setCurrentView('onboarding');
  };

  // Diagnostics State
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const checkSystemHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const health = await apiClient.getHealth();
      setHealthData(health);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch {
      setHealthData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 20000);
    return () => clearInterval(interval);
  }, [checkSystemHealth]);

  const isDbConnected = healthData?.database?.status === 'connected';
  const isBackendHealthy = healthData?.status === 'ok' || healthData?.status === 'degraded';

  // Prerequisite & Evidence Tracking
  const [evidenceCompleted, setEvidenceCompleted] = useState<boolean>(() => {
    return localStorage.getItem('skilltwin_evidence_completed') === 'true';
  });

  const hasEvidence = (): boolean => {
    return evidenceCompleted || localStorage.getItem('skilltwin_evidence_completed') === 'true';
  };

  // Verify evidence status from backend on mount or profile change
  useEffect(() => {
    const savedAuth = apiClient.getUser();
    const email = activeProfile?.email || savedAuth?.email;
    if (!email) return;
    const userId = activeProfile?.id;
    apiClient.getEvidenceSummary(email, userId).then(summary => {
      if (summary && (summary.can_continue || summary.total_skills > 0 || summary.resume_data || summary.github_data || (summary.projects_data && summary.projects_data.length > 0))) {
        setEvidenceCompleted(true);
        localStorage.setItem('skilltwin_evidence_completed', 'true');
      } else if (localStorage.getItem('skilltwin_evidence_completed') !== 'true') {
        setEvidenceCompleted(false);
      }
    }).catch(() => {});
  }, [activeProfile]);

  const isStageAvailable = (stage: string): boolean => {
    if (stage === 'landing') return true;
    if (stage === 'onboarding') return !hasEnteredEvidence && localStorage.getItem('skilltwin_evidence_entered') !== 'true';
    if (stage === 'evidence') return isOnboardingCompleted;

    const evDone = hasEvidence();
    if (stage === 'skilltwin') return isOnboardingCompleted && evDone;
    if (stage === 'target_role') return isOnboardingCompleted && evDone;

    const roadmapCompleted = localStorage.getItem('skilltwin_roadmap_completed') === 'true';
    const verificationCompleted = localStorage.getItem('skilltwin_verification_completed') === 'true';
    const updatedCompleted = localStorage.getItem('skilltwin_skilltwin_updated_completed') === 'true';

    if (stage === 'gap') return isOnboardingCompleted && evDone;
    if (stage === 'roadmap') return isOnboardingCompleted && evDone;
    if (stage === 'verification') return isOnboardingCompleted && evDone && roadmapCompleted;
    if (stage === 'skilltwin_updated') return isOnboardingCompleted && evDone && verificationCompleted;
    if (stage === 'readiness') return isOnboardingCompleted && evDone && updatedCompleted;

    // Informational pages are always available
    if (['profile', 'settings', 'help', 'diagnostics', 'landing'].includes(stage)) return true;
    return false;
  };

  const navigateToStage = (targetStage: any) => {
    if (targetStage === 'landing') {
      setCurrentView('landing');
      return;
    }
    if (targetStage === 'onboarding') {
      handleNavigateToOnboarding();
      return;
    }

    const evDone = hasEvidence();

    if (!isStageAvailable(targetStage)) {
      if (!isOnboardingCompleted) {
        alert('Please complete Onboarding first.');
        setCurrentView('onboarding');
        return;
      }
      if (!evDone && ['skilltwin', 'target_role', 'gap', 'roadmap', 'verification', 'skilltwin_updated', 'readiness'].includes(targetStage)) {
        alert('Evidence needed: Please add and analyze your resume, GitHub profile, or projects on Page 2 first to build your SkillTwin.');
        setCurrentView('evidence');
        return;
      }
      alert('This stage is locked until prerequisite stages are completed.');
      return;
    }

    setCurrentView(targetStage);
  };

  // Guard currentView against locked pipeline stages
  useEffect(() => {
    const evDone = hasEvidence();
    if (isOnboardingCompleted && !evDone && ['skilltwin', 'target_role', 'gap', 'roadmap', 'verification', 'skilltwin_updated', 'readiness'].includes(currentView)) {
      setCurrentView('evidence');
    }
  }, [isOnboardingCompleted, evidenceCompleted, currentView]);

  // Render Public Landing Page & Authentication Layer
  if (currentView === 'landing') {
    return (
      <>
        {showSplash && (
          <SkillTwinLoadingScreen onFinish={() => setShowSplash(false)} durationMs={2000} />
        )}
        <LandingPage
          userProfile={activeProfile}
          isAuthenticated={isAuthenticated}
          onGetStarted={handleGetStarted}
          onOpenLogin={handleOpenLogin}
          onLogout={handleLogout}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // Render Non-Landing Application Pages with Blue + Purple Theme & Smooth Transitions
  const renderCurrentView = () => {
    if (currentView === 'onboarding') {
      if (hasEnteredEvidence || localStorage.getItem('skilltwin_evidence_entered') === 'true') {
        return (
          <EvidenceCollectionPage
            userProfile={activeProfile}
            onNavigateToOnboarding={handleNavigateToOnboarding}
            onNavigateToProfile={() => setCurrentView('profile')}
            onNavigateToSettings={() => setCurrentView('settings')}
            onNavigateToHelp={() => setCurrentView('help')}
            onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
            onNavigateToTargetRole={() => navigateToStage('target_role')}
            onEvidenceUpdated={(completed) => setEvidenceCompleted(completed)}
          />
        );
      }
      return (
        <OnboardingPage
          userProfile={activeProfile}
          onOnboardingComplete={(profile) => {
            setActiveProfile(profile);
            localStorage.setItem('skilltwin_onboarding_completed', 'true');
            localStorage.setItem('skilltwin_active_profile', JSON.stringify(profile));
            localStorage.setItem('skilltwin_evidence_entered', 'true');
            setHasEnteredEvidence(true);
            setCurrentView('evidence');
          }}
        />
      );
    }

    if (currentView === 'evidence') {
      return (
        <EvidenceCollectionPage
          userProfile={activeProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onNavigateToHelp={() => setCurrentView('help')}
          onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
          onNavigateToTargetRole={() => navigateToStage('target_role')}
          onEvidenceUpdated={(completed) => setEvidenceCompleted(completed)}
        />
      );
    }

    if (currentView === 'skilltwin') {
      return (
        <SkillTwinPage
          userProfile={activeProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToEvidence={() => navigateToStage('evidence')}
          onNavigateToTargetRole={() => navigateToStage('target_role')}
          onNavigateToGapAnalysis={() => navigateToStage('gap')}
          onNavigateToRoadmap={() => navigateToStage('roadmap')}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onNavigateToHelp={() => setCurrentView('help')}
        />
      );
    }

    if (currentView === 'target_role') {
      return (
        <TargetRoleMappingPage
          userProfile={activeProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToEvidence={() => navigateToStage('evidence')}
          onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
          onNavigateToGapAnalysis={() => navigateToStage('gap')}
          onNavigateToRoadmap={() => navigateToStage('roadmap')}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onNavigateToHelp={() => setCurrentView('help')}
        />
      );
    }

    if (currentView === 'gap') {
      return (
        <GapAnalysisPage
          userProfile={activeProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToEvidence={() => navigateToStage('evidence')}
          onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
          onNavigateToTargetRole={() => navigateToStage('target_role')}
          onNavigateToGapAnalysis={() => navigateToStage('gap')}
          onNavigateToRoadmap={(gapData) => {
            if (gapData) {
              localStorage.setItem('skilltwin_active_gap_data', JSON.stringify(gapData));
            }
            navigateToStage('roadmap');
          }}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onNavigateToHelp={() => setCurrentView('help')}
        />
      );
    }

    if (currentView === 'roadmap') {
      return (
        <RoadmapPage
          userProfile={activeProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToEvidence={() => navigateToStage('evidence')}
          onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
          onNavigateToTargetRole={() => navigateToStage('target_role')}
          onNavigateToGapAnalysis={() => navigateToStage('gap')}
          onNavigateToRoadmap={() => navigateToStage('roadmap')}
          onNavigateToVerification={() => navigateToStage('verification')}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onNavigateToHelp={() => setCurrentView('help')}
        />
      );
    }

    if (currentView === 'verification') {
      return (
        <ProjectVerificationPage
          userProfile={activeProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToEvidence={() => navigateToStage('evidence')}
          onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
          onNavigateToTargetRole={() => navigateToStage('target_role')}
          onNavigateToGapAnalysis={() => navigateToStage('gap')}
          onNavigateToRoadmap={() => navigateToStage('roadmap')}
          onNavigateToVerification={() => navigateToStage('verification')}
          onNavigateToSkillTwinUpdated={() => navigateToStage('skilltwin_updated')}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onNavigateToHelp={() => setCurrentView('help')}
        />
      );
    }

    if (currentView === 'skilltwin_updated') {
      return (
        <SkillTwinUpdatedPage
          userProfile={activeProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToEvidence={() => navigateToStage('evidence')}
          onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
          onNavigateToTargetRole={() => navigateToStage('target_role')}
          onNavigateToGapAnalysis={() => navigateToStage('gap')}
          onNavigateToRoadmap={() => navigateToStage('roadmap')}
          onNavigateToVerification={() => navigateToStage('verification')}
          onNavigateToSkillTwinUpdated={() => navigateToStage('skilltwin_updated')}
          onNavigateToCareerReadiness={() => navigateToStage('readiness')}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onNavigateToHelp={() => setCurrentView('help')}
        />
      );
    }

    if (currentView === 'readiness') {
      return (
        <CareerReadinessPage
          userProfile={activeProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToEvidence={() => navigateToStage('evidence')}
          onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
          onNavigateToTargetRole={() => navigateToStage('target_role')}
          onNavigateToGapAnalysis={() => navigateToStage('gap')}
          onNavigateToRoadmap={() => navigateToStage('roadmap')}
          onNavigateToVerification={() => navigateToStage('verification')}
          onNavigateToSkillTwinUpdated={() => navigateToStage('skilltwin_updated')}
          onNavigateToCareerReadiness={() => navigateToStage('readiness')}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onNavigateToHelp={() => setCurrentView('help')}
        />
      );
    }

    if (currentView === 'profile') {
      return (
        <ProfilePage
          userProfile={activeProfile}
          onUpdateProfile={handleUpdateProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToEvidence={() => navigateToStage('evidence')}
          onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
          onNavigateToTargetRole={() => navigateToStage('target_role')}
          onNavigateToGapAnalysis={() => navigateToStage('gap')}
          onNavigateToRoadmap={() => navigateToStage('roadmap')}
          onNavigateToSettings={() => setCurrentView('settings')}
          onNavigateToHelp={() => setCurrentView('help')}
        />
      );
    }

    if (currentView === 'settings') {
      return (
        <SettingsPage
          userProfile={activeProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToEvidence={() => navigateToStage('evidence')}
          onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
          onNavigateToTargetRole={() => navigateToStage('target_role')}
          onNavigateToGapAnalysis={() => navigateToStage('gap')}
          onNavigateToRoadmap={() => navigateToStage('roadmap')}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToHelp={() => setCurrentView('help')}
          onResetAllData={handleDeleteProfileData}
          onSignOut={handleLogout}
        />
      );
    }

    if (currentView === 'help') {
      return (
        <HelpPage
          userProfile={activeProfile}
          onNavigateToOnboarding={handleNavigateToOnboarding}
          onNavigateToEvidence={() => navigateToStage('evidence')}
          onNavigateToSkillTwin={() => navigateToStage('skilltwin')}
          onNavigateToTargetRole={() => navigateToStage('target_role')}
          onNavigateToGapAnalysis={() => navigateToStage('gap')}
          onNavigateToRoadmap={() => navigateToStage('roadmap')}
          onNavigateToProfile={() => setCurrentView('profile')}
          onNavigateToSettings={() => setCurrentView('settings')}
        />
      );
    }

    // Diagnostics / Foundation View
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 64px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => setCurrentView('evidence')}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            >
              <ArrowLeft size={16} /> Back to Evidence Collection (Page 2)
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
                  SkillTwin Pipeline & Diagnostics
                </h1>
                <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Foundation Status</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                React (Vite) ↔ FastAPI (Python) ↔ PostgreSQL Database
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {lastCheckTime && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} /> {lastCheckTime}
              </span>
            )}
            <button
              id="refresh-health-btn"
              className="btn btn-outline"
              onClick={checkSystemHealth}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animated-glow' : ''} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
              {isLoading ? 'Checking...' : 'Refresh'}
            </button>
          </div>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layout size={24} color="#38BDF8" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Frontend Layer</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vite + React 18 + TypeScript</p>
                </div>
              </div>
              <span className="badge badge-connected">
                <span className="pulse-dot green" /> Running (Port 5173)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>UI Language:</span>
                <span className="mono" style={{ color: '#C084FC' }}>TypeScript 5.x</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Styling Engine:</span>
                <span>Vanilla CSS (Glassmorphism)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Active Views:</span>
                <span style={{ color: '#38BDF8' }}>Page 1 (Onboarding) + Page 2 (Evidence)</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Server size={24} color="#818CF8" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Backend Server</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FastAPI + Python 3.12/3.14</p>
                </div>
              </div>
              <span className={`badge ${isBackendHealthy ? 'badge-connected' : 'badge-disconnected'}`}>
                <span className={`pulse-dot ${isBackendHealthy ? 'green' : 'red'}`} />
                {isBackendHealthy ? 'Active (Port 8000)' : 'Unreachable'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <span style={{ color: isBackendHealthy ? '#34D399' : '#F87171', fontWeight: 600 }}>
                  {healthData?.status?.toUpperCase() || 'OFFLINE'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Service:</span>
                <span>{healthData?.service || 'SkillTwin Backend'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>API Docs:</span>
                <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" style={{ color: '#818CF8', textDecoration: 'none' }}>
                  /docs (Swagger UI) ↗
                </a>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={24} color="#C084FC" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Database Engine</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PostgreSQL 16 (Port 5432)</p>
                </div>
              </div>
              <span className={`badge ${isDbConnected ? 'badge-connected' : 'badge-info'}`}>
                <span className={`pulse-dot ${isDbConnected ? 'green' : 'amber'}`} />
                {isDbConnected ? 'Connected' : 'Active (Fallback Cache)'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Driver:</span>
                <span className="mono">psycopg2 / SQLAlchemy 2.0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Latency:</span>
                <span className="mono" style={{ color: '#34D399' }}>
                  {healthData?.database?.latency_ms !== undefined ? `${healthData.database.latency_ms} ms` : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Verified Tables:</span>
                <span>users, evidence_sources, skills, skill_twin</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div key={currentView} className="app-shell-bg page-transition">
      <DashboardParticles />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default App;
