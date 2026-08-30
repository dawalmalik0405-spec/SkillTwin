import React, { useState, useRef } from 'react';
import {
  User,
  Camera,
  Trash2,
  Edit3,
  Check,
  X,
  GraduationCap,
  Briefcase,
  BookOpen,
  Mail,
  Shield
} from 'lucide-react';
import { UserProfile } from '../../shared/types';
import PersistentSidebar from '../../shared/components/PersistentSidebar';
import { GlobalHeaderBadge } from '../../shared/components/GlobalHeaderBadge';

interface ProfilePageProps {
  userProfile: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onNavigateToOnboarding?: () => void;
  onNavigateToEvidence?: () => void;
  onNavigateToSkillTwin?: () => void;
  onNavigateToTargetRole?: () => void;
  onNavigateToGapAnalysis?: () => void;
  onNavigateToRoadmap?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  onUpdateProfile,
  onNavigateToOnboarding,
  onNavigateToEvidence,
  onNavigateToSkillTwin,
  onNavigateToTargetRole,
  onNavigateToGapAnalysis,
  onNavigateToRoadmap,
  onNavigateToSettings,
  onNavigateToHelp
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local Form State initialized from userProfile
  const [formData, setFormData] = useState({
    name: userProfile?.name || 'Layeeba Haram',
    email: userProfile?.email || 'layeeba@skilltwin.dev',
    education_level: userProfile?.education_level || 'Undergraduate',
    degree: userProfile?.degree || 'B.Tech / B.E.',
    branch: userProfile?.branch || 'Computer Science',
    semester_year: userProfile?.semester_year || 'Semester 6 / Year 3',
    target_role: userProfile?.target_role || 'Full-Stack Developer',
    career_interests: userProfile?.career_interests || 'Web Development, AI, Cloud Computing',
    study_time_per_day: userProfile?.study_time_per_day || '2-4 hours/day',
    preferred_learning_style: userProfile?.preferred_learning_style || 'Hands-on Projects',
    preferred_language: userProfile?.preferred_language || 'English',
    avatar_base64: userProfile?.avatar_base64 || userProfile?.avatar_url || ''
  });

  // Keep form fields synced whenever userProfile updates
  React.useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        email: userProfile.email || '',
        education_level: userProfile.education_level || 'Undergraduate',
        degree: userProfile.degree || 'B.Tech / B.E.',
        branch: userProfile.branch || 'Computer Science',
        semester_year: userProfile.semester_year || 'Semester 6 / Year 3',
        target_role: userProfile.target_role || 'Full-Stack Developer',
        career_interests: userProfile.career_interests || '',
        study_time_per_day: userProfile.study_time_per_day || '2-4 hours/day',
        preferred_learning_style: userProfile.preferred_learning_style || 'Hands-on Projects',
        preferred_language: userProfile.preferred_language || 'English',
        avatar_base64: userProfile.avatar_base64 || userProfile.avatar_url || ''
      });
    }
  }, [userProfile]);

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be under 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setFormData(prev => ({ ...prev, avatar_base64: base64 }));
        if (userProfile) {
          const updated: UserProfile = {
            ...userProfile,
            avatar_base64: base64,
            avatar_url: base64
          };
          onUpdateProfile(updated);
        }
        setSuccessMessage('Profile picture updated successfully ✓');
        setTimeout(() => setSuccessMessage(null), 4000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setFormData(prev => ({ ...prev, avatar_base64: '' }));
    if (userProfile) {
      const updated: UserProfile = {
        ...userProfile,
        avatar_base64: '',
        avatar_url: ''
      };
      onUpdateProfile(updated);
    }
    setSuccessMessage('Profile picture removed. Reverted to initials avatar.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Name and Email are required.');
      return;
    }

    const updatedProfile: UserProfile = {
      id: userProfile?.id || 'usr_' + Date.now(),
      name: formData.name.trim(),
      email: (userProfile?.email || formData.email).trim().toLowerCase(),
      avatar_base64: formData.avatar_base64,
      avatar_url: formData.avatar_base64,
      education_level: formData.education_level,
      degree: formData.degree,
      branch: formData.branch,
      semester_year: formData.semester_year,
      target_role: formData.target_role,
      career_interests: formData.career_interests,
      study_time_per_day: formData.study_time_per_day,
      preferred_learning_style: formData.preferred_learning_style,
      preferred_language: formData.preferred_language,
      updated_at: new Date().toISOString()
    };

    onUpdateProfile(updatedProfile);
    setIsEditing(false);
    setSuccessMessage('Profile updated successfully ✓');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleCancel = () => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || 'Layeeba Haram',
        email: userProfile.email || 'layeeba@skilltwin.dev',
        education_level: userProfile.education_level || 'Undergraduate',
        degree: userProfile.degree || 'B.Tech / B.E.',
        branch: userProfile.branch || 'Computer Science',
        semester_year: userProfile.semester_year || 'Semester 6 / Year 3',
        target_role: userProfile.target_role || 'Full-Stack Developer',
        career_interests: userProfile.career_interests || 'Web Development, AI, Cloud Computing',
        study_time_per_day: userProfile.study_time_per_day || '2-4 hours/day',
        preferred_learning_style: userProfile.preferred_learning_style || 'Hands-on Projects',
        preferred_language: userProfile.preferred_language || 'English',
        avatar_base64: userProfile.avatar_base64 || userProfile.avatar_url || ''
      });
    }
    setIsEditing(false);
  };

  const avatarDisplay = formData.avatar_base64 || userProfile?.avatar_base64 || userProfile?.avatar_url;
  const currentInitials = getInitials(formData.name || 'Layeeba Haram');

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
          activeView="profile"
          onNavigateToOnboarding={onNavigateToOnboarding}
          onNavigateToEvidence={onNavigateToEvidence}
          onNavigateToSkillTwin={onNavigateToSkillTwin}
          onNavigateToTargetRole={onNavigateToTargetRole}
          onNavigateToGapAnalysis={onNavigateToGapAnalysis}
          onNavigateToRoadmap={onNavigateToRoadmap}
          onNavigateToProfile={() => {}}
          onNavigateToSettings={onNavigateToSettings}
          onNavigateToHelp={onNavigateToHelp}
        />

        {/* Center Main Work Area */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Page Title & Edit Actions */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  My Profile
                </h1>
                <span style={{ fontSize: '1.25rem' }}>👤</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
                Manage your personal information and career profile.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {!isEditing ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsEditing(true)}
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                >
                  <Edit3 size={15} /> Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCancel}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    <X size={15} /> Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                    style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                  >
                    <Check size={15} /> Save Changes
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Success Notification Banner */}
          {successMessage && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '10px',
              color: '#34D399',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} />
                <span>{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                style={{ background: 'none', border: 'none', color: '#34D399', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Top Profile Hero Card with Avatar Upload */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Circular Avatar */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.8rem',
                  color: '#FFFFFF',
                  boxShadow: '0 0 25px rgba(124, 58, 237, 0.5)',
                  overflow: 'hidden',
                  border: '3px solid rgba(255, 255, 255, 0.15)'
                }}>
                  {avatarDisplay ? (
                    <img
                      src={avatarDisplay}
                      alt={formData.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    currentInitials
                  )}
                </div>

                {/* Upload Action Trigger Button on Avatar */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#F8FAFC' }}>
                    {formData.name}
                  </h2>
                  <span className="badge badge-analyzed" style={{ fontSize: '0.7rem' }}>
                    Verified Student
                  </span>
                </div>
                <p style={{ color: '#C084FC', fontWeight: 600, fontSize: '0.88rem', marginTop: '2px' }}>
                  {formData.target_role}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>
                  <Mail size={13} /> {formData.email}
                </div>
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '7px 14px', fontSize: '0.8rem' }}
              >
                <Camera size={14} /> {avatarDisplay ? 'Change Photo' : 'Upload Photo'}
              </button>

              {avatarDisplay && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleRemoveAvatar}
                  style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  title="Remove picture"
                >
                  <Trash2 size={14} /> Remove Photo
                </button>
              )}
            </div>
          </div>

          {/* Form Content: 2x2 Clean Grouped Sections */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {/* Card 1: Personal Information */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <div style={{ padding: '6px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px', color: '#818CF8' }}>
                    <User size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Personal Information</h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Identity & Contact Details</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Full Name *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    ) : (
                      <div style={{ fontSize: '0.88rem', color: '#FFFFFF', fontWeight: 600, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {formData.name}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Email Address *
                      </label>
                      <span style={{ fontSize: '0.7rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                        <Shield size={11} /> Authenticated Account
                      </span>
                    </div>
                    {isEditing ? (
                      <input
                        type="email"
                        className="form-input"
                        value={userProfile?.email || formData.email}
                        readOnly
                        disabled
                        style={{
                          backgroundColor: 'rgba(15, 23, 42, 0.65)',
                          color: 'var(--text-secondary)',
                          cursor: 'not-allowed',
                          borderColor: 'rgba(255, 255, 255, 0.08)',
                          opacity: 0.85
                        }}
                        title="Email is linked to your authenticated account and cannot be modified"
                      />
                    ) : (
                      <div style={{ fontSize: '0.88rem', color: '#FFFFFF', fontWeight: 600, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {userProfile?.email || formData.email}
                      </div>
                    )}
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Linked to your authenticated login account.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Education Details */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <div style={{ padding: '6px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '8px', color: '#38BDF8' }}>
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Education Details</h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Academic Background</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Education Level
                    </label>
                    {isEditing ? (
                      <select
                        className="form-input"
                        value={formData.education_level}
                        onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                      >
                        <option value="Undergraduate">Undergraduate</option>
                        <option value="Postgraduate">Postgraduate</option>
                        <option value="High School">High School</option>
                        <option value="Self-Taught">Self-Taught</option>
                      </select>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {formData.education_level}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Degree
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-input"
                        value={formData.degree}
                        onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                      />
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {formData.degree}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Branch / Specialization
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-input"
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      />
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {formData.branch}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Semester / Year
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-input"
                        value={formData.semester_year}
                        onChange={(e) => setFormData({ ...formData, semester_year: e.target.value })}
                      />
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {formData.semester_year}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Career Goals */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <div style={{ padding: '6px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px', color: '#C084FC' }}>
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Career Goals</h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target Role & Focus Areas</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Target Role *
                    </label>
                    {isEditing ? (
                      <select
                        className="form-input"
                        value={formData.target_role}
                        onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                      >
                        <option value="Full-Stack Developer">Full-Stack Developer</option>
                        <option value="Frontend Developer">Frontend Developer</option>
                        <option value="Backend Engineer">Backend Engineer</option>
                        <option value="AI / ML Engineer">AI / ML Engineer</option>
                        <option value="Data Scientist">Data Scientist</option>
                        <option value="DevOps / Cloud Engineer">DevOps / Cloud Engineer</option>
                        <option value="Mobile App Developer">Mobile App Developer</option>
                        <option value="Cybersecurity Analyst">Cybersecurity Analyst</option>
                      </select>
                    ) : (
                      <div style={{ fontSize: '0.88rem', color: '#C084FC', fontWeight: 700, padding: '8px 12px', background: 'rgba(168, 85, 247, 0.08)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        {formData.target_role}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Career Interests
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-input"
                        value={formData.career_interests}
                        onChange={(e) => setFormData({ ...formData, career_interests: e.target.value })}
                        placeholder="e.g. Web Development, AI, Cloud"
                      />
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 500, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {formData.career_interests}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 4: Learning Preferences */}
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <div style={{ padding: '6px', background: 'rgba(251, 146, 60, 0.15)', borderRadius: '8px', color: '#FB923C' }}>
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Learning Preferences</h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Daily Pace & Style</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Study Time Per Day
                    </label>
                    {isEditing ? (
                      <select
                        className="form-input"
                        value={formData.study_time_per_day}
                        onChange={(e) => setFormData({ ...formData, study_time_per_day: e.target.value })}
                      >
                        <option value="1-2 hours/day">1-2 hours/day</option>
                        <option value="2-4 hours/day">2-4 hours/day</option>
                        <option value="4-6 hours/day">4-6 hours/day</option>
                        <option value="6+ hours/day">6+ hours/day</option>
                      </select>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {formData.study_time_per_day}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Preferred Learning Style
                    </label>
                    {isEditing ? (
                      <select
                        className="form-input"
                        value={formData.preferred_learning_style}
                        onChange={(e) => setFormData({ ...formData, preferred_learning_style: e.target.value })}
                      >
                        <option value="Hands-on Projects">Hands-on Projects</option>
                        <option value="Video Tutorials">Video Tutorials</option>
                        <option value="Documentation / Reading">Documentation / Reading</option>
                        <option value="Interactive Challenges">Interactive Challenges</option>
                      </select>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {formData.preferred_learning_style}
                      </div>
                    )}
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Preferred Language
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="form-input"
                        value={formData.preferred_language}
                        onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                      />
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                        {formData.preferred_language}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save / Cancel Toolbar when in Edit Mode */}
            {isEditing && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 20px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                marginTop: '10px'
              }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCancel}
                  style={{ padding: '8px 18px' }}
                >
                  <X size={15} /> Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 22px' }}
                >
                  <Check size={15} /> Save Changes
                </button>
              </div>
            )}
          </form>
        </main>
      </div>
    </div>
  );
};

export default ProfilePage;
