import { useEffect, useRef } from 'react';
import { getAudioAnalysisData } from '../services/audioAnalysis';
import './AudioReactiveVisualizer.css';

export interface AudioReactiveVisualizerProps {
  isPlaying: boolean;
  presentation?: 'main' | 'compact';
  className?: string;
}

interface OrbitParticle {
  angle: number;
  radiusRatio: number;
  speed: number;
  size: number;
  track: 0 | 1 | 2; // 0: bass, 1: mid, 2: treble
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  colorType: 0 | 1 | 2;
  active: boolean;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseColorToRgb(str: string, fallback: RGB): RGB {
  if (!str) return fallback;
  const s = str.trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }
  const rgbMatch = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }
  return fallback;
}

const DEFAULT_PINK: RGB = { r: 243, g: 184, b: 216 }; // #F3B8D8
const DEFAULT_LAVENDER: RGB = { r: 185, g: 169, b: 214 }; // #B9A9D6

/**
 * AudioReactiveVisualizer — Circular Spectrum: Radial frequency visualization with rotating elements.
 * Radiates audio-reactive frequency bars, rotating cybernetic arcs, undulating waveform rings,
 * orbital celestial particles, and bass stardust bursts from behind the album artwork.
 */
export function AudioReactiveVisualizer({
  isPlaying,
  presentation = 'main',
  className = '',
}: AudioReactiveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Use refs for animation loop state to avoid React re-renders during 60fps rAF ticks
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const presentationRef = useRef(presentation);
  useEffect(() => {
    presentationRef.current = presentation;
  }, [presentation]);

  const startLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number | null = null;
    let isHidden = typeof document !== 'undefined' ? document.hidden : false;

    // Prefers-reduced-motion detector
    const motionQuery =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    let reducedMotion = motionQuery ? motionQuery.matches : false;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };
    if (motionQuery?.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
    }

    // Dynamic rotation & phase accumulator states
    let rotation = 0;
    let pulsePhase = 0;
    let wavePhase = 0;

    // Pre-allocated frequency smoothing buffers (64 bins)
    const NUM_BINS = 64;
    const smoothedFreqs = new Float32Array(NUM_BINS);
    const innerWaveformFreqs = new Float32Array(NUM_BINS);

    // Pre-allocated orbital particles (24 items)
    const MAX_ORBITS = 24;
    const orbitParticles: OrbitParticle[] = [];
    for (let i = 0; i < MAX_ORBITS; i++) {
      const track = (i % 3) as 0 | 1 | 2;
      const radiusRatio = track === 0 ? 0.35 : track === 1 ? 0.72 : 1.12;
      const speed = (0.35 + Math.random() * 0.45) * (track === 1 ? -1 : 1);
      orbitParticles.push({
        angle: Math.random() * Math.PI * 2,
        radiusRatio,
        speed,
        size: track === 0 ? 2.4 : track === 1 ? 2.0 : 1.6,
        track,
      });
    }

    // Pre-allocated burst particle pool (48 items) for bass kicks & treble stardust motes
    const MAX_BURST_PARTICLES = 48;
    const burstParticles: BurstParticle[] = [];
    for (let i = 0; i < MAX_BURST_PARTICLES; i++) {
      burstParticles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1.5,
        life: 0,
        maxLife: 40,
        colorType: 0,
        active: false,
      });
    }

    // Cached theme colors
    let cachedPinkStr = '';
    let cachedLavenderStr = '';
    let cachedGlowAStr = '';
    let cachedGlowBStr = '';

    let colorPrimary = DEFAULT_PINK;
    let colorSecondary = DEFAULT_LAVENDER;
    let colorGlowA = DEFAULT_PINK;
    let colorGlowB = DEFAULT_LAVENDER;

    function updateThemeColors() {
      if (typeof window === 'undefined') return;
      const rootStyle = window.getComputedStyle(document.documentElement);

      const rawPink =
        rootStyle.getPropertyValue('--pink').trim() ||
        rootStyle.getPropertyValue('--accent-primary').trim() ||
        rootStyle.getPropertyValue('--theme-accent-primary').trim();
      const rawLavender =
        rootStyle.getPropertyValue('--lavender').trim() ||
        rootStyle.getPropertyValue('--accent-secondary').trim() ||
        rootStyle.getPropertyValue('--theme-accent-secondary').trim();
      const rawGlowA =
        rootStyle.getPropertyValue('--glow-a').trim() ||
        rootStyle.getPropertyValue('--theme-glow-a').trim();
      const rawGlowB =
        rootStyle.getPropertyValue('--glow-b').trim() ||
        rootStyle.getPropertyValue('--theme-glow-b').trim();

      if (rawPink !== cachedPinkStr) {
        cachedPinkStr = rawPink;
        colorPrimary = parseColorToRgb(rawPink, DEFAULT_PINK);
      }
      if (rawLavender !== cachedLavenderStr) {
        cachedLavenderStr = rawLavender;
        colorSecondary = parseColorToRgb(rawLavender, DEFAULT_LAVENDER);
      }
      if (rawGlowA !== cachedGlowAStr) {
        cachedGlowAStr = rawGlowA;
        colorGlowA = parseColorToRgb(rawGlowA, colorPrimary);
      }
      if (rawGlowB !== cachedGlowBStr) {
        cachedGlowBStr = rawGlowB;
        colorGlowB = parseColorToRgb(rawGlowB, colorSecondary);
      }
    }

    let lastTime = performance.now();
    let themeCheckCounter = 0;
    // Master opacity fade for smooth, non-abrupt visualizer fade-in and fade-out (>= 0.5s duration)
    let masterAlpha = isPlayingRef.current ? 1.0 : 0.0;

    function renderFrame(time: number) {
      if (!canvas || !ctx) return;

      // Check document visibility
      if (isHidden) {
        rafId = null;
        return;
      }

      const deltaTime = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Master fade-in and fade-out over ~620-740ms (at least 0.5s delay)
      const targetAlpha = isPlayingRef.current ? 1.0 : 0.0;
      const fadeSpeed = isPlayingRef.current ? 1.6 : 1.35;
      if (masterAlpha < targetAlpha) {
        masterAlpha = Math.min(1.0, masterAlpha + deltaTime * fadeSpeed);
      } else if (masterAlpha > targetAlpha) {
        masterAlpha = Math.max(0.0, masterAlpha - deltaTime * fadeSpeed);
      }

      // Query synchronous audio data (decays to 0 smoothly over 600-800ms upon pause)
      const audioData = getAudioAnalysisData(isPlayingRef.current);

      // If quiescent, paused, and fully faded out (masterAlpha === 0), settle canvas to clear and halt rAF loop
      if (audioData.isQuiescent && !isPlayingRef.current && masterAlpha <= 0.001) {
        masterAlpha = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rafId = null;
        return;
      }

      // Check theme colors periodically (every ~30 frames) to prevent forced layout reflow
      if (themeCheckCounter++ % 30 === 0) {
        updateThemeColors();
      }

      // High-DPI buffer scaling: Math.min(window.devicePixelRatio || 1, 2)
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();

      // Zero dimension bypass check
      if (rect.width <= 0 || rect.height <= 0) {
        rafId = requestAnimationFrame(renderFrame);
        return;
      }

      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const cssW = rect.width || canvas.width / dpr || 300;
      const cssH = rect.height || canvas.height / dpr || 300;
      const cx = cssW / 2;
      const cy = cssH / 2;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.globalAlpha = masterAlpha;

      const isMain = presentationRef.current === 'main';

      const { bass, mid, treble, rms, rawFrequencies } = audioData;

      // Smooth individual frequency bins with exponential decay (target 0 when paused)
      let sumFreq = 0;
      for (let i = 0; i < NUM_BINS; i++) {
        const rawVal =
          isPlayingRef.current && rawFrequencies
            ? rawFrequencies[Math.floor((i / NUM_BINS) * Math.min(rawFrequencies.length, 96))] || 0
            : 0;
        const target = rawVal / 255;
        smoothedFreqs[i] += (target - smoothedFreqs[i]) * 0.18;
        innerWaveformFreqs[i] += (target - innerWaveformFreqs[i]) * 0.10;
        sumFreq += smoothedFreqs[i];
      }
      const avg = sumFreq / NUM_BINS;

      // Update rotation & wave phases
      if (!reducedMotion) {
        rotation += deltaTime * (isMain ? 0.38 : 0.25) * (0.55 + avg * 1.45);
        pulsePhase += deltaTime * 2.8 * (1 + bass * 1.5);
        wavePhase += deltaTime * 2.2;
      }

      // Geometry calculations strictly bounded within canvas to prevent edge chopping
      const minDimension = Math.min(cx, cy);
      // 28px safety padding from canvas boundary so outer arcs, dots, and glows are NEVER cut off
      const maxSafeRadius = minDimension - 28;

      const baseArtworkRadius = isMain ? Math.max(65, minDimension - 175) : 34;
      const innerRadius = isMain ? baseArtworkRadius + 8 : 36;

      // Scale maxBarLength so innerRadius + maxBarLength * 1.25 + arcThickness stays within maxSafeRadius
      const availableRadius = Math.max(16, maxSafeRadius - innerRadius);
      const maxBarLength = isMain
        ? Math.min(availableRadius * 0.58, 54)
        : Math.min(availableRadius * 0.55, 14);

      const outerArcRadius = Math.min(maxSafeRadius - 16, innerRadius + maxBarLength * 1.05);

      // ── Layer 1: Multi-layered luminous radial bass halo ─────────────────────────────
      // Pulsing on low frequencies (20-250 Hz)
      if (reducedMotion) {
        // Reduced motion: Steady, serene luminous halo without strobing or oscillation
        const steadyRadius = Math.min(maxSafeRadius, baseArtworkRadius + (isMain ? 36 : 10) + rms * 12);
        const steadyGrad = ctx.createRadialGradient(cx, cy, baseArtworkRadius * 0.8, cx, cy, steadyRadius);
        steadyGrad.addColorStop(0, `rgba(${colorGlowA.r}, ${colorGlowA.g}, ${colorGlowA.b}, 0.35)`);
        steadyGrad.addColorStop(0.5, `rgba(${colorPrimary.r}, ${colorPrimary.g}, ${colorPrimary.b}, 0.2)`);
        steadyGrad.addColorStop(1, `rgba(${colorGlowB.r}, ${colorGlowB.g}, ${colorGlowB.b}, 0)`);

        ctx.fillStyle = steadyGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, steadyRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dynamic breathing atmospheric bass halo bounded inside maxSafeRadius
        const outerMaxRadius = Math.min(
          maxSafeRadius,
          baseArtworkRadius + (isMain ? 75 : 22) * (0.45 + bass * 0.55) + rms * 14,
        );
        const outerGrad = ctx.createRadialGradient(
          cx,
          cy,
          baseArtworkRadius * 0.82,
          cx,
          cy,
          outerMaxRadius,
        );
        const outerAlpha = Math.min(0.65, 0.15 + bass * 0.5);
        outerGrad.addColorStop(0, `rgba(${colorGlowA.r}, ${colorGlowA.g}, ${colorGlowA.b}, ${outerAlpha})`);
        outerGrad.addColorStop(0.45, `rgba(${colorPrimary.r}, ${colorPrimary.g}, ${colorPrimary.b}, ${outerAlpha * 0.5})`);
        outerGrad.addColorStop(0.85, `rgba(${colorGlowB.r}, ${colorGlowB.g}, ${colorGlowB.b}, ${outerAlpha * 0.2})`);
        outerGrad.addColorStop(1, `rgba(${colorGlowB.r}, ${colorGlowB.g}, ${colorGlowB.b}, 0)`);

        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, outerMaxRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner core halo right behind vinyl disc rim
        const coreHaloRadius = Math.min(
          maxSafeRadius - 10,
          baseArtworkRadius + (isMain ? 38 : 12) * (0.3 + bass * 0.7),
        );
        const innerGrad = ctx.createRadialGradient(
          cx,
          cy,
          baseArtworkRadius * 0.88,
          cx,
          cy,
          coreHaloRadius,
        );
        const innerAlpha = Math.min(0.8, 0.2 + bass * 0.6);
        innerGrad.addColorStop(0, `rgba(${colorPrimary.r}, ${colorPrimary.g}, ${colorPrimary.b}, ${innerAlpha})`);
        innerGrad.addColorStop(0.7, `rgba(${colorGlowA.r}, ${colorGlowA.g}, ${colorGlowA.b}, ${innerAlpha * 0.3})`);
        innerGrad.addColorStop(1, `rgba(${colorPrimary.r}, ${colorPrimary.g}, ${colorPrimary.b}, 0)`);

        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreHaloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Layer 2: Rotating Concentric Dashed Guide Rings ──────────────────────────────
      if (isMain && !reducedMotion) {
        const ringCount = 3;
        const baseAlpha = 0.08 + avg * 0.14;
        ctx.save();
        ctx.translate(cx, cy);

        for (let i = 0; i < ringCount; i++) {
          const fraction = (i + 1) / (ringCount + 1);
          const r = innerRadius + maxBarLength * fraction;
          const dashDir = i % 2 === 0 ? 1 : -1;

          ctx.save();
          ctx.rotate(rotation * 0.15 * dashDir);
          ctx['setLineDash'](i % 2 === 0 ? [3, 8] : [2, 12]);
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${colorSecondary.r}, ${colorSecondary.g}, ${colorSecondary.b}, ${baseAlpha * (1 - fraction * 0.3)})`;

          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx['setLineDash']([]);
        ctx.restore();
      }

      // ── Layer 3: Rotating Undulating Waveform Ribbon Ring (mid frequencies) ──────────
      if (mid > 0.02 || reducedMotion) {
        const points = isMain ? 48 : 24;
        ctx.save();
        ctx.translate(cx, cy);
        if (!reducedMotion) ctx.rotate(rotation * 0.25);

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const binIdx = Math.floor(((i % points) / points) * NUM_BINS);
          const val = smoothedFreqs[binIdx] || 0;
          const wave = reducedMotion ? 0 : Math.sin(angle * 6 + wavePhase) * (isMain ? 6 : 2) * mid;
          const r = Math.min(maxSafeRadius - 6, innerRadius + (isMain ? 10 : 3) + val * (isMain ? 18 : 5) + wave);

          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();

        const strokeAlpha = Math.min(0.65, 0.2 + mid * 0.65);
        ctx.strokeStyle = `rgba(${colorSecondary.r}, ${colorSecondary.g}, ${colorSecondary.b}, ${strokeAlpha})`;
        ctx.lineWidth = isMain ? 1.6 : 1.0;
        ctx.stroke();

        // Subtle glowing radial aura inside waveform
        const fillGrad = ctx.createRadialGradient(0, 0, innerRadius * 0.9, 0, 0, innerRadius + (isMain ? 24 : 8));
        fillGrad.addColorStop(0, `rgba(${colorPrimary.r}, ${colorPrimary.g}, ${colorPrimary.b}, 0)`);
        fillGrad.addColorStop(1, `rgba(${colorSecondary.r}, ${colorSecondary.g}, ${colorSecondary.b}, ${strokeAlpha * 0.15})`);
        ctx.fillStyle = fillGrad;
        ctx.fill();

        ctx.restore();
      }

      // ── Layer 4: Main Circular Spectrum Frequency Bars (Radial Equalizer) ────────────
      {
        const barCount = isMain ? 72 : 36;
        ctx.save();
        ctx.translate(cx, cy);
        if (!reducedMotion) ctx.rotate(rotation);

        ctx.lineCap = 'round';
        ctx.lineWidth = isMain ? 2.8 : 1.6;

        for (let i = 0; i < barCount; i++) {
          // Symmetrical / mirrored frequency spectrum mapping
          const half = barCount / 2;
          const mirrorIdx = i < half ? i : barCount - 1 - i;
          const binIdx = Math.floor((mirrorIdx / half) * (NUM_BINS - 1));
          const val = smoothedFreqs[binIdx] || 0;

          const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
          const maxAllowedBarLen = Math.max(4, maxSafeRadius - innerRadius - (isMain ? 8 : 4));
          const barLen = Math.min(maxAllowedBarLen, Math.max(3, val * maxBarLength * (0.75 + bass * 0.45)));

          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);

          const x1 = cosA * innerRadius;
          const y1 = sinA * innerRadius;
          const x2 = cosA * (innerRadius + barLen);
          const y2 = sinA * (innerRadius + barLen);

          // Linear gradient along bar from primary -> secondary -> glowB
          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          const alphaBase = Math.min(0.9, 0.45 + val * 0.5);
          grad.addColorStop(0, `rgba(${colorPrimary.r}, ${colorPrimary.g}, ${colorPrimary.b}, ${alphaBase})`);
          grad.addColorStop(0.55, `rgba(${colorSecondary.r}, ${colorSecondary.g}, ${colorSecondary.b}, ${alphaBase})`);
          grad.addColorStop(1, `rgba(${colorGlowB.r}, ${colorGlowB.g}, ${colorGlowB.b}, ${Math.min(1, alphaBase + 0.2)})`);

          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Luminous glowing peak dot on energetic bars
          if (val > 0.38) {
            const dotR = isMain ? 1.5 + val * 2.2 : 0.8 + val * 1.4;
            ctx.fillStyle = `rgba(${colorGlowB.r}, ${colorGlowB.g}, ${colorGlowB.b}, ${Math.min(1, 0.6 + val * 0.4)})`;
            ctx.beginPath();
            ctx.arc(x2, y2, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }

      // ── Layer 5: Outer Segmented Cybernetic Frequency Arcs ───────────────────────────
      {
        const arcCount = isMain ? 32 : 16;
        const arcGap = (Math.PI * 2) / arcCount;
        const arcSpan = arcGap * 0.68;

        ctx.save();
        ctx.translate(cx, cy);
        if (!reducedMotion) ctx.rotate(-rotation * 0.45); // Reverse counter-rotation

        for (let i = 0; i < arcCount; i++) {
          const binIdx = Math.floor((i / arcCount) * NUM_BINS);
          const val = smoothedFreqs[binIdx] || 0;
          const startAngle = i * arcGap;
          const endAngle = startAngle + arcSpan;
          const maxArcThick = isMain ? 10 : 3;
          const arcThickness = Math.min(
            Math.max(2, maxSafeRadius - outerArcRadius - 2),
            Math.max(2, val * maxArcThick + 2),
          );

          const grad = ctx.createLinearGradient(
            Math.cos(startAngle) * outerArcRadius,
            Math.sin(startAngle) * outerArcRadius,
            Math.cos(startAngle) * (outerArcRadius + arcThickness),
            Math.sin(startAngle) * (outerArcRadius + arcThickness),
          );
          const alpha = Math.min(0.7, 0.15 + val * 0.55);
          grad.addColorStop(0, `rgba(${colorSecondary.r}, ${colorSecondary.g}, ${colorSecondary.b}, ${alpha})`);
          grad.addColorStop(1, `rgba(${colorGlowA.r}, ${colorGlowA.g}, ${colorGlowA.b}, ${alpha * 0.4})`);

          ctx.beginPath();
          ctx.arc(0, 0, outerArcRadius + arcThickness, startAngle, endAngle);
          ctx.arc(0, 0, outerArcRadius, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.restore();
      }

      // ── Layer 6: Orbital Celestial Particles & Connecting Luminous Web ───────────────
      if (!reducedMotion) {
        const numParticles = isMain ? orbitParticles.length : Math.floor(orbitParticles.length / 2);

        ctx.save();
        ctx.translate(cx, cy);

        for (let i = 0; i < numParticles; i++) {
          const p = orbitParticles[i];
          p.angle += p.speed * deltaTime * (0.8 + avg * 1.2);

          const modEnergy = p.track === 0 ? bass : p.track === 1 ? mid : treble;
          const glowR = p.size * (isMain ? 2.5 : 1.8);
          const currentR = Math.min(
            maxSafeRadius - glowR - 2,
            innerRadius + maxBarLength * p.radiusRatio * (1 + modEnergy * 0.18),
          );

          const px = Math.cos(p.angle) * currentR;
          const py = Math.sin(p.angle) * currentR;

          const c = p.track === 0 ? colorPrimary : p.track === 1 ? colorSecondary : colorGlowB;
          const alpha = Math.min(0.9, 0.35 + modEnergy * 0.6);

          // Soft particle glow aura
          const grad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
          grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.7})`);
          grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, glowR, 0, Math.PI * 2);
          ctx.fill();

          // Particle core
          ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size * (0.8 + modEnergy * 0.4), 0, Math.PI * 2);
          ctx.fill();
        }

        // Connecting web lines between neighboring particles when intensity is high
        if (isMain && avg > 0.16) {
          const maxDist = 80;
          const webAlpha = Math.min(0.25, (avg - 0.16) * 0.6);

          for (let i = 0; i < numParticles; i++) {
            for (let j = i + 1; j < numParticles; j++) {
              const p1 = orbitParticles[i];
              const p2 = orbitParticles[j];
              if (p1.track !== p2.track) continue;

              const mod1 = p1.track === 0 ? bass : p1.track === 1 ? mid : treble;
              const r1 = Math.min(maxSafeRadius - 4, innerRadius + maxBarLength * p1.radiusRatio * (1 + mod1 * 0.18));
              const r2 = Math.min(maxSafeRadius - 4, innerRadius + maxBarLength * p2.radiusRatio * (1 + mod1 * 0.18));

              const x1 = Math.cos(p1.angle) * r1;
              const y1 = Math.sin(p1.angle) * r1;
              const x2 = Math.cos(p2.angle) * r2;
              const y2 = Math.sin(p2.angle) * r2;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < maxDist) {
                const lineAlpha = (1 - dist / maxDist) * webAlpha;
                ctx.strokeStyle = `rgba(${colorSecondary.r}, ${colorSecondary.g}, ${colorSecondary.b}, ${lineAlpha})`;
                ctx.lineWidth = 0.6;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
              }
            }
          }
        }

        ctx.restore();
      }

      // ── Layer 7: Stardust Motes & Bass Burst Sparkle Particles ───────────────────────
      if (!reducedMotion) {
        // Spawn burst on bass kicks
        if (bass > 0.62) {
          const spawnCount = isMain ? Math.min(4, Math.floor(bass * 5)) : 2;
          let spawned = 0;
          for (let i = 0; i < burstParticles.length && spawned < spawnCount; i++) {
            const p = burstParticles[i];
            if (!p.active) {
              const angle = Math.random() * Math.PI * 2;
              const speed = (isMain ? 55 : 25) * (0.7 + bass * 1.2) * (0.6 + Math.random() * 0.8);
              p.x = cx + Math.cos(angle) * (innerRadius + 4);
              p.y = cy + Math.sin(angle) * (innerRadius + 4);
              p.vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 12;
              p.vy = Math.sin(angle) * speed + (Math.random() - 0.5) * 12;
              p.size = isMain ? 1.4 + Math.random() * 2.2 : 0.8 + Math.random() * 1.2;
              p.life = 0;
              p.maxLife = 35 + Math.random() * 25;
              p.colorType = Math.random() > 0.6 ? 2 : Math.random() > 0.3 ? 1 : 0;
              p.active = true;
              spawned++;
            }
          }
        }

        // Spawn high-frequency treble transient motes
        if (treble > 0.08) {
          const toSpawnTreble = Math.min(2, Math.ceil(treble * 3));
          let spawnedTreble = 0;
          for (let i = 0; i < burstParticles.length && spawnedTreble < toSpawnTreble; i++) {
            const p = burstParticles[i];
            if (!p.active) {
              const angle = Math.random() * Math.PI * 2;
              const dist = innerRadius + Math.random() * 20;
              const speed = (isMain ? 35 : 15) * (0.8 + treble * 1.5);
              p.x = cx + Math.cos(angle) * dist;
              p.y = cy + Math.sin(angle) * dist;
              p.vx = Math.cos(angle) * speed + (Math.random() - 0.5) * 8;
              p.vy = Math.sin(angle) * speed + (Math.random() - 0.5) * 8;
              p.size = isMain ? 1.0 + Math.random() * 1.6 : 0.7 + Math.random() * 0.9;
              p.life = 0;
              p.maxLife = 25 + Math.random() * 20;
              p.colorType = 1;
              p.active = true;
              spawnedTreble++;
            }
          }
        }

        // Update and draw burst particles & stardust motes
        for (let i = 0; i < burstParticles.length; i++) {
          const p = burstParticles[i];
          if (!p.active) continue;

          p.x += p.vx * deltaTime;
          p.y += p.vy * deltaTime;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life++;

          const progress = p.life / p.maxLife;
          const distFromCenter = Math.hypot(p.x - cx, p.y - cy);
          if (progress >= 1 || distFromCenter > maxSafeRadius - 6) {
            p.active = false;
            continue;
          }

          const alpha = (1 - progress) * (p.colorType === 2 ? 0.95 : 0.75);
          if (alpha > 0.02) {
            const c = p.colorType === 0 ? colorPrimary : p.colorType === 1 ? colorSecondary : colorGlowB;
            ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();

      // Schedule next frame
      rafId = requestAnimationFrame(renderFrame);
    }

    function startLoop() {
      if (rafId === null && !isHidden) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(renderFrame);
      }
    }

    function stopLoop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    const handleVisibilityChange = () => {
      isHidden = document.hidden;
      if (isHidden) {
        stopLoop();
      } else {
        startLoop();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial theme color query and start loop
    updateThemeColors();
    startLoop();
    startLoopRef.current = startLoop;

    return () => {
      stopLoop();
      startLoopRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (motionQuery?.removeEventListener) {
        motionQuery.removeEventListener('change', handleMotionChange);
      }
    };
  }, []); // Run once on mount; loop continuously checks refs without React re-render churn

  // Trigger smooth loop wakeup when isPlaying changes (playing: fade-in, pausing: fade-out)
  useEffect(() => {
    startLoopRef.current?.();
    const event = new Event('visibilitychange');
    document.dispatchEvent(event);
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className={`audio-reactive-visualizer audio-reactive-visualizer--${presentation} ${className}`.trim()}
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

export default AudioReactiveVisualizer;
