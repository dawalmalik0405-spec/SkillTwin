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

export const App: React.FC = () => {
  // Navigation & User Profile State with LocalStorage Persistence
  const [currentView, setCurrentView] = useState<'onboarding' | 'evidence' | 'skilltwin' | 'target_role' | 'profile' | 'settings' | 'help' | 'diagnostics'>(() => {
    const saved = localStorage.getItem('skilltwin_current_view');
    const validViews = ['onboarding', 'evidence', 'skilltwin', 'target_role', 'profile', 'settings', 'help', 'diagnostics'];
    return validViews.includes(saved || '') ? (saved as any) : 'onboarding';
  });

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

  // Save view and profile changes
  useEffect(() => {
    localStorage.setItem('skilltwin_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem('skilltwin_active_profile', JSON.stringify(activeProfile));
    }
  }, [activeProfile]);

  const handleUpdateProfile = (updated: UserProfile) => {
    setActiveProfile(updated);
    localStorage.setItem('skilltwin_active_profile', JSON.stringify(updated));
  };

  const handleResetAllData = () => {
    localStorage.clear();
    setActiveProfile(null);
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

  // Render Page 1: Onboarding
  if (currentView === 'onboarding') {
    return (
      <OnboardingPage
        onOnboardingComplete={(profile) => {
          setActiveProfile(profile);
          setCurrentView('evidence');
        }}
        onOpenDiagnostics={() => setCurrentView('diagnostics')}
      />
    );
  }

  // Render Page 2: Evidence Collection & AI Analysis
  if (currentView === 'evidence') {
    return (
      <EvidenceCollectionPage
        userProfile={activeProfile}
        onNavigateToOnboarding={() => setCurrentView('onboarding')}
        onNavigateToProfile={() => setCurrentView('profile')}
        onNavigateToSettings={() => setCurrentView('settings')}
        onNavigateToHelp={() => setCurrentView('help')}
        onNavigateToSkillTwin={() => setCurrentView('skilltwin')}
        onNavigateToTargetRole={() => setCurrentView('target_role')}
        onOpenDiagnostics={() => setCurrentView('diagnostics')}
      />
    );
  }

  // Render Page 3: Living SkillTwin
  if (currentView === 'skilltwin') {
    return (
      <SkillTwinPage
        userProfile={activeProfile}
        onNavigateToOnboarding={() => setCurrentView('onboarding')}
        onNavigateToEvidence={() => setCurrentView('evidence')}
        onNavigateToTargetRole={() => setCurrentView('target_role')}
        onNavigateToGapAnalysis={() => setCurrentView('target_role')}
        onNavigateToRoadmap={() => alert('Roadmap (Page 6) will follow Gap Analysis.')}
        onNavigateToProfile={() => setCurrentView('profile')}
        onNavigateToSettings={() => setCurrentView('settings')}
        onNavigateToHelp={() => setCurrentView('help')}
        onOpenDiagnostics={() => setCurrentView('diagnostics')}
      />
    );
  }

  // Render Page 4: Target Role / Industry Mapping
  if (currentView === 'target_role') {
    return (
      <TargetRoleMappingPage
        userProfile={activeProfile}
        onNavigateToOnboarding={() => setCurrentView('onboarding')}
        onNavigateToEvidence={() => setCurrentView('evidence')}
        onNavigateToSkillTwin={() => setCurrentView('skilltwin')}
        onNavigateToGapAnalysis={(roleData) => {
          alert(`Target Role Benchmark confirmed for ${roleData?.role || 'your target role'}! Gap Analysis (Page 5) will be implemented next.`);
        }}
        onNavigateToRoadmap={() => alert('Roadmap (Page 6) follows Gap Analysis.')}
        onNavigateToProfile={() => setCurrentView('profile')}
        onNavigateToSettings={() => setCurrentView('settings')}
        onNavigateToHelp={() => setCurrentView('help')}
        onOpenDiagnostics={() => setCurrentView('diagnostics')}
      />
    );
  }

  // Render Profile View
  if (currentView === 'profile') {
    return (
      <ProfilePage
        userProfile={activeProfile}
        onUpdateProfile={handleUpdateProfile}
        onNavigateToOnboarding={() => setCurrentView('onboarding')}
        onNavigateToEvidence={() => setCurrentView('evidence')}
        onNavigateToSkillTwin={() => setCurrentView('skilltwin')}
        onNavigateToTargetRole={() => setCurrentView('target_role')}
        onNavigateToGapAnalysis={() => setCurrentView('target_role')}
        onNavigateToRoadmap={() => alert('Roadmap (Page 6).')}
        onNavigateToSettings={() => setCurrentView('settings')}
        onNavigateToHelp={() => setCurrentView('help')}
        onOpenDiagnostics={() => setCurrentView('diagnostics')}
      />
    );
  }

  // Render Settings View
  if (currentView === 'settings') {
    return (
      <SettingsPage
        userProfile={activeProfile}
        onNavigateToOnboarding={() => setCurrentView('onboarding')}
        onNavigateToEvidence={() => setCurrentView('evidence')}
        onNavigateToSkillTwin={() => setCurrentView('skilltwin')}
        onNavigateToTargetRole={() => setCurrentView('target_role')}
        onNavigateToGapAnalysis={() => setCurrentView('target_role')}
        onNavigateToRoadmap={() => alert('Roadmap (Page 6).')}
        onNavigateToProfile={() => setCurrentView('profile')}
        onNavigateToHelp={() => setCurrentView('help')}
        onOpenDiagnostics={() => setCurrentView('diagnostics')}
        onResetAllData={handleResetAllData}
      />
    );
  }

  // Render Help & About View
  if (currentView === 'help') {
    return (
      <HelpPage
        userProfile={activeProfile}
        onNavigateToOnboarding={() => setCurrentView('onboarding')}
        onNavigateToEvidence={() => setCurrentView('evidence')}
        onNavigateToSkillTwin={() => setCurrentView('skilltwin')}
        onNavigateToTargetRole={() => setCurrentView('target_role')}
        onNavigateToGapAnalysis={() => setCurrentView('target_role')}
        onNavigateToRoadmap={() => alert('Roadmap (Page 6).')}
        onNavigateToProfile={() => setCurrentView('profile')}
        onNavigateToSettings={() => setCurrentView('settings')}
        onOpenDiagnostics={() => setCurrentView('diagnostics')}
      />
    );
  }

  // Render Diagnostics & Foundation View
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 64px' }}>
      {/* Top Diagnostics Header */}
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

      {/* Architecture Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Frontend Status Card */}
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

        {/* Backend Status Card */}
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

        {/* Database Status Card */}
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

export default App;
