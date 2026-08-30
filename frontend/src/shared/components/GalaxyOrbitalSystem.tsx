import React from 'react';

interface GalaxyOrbitalSystemProps {
  size?: 'default' | 'hero' | 'small';
  className?: string;
}

export const GalaxyOrbitalSystem: React.FC<GalaxyOrbitalSystemProps> = ({
  size = 'default',
  className = ''
}) => {
  const isHero = size === 'hero';
  const isSmall = size === 'small';

  const containerScaleClass = isHero
    ? 'galaxy-hero-scale'
    : isSmall
    ? 'galaxy-small-scale'
    : '';

  return (
    <div className={`galaxy-system-container ${containerScaleClass} ${className}`.trim()}>
      {/* Soft Radial Ambient Core Glow */}
      <div className={`galaxy-core-glow ${isHero ? 'galaxy-hero-glow' : ''}`} />

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
          <span
            style={{
              fontSize: isHero ? '2.8rem' : isSmall ? '1.5rem' : '2.35rem',
              fontWeight: 900,
              color: '#FFFFFF',
              textShadow: '0 0 18px rgba(255,255,255,0.95)'
            }}
          >
            S
          </span>
        </div>
      </div>
    </div>
  );
};

export default GalaxyOrbitalSystem;
