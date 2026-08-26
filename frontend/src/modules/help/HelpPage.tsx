import React, { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  LifeBuoy,
  CheckCircle2,
  Layers,
  Moon,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../../shared/types';
import PersistentSidebar from '../../shared/components/PersistentSidebar';

interface HelpPageProps {
  userProfile: UserProfile | null;
  onNavigateToOnboarding?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToSkillTwin?: () => void;
  onNavigateToTargetRole?: () => void;
  onNavigateToGapAnalysis?: () => void;
  onNavigateToRoadmap?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onOpenDiagnostics?: () => void;
}

export const HelpPage: React.FC<HelpPageProps> = ({
  userProfile,
  onNavigateToOnboarding,
  onNavigateToEvidence,
  onNavigateToSkillTwin,
  onNavigateToTargetRole,
  onNavigateToGapAnalysis,
  onNavigateToRoadmap,
  onNavigateToProfile,
  onNavigateToSettings,
  onOpenDiagnostics
}) => {
  // Accordion open states
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const [supportSent, setSupportSent] = useState<boolean>(false);
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketMessage, setTicketMessage] = useState<string>('');

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportSent(true);
    setTimeout(() => {
      setSupportSent(false);
      setIsSupportModalOpen(false);
      setTicketSubject('');
      setTicketMessage('');
    }, 2500);
  };

  const faqItems = [
    {
      question: 'What is SkillTwin?',
      answer: 'SkillTwin is an Evidence-Based Skill Development Operating System designed to understand your existing skills through real artifacts (resumes, code repositories, live projects), identify concrete industry skill gaps, and generate a personalized learning roadmap.'
    },
    {
      question: 'Why do I need to provide evidence?',
      answer: 'Because traditional resumes and self-reported skill ratings are unverified. SkillTwin builds your Living Digital Skill Twin based on verifiable proof—such as code repositories, text extracted from genuine experience, and project architectures—so employers and mentors trust your capabilities.'
    },
    {
      question: 'What files can I upload for my resume?',
      answer: 'SkillTwin supports PDF (.pdf), Microsoft Word (.docx, .doc), and plain text (.txt) files up to 10MB in size. Our server-side parser securely extracts skills, education history, projects, and certifications without storing unnecessary personal identifiers.'
    },
    {
      question: 'How does GitHub analysis work?',
      answer: 'When you connect your GitHub username, SkillTwin queries the official GitHub REST API to inspect your public repositories, dominant programming languages, framework topics, repository stars, and commit frequencies to verify hands-on coding proficiency.'
    },
    {
      question: 'Can I edit my profile later?',
      answer: 'Yes! You can open the Profile section from the persistent sidebar at any time, click "Edit Profile", and update your target role, education details, career interests, or learning preferences. All updates immediately synchronize across the application.'
    },
    {
      question: 'How is my data handled and secured?',
      answer: 'Your evidence is processed with strict privacy controls. All communications use HTTPS/TLS encryption and repository analysis only accesses publicly available GitHub repositories. You can export or delete your profile data at any time under Settings → Privacy & Data.'
    }
  ];

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

        {/* Header Badges & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              <Layers size={14} /> Pipeline Status
            </button>
          )}
          <div className="badge badge-purple" style={{ padding: '6px 12px' }}>
            <Moon size={13} /> Dark Mode
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="dashboard-layout">
        {/* Left Persistent Dashboard Sidebar */}
        <PersistentSidebar
          userProfile={userProfile}
          activeStep={2}
          activeView="help"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={onNavigateToEvidence}
          onNavigateToSkillTwin={onNavigateToSkillTwin}
          onNavigateToTargetRole={onNavigateToTargetRole}
          onNavigateToGapAnalysis={onNavigateToGapAnalysis}
          onNavigateToRoadmap={onNavigateToRoadmap}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToSettings={onNavigateToSettings}
          onNavigateToHelp={() => {}}
        />

        {/* Center Main Work Area */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Page Title */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Help & About
              </h1>
              <span style={{ fontSize: '1.25rem' }}>💡</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
              Learn how SkillTwin operates, explore evidence assessment, and find answers.
            </p>
          </div>

          {/* Section 1: How SkillTwin Works (5 Step Workflow) */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '6px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px', color: '#C084FC' }}>
                <Sparkles size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>How SkillTwin Works</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>The 5-stage evidence-based development pipeline</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              {/* Step 1 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#34D399', fontSize: '0.82rem' }}>01 • Onboarding</span>
                  <span className="badge badge-analyzed" style={{ fontSize: '0.65rem' }}>✓</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Profile Setup</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Tell SkillTwin about yourself, academic background, target industry role, and study pace.
                </p>
              </div>

              {/* Step 2 */}
              <div style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#C084FC', fontSize: '0.82rem' }}>02 • Evidence</span>
                  <span className="nav-badge-pill" style={{ fontSize: '0.65rem' }}>Active</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Evidence Collection</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Provide verifiable proof via resume parsing, public GitHub repo analytics, and project demos.
                </p>
              </div>

              {/* Step 3 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.82rem' }}>03 • Synthesis</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Next</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Living SkillTwin</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Evidence is mapped into canonical skills with confidence scores and verifiable context citations.
                </p>
              </div>

              {/* Step 4 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.82rem' }}>04 • Analysis</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Phase 4</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Gap Analysis</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Compare your evidence against live industry requirements for your target role to discover deficits.
                </p>
              </div>

              {/* Step 5 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '0.82rem' }}>05 • Roadmap</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Phase 5</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Adaptive Roadmap</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Generate an actionable, phased curriculum with project milestones to bridge your skill gaps.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: FAQ Accordion & About Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
            {/* FAQ Accordion */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ padding: '6px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '8px', color: '#38BDF8' }}>
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Frequently Asked Questions</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click question to expand explanation</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {faqItems.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        background: isOpen ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                        border: isOpen ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(idx)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          background: 'none',
                          border: 'none',
                          color: '#FFFFFF',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        <span>{item.question}</span>
                        {isOpen ? <ChevronUp size={16} color="#C084FC" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                      </button>

                      {isOpen && (
                        <div style={{ padding: '0 14px 14px', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '10px' }}>
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* About Card & Support Contact */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* About Card */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #9333EA 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#FFF'
                  }}>
                    S
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>About SkillTwin</h3>
                    <p style={{ fontSize: '0.72rem', color: '#C084FC', fontWeight: 600 }}>Evidence-Based Skill Development</p>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                  SkillTwin is an evidence-based skill development platform designed to understand your existing skills, identify gaps, and help build a personalized learning path using real evidence from your experience.
                </p>

                <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Application Version</span>
                    <span style={{ color: '#F8FAFC', fontWeight: 600 }}>v1.0.0 (Release)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Architecture</span>
                    <span style={{ color: '#38BDF8', fontWeight: 500 }}>React + TypeScript + FastAPI + PostgreSQL</span>
                  </div>
                </div>
              </div>

              {/* Need Help? Contact Support Card */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', color: '#34D399' }}>
                    <LifeBuoy size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Need Help?</h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Submit feedback or connect with developers</p>
                  </div>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '14px' }}>
                  Have questions about evidence extraction, canonical skills, or encountering an issue?
                </p>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsSupportModalOpen(true)}
                    style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                  >
                    <MessageSquare size={14} /> Report a Problem
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsSupportModalOpen(true)}
                    style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                  >
                    <Mail size={14} /> Contact Support
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Support Ticket Modal */}
          {isSupportModalOpen && (
            <div className="modal-backdrop" onClick={() => setIsSupportModalOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '10px', color: '#818CF8' }}>
                      <LifeBuoy size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>Contact Support</h3>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Direct feedback for SkillTwin engineers</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSupportModalOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                {supportSent ? (
                  <div style={{ padding: '24px 0', textAlign: 'center' }}>
                    <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Message Received</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Thank you for your feedback! Our engineering team will review it.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSendSupport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Subject *
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Issue with GitHub repo sync"
                        value={ticketSubject}
                        onChange={e => setTicketSubject(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Message / Details *
                      </label>
                      <textarea
                        className="form-input"
                        rows={4}
                        placeholder="Describe what you experienced or how we can help..."
                        value={ticketMessage}
                        onChange={e => setTicketMessage(e.target.value)}
                        required
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setIsSupportModalOpen(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Submit Message
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default HelpPage;
