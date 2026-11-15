/**
 * LUNA.FM — Theme Atmospheric Effects Layer (ThemeEffects)
 * 
 * Delivers 6 curated, performant atmospheric environmental treatments:
 * - Nocturne: Twinkling celestial star field, cosmic dust particles, subtle horizontal radio wave pulse ripple.
 * - Aqua: Buoyant rising micro-bubbles with horizontal wobble, seafoam motes drifting upwards, liquid lighting / caustic overlay.
 * - Afterglow: Warm vertical filament heat columns, slow ambient dust motes in warm projector light, amber edge vignette.
 * - Overdrive: CRT phosphor scanlines overlay, controlled glitch/flicker (2-frame shift), high-speed neon crimson cyber particles.
 * - Sakura: Drifting cherry blossom petals with natural rotation and swaying fall, luminous pink bloom.
 * - Monochrome: Minimal geometric precision grid (80px x 80px), corner registration marks/reticles, subtle grain.
 * 
 * Performance & Conservation Invariants:
 * - Non-interactive layer container: position: fixed; inset: 0; pointer-events: none; z-index: 0; contain: strict;
 * - Clamped devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2) to eliminate 4K GPU fillrate overhead.
 * - Visibility auto-pause: document.hidden cancels requestAnimationFrame immediately.
 * - prefers-reduced-motion: pauses high-frequency animation and CRT flicker, rendering serene static elements instead.
 * - Strict Web Audio isolation: strictly zero audio API calls, zero sound engine touch.
 * - Comprehensive lifecycle cleanup: cancels requestAnimationFrame, removes event listeners.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTheme } from './ThemeContext';
import type { ThemeId } from './types';
import './ThemeEffects.css';

interface StarParticle {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  speed: number;
  phase: number;
  color: string;
}

interface BubbleParticle {
  x: number;
  y: number;
  size: number;
  vy: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  phase: number;
  alpha: number;
  color: string;
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface CyberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  color: string;
  alpha: number;
}

interface PetalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  flipSpeed: number;
  phase: number;
  color: string;
  alpha: number;
}

export function ThemeEffects() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });
  const [isGlitching, setIsGlitching] = useState<boolean>(false);

  // Monitor prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMotionChange);
      return () => mediaQuery.removeEventListener('change', handleMotionChange);
    } else if (typeof (mediaQuery as any).addListener === 'function') {
      (mediaQuery as any).addListener(handleMotionChange);
      return () => (mediaQuery as any).removeListener(handleMotionChange);
    }
  }, []);

  // Overdrive controlled micro-glitch timer (2-frame shift every ~8 seconds)
  useEffect(() => {
    if (theme !== 'overdrive' || reducedMotion) {
      setIsGlitching(false);
      return;
    }

    let timeoutId: number | undefined;
    const triggerGlitch = () => {
      setIsGlitching(true);
      timeoutId = window.setTimeout(() => {
        setIsGlitching(false);
        scheduleNext();
      }, 50); // ~2 frames duration
    };

    let intervalId: number | undefined;
    const scheduleNext = () => {
      const delay = 6000 + Math.random() * 4000; // 6-10s
      intervalId = window.setTimeout(triggerGlitch, delay);
    };

    scheduleNext();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearTimeout(intervalId);
    };
  }, [theme, reducedMotion]);

  // Main Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // Clamped devicePixelRatio to prevent 4K GPU fillrate overhead
    const updateDimensions = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      if (width <= 0 || height <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    updateDimensions();

    // ── Theme-Specific Particle Generators ──────────────────────────────────
    // Nocturne particles
    const stars: StarParticle[] = [];
    const starColors = ['#F5F0F5', '#F3B8D8', '#B9A9D6'];
    for (let i = 0; i < 75; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.5 + Math.random() * 1.8,
        baseAlpha: 0.2 + Math.random() * 0.7,
        speed: 0.6 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      });
    }

    const cosmicDust: DustParticle[] = [];
    for (let i = 0; i < 25; i++) {
      cosmicDust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        size: 0.8 + Math.random() * 1.6,
        alpha: 0.15 + Math.random() * 0.35,
        color: Math.random() > 0.5 ? '#F3B8D8' : '#B9A9D6',
      });
    }

    // Aqua particles
    const bubbles: BubbleParticle[] = [];
    const seafoamMotes: DustParticle[] = [];
    for (let i = 0; i < 32; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1.5 + Math.random() * 4.5,
        vy: 0.4 + Math.random() * 0.9,
        wobbleSpeed: 0.8 + Math.random() * 1.5,
        wobbleAmp: 0.4 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.25 + Math.random() * 0.45,
        color: Math.random() > 0.3 ? '#22D3EE' : '#34D399',
      });
    }
    for (let i = 0; i < 20; i++) {
      seafoamMotes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.2 - Math.random() * 0.4,
        size: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.3,
        color: '#34D399',
      });
    }

    // Afterglow particles
    const filamentDust: DustParticle[] = [];
    const warmColors = ['#FEF3C7', '#F59E0B', '#D97706'];
    for (let i = 0; i < 35; i++) {
      filamentDust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        size: 1.0 + Math.random() * 2.2,
        alpha: 0.15 + Math.random() * 0.4,
        color: warmColors[Math.floor(Math.random() * warmColors.length)],
      });
    }

    // Overdrive cyber particles
    const cyberParticles: CyberParticle[] = [];
    for (let i = 0; i < 36; i++) {
      cyberParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 4.5 + Math.random() * 5.0,
        vy: 1.5 + Math.random() * 2.5,
        length: 8 + Math.random() * 22,
        color: Math.random() > 0.4 ? '#EF4444' : '#EC4899',
        alpha: 0.35 + Math.random() * 0.55,
      });
    }

    // Sakura petals
    const petals: PetalParticle[] = [];
    const petalColors = ['#FB7185', '#F472B6', '#FFF1F2'];
    for (let i = 0; i < 30; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0.5 + Math.random() * 0.6,
        vy: 0.7 + Math.random() * 0.9,
        size: 5 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.025,
        flipSpeed: 0.015 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        color: petalColors[Math.floor(Math.random() * petalColors.length)],
        alpha: 0.35 + Math.random() * 0.45,
      });
    }

    // ── Render Pass per Theme ───────────────────────────────────────────────
    const renderAtmosphere = (time: number, isStatic: boolean) => {
      // Validate canvas width/height dimensions before invoking render pass
      if (!canvas || width <= 0 || height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
        return;
      }

      ctx.clearRect(0, 0, width, height);

      switch (theme) {
        case 'nocturne': {
          // 1. Twinkling celestial star field
          for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            const currentAlpha = isStatic
              ? star.baseAlpha * 0.75
              : star.baseAlpha * (0.4 + 0.6 * Math.sin(time * 0.002 * star.speed + star.phase));

            ctx.fillStyle = star.color;
            ctx.globalAlpha = Math.max(0, Math.min(1, currentAlpha));
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();

            // Subtle cross diffraction spike for largest stars
            if (star.size > 1.6) {
              ctx.strokeStyle = star.color;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(star.x - star.size * 2, star.y);
              ctx.lineTo(star.x + star.size * 2, star.y);
              ctx.moveTo(star.x, star.y - star.size * 2);
              ctx.lineTo(star.x, star.y + star.size * 2);
              ctx.stroke();
            }
          }

          // 2. Cosmic dust motes
          for (let i = 0; i < cosmicDust.length; i++) {
            const dust = cosmicDust[i];
            if (!isStatic) {
              dust.x += dust.vx;
              dust.y += dust.vy;
              if (dust.x < 0) dust.x = width;
              if (dust.x > width) dust.x = 0;
              if (dust.y < 0) dust.y = height;
              if (dust.y > height) dust.y = 0;
            }

            ctx.fillStyle = dust.color;
            ctx.globalAlpha = dust.alpha;
            ctx.beginPath();
            ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3. Subtle horizontal radio wave pulse ripple
          if (!isStatic) {
            const originX = width * 0.5;
            const originY = height * 0.72;
            const maxRadius = Math.max(width, height) * 0.75;
            const wavePeriod = 6000;
            const progress = (time % wavePeriod) / wavePeriod;
            const currentRadius = progress * maxRadius;
            const waveAlpha = Math.max(0, (1 - progress) * 0.12);

            ctx.save();
            ctx.strokeStyle = '#F3B8D8';
            ctx.globalAlpha = waveAlpha;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(originX, originY, currentRadius, Math.PI, Math.PI * 2);
            ctx.stroke();

            // Second secondary faint wave
            const progress2 = ((time + 3000) % wavePeriod) / wavePeriod;
            const currentRadius2 = progress2 * maxRadius;
            const waveAlpha2 = Math.max(0, (1 - progress2) * 0.08);
            ctx.strokeStyle = '#B9A9D6';
            ctx.globalAlpha = waveAlpha2;
            ctx.beginPath();
            ctx.arc(originX, originY, currentRadius2, Math.PI, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
          break;
        }

        case 'aqua': {
          // 1. Liquid lighting / gentle caustic lighting overlay
          const causticGradient = ctx.createRadialGradient(
            width * 0.5 + (isStatic ? 0 : Math.sin(time * 0.0008) * 120),
            height * 0.35 + (isStatic ? 0 : Math.cos(time * 0.0006) * 60),
            20,
            width * 0.5,
            height * 0.4,
            Math.max(width, height) * 0.6
          );
          causticGradient.addColorStop(0, 'rgba(34, 211, 238, 0.06)');
          causticGradient.addColorStop(0.5, 'rgba(52, 211, 153, 0.03)');
          causticGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = causticGradient;
          ctx.globalAlpha = 1;
          ctx.fillRect(0, 0, width, height);

          // 2. Buoyant rising micro-bubbles with horizontal wobble
          for (let i = 0; i < bubbles.length; i++) {
            const b = bubbles[i];
            if (!isStatic) {
              b.y -= b.vy;
              b.x += Math.sin(time * 0.003 * b.wobbleSpeed + b.phase) * b.wobbleAmp;
              if (b.y < -20) {
                b.y = height + 20;
                b.x = Math.random() * width;
              }
            }

            ctx.save();
            ctx.strokeStyle = b.color;
            ctx.fillStyle = 'rgba(34, 211, 238, 0.06)';
            ctx.globalAlpha = b.alpha;
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Tiny specular highlight inside bubble
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = b.alpha * 0.8;
            ctx.beginPath();
            ctx.arc(b.x - b.size * 0.35, b.y - b.size * 0.35, Math.max(0.6, b.size * 0.25), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // 3. Seafoam motes drifting upwards
          for (let i = 0; i < seafoamMotes.length; i++) {
            const m = seafoamMotes[i];
            if (!isStatic) {
              m.y += m.vy;
              m.x += m.vx;
              if (m.y < -10) {
                m.y = height + 10;
                m.x = Math.random() * width;
              }
            }

            ctx.fillStyle = m.color;
            ctx.globalAlpha = m.alpha;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'afterglow': {
          // 1. Warm vertical filament heat columns
          const column1X = width * 0.32;
          const column2X = width * 0.68;
          const shimmer = isStatic ? 1 : 1 + Math.sin(time * 0.002) * 0.15;

          const drawFilamentColumn = (colX: number, baseW: number) => {
            const colWidth = baseW * shimmer;
            const grad = ctx.createLinearGradient(colX, height, colX, 0);
            grad.addColorStop(0, 'rgba(245, 158, 11, 0.08)');
            grad.addColorStop(0.4, 'rgba(217, 119, 6, 0.05)');
            grad.addColorStop(0.8, 'rgba(245, 158, 11, 0.02)');
            grad.addColorStop(1, 'transparent');

            ctx.fillStyle = grad;
            ctx.globalAlpha = 1;
            ctx.fillRect(colX - colWidth * 0.5, 0, colWidth, height);
          };

          drawFilamentColumn(column1X, 120);
          drawFilamentColumn(column2X, 120);

          // 2. Slow ambient dust motes in warm projector light
          for (let i = 0; i < filamentDust.length; i++) {
            const p = filamentDust[i];
            if (!isStatic) {
              p.x += p.vx;
              p.y += p.vy;
              if (p.x < 0) p.x = width;
              if (p.x > width) p.x = 0;
              if (p.y < 0) p.y = height;
              if (p.y > height) p.y = 0;
            }

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3. Amber edge vignette
          const vigGrad = ctx.createRadialGradient(
            width * 0.5,
            height * 0.5,
            Math.min(width, height) * 0.45,
            width * 0.5,
            height * 0.5,
            Math.max(width, height) * 0.72
          );
          vigGrad.addColorStop(0, 'transparent');
          vigGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.025)');
          vigGrad.addColorStop(1, 'rgba(217, 119, 6, 0.07)');
          ctx.fillStyle = vigGrad;
          ctx.globalAlpha = 1;
          ctx.fillRect(0, 0, width, height);
          break;
        }

        case 'overdrive': {
          // 1. High-speed neon crimson cyber particles
          for (let i = 0; i < cyberParticles.length; i++) {
            const cp = cyberParticles[i];
            if (!isStatic) {
              cp.x += cp.vx;
              cp.y += cp.vy;
              if (cp.x > width + 50 || cp.y > height + 50) {
                cp.x = Math.random() * width - 60;
                cp.y = -20;
              }
            }

            ctx.save();
            ctx.strokeStyle = cp.color;
            ctx.globalAlpha = cp.alpha;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cp.x, cp.y);
            ctx.lineTo(cp.x - cp.vx * 3.5, cp.y - cp.vy * 3.5);
            ctx.stroke();
            ctx.restore();
          }

          // 2. Controlled glitch / CRT scanline pulse
          if (!isStatic && !reducedMotion) {
            const scanlineGrad = ctx.createLinearGradient(0, (time * 0.08) % height, 0, ((time * 0.08) % height) + 120);
            scanlineGrad.addColorStop(0, 'transparent');
            scanlineGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.025)');
            scanlineGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = scanlineGrad;
            ctx.globalAlpha = 1;
            ctx.fillRect(0, 0, width, height);
          }
          break;
        }

        case 'sakura': {
          // 1. Luminous pink ambient bloom
          const bloomGrad = ctx.createRadialGradient(
            width * 0.75 + (isStatic ? 0 : Math.sin(time * 0.0007) * 80),
            height * 0.3 + (isStatic ? 0 : Math.cos(time * 0.0005) * 50),
            40,
            width * 0.75,
            height * 0.3,
            Math.max(width, height) * 0.55
          );
          bloomGrad.addColorStop(0, 'rgba(251, 113, 133, 0.06)');
          bloomGrad.addColorStop(0.6, 'rgba(244, 114, 182, 0.02)');
          bloomGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = bloomGrad;
          ctx.globalAlpha = 1;
          ctx.fillRect(0, 0, width, height);

          // 2. Drifting cherry blossom petals with natural rotation and swaying fall
          for (let i = 0; i < petals.length; i++) {
            const p = petals[i];
            if (!isStatic) {
              p.rotation += p.rotationSpeed;
              p.y += p.vy + Math.cos(time * 0.001 + p.phase) * 0.25;
              p.x += p.vx + Math.sin(time * 0.0014 + p.phase) * 0.45;

              if (p.y > height + 30) {
                p.y = -20;
                p.x = Math.random() * width - 40;
              }
              if (p.x > width + 30) {
                p.x = -20;
              }
            }

            const scaleX = isStatic ? 0.7 : Math.cos(time * p.flipSpeed + p.phase);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.scale(scaleX, 1);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;

            // Organic cherry petal teardrop path
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.5, p.size * 0.7, p.size * 0.6, 0, p.size);
            ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.6, -p.size * 0.8, -p.size * 0.5, 0, -p.size);
            ctx.fill();
            ctx.restore();
          }
          break;
        }

        case 'monochrome': {
          // 1. Minimal geometric precision grid (80px x 80px)
          const gridSize = 80;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
          ctx.lineWidth = 1;
          ctx.beginPath();

          for (let x = 0; x <= width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
          }
          for (let y = 0; y <= height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
          }
          ctx.stroke();

          // 2. Corner registration marks / reticles (+ crosshairs at 24px inset)
          const inset = 24;
          const reticleSize = 6;
          const reticles = [
            { x: inset, y: inset },
            { x: width - inset, y: inset },
            { x: inset, y: height - inset },
            { x: width - inset, y: height - inset },
          ];

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < reticles.length; i++) {
            const r = reticles[i];
            ctx.moveTo(r.x - reticleSize, r.y);
            ctx.lineTo(r.x + reticleSize, r.y);
            ctx.moveTo(r.x, r.y - reticleSize);
            ctx.lineTo(r.x, r.y + reticleSize);
          }
          ctx.stroke();

          // 3. Technical editorial annotations in corners
          ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText('[ 00 : 00 ]', inset + 12, inset + 4);
          ctx.fillText('LUNA // SYS.V2', width - inset - 84, inset + 4);
          ctx.fillText('REC ⬩ MONO', inset + 12, height - inset);
          ctx.fillText('GRID: 80PX', width - inset - 66, height - inset);
          break;
        }

        default:
          break;
      }
    };

    // ── Animation Loop Management ───────────────────────────────────────────
    let isRunning = true;

    const loop = (time: number) => {
      if (!isRunning) return;
      renderAtmosphere(time, false);
      rafIdRef.current = requestAnimationFrame(loop);
    };

    // If reduced motion is requested, render a single serene static frame and do not start rAF loop
    if (reducedMotion) {
      renderAtmosphere(0, true);
    } else {
      rafIdRef.current = requestAnimationFrame(loop);
    }

    // ── Event Handlers: Resize & Document Visibility ────────────────────────
    const handleResize = () => {
      updateDimensions();
      if (reducedMotion) {
        renderAtmosphere(0, true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Auto-pause animation frames when tab is hidden to conserve system resources
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      } else {
        // Resume animation loop when tab becomes visible if not in reduced motion mode
        if (!reducedMotion && !rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(loop);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      isRunning = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [theme, reducedMotion]);

  return (
    <div
      className="theme-effects"
      data-theme-effect={theme}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        contain: 'strict',
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="theme-effects__canvas" />
      {theme === 'overdrive' && (
        <div className={`theme-effects__scanlines ${isGlitching ? 'theme-effects__glitch' : ''}`} />
      )}
      {theme === 'afterglow' && <div className="theme-effects__vignette" />}
    </div>
  );
}

export default ThemeEffects;
