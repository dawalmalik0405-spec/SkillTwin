import React, { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  LifeBuoy,
  CheckCircle2,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../../shared/types';
import PersistentSidebar from '../../shared/components/PersistentSidebar';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';

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
  onNavigateToSettings
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
      question: '1. What is SkillTwin?',
      answer: 'SkillTwin is an evidence-based skill development system designed to understand your existing skills through real artifacts, identify concrete skill gaps against target industry roles, and generate an actionable learning path.'
    },
    {
      question: '2. Why do I need to provide evidence?',
      answer: 'Traditional resumes and self-ratings lack objective verification. SkillTwin constructs your Living Digital Skill Twin based on verifiable proof—such as code repositories, text extracted from genuine experience, and project architectures—ensuring your skills are trustworthy.'
    },
    {
      question: '3. What files can I upload for my resume?',
      answer: 'SkillTwin supports PDF (.pdf), Microsoft Word (.docx, .doc), and plain text (.txt) files up to 10MB. Our server-side parser securely extracts skills, academic background, projects, and technologies.'
    },
    {
      question: '4. How does GitHub analysis work?',
      answer: 'SkillTwin connects to your public GitHub profile to inspect repositories, languages, framework topics, repository stars, and commit frequencies to measure practical, code-backed engineering proficiency.'
    },
    {
      question: '5. How are my skills identified?',
      answer: 'Skills are identified using semantic analysis across your uploaded resume, GitHub repositories, and registered projects, matching technical evidence against a verified industry skill taxonomy.'
    },
    {
      question: '6. How is my target role used?',
      answer: 'Your target role (e.g. Full-Stack Developer, AI/ML Engineer) serves as the industry benchmark. SkillTwin compares your evidence-based skill profile against actual market requirements to reveal where you stand.'
    },
    {
      question: '7. How does Gap Analysis work?',
      answer: 'Gap Analysis compares your current verified skills against the required capabilities of your selected role, calculating readiness levels, missing competencies, and priority areas for improvement.'
    },
    {
      question: '8. How is my roadmap generated?',
      answer: 'Based on your specific skill gaps and daily study pace, SkillTwin builds an adaptive, phased curriculum with milestones, curated learning resources, and recommended practical builds.'
    },
    {
      question: '9. Can I edit my profile later?',
      answer: 'Yes. You can visit the Profile section at any time, click "Edit Profile", and update your target role, degree, career interests, or study habits. All updates immediately persist across the platform.'
    },
    {
      question: '10. How is my data handled and secured?',
      answer: 'Your data is processed with strict privacy controls using HTTPS/TLS encryption. SkillTwin only reads public GitHub repositories you specify, and you can export or delete your profile data at any time in Settings.'
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

        {/* Top Right Header Badge */}
        <GlobalHeaderBadge />
      </header>

      {/* Main Dashboard Layout */}
      <div className="dashboard-layout">
        {/* Left Persistent Dashboard Sidebar */}
        <PersistentSidebar
          userProfile={userProfile}
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

          {/* Section 1: How SkillTwin Works (9-Stage Journey) */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '6px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px', color: '#C084FC' }}>
                <Sparkles size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>How SkillTwin Works</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>The 9-stage evidence-based career development pipeline</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {/* Step 1 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#34D399', fontSize: '0.82rem' }}>01 • Onboarding</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Profile Setup</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Provide your basic profile, academic background, target industry role, and study pace.
                </p>
              </div>

              {/* Step 2 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#C084FC', fontSize: '0.82rem' }}>02 • Evidence</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Evidence Collection</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Provide verifiable evidence such as resume, GitHub profile/repositories, and projects.
                </p>
              </div>

              {/* Step 3 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#818CF8', fontSize: '0.82rem' }}>03 • SkillTwin</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Living SkillTwin</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Your evidence is mapped into a comprehensive, evidence-based skill profile with confidence ratings.
                </p>
              </div>

              {/* Step 4 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#38BDF8', fontSize: '0.82rem' }}>04 • Target Role</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Target Career Direction</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Define the target role and industry you are actively preparing for to establish clear benchmarks.
                </p>
              </div>

              {/* Step 5 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#F59E0B', fontSize: '0.82rem' }}>05 • Gap Analysis</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Skill Gap Analysis</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Current evidence-based skills are compared against target role requirements to identify skill gaps.
                </p>
              </div>

              {/* Step 6 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#EC4899', fontSize: '0.82rem' }}>06 • Roadmap</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Adaptive Roadmap</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  The system creates an actionable, phased learning roadmap based on your identified gaps and pace.
                </p>
              </div>

              {/* Step 7 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#34D399', fontSize: '0.82rem' }}>07 • Verification</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Project Verification</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Practical project evidence is verified and assessed against concrete implementation criteria.
                </p>
              </div>

              {/* Step 8 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#C084FC', fontSize: '0.82rem' }}>08 • SkillTwin Updated</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Updated SkillTwin</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Verified and developed skills from completed projects are reflected back into your Living SkillTwin.
                </p>
              </div>

              {/* Step 9 */}
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#38BDF8', fontSize: '0.82rem' }}>09 • Career Readiness</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>Career Readiness</div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  The system presents your overall readiness, verified proof portfolio, and continuous growth loop.
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
