import { useEffect, useRef, useCallback, useState } from 'react';
import { prefersReducedMotion } from '../utils/helpers';
import './Welcome.css';

interface WelcomeProps {
  onDone: () => void;
}

export default function Welcome({ onDone }: WelcomeProps) {
  const [visible, setVisible] = useState(false);
  const [bloomActive, setBloomActive] = useState(false);
  const [exiting, setExiting] = useState(false);

  const doneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    try {
      sessionStorage.setItem('luna-fm-welcomed-v3', '1');
      sessionStorage.setItem('luna-fm-welcomed-v2', '1');
      sessionStorage.setItem('luna-fm-welcomed', '1');
    } catch { /* ignore */ }
    onDone();
  }, [onDone]);

  const startExit = useCallback(() => {
    if (doneRef.current) return;
    setExiting(true);

    const fadeTime = prefersReducedMotion() ? 150 : 550;
    const t = setTimeout(finish, fadeTime);
    timersRef.current.push(t);
  }, [finish]);

  useEffect(() => {
    const reduced = prefersReducedMotion();

    if (reduced) {
      setVisible(true);
      setBloomActive(true);
    } else {
      // Small tick so browser paints initial scattered positions, then elements slide smoothly into place
      const t0 = setTimeout(() => {
        setVisible(true);
      }, 50);
      timersRef.current.push(t0);

      // Ambient bloom expands behind the card
      const t1 = setTimeout(() => {
        setBloomActive(true);
      }, 350);
      timersRef.current.push(t1);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  return (
    <div
      className={`welcome${exiting ? ' welcome--exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to LUNA.FM"
    >
      {/* Subtle night-listener orbital illustration background */}
      <div
        className={`welcome__illustration${visible ? ' welcome__illustration--visible' : ''}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="300" cy="300" r="230" stroke="var(--pink)" strokeWidth="1" strokeDasharray="6 8" opacity="0.22" />
          <circle cx="300" cy="300" r="160" stroke="var(--lavender)" strokeWidth="1" opacity="0.18" />
          <circle cx="300" cy="300" r="90" stroke="var(--pink)" strokeWidth="1.2" opacity="0.28" />
          {/* Radio wave arcs */}
          <path d="M 210 270 A 100 100 0 0 1 390 270" stroke="var(--pink)" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
          <path d="M 170 240 A 150 150 0 0 1 430 240" stroke="var(--lavender)" strokeWidth="1" strokeLinecap="round" opacity="0.22" />
          <path d="M 130 210 A 200 200 0 0 1 470 210" stroke="var(--pink)" strokeWidth="0.8" strokeLinecap="round" opacity="0.14" />
        </svg>
      </div>

      {/* Ambient bloom behind card */}
      <div
        className={`welcome__bloom${bloomActive ? ' welcome__bloom--animate' : ''}`}
        aria-hidden="true"
      />

      {/* Center hero card */}
      <div className={`welcome__card${visible ? ' welcome__card--visible' : ''}`}>
        {/* Floating celestial accents arriving from varied directions */}
        <span className="welcome__star welcome__star--top-left" aria-hidden="true">✦</span>
        <span className="welcome__moon welcome__moon--top-right" aria-hidden="true">☽</span>
        <span className="welcome__star welcome__star--mid-right" aria-hidden="true">✦</span>
        <span className="welcome__star welcome__star--bottom-right" aria-hidden="true">⋆</span>

        {/* Top header pill: slides in from top-left */}
        <div className="welcome__badge">
          <span lang="ja" className="welcome__badge-ja">夜の周波数</span>
          <span className="welcome__badge-sep">//</span>
          <span className="welcome__badge-brand">☾⋆⁺₊ LUNA.FM ⁺₊ · CH.01</span>
        </div>

        {/* Main Title: slides in from left, blinks into bright neon life */}
        <h1 className="welcome__title">
          My resonant<br />frequencies
        </h1>

        {/* Quote: slides in from top-right, blinks with electric lavender neon */}
        <p className="welcome__quote">
          &ldquo;Music is my soul.&rdquo;
        </p>

        {/* Description: slides in from bottom-left */}
        <p className="welcome__desc">
          A little collection of sounds that make me<br />feel something.
        </p>

        {/* Action Row: slides in from bottom-right; site proceeds ONLY upon clicking this button */}
        <div className="welcome__action-row">
          <button
            type="button"
            className="welcome__cta-btn"
            onClick={(e) => {
              e.stopPropagation();
              startExit();
            }}
            aria-label="Explore LUNA.FM"
          >
            <span className="welcome__cta-play" aria-hidden="true">▶</span>
            <span className="welcome__cta-text">
              EXPLORE <span className="welcome__cta-luna">LUNA</span>.FM
            </span>
          </button>

          <span className="welcome__telemetry">
            88.7 MHz · stereo archive
          </span>
        </div>
      </div>
    </div>
  );
}
