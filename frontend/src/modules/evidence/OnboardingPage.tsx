import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  User,
  Mail,
  GraduationCap,
  Briefcase,
  BookOpen,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Award
} from 'lucide-react';
import { apiClient } from '../../shared/apiClient';
import { IndustryRole, OnboardingFormData, UserProfile } from '../../shared/types';

interface OnboardingPageProps {
  userProfile?: UserProfile | null;
  onOnboardingComplete?: (profile: UserProfile) => void;
  onOpenDiagnostics?: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  userProfile,
  onOnboardingComplete
}) => {
  // Single source of truth for user identity: Authenticated account email
  let savedAuthUser: any = null;
  try {
    const raw = localStorage.getItem('skilltwin_auth_user');
    if (raw) savedAuthUser = JSON.parse(raw);
  } catch {}

  const authenticatedEmail = (userProfile?.email || savedAuthUser?.email || '').trim().toLowerCase();

  // Form State - email strictly populated from authenticated account
  const [formData, setFormData] = useState<OnboardingFormData>(() => {
    return {
      name: userProfile?.name || savedAuthUser?.name || '',
      email: authenticatedEmail,
      education_level: userProfile?.education_level || '',
      degree: userProfile?.degree || '',
      branch: userProfile?.branch || '',
      semester_year: userProfile?.semester_year || '',
      target_role: userProfile?.target_role || '',
      career_interests: userProfile?.career_interests || '',
      study_time_per_day: userProfile?.study_time_per_day || '',
      preferred_learning_style: (userProfile?.preferred_learning_style as any) || 'Hands-on',
      preferred_language: userProfile?.preferred_language || 'English'
    };
  });

  // Automatically recover existing profile data from backend for the authenticated user
  useEffect(() => {
    if (!authenticatedEmail) return;

    let isMounted = true;
    apiClient.getProfile(authenticatedEmail)
      .then(existingProfile => {
        if (!isMounted || !existingProfile) return;
        if (existingProfile.target_role || existingProfile.education_level || existingProfile.degree) {
          setFormData(prev => ({
            ...prev,
            name: prev.name || existingProfile.name || '',
            email: authenticatedEmail,
            education_level: prev.education_level || existingProfile.education_level || '',
            degree: prev.degree || existingProfile.degree || '',
            branch: prev.branch || existingProfile.branch || '',
            semester_year: prev.semester_year || existingProfile.semester_year || '',
            target_role: prev.target_role || existingProfile.target_role || '',
            career_interests: prev.career_interests || existingProfile.career_interests || '',
            study_time_per_day: prev.study_time_per_day || existingProfile.study_time_per_day || '',
            preferred_learning_style: prev.preferred_learning_style || existingProfile.preferred_learning_style || 'Hands-on',
            preferred_language: prev.preferred_language || existingProfile.preferred_language || 'English'
          }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [authenticatedEmail]);

  // Keep formData in sync if userProfile is loaded asynchronously
  useEffect(() => {
    if (userProfile && (userProfile.name || userProfile.email)) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || userProfile.name || '',
        email: authenticatedEmail || userProfile.email || prev.email
      }));
    }
  }, [userProfile, authenticatedEmail]);

  // Roles from PostgreSQL backend
  const [roles, setRoles] = useState<IndustryRole[]>([]);
  const [isRolesLoading, setIsRolesLoading] = useState<boolean>(true);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<UserProfile | null>(null);

  // Fetch target roles on mount
  useEffect(() => {
    let isMounted = true;
    const fetchRoles = async () => {
      try {
        const fetchedRoles = await apiClient.getRoles();
        if (isMounted && fetchedRoles && fetchedRoles.length > 0) {
          setRoles(fetchedRoles);
        }
      } catch (err) {
        console.warn('Could not fetch roles from backend, using default fallback list', err);
      } finally {
        if (isMounted) setIsRolesLoading(false);
      }
    };

    fetchRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'email') return; // Email is linked to authenticated account and non-editable
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Validation: Check if all required fields are filled and valid
  const effectiveEmail = authenticatedEmail || formData.email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(effectiveEmail);
  const isFormValid =
    formData.name.trim().length >= 2 &&
    isEmailValid &&
    formData.education_level.trim() !== '' &&
    formData.degree.trim() !== '' &&
    formData.branch.trim() !== '' &&
    formData.semester_year.trim() !== '' &&
    formData.target_role.trim() !== '' &&
    formData.study_time_per_day.trim() !== '' &&
    formData.preferred_learning_style.trim() !== '' &&
    formData.preferred_language.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const submissionData: OnboardingFormData = {
        ...formData,
        email: effectiveEmail
      };
      const result = await apiClient.submitOnboarding(submissionData);
      setSavedProfile(result);
      if (onOnboardingComplete) {
        onOnboardingComplete(result);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save student profile. Please verify backend connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '16px 24px 28px' }}>
      {/* Top Header / Stepper (Matching Reference Mockup) */}
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

        {/* 5-Step Stepper */}
        <div className="stepper-container" style={{ maxWidth: '640px', flex: 1 }}>
          <div className="step-item active">
            <div className="step-circle">1</div>
            <span className="step-title" style={{ color: '#C084FC' }}>Onboarding</span>
            <span className="step-subtitle">Tell us about yourself</span>
          </div>
          <div style={{ height: '1px', width: '24px', background: 'rgba(255,255,255,0.1)' }} />
          
          <div className="step-item">
            <div className="step-circle">2</div>
            <span className="step-title">Evidence</span>
            <span className="step-subtitle">Upload your evidence</span>
          </div>
          <div style={{ height: '1px', width: '24px', background: 'rgba(255,255,255,0.1)' }} />

          <div className="step-item">
            <div className="step-circle">3</div>
            <span className="step-title">SkillTwin</span>
            <span className="step-subtitle">Your skill profile</span>
          </div>
          <div style={{ height: '1px', width: '24px', background: 'rgba(255,255,255,0.1)' }} />

          <div className="step-item">
            <div className="step-circle">4</div>
            <span className="step-title">Analysis</span>
            <span className="step-subtitle">Gap & insights</span>
          </div>
          <div style={{ height: '1px', width: '24px', background: 'rgba(255,255,255,0.1)' }} />

          <div className="step-item">
            <div className="step-circle">5</div>
            <span className="step-title">Roadmap</span>
            <span className="step-subtitle">Your learning path</span>
          </div>
        </div>

        {/* Top Right: Decorative text */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #C084FC 0%, #38BDF8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.02em',
              userSelect: 'none',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(192, 132, 252, 0.25)',
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.15)'
            }}
          >
            ✦ Your Career Journey
          </span>
        </div>
      </header>

      {/* Main Two-Column Layout (Matching Mockup Composition) */}
      <div className="onboarding-layout">
        {/* Left Branding & Guarantee Column */}
        <aside style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '8px' }}>
          <div>
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Welcome to
              </span>
              <h2 style={{
                fontSize: '2.1rem',
                fontWeight: 800,
                lineHeight: 1.15,
                background: 'linear-gradient(135deg, #60A5FA 0%, #C084FC 50%, #E879F9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginTop: '2px',
                marginBottom: '10px'
              }}>
                SkillTwin
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.55 }}>
              Let&apos;s build your evidence-backed SkillTwin and accelerate your career journey.
            </p>

            {/* Futuristic SkillTwin Galaxy / Planetary Orbital System (Slightly larger and lower) */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '44px 0 28px' }}>
              <div className="galaxy-system-container">
                {/* Soft Radial Ambient Core Glow */}
                <div className="galaxy-core-glow" />

                {/* Orbit 1: Primary Elliptical Ring (Tilted) with Cyan & Pink Planetary Nodes */}
                <div className="galaxy-orbit-1">
                  <div className="galaxy-particle particle-cyan" />
                  <div className="galaxy-particle particle-pink" />
                </div>

                {/* Orbit 2: Counter-Tilted Elliptical Ring with Violet Node */}
                <div className="galaxy-orbit-2">
                  <div className="galaxy-particle particle-violet" />
                </div>

                {/* Orbit 3: Inner Circular Ring with Blue Node */}
                <div className="galaxy-orbit-3">
                  <div className="galaxy-particle particle-blue" />
                </div>

                {/* Central SkillTwin S Core Badge (Preserved Strong Focal Point) */}
                <div className="galaxy-core-badge">
                  <div className="galaxy-core-icon">
                    <span style={{ fontSize: '2.35rem', fontWeight: 900, color: '#FFFFFF', textShadow: '0 0 18px rgba(255,255,255,0.95)' }}>
                      S
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            {/* Trust / Privacy Card */}
            <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px', color: '#818CF8', flexShrink: 0 }}>
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC' }}>100% Secure & Private</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                  Your data is encrypted and never shared with anyone.
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              © 2026 SkillTwin. All rights reserved.
            </div>
          </div>
        </aside>

        {/* Right Column: Main Form + Returning User Section Below */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <main className="glass-panel" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {!savedProfile ? (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  {/* Header inside form */}
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>
                      Let&apos;s get to know you 👋
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Fill in the details below to personalize your experience.
                    </p>
                  </div>

                  {errorMessage && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: '#F87171',
                      fontSize: '0.82rem',
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertCircle size={16} />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* 2×2 Balanced Grid Layout (Matching Reference Mockup) */}
                  <div className="onboarding-grid">
                    {/* Top-Left: 1. Personal Information */}
                    <div className="glass-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#C084FC', fontWeight: 600, fontSize: '0.875rem' }}>
                        <User size={16} /> Personal Information
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="full-name-input">Full Name</label>
                        <div className="input-container">
                          <span className="input-icon"><User size={15} /></span>
                          <input
                            id="full-name-input"
                            name="name"
                            type="text"
                            required
                            className="form-input has-icon"
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <label className="form-label" htmlFor="email-input" style={{ marginBottom: 0 }}>Email Address</label>
                          <span style={{ fontSize: '0.7rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                            <Shield size={11} /> Authenticated Account
                          </span>
                        </div>
                        <div className="input-container">
                          <span className="input-icon"><Mail size={15} /></span>
                          <input
                            id="email-input"
                            name="email"
                            type="email"
                            readOnly
                            disabled
                            className="form-input has-icon"
                            placeholder="Authenticated email address"
                            value={effectiveEmail}
                            style={{
                              backgroundColor: 'rgba(15, 23, 42, 0.65)',
                              color: 'var(--text-secondary)',
                              cursor: 'not-allowed',
                              borderColor: 'rgba(255, 255, 255, 0.08)',
                              opacity: 0.85
                            }}
                            title="Email is linked to your authenticated account and cannot be modified"
                          />
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Linked to your authenticated login account.
                        </p>
                      </div>
                    </div>

                    {/* Top-Right: 2. Education Details */}
                    <div className="glass-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#818CF8', fontWeight: 600, fontSize: '0.875rem' }}>
                        <GraduationCap size={16} /> Education Details
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label" htmlFor="education-level-select">Education Level</label>
                          <select
                            id="education-level-select"
                            name="education_level"
                            required
                            className="form-select"
                            value={formData.education_level}
                            onChange={handleChange}
                          >
                            <option value="">Select education level</option>
                            <option value="Undergraduate">Undergraduate</option>
                            <option value="Postgraduate">Postgraduate</option>
                            <option value="Diploma">Diploma</option>
                            <option value="Doctorate">Doctorate / Ph.D.</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="degree-select">Degree</label>
                          <select
                            id="degree-select"
                            name="degree"
                            required
                            className="form-select"
                            value={formData.degree}
                            onChange={handleChange}
                          >
                            <option value="">Select your degree</option>
                            <option value="B.Tech / B.E.">B.Tech / B.E.</option>
                            <option value="B.Sc">B.Sc</option>
                            <option value="BCA">BCA</option>
                            <option value="M.Tech">M.Tech</option>
                            <option value="MCA">MCA</option>
                            <option value="MS / M.Sc">MS / M.Sc</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label" htmlFor="branch-input">Branch / Specialization</label>
                          <input
                            id="branch-input"
                            name="branch"
                            type="text"
                            required
                            className="form-input"
                            placeholder="Enter your branch or specialization"
                            value={formData.branch}
                            onChange={handleChange}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="semester-select">Current Semester / Year</label>
                          <select
                            id="semester-select"
                            name="semester_year"
                            required
                            className="form-select"
                            value={formData.semester_year}
                            onChange={handleChange}
                          >
                            <option value="">Select semester or year</option>
                            <option value="Semester 1 / Year 1">Semester 1 / Year 1</option>
                            <option value="Semester 2 / Year 1">Semester 2 / Year 1</option>
                            <option value="Semester 3 / Year 2">Semester 3 / Year 2</option>
                            <option value="Semester 4 / Year 2">Semester 4 / Year 2</option>
                            <option value="Semester 5 / Year 3">Semester 5 / Year 3</option>
                            <option value="Semester 6 / Year 3">Semester 6 / Year 3</option>
                            <option value="Semester 7 / Year 4">Semester 7 / Year 4</option>
                            <option value="Semester 8 / Year 4">Semester 8 / Year 4</option>
                            <option value="Recent Graduate">Recent Graduate</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Bottom-Left: 3. Career Goals */}
                    <div className="glass-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#38BDF8', fontWeight: 600, fontSize: '0.875rem' }}>
                        <Briefcase size={16} /> Career Goals
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="target-role-select">Target Role</label>
                        <select
                          id="target-role-select"
                          name="target_role"
                          required
                          className="form-select"
                          value={formData.target_role}
                          onChange={handleChange}
                          disabled={isRolesLoading}
                        >
                          <option value="">{isRolesLoading ? 'Loading roles...' : 'Select your target role'}</option>
                          {roles.map(r => (
                            <option key={r.role_name} value={r.role_name}>
                              {r.role_name}
                            </option>
                          ))}
                        </select>
                        <div style={{ fontSize: '0.72rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                          <Sparkles size={11} /> We&apos;ll analyze your skills based on your target role.
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="career-interests-input">Career Interests (Optional)</label>
                        <input
                          id="career-interests-input"
                          name="career_interests"
                          type="text"
                          className="form-input"
                          placeholder="e.g., Web Development, AI, Data Science"
                          value={formData.career_interests || ''}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Bottom-Right: 4. Learning Preferences */}
                    <div className="glass-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#34D399', fontWeight: 600, fontSize: '0.875rem' }}>
                        <BookOpen size={16} /> Learning Preferences
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="form-group">
                          <label className="form-label" htmlFor="study-time-select">Study Time Per Day</label>
                          <select
                            id="study-time-select"
                            name="study_time_per_day"
                            required
                            className="form-select"
                            value={formData.study_time_per_day}
                            onChange={handleChange}
                          >
                            <option value="">Select your study time</option>
                            <option value="30 mins/day">30 mins/day</option>
                            <option value="1-2 hours/day">1-2 hours/day</option>
                            <option value="2-4 hours/day">2-4 hours/day</option>
                            <option value="4+ hours/day">4+ hours/day</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label" htmlFor="learning-style-select">Preferred Learning Style</label>
                          <select
                            id="learning-style-select"
                            name="preferred_learning_style"
                            required
                            className="form-select"
                            value={formData.preferred_learning_style}
                            onChange={handleChange}
                          >
                            <option value="Hands-on">Hands-on</option>
                            <option value="Visual">Visual</option>
                            <option value="Reading">Reading</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="language-select">Preferred Language</label>
                        <select
                          id="language-select"
                          name="preferred_language"
                          required
                          className="form-select"
                          value={formData.preferred_language}
                          onChange={handleChange}
                        >
                          <option value="English">English</option>
                          <option value="Spanish">Spanish</option>
                          <option value="Hindi">Hindi</option>
                          <option value="French">French</option>
                          <option value="German">German</option>
                        </select>
                        <div style={{ fontSize: '0.72rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                          <Sparkles size={11} /> This helps us create a personalized learning experience for you.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar (Step 1 of 5 removed) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '16px',
                  marginTop: '8px'
                }}>
                  <button
                    id="onboarding-continue-btn"
                    type="submit"
                    className="btn btn-primary"
                    disabled={!isFormValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animated-glow" style={{ animation: 'spin 1s linear infinite' }} />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        Continue <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Onboarding Saved & Verified State */
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '2px solid #10B981',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                  boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)'
                }}>
                  <CheckCircle2 size={32} color="#10B981" />
                </div>

                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px' }}>
                  Profile Successfully Saved!
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 24px' }}>
                  Welcome aboard, <strong style={{ color: '#F8FAFC' }}>{savedProfile.name}</strong>. Your onboarding profile has been securely saved to the database.
                </p>

                {/* Profile Summary Card */}
                <div className="glass-card" style={{ maxWidth: '480px', margin: '0 auto 28px', textAlign: 'left' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                      <div style={{ color: '#F8FAFC', fontWeight: 500 }}>{savedProfile.email}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Target Role:</span>
                      <div style={{ color: '#38BDF8', fontWeight: 600 }}>{savedProfile.target_role}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Education:</span>
                      <div style={{ color: '#F8FAFC' }}>{savedProfile.degree} ({savedProfile.branch})</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Study Time:</span>
                      <div style={{ color: '#34D399' }}>{savedProfile.study_time_per_day}</div>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '10px',
                  color: '#C084FC',
                  fontSize: '0.82rem'
                }}>
                  <Award size={16} />
                  <span>Page 1 Complete. Ready for Phase 2: Evidence Collection (Resume + GitHub).</span>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => setSavedProfile(null)}
                  >
                    Edit Profile Information
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
