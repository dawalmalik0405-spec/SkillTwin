import React, { useEffect, useState } from 'react';

interface SkillTwinLoadingScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export const SkillTwinLoadingScreen: React.FC<SkillTwinLoadingScreenProps> = ({
  onFinish,
  durationMs = 2000
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [fadeOut, setFadeOut] = useState<boolean>(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setFadeOut(true);
        setTimeout(() => {
          if (onFinish) onFinish();
        }, 350); // allow fade transition
      }
    }, 25);

    return () => clearInterval(interval);
  }, [durationMs, onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#070B14',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.35s ease-out',
        pointerEvents: fadeOut ? 'none' : 'auto'
      }}
    >
      {/* Soft Ambient Core Glow */}
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(147, 51, 234, 0.15) 45%, transparent 70%)',
          filter: 'blur(36px)',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          textAlign: 'center',
          maxWidth: '360px',
          width: '90%'
        }}
      >
        {/* SkillTwin S Logo with Subtle Glow */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(124, 58, 237, 0.55), inset 0 0 10px rgba(255, 255, 255, 0.25)',
            border: '1px solid rgba(192, 132, 252, 0.4)',
            animation: 'pulseGlow 2s infinite ease-in-out'
          }}
        >
          <span
            style={{
              fontWeight: 900,
              fontSize: '1.85rem',
              color: '#FFFFFF',
              textShadow: '0 0 12px rgba(255, 255, 255, 0.8)'
            }}
          >
            S
          </span>
        </div>

        {/* Branding Typography */}
        <div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em'
            }}
          >
            SkillTwin
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginTop: '2px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            Evidence-Based Skill Development
          </div>
        </div>

        {/* Minimal Animated Progress Bar */}
        <div style={{ width: '100%', marginTop: '12px' }}>
          <div
            style={{
              height: '4px',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #6366F1 0%, #A855F7 50%, #38BDF8 100%)',
                borderRadius: '9999px',
                transition: 'width 0.04s linear',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.6)'
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '8px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)'
            }}
          >
            <span>Loading...</span>
            <span className="mono">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillTwinLoadingScreen;
