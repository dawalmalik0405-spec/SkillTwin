import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { apiClient } from '../../shared/apiClient';
import { UserProfile } from '../../shared/types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.login({ email: cleanEmail, password });
      if (res && res.user) {
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.signup({
        name: cleanName,
        email: cleanEmail,
        password
      });
      if (res && res.user) {
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9990,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel auth-modal-box"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '32px',
          position: 'relative',
          borderRadius: '20px',
          border: '1px solid rgba(168, 85, 247, 0.28)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px rgba(99, 102, 241, 0.2)',
          animation: 'modalFadeIn 0.25s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Close"
        >
          <X size={16} />
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)',
              marginBottom: '12px'
            }}
          >
            <span style={{ fontWeight: 900, fontSize: '1.4rem', color: '#FFFFFF' }}>S</span>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginTop: '4px' }}>
            {mode === 'login'
              ? 'Access your evidence-backed SkillTwin profile'
              : 'Start your evidence-based career development journey'}
          </p>
        </div>

        {/* Mode Switch Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(10, 15, 29, 0.8)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '22px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: mode === 'login' ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' : 'transparent',
              color: mode === 'login' ? '#FFFFFF' : 'var(--text-secondary)'
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: mode === 'signup' ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' : 'transparent',
              color: mode === 'signup' ? '#FFFFFF' : 'var(--text-secondary)'
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '18px',
              fontSize: '0.82rem',
              color: '#F87171'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">
                <Mail size={14} /> Email Address
              </label>
              <div className="input-container">
                <div className="input-icon">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  className="form-input has-icon"
                  placeholder="your.email@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">
                <Lock size={14} /> Password
              </label>
              <div className="input-container">
                <div className="input-icon">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input has-icon"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                width: '100%',
                marginTop: '22px',
                padding: '12px',
                fontSize: '0.92rem'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin" /> Signing In...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#A855F7',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Sign up here
              </button>
            </div>
          </form>
        ) : (
          /* Sign Up Form */
          <form onSubmit={handleSignUp}>
            <div className="form-group">
              <label className="form-label">
                <User size={14} /> Full Name
              </label>
              <div className="input-container">
                <div className="input-icon">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  className="form-input has-icon"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">
                <Mail size={14} /> Email Address
              </label>
              <div className="input-container">
                <div className="input-icon">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  className="form-input has-icon"
                  placeholder="your.name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">
                <Lock size={14} /> Password (min. 6 characters)
              </label>
              <div className="input-container">
                <div className="input-icon">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input has-icon"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">
                <CheckCircle2 size={14} /> Confirm Password
              </label>
              <div className="input-container">
                <div className="input-icon">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input has-icon"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '12px',
                fontSize: '0.92rem'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin" /> Creating Account...
                </>
              ) : (
                <>
                  Create Account & Continue <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#A855F7',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Log in
              </button>
            </div>
          </form>
        )}

        {/* Privacy Note */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '20px',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}
        >
          <Shield size={12} color="#10B981" />
          <span>Encrypted with SHA-256 PBKDF2. Private & secure.</span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
