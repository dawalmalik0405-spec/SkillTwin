import React, { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Shield,
  FolderGit2,
  Cpu,
  Target,
  TrendingUp,
  FileText,
  Compass,
  Milestone,
  ShieldCheck,
  Award,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { UserProfile } from '../../shared/types';
import GalaxyOrbitalSystem from '../../shared/components/GalaxyOrbitalSystem';

interface LandingPageProps {
  userProfile?: UserProfile | null;
  isAuthenticated: boolean;
  onGetStarted: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  userProfile,
  isAuthenticated,
  onGetStarted,
  onOpenLogin,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const userName = userProfile?.name || 'Engineer';

  return (
    <div className="landing-page-bg" style={{ paddingTop: '74px', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* 1. Sticky Navigation Bar */}
      <nav className="landing-navbar">
        <div className="landing-nav-container">
          {/* Brand Logo & Tagline */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(99, 102, 241, 0.5)'
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#FFFFFF' }}>S</span>
            </div>
            <div>
              <span style={{ fontSize: '1.22rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', display: 'block' }}>
                SkillTwin
              </span>
              <span className="landing-brand-tagline" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.02em', display: 'block' }}>
                Evidence-Based Skill Development
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="landing-nav-links">
            <span className="landing-nav-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Home
            </span>
            <span className="landing-nav-link" onClick={() => scrollToSection('about')}>
              About
            </span>
            <span className="landing-nav-link" onClick={() => scrollToSection('features')}>
              Features
            </span>
            <span className="landing-nav-link" onClick={() => scrollToSection('how-it-works')}>
              How It Works
            </span>
            <span className="landing-nav-link" onClick={() => scrollToSection('why-skilltwin')}>
              Why SkillTwin
            </span>
          </div>

          {/* Right Action Items */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  className="landing-nav-user-badge"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    fontSize: '0.82rem',
                    color: '#C084FC'
                  }}
                >
                  <UserIcon size={14} />
                  <span>{userName}</span>
                </div>
                <button
                  onClick={onGetStarted}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  Go to App <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  id="landing-signout-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLogout();
                  }}
                  className="btn btn-outline"
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    color: '#F87171',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={onOpenLogin}
                  className="btn btn-ghost landing-nav-login-btn"
                  style={{ fontSize: '0.88rem', fontWeight: 600 }}
                >
                  Log In
                </button>
                <button
                  onClick={onGetStarted}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.88rem' }}
                >
                  Get Started <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn"
              title="Toggle Menu"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              padding: '16px 24px 24px',
              backgroundColor: 'rgba(10, 15, 29, 0.98)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: 'calc(100vh - 74px)',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)'
            }}
          >
            <span className="landing-nav-link" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }}>
              Home
            </span>
            <span className="landing-nav-link" onClick={() => scrollToSection('about')}>
              About
            </span>
            <span className="landing-nav-link" onClick={() => scrollToSection('features')}>
              Features
            </span>
            <span className="landing-nav-link" onClick={() => scrollToSection('how-it-works')}>
              How It Works
            </span>
            <span className="landing-nav-link" onClick={() => scrollToSection('why-skilltwin')}>
              Why SkillTwin
            </span>

            {isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onGetStarted(); }}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Go to App <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <LogOut size={15} /> Sign Out ({userName})
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                  className="btn btn-outline"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onGetStarted(); }}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <section
        id="hero"
        style={{
          position: 'relative',
          padding: 'clamp(40px, 8vw, 80px) clamp(16px, 4vw, 24px) clamp(50px, 10vw, 100px)',
          textAlign: 'center',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%'
        }}
      >
        {/* Subtle Ambient Background Halo */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(600px, 90vw)',
            height: 'min(400px, 60vw)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(147, 51, 234, 0.08) 50%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Top Pill */}
          <div className="landing-tag-badge">
            <Sparkles size={14} /> The Next-Generation Career Operating System
          </div>

          {/* Main Headline */}
          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5.5vw, 4.4rem)',
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: '-0.03em',
              maxWidth: '920px',
              margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #FFFFFF 20%, #C084FC 60%, #38BDF8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Build Your Career With Evidence.
          </h1>

          {/* Supporting Text */}
          <p
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1.25rem)',
              color: 'var(--text-secondary)',
              maxWidth: '720px',
              margin: '0 auto 36px',
              lineHeight: 1.6
            }}
          >
            Turn your projects, skills, and achievements into an evidence-backed SkillTwin and understand exactly what you need to build next.
          </p>

          {/* Hero Action Buttons */}
          <div
            className="hero-action-btns"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '32px'
            }}
          >
            <button
              onClick={onGetStarted}
              className="btn btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: '1rem',
                borderRadius: '12px',
                boxShadow: '0 6px 25px rgba(99, 102, 241, 0.55)'
              }}
            >
              Get Started <ArrowRight size={18} />
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="btn btn-outline"
              style={{
                padding: '14px 28px',
                fontSize: '1rem',
                borderRadius: '12px'
              }}
            >
              Learn More
            </button>
          </div>

          {/* Centerpiece: Reused & Scaled Galaxy / Planetary Orbital System */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', minHeight: 'clamp(260px, 40vw, 340px)', width: '100%', overflow: 'hidden' }}>
            <GalaxyOrbitalSystem size="hero" />
          </div>
        </div>
      </section>

      {/* 3. About Section */}
      <section id="about" className="landing-section">
        <div className="landing-section-header">
          <div className="landing-tag-badge">
            <Shield size={14} /> THE EVIDENCE REVOLUTION
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.8vw, 2.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
              color: '#FFFFFF'
            }}
          >
            Your Skills Should Be Backed By Evidence.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            SkillTwin builds a dynamic, evidence-backed digital skill profile from your real GitHub commits, production code, verified projects, and assessments. Never rely on unverified claims again.
          </p>
        </div>

        {/* 4 Connected Cards Journey */}
        <div className="about-journey-container">
          <div className="about-journey-track" />

          <div className="about-cards-grid">
            {/* Card 01 — Collect Evidence */}
            <div className="about-card" style={{ position: 'relative', zIndex: 1 }}>
              <div className="about-card-glow-edge" style={{ background: 'linear-gradient(90deg, #38BDF8, #60A5FA)' }} />
              <div>
                <div className="about-card-step-badge" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 6px #38BDF8' }} />
                  STEP 01
                </div>

                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38BDF8',
                    marginBottom: '16px',
                    boxShadow: '0 0 16px rgba(56, 189, 248, 0.18)'
                  }}
                >
                  <FolderGit2 size={22} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                  Collect Evidence
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                  GitHub repositories, projects, certifications, assessments and other career evidence.
                </p>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#38BDF8', fontWeight: 600, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
                <span>Connect & Analyze</span>
                <span>→</span>
              </div>
            </div>

            {/* Card 02 — Build Your SkillTwin */}
            <div className="about-card" style={{ position: 'relative', zIndex: 1 }}>
              <div className="about-card-glow-edge" style={{ background: 'linear-gradient(90deg, #C084FC, #A855F7)' }} />
              <div>
                <div className="about-card-step-badge" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#C084FC', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C084FC', boxShadow: '0 0 6px #C084FC' }} />
                  STEP 02
                </div>

                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C084FC',
                    marginBottom: '16px',
                    boxShadow: '0 0 16px rgba(168, 85, 247, 0.18)'
                  }}
                >
                  <Cpu size={22} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                  Build Your SkillTwin
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                  Transform real evidence into a living skill profile with quantified confidence scores.
                </p>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#C084FC', fontWeight: 600, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
                <span>Living Twin Graph</span>
                <span>→</span>
              </div>
            </div>

            {/* Card 03 — Discover Skill Gaps */}
            <div className="about-card" style={{ position: 'relative', zIndex: 1 }}>
              <div className="about-card-glow-edge" style={{ background: 'linear-gradient(90deg, #818CF8, #6366F1)' }} />
              <div>
                <div className="about-card-step-badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818CF8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818CF8', boxShadow: '0 0 6px #818CF8' }} />
                  STEP 03
                </div>

                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818CF8',
                    marginBottom: '16px',
                    boxShadow: '0 0 16px rgba(99, 102, 241, 0.18)'
                  }}
                >
                  <Target size={22} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                  Discover Skill Gaps
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                  Compare current capabilities with the requirements of a target career role.
                </p>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#818CF8', fontWeight: 600, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
                <span>Benchmark Gap Index</span>
                <span>→</span>
              </div>
            </div>

            {/* Card 04 — Grow With Purpose */}
            <div className="about-card" style={{ position: 'relative', zIndex: 1 }}>
              <div className="about-card-glow-edge" style={{ background: 'linear-gradient(90deg, #34D399, #10B981)' }} />
              <div>
                <div className="about-card-step-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
                  STEP 04
                </div>

                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#34D399',
                    marginBottom: '16px',
                    boxShadow: '0 0 16px rgba(16, 185, 129, 0.18)'
                  }}
                >
                  <TrendingUp size={22} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                  Grow With Purpose
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
                  Follow a personalized roadmap to strengthen the most important skill gaps.
                </p>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#34D399', fontWeight: 600, borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px' }}>
                <span>Targeted Roadmap</span>
                <span>✓</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="landing-section" style={{ backgroundColor: 'rgba(10, 15, 29, 0.5)' }}>
        <div className="landing-section-header">
          <div className="landing-tag-badge">
            <Cpu size={14} /> INTELLIGENCE SUITE
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.8vw, 2.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
              color: '#FFFFFF'
            }}
          >
            Everything You Need To Become Career Ready
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            A synchronized 9-stage intelligence ecosystem designed to verify skills, eliminate blind spots, and accelerate hiring readiness.
          </p>
        </div>

        {/* Varied Bento Grid */}
        <div className="features-bento-grid">
          {/* Feature 1 - Span 2 */}
          <div className="bento-card span-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}>
                <FolderGit2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#FFFFFF' }}>Evidence Collection</h3>
                <span style={{ fontSize: '0.75rem', color: '#818CF8', fontWeight: 600 }}>MULTI-SOURCE INGESTION</span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Seamlessly connect public and private GitHub repositories, upload structured resumes, and link live project deployments. SkillTwin parses codebases, commits, and project documentation automatically.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bento-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC' }}>
                <Cpu size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>AI Skill Analysis</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
              Deep semantic extraction models identify languages, frameworks, architecture patterns, and tools directly from raw files.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bento-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}>
                <Sparkles size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>Living SkillTwin</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
              A real-time competency twin that dynamically updates as you code, commit, and ship new projects.
            </p>
          </div>

          {/* Feature 4 - Span 2 */}
          <div className="bento-card span-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>
                <Target size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#FFFFFF' }}>Industry Role Matching</h3>
                <span style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 600 }}>LIVE HIRING BENCHMARKS</span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Benchmark your verified skills directly against curated industry roles — such as Full-Stack Engineer, AI Systems Specialist, and Backend Cloud Architect — with real-world weighting.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bento-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', color: '#FB7185' }}>
                <Compass size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>Skill Gap Analysis</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
              Mathematically quantifies Critical, High, and Medium skill gaps required to reach role readiness.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bento-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' }}>
                <Milestone size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>Personalized Roadmap</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
              Generates customized sprint-based learning milestones with curated resources and project briefs.
            </p>
          </div>

          {/* Feature 7 */}
          <div className="bento-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>Project Verification</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
              Automated git commit analysis inspects roadmap implementations to verify authenticity before unlocking progress.
            </p>
          </div>

          {/* Feature 8 */}
          <div className="bento-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}>
                <Award size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>Career Readiness</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.55 }}>
              A definitive readiness score with verifiable skill certificates ready to share with hiring teams.
            </p>
          </div>
        </div>
      </section>

      {/* 5. How It Works Section */}
      <section id="how-it-works" className="landing-section">
        <div className="landing-section-header">
          <div className="landing-tag-badge">
            <TrendingUp size={14} /> THE SYSTEM JOURNEY
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.8vw, 2.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
              color: '#FFFFFF'
            }}
          >
            From Raw Evidence To Career Readiness
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            SkillTwin guides you through a progressive 8-stage transformation, turning your actual work into verified career readiness.
          </p>
        </div>

        {/* 8-Stage Animated Journey Cards */}
        <div className="journey-timeline-grid">
          {[
            { step: '01', title: 'Your Evidence', desc: 'Connect GitHub repos, projects, and career documents.', icon: FileText, color: '#38BDF8' },
            { step: '02', title: 'Skill Extraction', desc: 'AI analyzes syntax, commits, frameworks, and architecture.', icon: Cpu, color: '#818CF8' },
            { step: '03', title: 'SkillTwin', desc: 'A living digital twin with evidence backing and confidence metrics.', icon: Sparkles, color: '#C084FC' },
            { step: '04', title: 'Target Role', desc: 'Select your target engineering role and industry benchmark.', icon: Target, color: '#F472B6' },
            { step: '05', title: 'Gap Analysis', desc: 'Identify critical, high, and medium gaps with quantified metrics.', icon: Compass, color: '#F59E0B' },
            { step: '06', title: 'Personalized Roadmap', desc: 'Follow tailored sprint milestones to build missing capabilities.', icon: Milestone, color: '#34D399' },
            { step: '07', title: 'Build + Verify', desc: 'Code real projects and verify commits with automated analysis.', icon: ShieldCheck, color: '#60A5FA' },
            { step: '08', title: 'Career Readiness', desc: 'Achieve 85%+ readiness score and showcase verified proof.', icon: Award, color: '#10B981' }
          ].map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div key={idx} className="journey-step-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: item.color, fontFamily: 'var(--font-mono)' }}>
                    PHASE {item.step}
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${item.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: item.color
                    }}
                  >
                    <IconComponent size={17} />
                  </div>
                </div>
                <h4 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Why SkillTwin Section */}
      <section id="why-skilltwin" className="landing-section" style={{ backgroundColor: 'rgba(10, 15, 29, 0.6)' }}>
        <div className="landing-section-header">
          <div className="landing-tag-badge">
            <Target size={14} /> EVIDENCE VS CLAIMS
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.8vw, 2.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
              color: '#FFFFFF'
            }}
          >
            Your Resume Says What You Claim.<br />
            <span style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #C084FC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Your SkillTwin Shows What You Can Prove.
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Hiring teams are tired of keyword buzzwords on resumes. SkillTwin bridges the trust gap with automated verification.
          </p>
        </div>

        {/* Side by Side Comparison */}
        <div className="comparison-grid">
          {/* Left: Traditional */}
          <div className="comparison-column traditional">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <XCircle size={22} color="#EF4444" />
              <h3 style={{ fontSize: '1.28rem', fontWeight: 700, color: '#F87171' }}>
                Traditional Career Building
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { title: 'Resume Claims', desc: 'Unverified lists of buzzwords with no proof of actual capability.' },
                { title: 'Video Certificates', desc: 'Passive video completion badges that do not demonstrate implementation skills.' },
                { title: 'Self-Reported Ratings', desc: 'Subjective ratings (e.g. 8/10 in React) that recruiters dismiss immediately.' },
                { title: 'Generic Tutorials', desc: 'One-size-fits-all roadmaps disconnected from real hiring benchmarks.' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ marginTop: '2px', color: '#EF4444', flexShrink: 0 }}>✕</div>
                  <div>
                    <strong style={{ color: '#F8FAFC', fontSize: '0.94rem' }}>{item.title}:</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginLeft: '6px' }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: SkillTwin */}
          <div className="comparison-column skilltwin">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <CheckCircle2 size={22} color="#10B981" />
              <h3 style={{ fontSize: '1.28rem', fontWeight: 700, color: '#34D399' }}>
                SkillTwin Operating System
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { title: 'Real Project Evidence', desc: 'Actual Git commits, repositories, and verified production codebases.' },
                { title: 'Verified Implementation', desc: 'Automated code inspection checks architecture, dependencies, and commits.' },
                { title: 'Industry-Aligned Benchmarks', desc: 'Directly mapped to live hiring requirements and role weightings.' },
                { title: 'Personalized Growth', desc: 'Dynamic milestone roadmaps that adapt continuously as you build.' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ marginTop: '2px', color: '#10B981', flexShrink: 0 }}>✓</div>
                  <div>
                    <strong style={{ color: '#F8FAFC', fontSize: '0.94rem' }}>{item.title}:</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginLeft: '6px' }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section
        style={{
          padding: '120px 24px',
          textAlign: 'center',
          position: 'relative',
          background: 'linear-gradient(180deg, rgba(7, 11, 20, 0) 0%, rgba(79, 70, 229, 0.12) 50%, rgba(7, 11, 20, 1) 100%)'
        }}
      >
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div className="landing-tag-badge">
            <Sparkles size={14} /> GET STARTED TODAY
          </div>

          <h2
            style={{
              fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              marginBottom: '20px',
              color: '#FFFFFF'
            }}
          >
            Ready To Build Your SkillTwin?
          </h2>

          <div
            style={{
              fontSize: '1.2rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              marginBottom: '38px'
            }}
          >
            <p>Turn your work into evidence.</p>
            <p>Turn your evidence into skills.</p>
            <p style={{ color: '#C084FC', fontWeight: 600 }}>Turn your skills into your career.</p>
          </div>

          <button
            onClick={onGetStarted}
            className="btn btn-primary"
            style={{
              padding: '16px 40px',
              fontSize: '1.08rem',
              borderRadius: '14px',
              boxShadow: '0 8px 30px rgba(99, 102, 241, 0.6)'
            }}
          >
            Get Started <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* 8. Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '48px 24px 36px',
          backgroundColor: '#050810'
        }}
      >
        <div
          className="landing-footer-content"
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px'
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>S</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>SkillTwin</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Evidence-Based Skill Development</div>
            </div>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Home
            </span>
            <span style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => scrollToSection('about')}>
              About
            </span>
            <span style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => scrollToSection('features')}>
              Features
            </span>
            <span style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => scrollToSection('how-it-works')}>
              How It Works
            </span>
            <span style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => scrollToSection('why-skilltwin')}>
              Why SkillTwin
            </span>
            <span style={{ color: 'var(--text-muted)' }}>Privacy</span>
            <span style={{ color: 'var(--text-muted)' }}>Terms</span>
          </div>

          {/* Copyright */}
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            © 2026 SkillTwin. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
