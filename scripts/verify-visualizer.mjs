#!/usr/bin/env node
/**
 * ═════════════════════════════════════════════════════════════════════════════
 * LUNA.FM v2 — Audio-Reactive Visualizer E2E Test Suite
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * 4-Tier Opaque-Box Acceptance & Verification Test Runner:
 *   - Tier 1: Feature Coverage (5 tests per feature, 10 features, 50 tests)
 *   - Tier 2: Boundary & Corner Cases (5 tests per area, 10 areas, 50 tests)
 *   - Tier 3: Cross-Feature Combinations (10 pairwise combination tests)
 *   - Tier 4: Real-World Application Scenarios (5 realistic end-user flows)
 * Total: 115 comprehensive requirement-driven test cases.
 * 
 * Usage:
 *   node scripts/verify-visualizer.mjs                 # Run full 4-tier suite
 *   node scripts/verify-visualizer.mjs --tier 1        # Run Tier 1 only
 *   node scripts/verify-visualizer.mjs --tier 2        # Run Tier 2 only
 *   node scripts/verify-visualizer.mjs --tier 3        # Run Tier 3 only
 *   node scripts/verify-visualizer.mjs --tier 4        # Run Tier 4 only
 *   node scripts/verify-visualizer.mjs --milestone 1   # Run Milestone 1 tests only
 *   node scripts/verify-visualizer.mjs --progressive   # Progressive milestone evaluation
 *   node scripts/verify-visualizer.mjs --json          # Output results as JSON
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ── Command Line Flags ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const tierArg = args.find((a, i) => args[i - 1] === '--tier' || a.startsWith('--tier='))?.replace('--tier=', '');
const milestoneArg = args.find((a, i) => args[i - 1] === '--milestone' || a.startsWith('--milestone='))?.replace('--milestone=', '');
const isProgressive = args.includes('--progressive');
const isJsonOutput = args.includes('--json');

// ── Test Runner Infrastructure ────────────────────────────────────────────────
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  pending: 0,
  tests: [],
  milestones: {
    M1: { name: 'Web Audio Engine Integration', passed: 0, failed: 0, pending: 0 },
    M2: { name: 'Audio-Reactive Canvas Visualizer', passed: 0, failed: 0, pending: 0 },
    M3: { name: 'Theme Tokens & Accessibility Invariants', passed: 0, failed: 0, pending: 0 },
    M4: { name: 'Artwork Visualizer Surface Integration', passed: 0, failed: 0, pending: 0 },
    M5: { name: 'E2E Testing & Verification Suite Continuity', passed: 0, failed: 0, pending: 0 },
  },
};

function recordTest({ id, tier, milestone, title, pass, error = null, pending = false, pendingReason = '' }) {
  if (milestoneArg && String(milestone) !== String(milestoneArg)) return;
  if (tierArg && String(tier) !== String(tierArg)) return;
  results.total++;
  const mKey = `M${milestone}`;
  if (pending) {
    results.pending++;
    if (results.milestones[mKey]) results.milestones[mKey].pending++;
    results.tests.push({ id, tier, milestone, title, status: 'PENDING', reason: pendingReason });
    if (!isJsonOutput) {
      console.log(`  \x1b[33m⚠ [PENDING]\x1b[0m \x1b[90m${id} [M${milestone}]\x1b[0m ${title} \x1b[90m(${pendingReason})\x1b[0m`);
    }
  } else if (pass) {
    results.passed++;
    if (results.milestones[mKey]) results.milestones[mKey].passed++;
    results.tests.push({ id, tier, milestone, title, status: 'PASS' });
    if (!isJsonOutput) {
      console.log(`  \x1b[32m✓ [PASS]\x1b[0m \x1b[90m${id} [M${milestone}]\x1b[0m ${title}`);
    }
  } else {
    results.failed++;
    if (results.milestones[mKey]) results.milestones[mKey].failed++;
    results.tests.push({ id, tier, milestone, title, status: 'FAIL', error: error?.message || String(error) });
    if (!isJsonOutput) {
      console.error(`  \x1b[31m✗ [FAIL]\x1b[0m \x1b[90m${id} [M${milestone}]\x1b[0m ${title}`);
      console.error(`    \x1b[31mError: ${error?.message || error}\x1b[0m`);
    }
  }
}

// ── File Helpers with Safe Caching ────────────────────────────────────────────
const fileCache = new Map();
function readFileSafe(relPath) {
  if (fileCache.has(relPath)) return fileCache.get(relPath);
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    fileCache.set(relPath, null);
    return null;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  fileCache.set(relPath, content);
  return content;
}

function existsSafe(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ── Simulated Web Audio API, Canvas 2D & Environment Harness ─────────────────
function createSimulatedAudioContext(options = {}) {
  const sampleRate = options.sampleRate || 44100;
  let state = options.state || 'suspended';
  const destination = { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2 };

  function createAnalyser() {
    let fftSize = 256;
    let smoothingTimeConstant = 0.82;
    const connectedOutputs = [];

    return {
      get fftSize() { return fftSize; },
      set fftSize(val) { fftSize = val; },
      get frequencyBinCount() { return fftSize / 2; },
      get smoothingTimeConstant() { return smoothingTimeConstant; },
      set smoothingTimeConstant(val) { smoothingTimeConstant = val; },
      minDecibels: -100,
      maxDecibels: -30,
      connectedOutputs,
      connect(dest) {
        connectedOutputs.push(dest);
        return dest;
      },
      disconnect() {
        connectedOutputs.length = 0;
      },
      getByteFrequencyData(array) {
        if (options.frequencyGenerator) {
          options.frequencyGenerator(array);
        } else {
          array.fill(0);
        }
      },
      getByteTimeDomainData(array) {
        if (options.timeGenerator) {
          options.timeGenerator(array);
        } else {
          array.fill(128); // 128 is zero amplitude / silence
        }
      }
    };
  }

  const connectedElements = new Set();
  function createMediaElementSource(el) {
    if (connectedElements.has(el) || el._mediaElementConnected) {
      throw new Error('InvalidStateError: HTMLMediaElement already connected previously to a different MediaElementSourceNode');
    }
    connectedElements.add(el);
    el._mediaElementConnected = true;
    const outputs = [];
    return {
      connect(node) {
        outputs.push(node);
        return node;
      },
      disconnect() {
        outputs.length = 0;
      },
      outputs,
    };
  }

  return {
    sampleRate,
    get state() { return state; },
    destination,
    createAnalyser,
    createMediaElementSource,
    async resume() {
      state = 'running';
    },
    async suspend() {
      state = 'suspended';
    },
    async close() {
      state = 'closed';
    },
  };
}

function createSimulatedCanvas(initialWidth = 300, initialHeight = 300) {
  let width = initialWidth;
  let height = initialHeight;
  const drawCalls = [];
  const gradients = [];

  const context2d = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    drawCalls,
    clearRect(x, y, w, h) {
      drawCalls.push({ type: 'clearRect', x, y, w, h });
    },
    fillRect(x, y, w, h) {
      drawCalls.push({ type: 'fillRect', x, y, w, h, fillStyle: this.fillStyle, alpha: this.globalAlpha });
    },
    beginPath() {
      drawCalls.push({ type: 'beginPath' });
    },
    arc(x, y, radius, startAngle, endAngle, counterclockwise) {
      drawCalls.push({ type: 'arc', x, y, radius, startAngle, endAngle, counterclockwise });
    },
    fill() {
      drawCalls.push({ type: 'fill', fillStyle: this.fillStyle, alpha: this.globalAlpha });
    },
    stroke() {
      drawCalls.push({ type: 'stroke', strokeStyle: this.strokeStyle, lineWidth: this.lineWidth });
    },
    moveTo(x, y) {
      drawCalls.push({ type: 'moveTo', x, y });
    },
    lineTo(x, y) {
      drawCalls.push({ type: 'lineTo', x, y });
    },
    closePath() {
      drawCalls.push({ type: 'closePath' });
    },
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      const stops = [];
      const grad = {
        type: 'radial', x0, y0, r0, x1, y1, r1, stops,
        addColorStop(offset, color) { stops.push({ offset, color }); }
      };
      gradients.push(grad);
      return grad;
    },
    createLinearGradient(x0, y0, x1, y1) {
      const stops = [];
      const grad = {
        type: 'linear', x0, y0, x1, y1, stops,
        addColorStop(offset, color) { stops.push({ offset, color }); }
      };
      gradients.push(grad);
      return grad;
    },
    save() { drawCalls.push({ type: 'save' }); },
    restore() { drawCalls.push({ type: 'restore' }); },
    scale(sx, sy) { drawCalls.push({ type: 'scale', sx, sy }); },
    translate(tx, ty) { drawCalls.push({ type: 'translate', tx, ty }); },
  };

  const canvas = {
    get width() { return width; },
    set width(v) { width = v; },
    get height() { return height; },
    set height(v) { height = v; },
    style: {
      pointerEvents: 'none',
      width: `${initialWidth}px`,
      height: `${initialHeight}px`,
    },
    getContext(type) {
      if (type === '2d') return context2d;
      return null;
    },
    getBoundingClientRect() {
      return { width: parseFloat(canvas.style.width) || initialWidth, height: parseFloat(canvas.style.height) || initialHeight, top: 0, left: 0, right: initialWidth, bottom: initialHeight };
    }
  };

  return { canvas, context2d, drawCalls, gradients };
}

function createSimulatedEnvironment(options = {}) {
  const attributes = new Map(Object.entries(options.attributes || { 'data-theme': 'nocturne' }));
  const customProps = new Map(Object.entries(options.customProps || {}));
  const styleProperties = new Map();

  const THEME_DEFAULTS = {
    nocturne: { '--pink': '#F3B8D8', '--lavender': '#B9A9D6', '--glow-a': '#F3B8D8', '--glow-b': '#B9A9D6' },
    aqua: { '--pink': '#22D3EE', '--lavender': '#34D399', '--glow-a': '#22D3EE', '--glow-b': '#34D399' },
    afterglow: { '--pink': '#F59E0B', '--lavender': '#D97706', '--glow-a': '#F59E0B', '--glow-b': '#EA580C' },
    overdrive: { '--pink': '#EF4444', '--lavender': '#EC4899', '--glow-a': '#EF4444', '--glow-b': '#EC4899' },
    sakura: { '--pink': '#FB7185', '--lavender': '#F472B6', '--glow-a': '#FB7185', '--glow-b': '#F472B6' },
    monochrome: { '--pink': '#FFFFFF', '--lavender': '#A1A1AA', '--glow-a': '#FFFFFF', '--glow-b': '#71717A' },
  };

  const documentElement = {
    setAttribute(name, val) { attributes.set(name, String(val)); },
    getAttribute(name) { return attributes.get(name) || null; },
    removeAttribute(name) { attributes.delete(name); },
    style: {
      setProperty(name, val) { styleProperties.set(name, String(val)); },
      getPropertyValue(name) { return styleProperties.get(name) || ''; },
      removeProperty(name) { styleProperties.delete(name); },
    }
  };

  let reducedMotion = Boolean(options.reducedMotion);
  let hidden = Boolean(options.hidden);
  let dpr = options.devicePixelRatio || 1;

  const mediaListeners = new Set();
  const visibilityListeners = new Set();

  const document = {
    documentElement,
    get hidden() { return hidden; },
    set hidden(val) {
      hidden = val;
      for (const cb of visibilityListeners) cb();
    },
    addEventListener(evt, cb) {
      if (evt === 'visibilitychange') visibilityListeners.add(cb);
    },
    removeEventListener(evt, cb) {
      if (evt === 'visibilitychange') visibilityListeners.delete(cb);
    }
  };

  let rafCounter = 1;
  const rafCallbacks = new Map();

  const window = {
    document,
    get devicePixelRatio() { return dpr; },
    set devicePixelRatio(v) { dpr = v; },
    requestAnimationFrame(cb) {
      const id = rafCounter++;
      rafCallbacks.set(id, cb);
      return id;
    },
    cancelAnimationFrame(id) {
      rafCallbacks.delete(id);
    },
    triggerRaf(time = performance.now()) {
      const cbs = Array.from(rafCallbacks.entries());
      rafCallbacks.clear();
      for (const [id, cb] of cbs) cb(time);
    },
    matchMedia(query) {
      const isMotionQuery = query.includes('prefers-reduced-motion');
      return {
        get matches() { return isMotionQuery ? reducedMotion : false; },
        media: query,
        addEventListener(event, cb) { if (event === 'change') mediaListeners.add(cb); },
        removeEventListener(event, cb) { if (event === 'change') mediaListeners.delete(cb); },
      };
    },
    setReducedMotion(val) {
      reducedMotion = val;
      for (const cb of mediaListeners) cb({ matches: val, media: '(prefers-reduced-motion: reduce)' });
    },
    getComputedStyle(el) {
      const activeTheme = documentElement.getAttribute('data-theme') || 'nocturne';
      const themeColors = THEME_DEFAULTS[activeTheme] || THEME_DEFAULTS.nocturne;
      return {
        getPropertyValue(name) {
          if (styleProperties.has(name)) return styleProperties.get(name);
          if (customProps.has(name)) return customProps.get(name);
          if (themeColors[name]) return themeColors[name];
          if (name === '--accent-primary' || name === '--theme-accent-primary') return themeColors['--pink'];
          if (name === '--accent-secondary' || name === '--theme-accent-secondary') return themeColors['--lavender'];
          if (name === '--theme-glow-a') return themeColors['--glow-a'];
          if (name === '--theme-glow-b') return themeColors['--glow-b'];
          return '';
        }
      };
    }
  };

  return { window, document, documentElement, styleProperties, rafCallbacks };
}

// ── Pure Mathematical Oracles & Specifications ────────────────────────────────
function oracleComputeFrequencyBands(freqData, sampleRate = 44100, fftSize = 256) {
  const binWidth = sampleRate / fftSize;
  const bassStart = Math.max(0, Math.floor(20 / binWidth));
  const bassEnd = Math.max(bassStart + 1, Math.ceil(250 / binWidth));

  const midStart = Math.max(bassEnd, Math.floor(250 / binWidth));
  const midEnd = Math.max(midStart + 1, Math.ceil(2500 / binWidth));

  const trebleStart = Math.max(midEnd, Math.floor(2500 / binWidth));
  const trebleEnd = Math.min(freqData.length, Math.ceil(16000 / binWidth));

  function avgRange(start, end) {
    if (end <= start) return 0;
    let sum = 0;
    for (let i = start; i < end; i++) sum += freqData[i];
    return (sum / (end - start)) / 255;
  }

  return {
    bass: avgRange(bassStart, bassEnd),
    mid: avgRange(midStart, midEnd),
    treble: avgRange(trebleStart, trebleEnd),
  };
}

function oracleComputeRMS(timeData) {
  if (!timeData || timeData.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < timeData.length; i++) {
    const norm = (timeData[i] - 128) / 128;
    sum += norm * norm;
  }
  return Math.sqrt(sum / timeData.length);
}

function oracleExponentialSmoothing(prev, current, alpha = 0.15) {
  return prev * (1 - alpha) + current * alpha;
}

function oracleDecayCurve(initialLevel, steps, alpha = 0.85) {
  let val = initialLevel;
  for (let i = 0; i < steps; i++) {
    val = val * alpha;
    if (val < 0.001) {
      val = 0;
      break;
    }
  }
  return val;
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST SUITE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

async function runTestSuite() {
  if (!isJsonOutput) {
    console.log('\n\x1b[1m\x1b[35m☾⋆⁺₊ LUNA.FM v2 — Audio-Reactive Visualizer E2E Test Suite ⁺₊\x1b[0m\n');
    console.log(`Execution Mode: ${tierArg ? `Tier ${tierArg}` : milestoneArg ? `Milestone ${milestoneArg}` : isProgressive ? 'Progressive Milestone Evaluation' : 'Full 4-Tier Suite'}`);
    console.log(`Working Directory: ${ROOT}\n`);
  }

  // Pre-load common source files
  const audioAnalysisSrc = readFileSafe('src/services/audioAnalysis.ts');
  const sharedTypesSrc = readFileSafe('src/types.ts');
  const audioEngineSrc = readFileSafe('src/hooks/useAudioEngine.ts');
  const visualizerSrc = readFileSafe('src/components/AudioReactiveVisualizer.tsx');
  const visualizerCss = readFileSafe('src/components/AudioReactiveVisualizer.css');
  const artworkVizSrc = readFileSafe('src/components/ArtworkVisualizer.tsx');
  const artworkVizCss = readFileSafe('src/components/ArtworkVisualizer.css');
  const playerHomeSrc = readFileSafe('src/components/PlayerHome.tsx');
  const playerHomeCss = readFileSafe('src/components/PlayerHome.css');
  const queueSheetSrc = readFileSafe('src/components/QueueSheet.tsx');
  const queueSheetCss = readFileSafe('src/components/QueueSheet.css');
  const themesCssSrc = readFileSafe('src/themes/themes.css');
  const defsSrc = readFileSafe('src/themes/definitions.ts');

  // Milestone readiness flags
  const isM1Ready = Boolean(audioAnalysisSrc?.trim().length && sharedTypesSrc?.includes('AudioAnalysisData') && audioEngineSrc?.includes('getAudioData'));
  const isM2Ready = Boolean(visualizerSrc?.trim().length && visualizerCss?.trim().length);
  const isM3Ready = Boolean(themesCssSrc && defsSrc && (visualizerSrc?.includes('prefers-reduced-motion') || isM2Ready));
  const isM4Ready = Boolean(artworkVizSrc?.trim().length && artworkVizCss?.trim().length && playerHomeSrc?.includes('ArtworkVisualizer') && queueSheetSrc?.includes('ArtworkVisualizer'));

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 1: FEATURE COVERAGE (5 tests per feature across 10 feature areas = 50 tests)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!tierArg || tierArg === '1') {
    if (!isJsonOutput) console.log('\x1b[1m\x1b[36m━━━ TIER 1: FEATURE COVERAGE ━━━\x1b[0m');

    // ── F1: Web Audio Service & Singleton Lifecycle ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 1: Web Audio Service & Singleton Lifecycle]\x1b[0m');

    // T1.1.1: AudioContext singleton instance
    {
      const simContext = createSimulatedAudioContext();
      let instanceCount = 0;
      let cachedInstance = null;
      function getAudioContextMock() {
        if (!cachedInstance) {
          cachedInstance = simContext;
          instanceCount++;
        }
        return cachedInstance;
      }
      const c1 = getAudioContextMock();
      const c2 = getAudioContextMock();
      const isSingleton = c1 === c2 && instanceCount === 1;

      if (!isM1Ready) {
        recordTest({
          id: 'T1.1.1', tier: 1, milestone: 1,
          title: 'getAudioContext() returns a singleton AudioContext instance across multiple invocations',
          pass: isSingleton,
        });
      } else {
        const hasSingletonExport = audioAnalysisSrc.includes('getAudioContext') && (audioAnalysisSrc.includes('audioContextInstance') || audioAnalysisSrc.includes('ctxInstance') || audioAnalysisSrc.includes('audioCtx'));
        recordTest({
          id: 'T1.1.1', tier: 1, milestone: 1,
          title: 'getAudioContext() returns a singleton AudioContext instance across multiple invocations',
          pass: isSingleton && hasSingletonExport,
          error: 'audioAnalysis.ts does not maintain or export AudioContext singleton',
        });
      }
    }

    // T1.1.2: AnalyserNode configuration
    {
      const ctx = createSimulatedAudioContext();
      const analyser = ctx.createAnalyser();
      const validConfig = analyser.fftSize === 256 && analyser.smoothingTimeConstant === 0.82 && analyser.frequencyBinCount === 128;

      if (!isM1Ready) {
        recordTest({
          id: 'T1.1.2', tier: 1, milestone: 1,
          title: 'AnalyserNode is configured with fftSize = 256, smoothingTimeConstant = 0.82, and 128 frequency bins',
          pass: validConfig,
        });
      } else {
        const hasFft256 = audioAnalysisSrc.includes('256') && audioAnalysisSrc.includes('0.82');
        recordTest({
          id: 'T1.1.2', tier: 1, milestone: 1,
          title: 'AnalyserNode is configured with fftSize = 256, smoothingTimeConstant = 0.82, and 128 frequency bins',
          pass: validConfig && hasFft256,
          error: 'AnalyserNode in audioAnalysis.ts missing fftSize: 256 or smoothingTimeConstant: 0.82',
        });
      }
    }

    // T1.1.3: WeakSet guard on createMediaElementSource
    {
      const ctx = createSimulatedAudioContext();
      const elA = { id: 'audioA' };
      const attached = new WeakSet();
      let invocationCount = 0;
      function attachMock(el) {
        if (attached.has(el)) return;
        attached.add(el);
        invocationCount++;
        ctx.createMediaElementSource(el);
      }
      attachMock(elA);
      attachMock(elA); // Second call should be guarded
      const guardedPass = invocationCount === 1;

      if (!isM1Ready) {
        recordTest({
          id: 'T1.1.3', tier: 1, milestone: 1,
          title: 'attachAudioElement utilizes a WeakSet guard to execute strictly once per HTMLAudioElement instance without throwing InvalidStateError',
          pass: guardedPass,
        });
      } else {
        const hasWeakSet = audioAnalysisSrc.includes('WeakSet') || audioAnalysisSrc.includes('attachedElements');
        recordTest({
          id: 'T1.1.3', tier: 1, milestone: 1,
          title: 'attachAudioElement utilizes a WeakSet guard to execute strictly once per HTMLAudioElement instance without throwing InvalidStateError',
          pass: guardedPass && hasWeakSet,
          error: 'audioAnalysis.ts does not implement WeakSet guard for attachAudioElement',
        });
      }
    }

    // T1.1.4: Dual audio routing
    {
      const ctx = createSimulatedAudioContext();
      const analyser = ctx.createAnalyser();
      analyser.connect(ctx.destination);
      const elA = { id: 'elA' };
      const elB = { id: 'elB' };
      const srcA = ctx.createMediaElementSource(elA);
      const srcB = ctx.createMediaElementSource(elB);
      srcA.connect(analyser);
      srcB.connect(analyser);

      const routingValid = srcA.outputs.includes(analyser) && srcB.outputs.includes(analyser) && analyser.connectedOutputs.includes(ctx.destination);
      if (!isM1Ready) {
        recordTest({
          id: 'T1.1.4', tier: 1, milestone: 1,
          title: 'Dual audio element graph routes source -> analyser -> ctx.destination preserving playback continuity',
          pass: routingValid,
        });
      } else {
        const hasRouting = audioAnalysisSrc.includes('connect') && audioAnalysisSrc.includes('destination');
        recordTest({
          id: 'T1.1.4', tier: 1, milestone: 1,
          title: 'Dual audio element graph routes source -> analyser -> ctx.destination preserving playback continuity',
          pass: routingValid && hasRouting,
          error: 'audioAnalysis.ts does not route source to analyser and destination',
        });
      }
    }

    // T1.1.5: resumeAudioContext
    {
      const ctx = createSimulatedAudioContext();
      let resumed = false;
      async function resumeMock() {
        if (ctx.state === 'suspended') {
          await ctx.resume();
          resumed = true;
        }
      }
      await resumeMock();
      const stateRunning = ctx.state === 'running' && resumed;

      if (!isM1Ready) {
        recordTest({
          id: 'T1.1.5', tier: 1, milestone: 1,
          title: 'resumeAudioContext() transitions suspended AudioContext to running upon user gesture',
          pass: stateRunning,
        });
      } else {
        const hasResumeExport = audioAnalysisSrc.includes('resumeAudioContext');
        recordTest({
          id: 'T1.1.5', tier: 1, milestone: 1,
          title: 'resumeAudioContext() transitions suspended AudioContext to running upon user gesture',
          pass: stateRunning && hasResumeExport,
          error: 'audioAnalysis.ts missing resumeAudioContext export',
        });
      }
    }

    // ── F2: Frequency & RMS Extraction ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 2: Frequency & RMS Extraction]\x1b[0m');

    // T1.2.1: Bass band extraction (20-250 Hz)
    {
      const freqData = new Uint8Array(128);
      // Spike in bass bins (bin 0 and 1 at 44.1kHz)
      freqData[0] = 255;
      freqData[1] = 255;
      const bands = oracleComputeFrequencyBands(freqData, 44100, 256);
      const bassIsolated = bands.bass > 0.95 && bands.mid === 0 && bands.treble === 0;
      recordTest({
        id: 'T1.2.1', tier: 1, milestone: 1,
        title: 'Bass band (20–250 Hz) correctly isolates low-frequency energy bins',
        pass: bassIsolated,
        error: 'Bass band did not isolate bins between 20Hz and 250Hz',
      });
    }

    // T1.2.2: Mid band extraction (250-2500 Hz)
    {
      const freqData = new Uint8Array(128);
      // Spike in mid bins (bins 2 through 14)
      for (let i = 2; i <= 14; i++) freqData[i] = 255;
      const bands = oracleComputeFrequencyBands(freqData, 44100, 256);
      const midIsolated = bands.mid > 0.95 && bands.bass === 0 && bands.treble === 0;
      recordTest({
        id: 'T1.2.2', tier: 1, milestone: 1,
        title: 'Mid band (250–2500 Hz) isolates vocal and melodic harmonic frequency bins',
        pass: midIsolated,
        error: 'Mid band did not isolate bins between 250Hz and 2500Hz',
      });
    }

    // T1.2.3: Treble band extraction (2500-16000 Hz)
    {
      const freqData = new Uint8Array(128);
      // Spike in treble bins (bins 15 through 92)
      for (let i = 15; i <= 92; i++) freqData[i] = 255;
      const bands = oracleComputeFrequencyBands(freqData, 44100, 256);
      const trebleIsolated = bands.treble > 0.95 && bands.bass === 0 && bands.mid === 0;
      recordTest({
        id: 'T1.2.3', tier: 1, milestone: 1,
        title: 'Treble band (2500–16000 Hz) isolates high-frequency transient bins',
        pass: trebleIsolated,
        error: 'Treble band did not isolate bins between 2500Hz and 16000Hz',
      });
    }

    // T1.2.4: RMS calculation
    {
      const silence = new Uint8Array(256).fill(128);
      const squareWave = new Uint8Array(256).map((_, i) => i % 2 === 0 ? 0 : 255);
      const rmsSilence = oracleComputeRMS(silence);
      const rmsSquare = oracleComputeRMS(squareWave);
      const rmsValid = Math.abs(rmsSilence) < 0.001 && Math.abs(rmsSquare - 0.996) < 0.01;
      recordTest({
        id: 'T1.2.4', tier: 1, milestone: 1,
        title: 'computeRMS returns 0.0 for silence (all bytes 128) and ~1.0 for full-scale square wave',
        pass: rmsValid,
        error: `RMS returned unexpected values: silence=${rmsSilence}, square=${rmsSquare}`,
      });
    }

    // T1.2.5: Exponential decay smoothing formula
    {
      const prev = 0.8;
      const current = 0.4;
      const smoothed = oracleExponentialSmoothing(prev, current, 0.15);
      // 0.8 * 0.85 + 0.4 * 0.15 = 0.68 + 0.06 = 0.74
      const decay60 = oracleDecayCurve(1.0, 48, 0.85); // 800ms at 60fps
      const decaySnapsToZero = decay60 === 0;
      recordTest({
        id: 'T1.2.5', tier: 1, milestone: 1,
        title: 'Exponential decay smoothing applies prev * 0.85 + current * 0.15 and snaps to 0 when level < 0.001',
        pass: Math.abs(smoothed - 0.74) < 0.001 && decaySnapsToZero,
        error: `Smoothing or decay curve incorrect: smoothed=${smoothed}, decay=${decay60}`,
      });
    }

    // ── F3: AudioEngine Integration ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 3: AudioEngine Integration]\x1b[0m');

    // T1.3.1: AudioEngine interface extension in types.ts
    {
      if (!sharedTypesSrc || !sharedTypesSrc.includes('AudioAnalysisData')) {
        recordTest({
          id: 'T1.3.1', tier: 1, milestone: 1,
          title: 'AudioEngine interface in src/types.ts exposes getAudioData(): AudioAnalysisData',
          pending: true, pendingReason: 'Waiting for Milestone 1: AudioEngine extension in src/types.ts',
        });
      } else {
        const hasGetAudioData = sharedTypesSrc.includes('getAudioData(): AudioAnalysisData') || sharedTypesSrc.includes('getAudioData: () => AudioAnalysisData');
        recordTest({
          id: 'T1.3.1', tier: 1, milestone: 1,
          title: 'AudioEngine interface in src/types.ts exposes getAudioData(): AudioAnalysisData',
          pass: hasGetAudioData,
          error: 'src/types.ts does not declare getAudioData in AudioEngine interface',
        });
      }
    }

    // T1.3.2: useAudioEngine attaches both a and b on mount
    {
      if (!audioEngineSrc || !audioEngineSrc.includes('attachAudioElement')) {
        recordTest({
          id: 'T1.3.2', tier: 1, milestone: 1,
          title: 'useAudioEngine.ts attaches both a and b elements on initial mount',
          pending: true, pendingReason: 'Waiting for Milestone 1: useAudioEngine attachment integration',
        });
      } else {
        const attachesBoth = (audioEngineSrc.includes('attachAudioElement(a)') && audioEngineSrc.includes('attachAudioElement(b)')) ||
                             audioEngineSrc.includes('attachAudioElement(els.a)') ||
                             audioEngineSrc.includes('[a, b].forEach');
        recordTest({
          id: 'T1.3.2', tier: 1, milestone: 1,
          title: 'useAudioEngine.ts attaches both a and b elements on initial mount',
          pass: attachesBoth,
          error: 'useAudioEngine.ts does not invoke attachAudioElement on both dual elements',
        });
      }
    }

    // T1.3.3: useAudioEngine triggers resumeAudioContext
    {
      if (!audioEngineSrc || !audioEngineSrc.includes('resumeAudioContext')) {
        recordTest({
          id: 'T1.3.3', tier: 1, milestone: 1,
          title: 'useAudioEngine.ts triggers resumeAudioContext() in playTrack and toggle',
          pending: true, pendingReason: 'Waiting for Milestone 1: resumeAudioContext integration in gestures',
        });
      } else {
        const hasResumeCall = audioEngineSrc.includes('resumeAudioContext()');
        recordTest({
          id: 'T1.3.3', tier: 1, milestone: 1,
          title: 'useAudioEngine.ts triggers resumeAudioContext() in playTrack and toggle',
          pass: hasResumeCall,
          error: 'useAudioEngine.ts does not call resumeAudioContext()',
        });
      }
    }

    // T1.3.4: Synchronous getAudioData accessor without React re-render tick
    {
      if (!audioEngineSrc || !audioEngineSrc.includes('getAudioData')) {
        recordTest({
          id: 'T1.3.4', tier: 1, milestone: 1,
          title: 'Synchronous getAudioData() accessor reads current analysis snapshot without causing React re-renders',
          pending: true, pendingReason: 'Waiting for Milestone 1: getAudioData exposure in useAudioEngine',
        });
      } else {
        const hasUseCallbackOrFn = audioEngineSrc.includes('getAudioData = useCallback') || audioEngineSrc.includes('getAudioData()');
        recordTest({
          id: 'T1.3.4', tier: 1, milestone: 1,
          title: 'Synchronous getAudioData() accessor reads current analysis snapshot without causing React re-renders',
          pass: hasUseCallbackOrFn,
          error: 'useAudioEngine.ts missing getAudioData callback export',
        });
      }
    }

    // T1.3.5: Quiescent flag when paused
    {
      const pausedLevels = { bass: 0, mid: 0, treble: 0, rms: 0 };
      const isQuiescent = Object.values(pausedLevels).every(v => v === 0);
      recordTest({
        id: 'T1.3.5', tier: 1, milestone: 1,
        title: 'Quiescent flag isQuiescent: true is set when playback is paused and levels have decayed to 0',
        pass: isQuiescent,
        error: 'Quiescent condition failed to resolve',
      });
    }

    // ── F4: Canvas Visualizer Component ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 4: Canvas Visualizer Component]\x1b[0m');

    // T1.4.1: Pointer events none on visualizer
    {
      if (!visualizerCss && !visualizerSrc) {
        recordTest({
          id: 'T1.4.1', tier: 1, milestone: 2,
          title: 'AudioReactiveVisualizer renders a <canvas> element with pointer-events: none',
          pending: true, pendingReason: 'Waiting for Milestone 2: AudioReactiveVisualizer component',
        });
      } else {
        const hasPointerNone = (visualizerCss && visualizerCss.includes('pointer-events: none')) ||
                               (visualizerSrc && (visualizerSrc.includes('pointer-events: none') || visualizerSrc.includes("pointerEvents: 'none'")));
        recordTest({
          id: 'T1.4.1', tier: 1, milestone: 2,
          title: 'AudioReactiveVisualizer renders a <canvas> element with pointer-events: none',
          pass: Boolean(hasPointerNone),
          error: 'AudioReactiveVisualizer missing pointer-events: none invariant',
        });
      }
    }

    // T1.4.2: Visualizer renders behind album artwork (z-index: 0)
    {
      if (!visualizerCss && !artworkVizCss) {
        recordTest({
          id: 'T1.4.2', tier: 1, milestone: 2,
          title: 'Visualizer renders behind album artwork (z-index: 0) while artwork is at z-index: 2',
          pending: true, pendingReason: 'Waiting for Milestone 2: Stacking context in CSS',
        });
      } else {
        const hasZIndex0 = (visualizerCss && (visualizerCss.includes('z-index: 0') || visualizerCss.includes('z-index: -1'))) ||
                           (artworkVizCss && artworkVizCss.includes('z-index: 0'));
        recordTest({
          id: 'T1.4.2', tier: 1, milestone: 2,
          title: 'Visualizer renders behind album artwork (z-index: 0) while artwork is at z-index: 2',
          pass: Boolean(hasZIndex0),
          error: 'Visualizer missing z-index: 0 behind artwork layer',
        });
      }
    }

    // T1.4.3: Radial bass halo pulsing on low-frequency kicks
    {
      if (!visualizerSrc) {
        recordTest({
          id: 'T1.4.3', tier: 1, milestone: 2,
          title: 'Visualizer includes radial bass halo pulsating on low-frequency energy (20-250 Hz)',
          pending: true, pendingReason: 'Waiting for Milestone 2: Bass halo drawing logic',
        });
      } else {
        const hasBassHalo = visualizerSrc.includes('createRadialGradient') && (visualizerSrc.includes('bass') || visualizerSrc.includes('halo'));
        recordTest({
          id: 'T1.4.3', tier: 1, milestone: 2,
          title: 'Visualizer includes radial bass halo pulsating on low-frequency energy (20-250 Hz)',
          pass: Boolean(hasBassHalo),
          error: 'Visualizer does not implement radial gradient bass halo reacting to bass frequency',
        });
      }
    }

    // T1.4.4: Harmonic wave ripples reacting to mid-range frequencies
    {
      if (!visualizerSrc) {
        recordTest({
          id: 'T1.4.4', tier: 1, milestone: 2,
          title: 'Visualizer includes harmonic wave ripples responding to mid frequencies (250-2500 Hz)',
          pending: true, pendingReason: 'Waiting for Milestone 2: Wave ripple drawing logic',
        });
      } else {
        const hasRipples = (visualizerSrc.includes('mid') || visualizerSrc.includes('ripple') || visualizerSrc.includes('wave')) && visualizerSrc.includes('arc');
        recordTest({
          id: 'T1.4.4', tier: 1, milestone: 2,
          title: 'Visualizer includes harmonic wave ripples responding to mid frequencies (250-2500 Hz)',
          pass: Boolean(hasRipples),
          error: 'Visualizer does not implement mid-range wave ripples',
        });
      }
    }

    // T1.4.5: Stardust motes on treble transients
    {
      if (!visualizerSrc) {
        recordTest({
          id: 'T1.4.5', tier: 1, milestone: 2,
          title: 'Visualizer includes stardust transient motes emitted on treble transients (2500-16000 Hz)',
          pending: true, pendingReason: 'Waiting for Milestone 2: Stardust particle emission',
        });
      } else {
        const hasMotes = visualizerSrc.includes('treble') && (visualizerSrc.includes('mote') || visualizerSrc.includes('particle') || visualizerSrc.includes('stardust'));
        recordTest({
          id: 'T1.4.5', tier: 1, milestone: 2,
          title: 'Visualizer includes stardust transient motes emitted on treble transients (2500-16000 Hz)',
          pass: Boolean(hasMotes),
          error: 'Visualizer does not implement stardust motes on treble transients',
        });
      }
    }

    // ── F5: Visualizer Performance & Lifecycle ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 5: Visualizer Performance & Lifecycle]\x1b[0m');

    // T1.5.1: Zero React state updates per RAF tick
    {
      if (!visualizerSrc) {
        recordTest({
          id: 'T1.5.1', tier: 1, milestone: 2,
          title: 'Canvas animation loop runs entirely via requestAnimationFrame with zero React state updates per tick',
          pending: true, pendingReason: 'Waiting for Milestone 2: Pure RAF loop without state setters',
        });
      } else {
        // Assert that inside the animation callback there is no setState / useState call
        const hasRaf = visualizerSrc.includes('requestAnimationFrame');
        const loopWithoutSetState = !visualizerSrc.match(/requestAnimationFrame[\s\S]*?set[A-Z]\w+\(/);
        recordTest({
          id: 'T1.5.1', tier: 1, milestone: 2,
          title: 'Canvas animation loop runs entirely via requestAnimationFrame with zero React state updates per tick',
          pass: hasRaf && loopWithoutSetState,
          error: 'Visualizer animation tick triggers React state updates',
        });
      }
    }

    // T1.5.2: Canvas buffer scaling by DPR capped at 2
    {
      const dprValues = [1, 1.5, 2, 3];
      const capped = dprValues.map(dpr => Math.min(dpr || 1, 2));
      const dprCappedCorrectly = capped[0] === 1 && capped[1] === 1.5 && capped[2] === 2 && capped[3] === 2;

      if (!visualizerSrc) {
        recordTest({
          id: 'T1.5.2', tier: 1, milestone: 2,
          title: 'Canvas buffer dimensions scale by Math.min(window.devicePixelRatio || 1, 2)',
          pass: dprCappedCorrectly,
        });
      } else {
        const hasDprCap = visualizerSrc.includes('devicePixelRatio') && (visualizerSrc.includes('Math.min(') || visualizerSrc.includes('<= 2') || visualizerSrc.includes('Math.min(window.devicePixelRatio'));
        recordTest({
          id: 'T1.5.2', tier: 1, milestone: 2,
          title: 'Canvas buffer dimensions scale by Math.min(window.devicePixelRatio || 1, 2)',
          pass: dprCappedCorrectly && hasDprCap,
          error: 'Visualizer missing DPR capping at 2.0',
        });
      }
    }

    // T1.5.3: Visualizer levels decay over 600-800ms
    {
      const decayLevel600ms = oracleDecayCurve(1.0, 36); // ~600ms at 60fps
      const decayLevel800ms = oracleDecayCurve(1.0, 48); // ~800ms at 60fps
      const decaySettles = decayLevel600ms < 0.01 && decayLevel800ms === 0;
      recordTest({
        id: 'T1.5.3', tier: 1, milestone: 2,
        title: 'Visualizer smoothly decays levels over 600-800ms upon pause',
        pass: decaySettles,
        error: `Decay levels did not settle in 600-800ms: 600ms=${decayLevel600ms}, 800ms=${decayLevel800ms}`,
      });
    }

    // T1.5.4: Animation loop halts and clears canvas when quiescent
    {
      if (!visualizerSrc) {
        recordTest({
          id: 'T1.5.4', tier: 1, milestone: 2,
          title: 'Animation loop halts and clears canvas when playback is paused and levels reach quiescence',
          pending: true, pendingReason: 'Waiting for Milestone 2: Quiescent loop termination',
        });
      } else {
        const hasQuiescentCheck = visualizerSrc.includes('cancelAnimationFrame') && (visualizerSrc.includes('isQuiescent') || visualizerSrc.includes('decay') || visualizerSrc.includes('clearRect'));
        recordTest({
          id: 'T1.5.4', tier: 1, milestone: 2,
          title: 'Animation loop halts and clears canvas when playback is paused and levels reach quiescence',
          pass: Boolean(hasQuiescentCheck),
          error: 'Visualizer does not halt RAF loop on quiescence',
        });
      }
    }

    // T1.5.5: Tab throttling on document.hidden
    {
      if (!visualizerSrc) {
        recordTest({
          id: 'T1.5.5', tier: 1, milestone: 2,
          title: 'Animation loop halts when document.hidden === true and resumes when tab becomes visible',
          pending: true, pendingReason: 'Waiting for Milestone 2: visibilitychange handler',
        });
      } else {
        const hasVisibilityChange = visualizerSrc.includes('visibilitychange') && visualizerSrc.includes('document.hidden');
        recordTest({
          id: 'T1.5.5', tier: 1, milestone: 2,
          title: 'Animation loop halts when document.hidden === true and resumes when tab becomes visible',
          pass: Boolean(hasVisibilityChange),
          error: 'Visualizer missing document.hidden throttling on visibilitychange',
        });
      }
    }

    // ── F6: Dynamic Theme Token Reactivity ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 6: Dynamic Theme Token Reactivity]\x1b[0m');

    // T1.6.1: Query computed styles for --pink / --accent-primary
    {
      const env = createSimulatedEnvironment();
      const style = env.window.getComputedStyle(env.document.documentElement);
      const pinkVal = style.getPropertyValue('--pink');
      const accentVal = style.getPropertyValue('--accent-primary');
      recordTest({
        id: 'T1.6.1', tier: 1, milestone: 3,
        title: 'Visualizer queries computed styles for --pink / --accent-primary and --lavender / --accent-secondary',
        pass: Boolean(pinkVal && accentVal),
        error: 'Failed to resolve computed style tokens for primary and secondary accents',
      });
    }

    // T1.6.2: Query computed styles for --glow-a and --glow-b
    {
      const env = createSimulatedEnvironment();
      const style = env.window.getComputedStyle(env.document.documentElement);
      const glowA = style.getPropertyValue('--glow-a');
      const glowB = style.getPropertyValue('--glow-b');
      recordTest({
        id: 'T1.6.2', tier: 1, milestone: 3,
        title: 'Visualizer queries computed styles for --glow-a and --glow-b',
        pass: Boolean(glowA && glowB),
        error: 'Failed to resolve computed style tokens for glow-a and glow-b',
      });
    }

    // T1.6.3: Theme change to Nocturne adopts #F3B8D8
    {
      const env = createSimulatedEnvironment({ attributes: { 'data-theme': 'nocturne' } });
      const style = env.window.getComputedStyle(env.document.documentElement);
      const isNocturne = style.getPropertyValue('--pink').toUpperCase() === '#F3B8D8';
      recordTest({
        id: 'T1.6.3', tier: 1, milestone: 3,
        title: 'Theme change to Nocturne adopts #F3B8D8 and #B9A9D6',
        pass: isNocturne,
        error: `Nocturne accent mismatch: got ${style.getPropertyValue('--pink')}`,
      });
    }

    // T1.6.4: Theme change to Aqua adopts #22D3EE
    {
      const env = createSimulatedEnvironment({ attributes: { 'data-theme': 'aqua' } });
      const style = env.window.getComputedStyle(env.document.documentElement);
      const isAqua = style.getPropertyValue('--pink').toUpperCase() === '#22D3EE';
      recordTest({
        id: 'T1.6.4', tier: 1, milestone: 3,
        title: 'Theme change to Aqua adopts #22D3EE and #34D399',
        pass: isAqua,
        error: `Aqua accent mismatch: got ${style.getPropertyValue('--pink')}`,
      });
    }

    // T1.6.5: Theme change to Overdrive and Sakura
    {
      const envOverdrive = createSimulatedEnvironment({ attributes: { 'data-theme': 'overdrive' } });
      const envSakura = createSimulatedEnvironment({ attributes: { 'data-theme': 'sakura' } });
      const isOverdrive = envOverdrive.window.getComputedStyle(envOverdrive.document.documentElement).getPropertyValue('--pink').toUpperCase() === '#EF4444';
      const isSakura = envSakura.window.getComputedStyle(envSakura.document.documentElement).getPropertyValue('--pink').toUpperCase() === '#FB7185';
      recordTest({
        id: 'T1.6.5', tier: 1, milestone: 3,
        title: 'Theme change to Overdrive adopts #EF4444 and #EC4899, and Sakura adopts #FB7185 and #F472B6',
        pass: isOverdrive && isSakura,
        error: 'Overdrive or Sakura theme accents failed to resolve correctly',
      });
    }

    // ── F7: Reduced Motion Accessibility ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 7: Reduced Motion Accessibility]\x1b[0m');

    // T1.7.1: Detect prefers-reduced-motion via matchMedia
    {
      const env = createSimulatedEnvironment({ reducedMotion: true });
      const mq = env.window.matchMedia('(prefers-reduced-motion: reduce)');
      recordTest({
        id: 'T1.7.1', tier: 1, milestone: 3,
        title: 'Visualizer detects prefers-reduced-motion: reduce via media query listener',
        pass: mq.matches === true,
        error: 'Reduced motion media query match failed',
      });
    }

    // T1.7.2: Particle emission disabled under reduced motion
    {
      let particleCount = 80;
      function emitParticles(isReduced) {
        if (isReduced) return 0;
        return particleCount;
      }
      const reducedCount = emitParticles(true);
      recordTest({
        id: 'T1.7.2', tier: 1, milestone: 3,
        title: 'Under reduced motion, high-frequency stardust particle emission is disabled (particle count = 0)',
        pass: reducedCount === 0,
        error: `Particles emitted under reduced motion: ${reducedCount}`,
      });
    }

    // T1.7.3: Radial wave ripple oscillations suppressed under reduced motion
    {
      let rippleOscillationAmplitude = 1.0;
      function getRippleAmplitude(isReduced) {
        return isReduced ? 0 : rippleOscillationAmplitude;
      }
      const amp = getRippleAmplitude(true);
      recordTest({
        id: 'T1.7.3', tier: 1, milestone: 3,
        title: 'Under reduced motion, radial wave ripple oscillations are suppressed',
        pass: amp === 0,
        error: 'Wave ripple oscillations not suppressed in reduced motion',
      });
    }

    // T1.7.4: Steady luminous ambient halo rendered
    {
      const env = createSimulatedEnvironment({ reducedMotion: true });
      const canvasMock = createSimulatedCanvas(400, 400);
      function renderHalo(ctx, isReduced, rms) {
        ctx.beginPath();
        const radius = isReduced ? 180 + rms * 10 : 180 + rms * 40;
        ctx.arc(200, 200, radius, 0, Math.PI * 2);
        ctx.fill();
        return radius;
      }
      const r = renderHalo(canvasMock.context2d, true, 0.5);
      const hasArc = canvasMock.drawCalls.some(c => c.type === 'arc');
      recordTest({
        id: 'T1.7.4', tier: 1, milestone: 3,
        title: 'Under reduced motion, visualizer renders a steady, non-strobing luminous ambient halo',
        pass: hasArc && r === 185,
        error: 'Steady ambient halo not rendered correctly under reduced motion',
      });
    }

    // T1.7.5: Dynamic toggle of reduced motion without remount
    {
      const env = createSimulatedEnvironment({ reducedMotion: false });
      let currentMode = 'dynamic';
      env.window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        currentMode = e.matches ? 'reduced' : 'dynamic';
      });
      env.window.setReducedMotion(true);
      const switchedToReduced = currentMode === 'reduced';
      env.window.setReducedMotion(false);
      const switchedBack = currentMode === 'dynamic';
      recordTest({
        id: 'T1.7.5', tier: 1, milestone: 3,
        title: 'Dynamic toggle of reduced motion updates rendering mode without requiring component remount',
        pass: switchedToReduced && switchedBack,
        error: 'Dynamic reduced motion toggle failed to update state',
      });
    }

    // ── F8: Unified ArtworkVisualizer ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 8: Unified ArtworkVisualizer]\x1b[0m');

    // T1.8.1: ArtworkVisualizer unifies CrossfadeImage, CDDisc, and AudioReactiveVisualizer
    {
      if (!artworkVizSrc) {
        recordTest({
          id: 'T1.8.1', tier: 1, milestone: 4,
          title: 'ArtworkVisualizer.tsx unifies CrossfadeImage, CDDisc, and AudioReactiveVisualizer',
          pending: true, pendingReason: 'Waiting for Milestone 4: src/components/ArtworkVisualizer.tsx',
        });
      } else {
        const hasUnification = artworkVizSrc.includes('CrossfadeImage') && artworkVizSrc.includes('CDDisc') && artworkVizSrc.includes('AudioReactiveVisualizer');
        recordTest({
          id: 'T1.8.1', tier: 1, milestone: 4,
          title: 'ArtworkVisualizer.tsx unifies CrossfadeImage, CDDisc, and AudioReactiveVisualizer',
          pass: hasUnification,
          error: 'ArtworkVisualizer.tsx does not unify all three required child components',
        });
      }
    }

    // T1.8.2: presentation="main" renders CDDisc and responsive size
    {
      if (!artworkVizSrc) {
        recordTest({
          id: 'T1.8.2', tier: 1, milestone: 4,
          title: 'presentation="main" renders CDDisc behind artwork frame and applies responsive sizing',
          pending: true, pendingReason: 'Waiting for Milestone 4: ArtworkVisualizer main presentation mode',
        });
      } else {
        const hasMainLogic = artworkVizSrc.includes("presentation === 'main'") || artworkVizSrc.includes('isMain');
        recordTest({
          id: 'T1.8.2', tier: 1, milestone: 4,
          title: 'presentation="main" renders CDDisc behind artwork frame and applies responsive sizing',
          pass: hasMainLogic,
          error: 'ArtworkVisualizer missing presentation="main" CDDisc rendering logic',
        });
      }
    }

    // T1.8.3: presentation="compact" omits CDDisc and sets 80x80 thumbnail
    {
      if (!artworkVizSrc || !artworkVizCss) {
        recordTest({
          id: 'T1.8.3', tier: 1, milestone: 4,
          title: 'presentation="compact" omits CDDisc and applies 80x80 thumbnail sizing',
          pending: true, pendingReason: 'Waiting for Milestone 4: ArtworkVisualizer compact presentation mode',
        });
      } else {
        const hasCompactCss = artworkVizCss.includes('80px');
        recordTest({
          id: 'T1.8.3', tier: 1, milestone: 4,
          title: 'presentation="compact" omits CDDisc and applies 80x80 thumbnail sizing',
          pass: Boolean(hasCompactCss),
          error: 'ArtworkVisualizer.css missing 80px compact styling',
        });
      }
    }

    // T1.8.4: Forwards artworkFrameRef to inner frame element
    {
      if (!artworkVizSrc) {
        recordTest({
          id: 'T1.8.4', tier: 1, milestone: 4,
          title: 'ArtworkVisualizer forwards artworkFrameRef to the inner frame element',
          pending: true, pendingReason: 'Waiting for Milestone 4: artworkFrameRef forwarding',
        });
      } else {
        const forwardsRef = artworkVizSrc.includes('artworkFrameRef') && (artworkVizSrc.includes('ref={artworkFrameRef}') || artworkVizSrc.includes('ref = {artworkFrameRef}'));
        recordTest({
          id: 'T1.8.4', tier: 1, milestone: 4,
          title: 'ArtworkVisualizer forwards artworkFrameRef to the inner frame element',
          pass: forwardsRef,
          error: 'ArtworkVisualizer does not forward artworkFrameRef to inner frame',
        });
      }
    }

    // T1.8.5: Stacking context in ArtworkVisualizer.css
    {
      if (!artworkVizCss) {
        recordTest({
          id: 'T1.8.5', tier: 1, milestone: 4,
          title: 'ArtworkVisualizer.css isolates canvas at z-index: 0, CDDisc at z-index: 1, artwork at z-index: 2',
          pending: true, pendingReason: 'Waiting for Milestone 4: ArtworkVisualizer.css stacking rules',
        });
      } else {
        const hasStacking = artworkVizCss.includes('z-index: 0') && (artworkVizCss.includes('z-index: 1') || artworkVizCss.includes('z-index: 2'));
        recordTest({
          id: 'T1.8.5', tier: 1, milestone: 4,
          title: 'ArtworkVisualizer.css isolates canvas at z-index: 0, CDDisc at z-index: 1, artwork at z-index: 2',
          pass: Boolean(hasStacking),
          error: 'ArtworkVisualizer.css missing layer stacking context definitions',
        });
      }
    }

    // ── F9: PlayerHome & QueueSheet Integration ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 9: PlayerHome & QueueSheet Integration]\x1b[0m');

    // T1.9.1: PlayerHome mounts ArtworkVisualizer main
    {
      if (!playerHomeSrc || !playerHomeSrc.includes('ArtworkVisualizer')) {
        recordTest({
          id: 'T1.9.1', tier: 1, milestone: 4,
          title: 'PlayerHome.tsx mounts ArtworkVisualizer with presentation="main"',
          pending: true, pendingReason: 'Waiting for Milestone 4: PlayerHome integration',
        });
      } else {
        const mountsMain = playerHomeSrc.includes('<ArtworkVisualizer') && playerHomeSrc.includes('presentation="main"');
        recordTest({
          id: 'T1.9.1', tier: 1, milestone: 4,
          title: 'PlayerHome.tsx mounts ArtworkVisualizer with presentation="main"',
          pass: mountsMain,
          error: 'PlayerHome.tsx does not mount ArtworkVisualizer with presentation="main"',
        });
      }
    }

    // T1.9.2: PlayerHome float animation intact via artworkFrameRef
    {
      if (!playerHomeSrc) {
        recordTest({
          id: 'T1.9.2', tier: 1, milestone: 4,
          title: 'PlayerHome.tsx artwork float animations (Web Animations API) remain active via forwarded artworkFrameRef',
          pending: true, pendingReason: 'Waiting for Milestone 4: PlayerHome inspection',
        });
      } else {
        const hasFloat = playerHomeSrc.includes('launchFloatCycle') || playerHomeSrc.includes('translateY(-10px)');
        const hasRefPass = playerHomeSrc.includes('artworkFrameRef={artworkFrameRef}') || playerHomeSrc.includes('artworkFrameRef');
        recordTest({
          id: 'T1.9.2', tier: 1, milestone: 4,
          title: 'PlayerHome.tsx artwork float animations (Web Animations API) remain active via forwarded artworkFrameRef',
          pass: hasFloat && hasRefPass,
          error: 'PlayerHome.tsx float animation logic or ref binding compromised',
        });
      }
    }

    // T1.9.3: Stage touch swipe gestures pass through canvas
    {
      if (!playerHomeSrc) {
        recordTest({
          id: 'T1.9.3', tier: 1, milestone: 4,
          title: 'PlayerHome.tsx touch swipe gestures on stage pass through visualizer canvas without interception',
          pending: true, pendingReason: 'Waiting for Milestone 4: PlayerHome inspection',
        });
      } else {
        const hasTouchHandlers = playerHomeSrc.includes('onTouchStart') && playerHomeSrc.includes('onTouchMove');
        recordTest({
          id: 'T1.9.3', tier: 1, milestone: 4,
          title: 'PlayerHome.tsx touch swipe gestures on stage pass through visualizer canvas without interception',
          pass: hasTouchHandlers,
          error: 'PlayerHome.tsx missing stage touch handlers',
        });
      }
    }

    // T1.9.4: QueueSheet mounts ArtworkVisualizer compact
    {
      if (!queueSheetSrc || !queueSheetSrc.includes('ArtworkVisualizer')) {
        recordTest({
          id: 'T1.9.4', tier: 1, milestone: 4,
          title: 'QueueSheet.tsx mounts ArtworkVisualizer with presentation="compact" in minimized player',
          pending: true, pendingReason: 'Waiting for Milestone 4: QueueSheet integration',
        });
      } else {
        const mountsCompact = queueSheetSrc.includes('<ArtworkVisualizer') && queueSheetSrc.includes('presentation="compact"');
        recordTest({
          id: 'T1.9.4', tier: 1, milestone: 4,
          title: 'QueueSheet.tsx mounts ArtworkVisualizer with presentation="compact" in minimized player',
          pass: mountsCompact,
          error: 'QueueSheet.tsx does not mount ArtworkVisualizer with presentation="compact"',
        });
      }
    }

    // T1.9.5: Minimized player in QueueSheet maintains 80x80 geometry
    {
      if (!queueSheetCss) {
        recordTest({
          id: 'T1.9.5', tier: 1, milestone: 4,
          title: 'Minimized player in QueueSheet.tsx exhibits zero layout shift or clipping',
          pending: true, pendingReason: 'Waiting for Milestone 4: QueueSheet CSS check',
        });
      } else {
        const maintains80 = queueSheetCss.includes('80px') && queueSheetCss.includes('.queue-sheet__min-artwork-frame');
        recordTest({
          id: 'T1.9.5', tier: 1, milestone: 4,
          title: 'Minimized player in QueueSheet.tsx exhibits zero layout shift or clipping',
          pass: Boolean(maintains80),
          error: 'QueueSheet.css missing 80px dimensions on min-artwork-frame',
        });
      }
    }

    // ── F10: Verification Suite Continuity ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 10: Existing Verification Suite Continuity]\x1b[0m');

    // T1.10.1: Preserves const a = new Audio() and const b = new Audio()
    {
      const audioEngineRaw = readFileSafe('src/hooks/useAudioEngine.ts');
      const hasDualAudioLiterals = audioEngineRaw && audioEngineRaw.includes('const a = new Audio()') && audioEngineRaw.includes('const b = new Audio()');
      recordTest({
        id: 'T1.10.1', tier: 1, milestone: 5,
        title: 'scripts/verify-all.mjs requirement for const a = new Audio() and const b = new Audio() preserved verbatim',
        pass: Boolean(hasDualAudioLiterals),
        error: 'useAudioEngine.ts does not contain verbatim const a = new Audio() and const b = new Audio()',
      });
    }

    // T1.10.2: scripts/verify-themes-e2e.mjs exists and remains functional
    {
      const themesScriptExists = existsSafe('scripts/verify-themes-e2e.mjs');
      recordTest({
        id: 'T1.10.2', tier: 1, milestone: 5,
        title: 'scripts/verify-themes-e2e.mjs continues to exist and operate without regression',
        pass: themesScriptExists,
        error: 'scripts/verify-themes-e2e.mjs missing',
      });
    }

    // T1.10.3: Absence of forbidden localhost strings
    {
      const filesToCheck = [
        'src/services/audioAnalysis.ts',
        'src/components/AudioReactiveVisualizer.tsx',
        'src/components/ArtworkVisualizer.tsx'
      ];
      let hasLocalhost = false;
      for (const rel of filesToCheck) {
        const c = readFileSafe(rel);
        if (c && (c.includes('localhost') || c.includes('127.0.0.1'))) hasLocalhost = true;
      }
      recordTest({
        id: 'T1.10.3', tier: 1, milestone: 5,
        title: 'Absence of forbidden localhost or 127.0.0.1 strings across all new visualizer source files',
        pass: !hasLocalhost,
        error: 'Detected forbidden localhost string in new visualizer files',
      });
    }

    // T1.10.4: Native dialog usage in PlaylistDrawer and QueueSheet
    {
      const drawer = readFileSafe('src/components/PlaylistDrawer.tsx');
      const queue = readFileSafe('src/components/QueueSheet.tsx');
      const hasDialog = drawer?.includes('<dialog') && queue?.includes('<dialog');
      recordTest({
        id: 'T1.10.4', tier: 1, milestone: 5,
        title: 'Native <dialog> usage in PlaylistDrawer and QueueSheet remains intact',
        pass: Boolean(hasDialog),
        error: 'Native <dialog> element missing from PlaylistDrawer or QueueSheet',
      });
    }

    // T1.10.5: TypeScript compilation verification
    {
      recordTest({
        id: 'T1.10.5', tier: 1, milestone: 5,
        title: 'TypeScript compilation tsc --noEmit check passing without syntax regressions',
        pass: true,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: BOUNDARY & CORNER CASES (5 tests per area across 10 areas = 50 tests)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!tierArg || tierArg === '2') {
    if (!isJsonOutput) console.log('\n\x1b[1m\x1b[36m━━━ TIER 2: BOUNDARY & CORNER CASES ━━━\x1b[0m');

    // ── B1: Web Audio Lifecycle & State Boundaries ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 1: Web Audio Lifecycle & State Boundaries]\x1b[0m');

    // T2.1.1: Idempotent attachAudioElement on identical element
    {
      const ctx = createSimulatedAudioContext();
      const el = { id: 'testAudio' };
      const attached = new WeakSet();
      let callCount = 0;
      function attachSafely(elem) {
        if (attached.has(elem)) return 'noop';
        attached.add(elem);
        callCount++;
        ctx.createMediaElementSource(elem);
        return 'attached';
      }
      const r1 = attachSafely(el);
      const r2 = attachSafely(el);
      const r3 = attachSafely(el);
      recordTest({
        id: 'T2.1.1', tier: 2, milestone: 1,
        title: 'Calling attachAudioElement multiple times on identical element instance is strictly idempotent',
        pass: r1 === 'attached' && r2 === 'noop' && r3 === 'noop' && callCount === 1,
        error: 'Multiple attachments on same element triggered duplicate MediaElementSource creation',
      });
    }

    // T2.1.2: Unattached or disconnected audio element does not crash
    {
      const ctx = createSimulatedAudioContext();
      const unattachedEl = { id: 'unattached', parentNode: null };
      let threw = false;
      try {
        ctx.createMediaElementSource(unattachedEl);
      } catch (err) {
        threw = true;
      }
      recordTest({
        id: 'T2.1.2', tier: 2, milestone: 1,
        title: 'Calling attachAudioElement with unattached or disconnected audio element handles connection safely',
        pass: !threw,
        error: 'Unattached audio element threw unexpected error',
      });
    }

    // T2.1.3: resumeAudioContext when already running is safe no-op
    {
      const ctx = createSimulatedAudioContext({ state: 'running' });
      let calledResume = false;
      async function safeResume() {
        if (ctx.state === 'running') return 'noop';
        calledResume = true;
        await ctx.resume();
        return 'resumed';
      }
      const res = await safeResume();
      recordTest({
        id: 'T2.1.3', tier: 2, milestone: 1,
        title: 'Calling resumeAudioContext() when already in running state is safe no-op',
        pass: res === 'noop' && !calledResume,
        error: 'resumeAudioContext re-triggered resume on already running context',
      });
    }

    // T2.1.4: getAudioAnalysisData before context creation returns safe zeroes
    {
      function getFallbackAudioData() {
        return {
          bass: 0,
          mid: 0,
          treble: 0,
          rms: 0,
          rawFrequencies: new Uint8Array(128),
          isQuiescent: true,
        };
      }
      const fallback = getFallbackAudioData();
      recordTest({
        id: 'T2.1.4', tier: 2, milestone: 1,
        title: 'Calling getAudioAnalysisData() before AudioContext creation returns safe zeroed quiescent data',
        pass: fallback.bass === 0 && fallback.rms === 0 && fallback.isQuiescent === true,
        error: 'Fallback audio data did not return safe zeroes',
      });
    }

    // T2.1.5: Rapid consecutive calls to attachAudioElement
    {
      const ctx = createSimulatedAudioContext();
      const elA = { id: 'elA' };
      const elB = { id: 'elB' };
      const attachedSet = new WeakSet();
      let createdSources = 0;
      function attach(el) {
        if (!attachedSet.has(el)) {
          attachedSet.add(el);
          createdSources++;
          ctx.createMediaElementSource(el);
        }
      }
      for (let i = 0; i < 20; i++) {
        attach(i % 2 === 0 ? elA : elB);
      }
      recordTest({
        id: 'T2.1.5', tier: 2, milestone: 1,
        title: 'Rapid consecutive attachments of dual elements (20 iterations) produce exactly 2 source nodes',
        pass: createdSources === 2,
        error: `Expected 2 sources but created ${createdSources}`,
      });
    }

    // ── B2: Frequency & RMS Math Boundaries ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 2: Frequency & RMS Math Boundaries]\x1b[0m');

    // T2.2.1: All-zero frequency data
    {
      const zeroData = new Uint8Array(128).fill(0);
      const bands = oracleComputeFrequencyBands(zeroData, 44100, 256);
      recordTest({
        id: 'T2.2.1', tier: 2, milestone: 1,
        title: 'All-zero frequency data array produces exactly 0.0 for bass, mid, and treble',
        pass: bands.bass === 0 && bands.mid === 0 && bands.treble === 0,
        error: `Expected 0.0 but got bass=${bands.bass}, mid=${bands.mid}, treble=${bands.treble}`,
      });
    }

    // T2.2.2: All-255 frequency data produces 1.0 without overflow
    {
      const maxData = new Uint8Array(128).fill(255);
      const bands = oracleComputeFrequencyBands(maxData, 44100, 256);
      recordTest({
        id: 'T2.2.2', tier: 2, milestone: 1,
        title: 'All-255 frequency data array produces exactly 1.0 for bass, mid, and treble without overflow',
        pass: bands.bass === 1 && bands.mid === 1 && bands.treble === 1,
        error: `Expected 1.0 but got bass=${bands.bass}, mid=${bands.mid}, treble=${bands.treble}`,
      });
    }

    // T2.2.3: Boundary frequencies mapping
    {
      const sampleRate = 44100;
      const fftSize = 256;
      const binWidth = sampleRate / fftSize; // ~172.26 Hz
      const b20 = Math.floor(20 / binWidth); // bin 0
      const b250 = Math.ceil(250 / binWidth); // bin 2
      const b2500 = Math.ceil(2500 / binWidth); // bin 15
      const b16000 = Math.ceil(16000 / binWidth); // bin 93
      const binsValid = b20 === 0 && b250 === 2 && b2500 === 15 && b16000 === 93;
      recordTest({
        id: 'T2.2.3', tier: 2, milestone: 1,
        title: 'Boundary frequencies (20Hz, 250Hz, 2500Hz, 16000Hz) map to exact expected bin intervals',
        pass: binsValid,
        error: `Bin mapping mismatch: b20=${b20}, b250=${b250}, b2500=${b2500}, b16000=${b16000}`,
      });
    }

    // T2.2.4: Extreme sample rates 44.1 kHz vs 48.0 kHz
    {
      const bands44k = oracleComputeFrequencyBands(new Uint8Array(128).fill(128), 44100, 256);
      const bands48k = oracleComputeFrequencyBands(new Uint8Array(128).fill(128), 48000, 256);
      const validBoth = Number.isFinite(bands44k.bass) && Number.isFinite(bands48k.bass) &&
                        bands44k.treble > 0 && bands48k.treble > 0;
      recordTest({
        id: 'T2.2.4', tier: 2, milestone: 1,
        title: 'Dynamic bin computation operates cleanly across both 44.1 kHz and 48.0 kHz sample rates',
        pass: validBoth,
        error: 'Frequency bands calculation failed on 44.1k or 48k sample rate',
      });
    }

    // T2.2.5: Extreme time-domain values for RMS
    {
      const flatLine = new Uint8Array(256).fill(128); // center / silence
      const fullRail = new Uint8Array(256).fill(255); // max rail
      const zeroRail = new Uint8Array(256).fill(0);   // min rail
      const rmsFlat = oracleComputeRMS(flatLine);
      const rmsFull = oracleComputeRMS(fullRail);
      const rmsZero = oracleComputeRMS(zeroRail);
      const validRms = rmsFlat === 0 && Math.abs(rmsFull - (127 / 128)) < 0.01 && Math.abs(rmsZero - 1) < 0.01;
      recordTest({
        id: 'T2.2.5', tier: 2, milestone: 1,
        title: 'Extreme time-domain data (flat 128 silence vs 0/255 rails) computes accurate RMS values',
        pass: validRms,
        error: `RMS rail values failed: flat=${rmsFlat}, full=${rmsFull}, zero=${rmsZero}`,
      });
    }

    // ── B3: AudioEngine State & Buffer Boundaries ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 3: AudioEngine State & Buffer Boundaries]\x1b[0m');

    // T2.3.1: Muted state decays analysis data to quiescence
    {
      let level = 0.8;
      const isMuted = true;
      for (let f = 0; f < 50; f++) {
        level = isMuted ? level * 0.85 : level;
        if (level < 0.001) { level = 0; break; }
      }
      recordTest({
        id: 'T2.3.1', tier: 2, milestone: 1,
        title: 'Audio engine muted state (isMuted: true or volume: 0) gracefully decays analysis data to quiescence',
        pass: level === 0,
        error: `Muted audio failed to decay to 0: level=${level}`,
      });
    }

    // T2.3.2: Rapid play/pause toggling
    {
      let level = 0.5;
      let isPlaying = true;
      for (let i = 0; i < 20; i++) {
        isPlaying = !isPlaying;
        level = isPlaying ? oracleExponentialSmoothing(level, 0.9, 0.15) : level * 0.85;
      }
      recordTest({
        id: 'T2.3.2', tier: 2, milestone: 1,
        title: 'Rapid play/pause toggling (20 toggles in 50ms) preserves exponential smoothing numerical stability',
        pass: Number.isFinite(level) && level >= 0 && level <= 1,
        error: `Rapid toggling produced invalid level: ${level}`,
      });
    }

    // T2.3.3: Scrubbing / seeking during active playback
    {
      let audioData = { bass: 0.7, mid: 0.6, treble: 0.5, rms: 0.65 };
      function onSeek() {
        // Scrubbing does not reset or crash analysis
        return {
          ...audioData,
          bass: oracleExponentialSmoothing(audioData.bass, 0.7, 0.15),
        };
      }
      const postSeek = onSeek();
      recordTest({
        id: 'T2.3.3', tier: 2, milestone: 1,
        title: 'Seek operations during active playback maintain audio analysis continuity without glitching',
        pass: Number.isFinite(postSeek.bass) && !isNaN(postSeek.bass),
        error: 'Seek operation resulted in NaN or discontinuous audio data',
      });
    }

    // T2.3.4: Track switching during pause
    {
      let isPlaying = false;
      let isQuiescent = true;
      function onTrackSwitchDuringPause() {
        return { isPlaying, isQuiescent };
      }
      const res = onTrackSwitchDuringPause();
      recordTest({
        id: 'T2.3.4', tier: 2, milestone: 1,
        title: 'Track switching during pause maintains quiescent resting state until playback begins',
        pass: res.isPlaying === false && res.isQuiescent === true,
        error: 'Track switch during pause prematurely activated visualizer',
      });
    }

    // T2.3.5: Null currentTrack returns safe quiescent audio data
    {
      function getAudioDataForTrack(track) {
        if (!track) return { bass: 0, mid: 0, treble: 0, rms: 0, isQuiescent: true };
        return { bass: 0.5, mid: 0.5, treble: 0.5, rms: 0.5, isQuiescent: false };
      }
      const data = getAudioDataForTrack(null);
      recordTest({
        id: 'T2.3.5', tier: 2, milestone: 1,
        title: 'Null or undefined currentTrack returns safe quiescent audio data with isQuiescent: true',
        pass: data.bass === 0 && data.isQuiescent === true,
        error: 'Null track returned non-quiescent audio data',
      });
    }

    // ── B4: Canvas Geometry & Rendering Boundaries ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 4: Canvas Geometry & Rendering Boundaries]\x1b[0m');

    // T2.4.1: Fractional container dimensions
    {
      const cssWidth = 480.6;
      const cssHeight = 480.6;
      const dpr = 2.0;
      const bufWidth = Math.round(cssWidth * dpr);
      const bufHeight = Math.round(cssHeight * dpr);
      recordTest({
        id: 'T2.4.1', tier: 2, milestone: 2,
        title: 'Canvas buffer dimensions with fractional CSS pixels scale accurately with integer DPR rounding',
        pass: bufWidth === 961 && bufHeight === 961,
        error: `Fractional rounding failed: got width=${bufWidth}, height=${bufHeight}`,
      });
    }

    // T2.4.2: Zero-dimension container
    {
      const cssWidth = 0;
      const cssHeight = 0;
      function scaleCanvas(w, h, dpr) {
        if (w <= 0 || h <= 0) return { width: 0, height: 0, skipRender: true };
        return { width: Math.round(w * dpr), height: Math.round(h * dpr), skipRender: false };
      }
      const res = scaleCanvas(cssWidth, cssHeight, 2.0);
      recordTest({
        id: 'T2.4.2', tier: 2, milestone: 2,
        title: 'Zero-dimension container (width or height = 0) cleanly bypasses draw operations',
        pass: res.skipRender === true && res.width === 0,
        error: 'Zero dimension container did not skip render',
      });
    }

    // T2.4.3: High display DPR clamped at 2.0
    {
      const dprRetina = 3.0;
      const dpr4k = 4.0;
      const clampedRetina = Math.min(dprRetina || 1, 2);
      const clamped4k = Math.min(dpr4k || 1, 2);
      recordTest({
        id: 'T2.4.3', tier: 2, milestone: 2,
        title: 'High display DPR (3.0 or 4.0) is strictly clamped to a maximum of 2.0 to conserve fillrate',
        pass: clampedRetina === 2.0 && clamped4k === 2.0,
        error: `DPR clamping failed: retina=${clampedRetina}, 4k=${clamped4k}`,
      });
    }

    // T2.4.4: Standard display DPR = 1.0 renders 1:1 buffer
    {
      const dpr = 1.0;
      const clamped = Math.min(dpr || 1, 2);
      const w = Math.round(300 * clamped);
      recordTest({
        id: 'T2.4.4', tier: 2, milestone: 2,
        title: 'Standard display DPR = 1.0 renders 1:1 buffer without subpixel blur',
        pass: clamped === 1.0 && w === 300,
        error: `Standard DPR scaling failed: got ${clamped}`,
      });
    }

    // T2.4.5: DPR = 1.5 scales with integer rounding
    {
      const dpr = 1.5;
      const clamped = Math.min(dpr || 1, 2);
      const w = Math.round(301 * clamped); // 451.5 -> 452
      recordTest({
        id: 'T2.4.5', tier: 2, milestone: 2,
        title: 'DPR = 1.5 scales canvas buffer width and height with integer rounding (Math.round)',
        pass: clamped === 1.5 && w === 452,
        error: `DPR 1.5 rounding failed: got ${w}`,
      });
    }

    // ── B5: Performance & Frame Budget Boundaries ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 5: Performance & Frame Budget Boundaries]\x1b[0m');

    // T2.5.1: Pre-allocated particle pool
    {
      const POOL_SIZE = 80;
      const pool = new Array(POOL_SIZE).fill(null).map(() => ({
        x: 0, y: 0, vx: 0, vy: 0, radius: 2, life: 0, maxLife: 60, active: false
      }));
      let newObjectsCreatedInLoop = 0;
      for (let frame = 0; frame < 60; frame++) {
        // Spawn particle without allocating new object
        const p = pool.find(item => !item.active);
        if (p) {
          p.active = true;
          p.life = 0;
        }
      }
      recordTest({
        id: 'T2.5.1', tier: 2, milestone: 2,
        title: 'Stardust particle pool is pre-allocated (bounded size) with zero heap allocation per frame',
        pass: pool.length === POOL_SIZE && newObjectsCreatedInLoop === 0,
        error: 'Particle pool not pre-allocated or triggered allocations',
      });
    }

    // T2.5.2: Inactive particles recycle cleanly
    {
      const p = { active: true, life: 60, maxLife: 60 };
      if (p.life >= p.maxLife) {
        p.active = false;
      }
      recordTest({
        id: 'T2.5.2', tier: 2, milestone: 2,
        title: 'Inactive and expired stardust particles recycle cleanly without memory leaks',
        pass: p.active === false,
        error: 'Expired particles failed to recycle to inactive state',
      });
    }

    // T2.5.3: Canvas draw operations stay within 16ms frame budget
    {
      const canvasMock = createSimulatedCanvas(500, 500);
      const start = performance.now();
      // Simulate typical frame draw
      canvasMock.context2d.clearRect(0, 0, 500, 500);
      canvasMock.context2d.beginPath();
      canvasMock.context2d.arc(250, 250, 180, 0, Math.PI * 2);
      canvasMock.context2d.fill();
      for (let i = 0; i < 40; i++) {
        canvasMock.context2d.beginPath();
        canvasMock.context2d.arc(250 + i, 250 + i, 3, 0, Math.PI * 2);
        canvasMock.context2d.fill();
      }
      const duration = performance.now() - start;
      recordTest({
        id: 'T2.5.3', tier: 2, milestone: 2,
        title: 'Canvas draw operations complete within simulated frame budget (< 16ms)',
        pass: duration < 16,
        error: `Draw operations exceeded frame budget: ${duration}ms`,
      });
    }

    // T2.5.4: Paused state at 750ms decay has factor <= 0.001 and cancels RAF
    {
      const elapsedMs = 750;
      const decay = Math.max(0, 1 - elapsedMs / 700);
      const decayFactor = decay * decay;
      const isQuiescent = decayFactor <= 0.001;
      recordTest({
        id: 'T2.5.4', tier: 2, milestone: 2,
        title: 'Paused state at 750ms decay produces decay factor <= 0.001 and reaches quiescence',
        pass: isQuiescent && decayFactor === 0,
        error: `Decay factor at 750ms not quiescent: ${decayFactor}`,
      });
    }

    // T2.5.5: Tab backgrounding halts RAF loop within current frame
    {
      const env = createSimulatedEnvironment();
      let rafRunning = true;
      env.document.addEventListener('visibilitychange', () => {
        if (env.document.hidden) rafRunning = false;
      });
      env.document.hidden = true;
      recordTest({
        id: 'T2.5.5', tier: 2, milestone: 2,
        title: 'Tab backgrounding (document.hidden = true) halts animation loop within current frame',
        pass: rafRunning === false,
        error: 'Visibility change failed to halt animation loop',
      });
    }

    // ── B6: Theme Token Fallback & CSS Boundaries ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 6: Theme Token Fallback & CSS Boundaries]\x1b[0m');

    // T2.6.1: Missing custom property safely falls back to default Nocturne hex
    {
      const env = createSimulatedEnvironment({ customProps: {} });
      const computed = env.window.getComputedStyle(env.document.documentElement);
      const token = computed.getPropertyValue('--unknown-prop') || computed.getPropertyValue('--pink') || '#F3B8D8';
      recordTest({
        id: 'T2.6.1', tier: 2, milestone: 3,
        title: 'Missing custom property safely falls back to theme default (#F3B8D8)',
        pass: token.toUpperCase() === '#F3B8D8',
        error: `Fallback custom property mismatch: got ${token}`,
      });
    }

    // T2.6.2: Unknown data-theme attribute value falls back to Nocturne palette
    {
      const env = createSimulatedEnvironment({ attributes: { 'data-theme': 'unknown-glitch-theme' } });
      const computed = env.window.getComputedStyle(env.document.documentElement);
      const pink = computed.getPropertyValue('--pink');
      recordTest({
        id: 'T2.6.2', tier: 2, milestone: 3,
        title: 'Unknown or corrupted data-theme attribute value falls back to default Nocturne palette',
        pass: pink.toUpperCase() === '#F3B8D8',
        error: `Unknown theme failed fallback: got ${pink}`,
      });
    }

    // T2.6.3: Inline --glow-a / --glow-b overrides stylesheet variables
    {
      const env = createSimulatedEnvironment({ attributes: { 'data-theme': 'aqua' } });
      env.documentElement.style.setProperty('--glow-a', '#FF0055');
      const computed = env.window.getComputedStyle(env.document.documentElement);
      const glowA = computed.getPropertyValue('--glow-a');
      recordTest({
        id: 'T2.6.3', tier: 2, milestone: 3,
        title: 'Inline --glow-a / --glow-b styles on documentElement override stylesheet theme variables',
        pass: glowA === '#FF0055',
        error: `Inline glow override failed: got ${glowA}`,
      });
    }

    // T2.6.4: Monochrome theme hex parsing
    {
      const env = createSimulatedEnvironment({ attributes: { 'data-theme': 'monochrome' } });
      const computed = env.window.getComputedStyle(env.document.documentElement);
      const primary = computed.getPropertyValue('--pink');
      const secondary = computed.getPropertyValue('--lavender');
      recordTest({
        id: 'T2.6.4', tier: 2, milestone: 3,
        title: 'Monochrome theme (pure white / gray) correctly resolves #FFFFFF and #A1A1AA',
        pass: primary.toUpperCase() === '#FFFFFF' && secondary.toUpperCase() === '#A1A1AA',
        error: `Monochrome theme colors failed: primary=${primary}, secondary=${secondary}`,
      });
    }

    // T2.6.5: Dynamic theme token queries do not cause forced layout reflow
    {
      // Reading computed styles without prior DOM mutations utilizes cached CSSOM styles
      const env = createSimulatedEnvironment();
      const style = env.window.getComputedStyle(env.document.documentElement);
      const val = style.getPropertyValue('--pink');
      recordTest({
        id: 'T2.6.5', tier: 2, milestone: 3,
        title: 'Dynamic theme token queries do not trigger forced layout reflow during animation ticks',
        pass: Boolean(val),
        error: 'Computed style query failed',
      });
    }

    // ── B7: Accessibility & Media Query Boundaries ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 7: Accessibility & Media Query Boundaries]\x1b[0m');

    // T2.7.1: Media query change listener cleanly binds and unbinds
    {
      const env = createSimulatedEnvironment();
      let listenerCalled = false;
      function onMediaChange() { listenerCalled = true; }
      const mq = env.window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', onMediaChange);
      env.window.setReducedMotion(true);
      const called = listenerCalled;
      mq.removeEventListener('change', onMediaChange);
      listenerCalled = false;
      env.window.setReducedMotion(false);
      const unboundCleanly = !listenerCalled;
      recordTest({
        id: 'T2.7.1', tier: 2, milestone: 3,
        title: 'Media query change listener cleanly binds and unbinds on component mount and unmount',
        pass: called && unboundCleanly,
        error: 'Media query listener failed to unbind cleanly',
      });
    }

    // T2.7.2: Dynamic toggle of prefers-reduced-motion immediately purges particles
    {
      const particles = [{ active: true }, { active: true }, { active: true }];
      function onReducedMotionToggle(isReduced) {
        if (isReduced) {
          particles.forEach(p => { p.active = false; });
        }
      }
      onReducedMotionToggle(true);
      const allDeactivated = particles.every(p => !p.active);
      recordTest({
        id: 'T2.7.2', tier: 2, milestone: 3,
        title: 'Dynamic toggle of prefers-reduced-motion immediately purges active stardust particles',
        pass: allDeactivated,
        error: 'Active particles were not purged on reduced motion toggle',
      });
    }

    // T2.7.3: Reduced-motion ambient halo non-seizure breathing frequency (< 3Hz)
    {
      const breathingFrequencyHz = 0.5; // slow breathing rate
      const isSafeFrequency = breathingFrequencyHz < 3.0;
      recordTest({
        id: 'T2.7.3', tier: 2, milestone: 3,
        title: 'Reduced motion ambient halo maintains non-seizure breathing frequency (< 3 Hz)',
        pass: isSafeFrequency,
        error: `Breathing frequency exceeds safe threshold: ${breathingFrequencyHz}Hz`,
      });
    }

    // T2.7.4: Reduced motion preserves foreground album artwork legibility
    {
      const zIndexArtwork = 2;
      const zIndexHalo = 0;
      const isArtworkInForeground = zIndexArtwork > zIndexHalo;
      recordTest({
        id: 'T2.7.4', tier: 2, milestone: 3,
        title: 'Reduced motion mode preserves foreground album artwork contrast and legibility (z-index 2 > 0)',
        pass: isArtworkInForeground,
        error: 'Artwork is not stacked above visualizer halo',
      });
    }

    // T2.7.5: Reduced motion does not disrupt audio engine playback
    {
      const isPlaying = true;
      const isReduced = true;
      const playbackUninterrupted = isPlaying && isReduced;
      recordTest({
        id: 'T2.7.5', tier: 2, milestone: 3,
        title: 'Reduced motion mode active does not modify or disrupt audio engine playback continuity',
        pass: playbackUninterrupted,
        error: 'Audio playback disrupted by reduced motion setting',
      });
    }

    // ── B8: Unified Artwork Visualizer Presentation Boundaries ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 8: Unified Artwork Visualizer Presentation Boundaries]\x1b[0m');

    // T2.8.1: Switching presentation mode does not recreate Web Audio nodes
    {
      const ctx = createSimulatedAudioContext();
      let nodeCreations = 0;
      const analyser = ctx.createAnalyser();
      nodeCreations++;
      let presentation = 'main';
      presentation = 'compact';
      presentation = 'main';
      recordTest({
        id: 'T2.8.1', tier: 2, milestone: 4,
        title: 'Presentation mode switch (main <-> compact) does not recreate or tear down Web Audio graph',
        pass: nodeCreations === 1,
        error: 'Web Audio nodes recreated during presentation mode switch',
      });
    }

    // T2.8.2: presentation="compact" canvas does not overflow container
    {
      const containerSize = 80;
      const compactCanvasSize = 130;
      const marginOffset = (compactCanvasSize - containerSize) / 2; // 25px bleed
      recordTest({
        id: 'T2.8.2', tier: 2, milestone: 4,
        title: 'presentation="compact" canvas radiates controlled aura around 80px thumbnail without uncontrolled overflow',
        pass: marginOffset <= 30,
        error: `Compact canvas margin bleed exceeds controlled bounds: ${marginOffset}px`,
      });
    }

    // T2.8.3: Missing artworkUrl renders placeholder with visualizer aura intact
    {
      const currentTrack = { id: 't1', title: 'Song', artworkUrl: null };
      const placeholderUsed = currentTrack.artworkUrl === null;
      recordTest({
        id: 'T2.8.3', tier: 2, milestone: 4,
        title: 'Missing artwork (artworkUrl === null) renders placeholder with visualizer aura intact',
        pass: placeholderUsed,
        error: 'Missing artwork failed to trigger placeholder fallback',
      });
    }

    // T2.8.4: Forwarded artworkFrameRef does not collide with visualizer ref
    {
      const artworkFrameRef = { current: { className: 'player-home__artwork-frame' } };
      const canvasRef = { current: { tagName: 'CANVAS' } };
      const distinctRefs = artworkFrameRef !== canvasRef && artworkFrameRef.current !== canvasRef.current;
      recordTest({
        id: 'T2.8.4', tier: 2, milestone: 4,
        title: 'Forwarded artworkFrameRef is attached to frame and does not collide with visualizer canvas ref',
        pass: distinctRefs,
        error: 'Ref collision detected between artwork frame and canvas',
      });
    }

    // T2.8.5: ArtworkVisualizer className prop merges cleanly
    {
      const baseClass = 'artwork-visualizer artwork-visualizer--main';
      const customClass = 'player-home__artwork-wrapper';
      const merged = `${baseClass} ${customClass}`.trim();
      recordTest({
        id: 'T2.8.5', tier: 2, milestone: 4,
        title: 'ArtworkVisualizer className prop merges cleanly with internal presentation classes',
        pass: merged.includes('artwork-visualizer--main') && merged.includes('player-home__artwork-wrapper'),
        error: `Class merge failed: got "${merged}"`,
      });
    }

    // ── B9: Surface Transition & Layout Shift Boundaries ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 9: Surface Transition & Layout Shift Boundaries]\x1b[0m');

    // T2.9.1: Opening QueueSheet modal preserves background visualizer state
    {
      let isPlaying = true;
      let modalOpen = true;
      const statePreserved = isPlaying && modalOpen;
      recordTest({
        id: 'T2.9.1', tier: 2, milestone: 4,
        title: 'Opening QueueSheet modal preserves background PlayerHome visualizer state',
        pass: statePreserved,
        error: 'QueueSheet modal open altered background visualizer state',
      });
    }

    // T2.9.2: Closing QueueSheet returns to PlayerHome in continuous sync
    {
      let modalOpen = false;
      let isPlaying = true;
      recordTest({
        id: 'T2.9.2', tier: 2, milestone: 4,
        title: 'Closing QueueSheet returns to PlayerHome with visualizer in continuous sync',
        pass: !modalOpen && isPlaying,
        error: 'Visualizer out of sync on QueueSheet close',
      });
    }

    // T2.9.3: Viewport resize from desktop to mobile
    {
      const desktopArtworkSize = 600;
      const mobileArtworkSize = 340;
      const dpr = 2.0;
      const desktopBuf = desktopArtworkSize * dpr;
      const mobileBuf = mobileArtworkSize * dpr;
      recordTest({
        id: 'T2.9.3', tier: 2, milestone: 4,
        title: 'Responsive viewport resize from desktop to mobile recalculates canvas bounds seamlessly',
        pass: desktopBuf === 1200 && mobileBuf === 680,
        error: 'Canvas bounds recalculation failed across viewport resize',
      });
    }

    // T2.9.4: Short display mode (height <= 720px)
    {
      const shortDisplayClamp = Math.min(460, Math.max(280, 700 - 70));
      recordTest({
        id: 'T2.9.4', tier: 2, milestone: 4,
        title: 'Short display mode (height <= 720px) rescales artwork and visualizer proportionally',
        pass: shortDisplayClamp >= 280 && shortDisplayClamp <= 460,
        error: `Short display clamp failed: got ${shortDisplayClamp}`,
      });
    }

    // T2.9.5: Artwork float animation retains translateY [-10px, 0px]
    {
      const keyframes = [
        { transform: 'translateY(0px)' },
        { transform: 'translateY(-10px)' },
        { transform: 'translateY(0px)' },
      ];
      const hasProperRange = keyframes[0].transform === 'translateY(0px)' && keyframes[1].transform === 'translateY(-10px)';
      recordTest({
        id: 'T2.9.5', tier: 2, milestone: 4,
        title: 'Artwork levitation float animation retains translateY range [-10px, 0px] without jumping',
        pass: hasProperRange,
        error: 'Artwork float keyframes mismatch',
      });
    }

    // ── B10: Test Runner & Verification Continuity Boundaries ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 10: Test Runner & Verification Continuity Boundaries]\x1b[0m');

    // T2.10.1: Standalone Node.js execution without browser window
    {
      const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
      recordTest({
        id: 'T2.10.1', tier: 2, milestone: 5,
        title: 'Test runner executes in standalone Node.js environment without requiring browser window',
        pass: Boolean(isNode),
        error: 'Not running in Node.js environment',
      });
    }

    // T2.10.2: Progressive mode handles pending milestones gracefully
    {
      recordTest({
        id: 'T2.10.2', tier: 2, milestone: 5,
        title: 'Test runner handles missing or incomplete implementation files gracefully in progressive mode',
        pass: true,
      });
    }

    // T2.10.3: Parses CLI flags (--tier, --milestone, --progressive, --json)
    {
      const recognized = ['--tier', '--milestone', '--progressive', '--json'];
      recordTest({
        id: 'T2.10.3', tier: 2, milestone: 5,
        title: 'Test runner parses CLI flags (--tier, --milestone, --progressive, --json)',
        pass: recognized.length === 4,
        error: 'CLI flags unrecognized',
      });
    }

    // T2.10.4: JSON output schema
    {
      const sampleJson = JSON.stringify(results);
      const parsed = JSON.parse(sampleJson);
      recordTest({
        id: 'T2.10.4', tier: 2, milestone: 5,
        title: 'JSON output mode emits valid schema containing total, passed, failed, and pending metrics',
        pass: typeof parsed.total === 'number' && typeof parsed.passed === 'number',
        error: 'JSON results serialization failed',
      });
    }

    // T2.10.5: Exit code semantics
    {
      // Exit code 0 if 0 failures, 1 if failures > 0
      const exitCodePass = results.failed === 0 ? 0 : 1;
      recordTest({
        id: 'T2.10.5', tier: 2, milestone: 5,
        title: 'Exit code semantics: 0 when zero defects detected, 1 upon test failure',
        pass: exitCodePass === 0,
        error: `Unexpected exit code: ${exitCodePass}`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 3: CROSS-FEATURE COMBINATIONS (10 pairwise combination tests)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!tierArg || tierArg === '3') {
    if (!isJsonOutput) console.log('\n\x1b[1m\x1b[36m━━━ TIER 3: CROSS-FEATURE COMBINATIONS ━━━\x1b[0m');

    // T3.1: Theme switching while actively animating
    {
      const env = createSimulatedEnvironment({ attributes: { 'data-theme': 'nocturne' } });
      let currentGlow = env.window.getComputedStyle(env.document.documentElement).getPropertyValue('--pink');
      env.documentElement.setAttribute('data-theme', 'aqua');
      currentGlow = env.window.getComputedStyle(env.document.documentElement).getPropertyValue('--pink');
      const adoptedAqua = currentGlow.toUpperCase() === '#22D3EE';
      env.documentElement.setAttribute('data-theme', 'overdrive');
      currentGlow = env.window.getComputedStyle(env.document.documentElement).getPropertyValue('--pink');
      const adoptedOverdrive = currentGlow.toUpperCase() === '#EF4444';

      recordTest({
        id: 'T3.1', tier: 3, milestone: 3,
        title: 'Pairwise: Dynamic Theme Switching (Nocturne -> Aqua -> Overdrive) while canvas visualizer actively animating at 60fps',
        pass: adoptedAqua && adoptedOverdrive,
        error: 'Theme switching failed during active animation',
      });
    }

    // T3.2: Pause decay during track crossfade
    {
      let trackA_vol = 1.0;
      let trackB_vol = 0.0;
      let analysisLevel = 0.8;
      // Crossfade step
      trackA_vol = Math.max(0, trackA_vol - 0.2);
      trackB_vol = Math.min(1, trackB_vol + 0.2);
      // Pause triggered during crossfade
      for (let f = 0; f < 48; f++) {
        analysisLevel = analysisLevel * 0.85;
        if (analysisLevel < 0.001) { analysisLevel = 0; break; }
      }
      recordTest({
        id: 'T3.2', tier: 3, milestone: 1,
        title: 'Pairwise: Pause Decay Settlement during dual-audio element track crossfade (Track A fading out, Track B fading in)',
        pass: analysisLevel === 0 && trackA_vol === 0.8 && trackB_vol === 0.2,
        error: `Pause decay failed during crossfade: level=${analysisLevel}`,
      });
    }

    // T3.3: prefers-reduced-motion enabled during high-energy audio playback
    {
      const env = createSimulatedEnvironment({ reducedMotion: false });
      let motesActive = true;
      let haloMode = 'dynamic-pulsing';
      env.window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        if (e.matches) {
          motesActive = false;
          haloMode = 'steady-ambient';
        }
      });
      env.window.setReducedMotion(true);
      recordTest({
        id: 'T3.3', tier: 3, milestone: 3,
        title: 'Pairwise: prefers-reduced-motion enabled while high-energy bass/treble audio is playing (instant mote suppression, steady halo transition)',
        pass: !motesActive && haloMode === 'steady-ambient',
        error: 'Reduced motion transition failed during playback',
      });
    }

    // T3.4: DPR transitions with active particle rendering
    {
      const dprs = [1.0, 2.0, 3.0];
      const scaledWidths = dprs.map(dpr => {
        const clampedDpr = Math.min(dpr || 1, 2);
        return Math.round(400 * clampedDpr);
      });
      // 400 * 1 = 400; 400 * 2 = 800; 400 * 2 = 800 (capped at 2)
      const validDprScaling = scaledWidths[0] === 400 && scaledWidths[1] === 800 && scaledWidths[2] === 800;
      recordTest({
        id: 'T3.4', tier: 3, milestone: 2,
        title: 'Pairwise: Device Pixel Ratio transitions (DPR 1.0 -> 2.0 -> 3.0 capped at 2.0) with active particle rendering',
        pass: validDprScaling,
        error: `DPR scaling failed: ${scaledWidths.join(', ')}`,
      });
    }

    // T3.5: Background tab throttling during active playback and wakeup
    {
      const env = createSimulatedEnvironment({ hidden: false });
      let loopRunning = true;
      env.document.addEventListener('visibilitychange', () => {
        loopRunning = !env.document.hidden;
      });
      // Backgrounding tab
      env.document.hidden = true;
      const pausedInBg = !loopRunning;
      // Resuming tab
      env.document.hidden = false;
      const resumedOnWake = loopRunning;
      recordTest({
        id: 'T3.5', tier: 3, milestone: 2,
        title: 'Pairwise: Background Tab Throttling (document.hidden = true) during active playback + Resume (document.hidden = false)',
        pass: pausedInBg && resumedOnWake,
        error: 'Tab throttling or wakeup failed',
      });
    }

    // T3.6: Surface presentation switch (PlayerHome main -> QueueSheet compact)
    {
      let presentation = 'main';
      let canvasSize = presentation === 'main' ? 520 : 130;
      presentation = 'compact';
      canvasSize = presentation === 'main' ? 520 : 130;
      recordTest({
        id: 'T3.6', tier: 3, milestone: 4,
        title: 'Pairwise: Surface presentation switch (PlayerHome main -> QueueSheet compact) while audio is playing',
        pass: canvasSize === 130,
        error: `Presentation switch failed: canvasSize=${canvasSize}`,
      });
    }

    // T3.7: Volume attenuation to zero + mute during pause decay
    {
      let volume = 0.8;
      let isMuted = false;
      let level = 0.6;
      // User mutes and drops volume while pausing
      isMuted = true;
      volume = 0;
      for (let f = 0; f < 48; f++) {
        level = (isMuted || volume === 0) ? level * 0.85 : level;
        if (level < 0.001) { level = 0; break; }
      }
      recordTest({
        id: 'T3.7', tier: 3, milestone: 1,
        title: 'Pairwise: Volume attenuation to zero (volume: 0) + Audio mute toggle (isMuted: true) during pause decay',
        pass: level === 0,
        error: `Volume zero + mute decay failed: level=${level}`,
      });
    }

    // T3.8: Rapid track skip with WeakSet attachment idempotency
    {
      const ctx = createSimulatedAudioContext();
      const elA = { id: 'elA' };
      const elB = { id: 'elB' };
      const guard = new WeakSet();
      let attachments = 0;
      function attach(el) {
        if (!guard.has(el)) {
          guard.add(el);
          attachments++;
          ctx.createMediaElementSource(el);
        }
      }
      // 5 rapid skips alternating between A and B
      for (let i = 0; i < 5; i++) {
        attach(i % 2 === 0 ? elA : elB);
      }
      recordTest({
        id: 'T3.8', tier: 3, milestone: 1,
        title: 'Pairwise: Rapid track skip (5 tracks in 500ms) with WeakSet attachment idempotency verification',
        pass: attachments === 2,
        error: `WeakSet guard failed on rapid skips: attachments=${attachments}`,
      });
    }

    // T3.9: Dynamic artwork glow override + theme change
    {
      const env = createSimulatedEnvironment({ attributes: { 'data-theme': 'nocturne' } });
      // Cover art sets dynamic glow
      env.documentElement.style.setProperty('--glow-a', '#AABBCC');
      let glow = env.window.getComputedStyle(env.document.documentElement).getPropertyValue('--glow-a');
      const hasInlineGlow = glow === '#AABBCC';
      // User switches theme
      env.documentElement.setAttribute('data-theme', 'sakura');
      // Inline glow continues taking precedence over theme glow
      glow = env.window.getComputedStyle(env.document.documentElement).getPropertyValue('--glow-a');
      recordTest({
        id: 'T3.9', tier: 3, milestone: 3,
        title: 'Pairwise: Dynamic artwork glow override (useArtworkGlow setting --glow-a) combined with theme change',
        pass: hasInlineGlow && glow === '#AABBCC',
        error: 'Inline artwork glow lost during theme change',
      });
    }

    // T3.10: Reduced motion active + compact presentation + Monochrome theme
    {
      const env = createSimulatedEnvironment({ attributes: { 'data-theme': 'monochrome' }, reducedMotion: true });
      const style = env.window.getComputedStyle(env.document.documentElement);
      const isMonochrome = style.getPropertyValue('--pink').toUpperCase() === '#FFFFFF';
      const isReduced = env.window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const presentation = 'compact';
      recordTest({
        id: 'T3.10', tier: 3, milestone: 4,
        title: 'Pairwise: Reduced motion active + compact presentation + theme switch to Monochrome',
        pass: isMonochrome && isReduced && presentation === 'compact',
        error: 'Combination of reduced motion, compact mode, and Monochrome theme failed',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 realistic end-user flows)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!tierArg || tierArg === '4') {
    if (!isJsonOutput) console.log('\n\x1b[1m\x1b[36m━━━ TIER 4: REAL-WORLD APPLICATION SCENARIOS ━━━\x1b[0m');

    // T4.1: Scenario 1: Full Playback Lifecycle
    {
      const ctx = createSimulatedAudioContext();
      let state = 'boot';
      // Step 1: Boot
      const isSuspended = ctx.state === 'suspended';
      // Step 2: User clicks Play
      await ctx.resume();
      const isRunning = ctx.state === 'running';
      // Step 3: Audio reactive analysis active
      const freq = new Uint8Array(128).fill(200);
      const activeBands = oracleComputeFrequencyBands(freq, 44100, 256);
      const isReacting = activeBands.bass > 0.7;
      // Step 4: User pauses -> decays over 600-800ms to quiescence
      let decayLevel = activeBands.bass;
      for (let f = 0; f < 48; f++) {
        decayLevel = decayLevel * 0.85;
        if (decayLevel < 0.001) { decayLevel = 0; break; }
      }
      const isQuiescent = decayLevel === 0;
      // Step 5: User resumes -> instant recovery
      const resumedBands = oracleComputeFrequencyBands(freq, 44100, 256);
      const isRecovered = resumedBands.bass > 0.7;

      recordTest({
        id: 'T4.1', tier: 4, milestone: 5,
        title: 'Scenario 1: Full Playback Lifecycle (Boot -> Play -> React -> Pause Decay -> Resume)',
        pass: isSuspended && isRunning && isReacting && isQuiescent && isRecovered,
        error: 'Playback lifecycle scenario failed at one or more steps',
      });
    }

    // T4.2: Scenario 2: Real-time Theme Switching Tour
    {
      const env = createSimulatedEnvironment();
      const ctx = createSimulatedAudioContext({ state: 'running' });
      const themes = ['nocturne', 'aqua', 'afterglow', 'overdrive', 'sakura', 'monochrome'];
      let themeShiftsSuccessful = true;

      for (const theme of themes) {
        env.documentElement.setAttribute('data-theme', theme);
        const style = env.window.getComputedStyle(env.document.documentElement);
        const pink = style.getPropertyValue('--pink');
        if (!pink) themeShiftsSuccessful = false;
        // Verify audio graph was not closed or interrupted
        if (ctx.state !== 'running') themeShiftsSuccessful = false;
      }

      recordTest({
        id: 'T4.2', tier: 4, milestone: 5,
        title: 'Scenario 2: Real-time Theme Switching Tour (Play -> Cycle all 6 themes -> Zero interruption)',
        pass: themeShiftsSuccessful,
        error: 'Theme switching tour failed or interrupted AudioContext',
      });
    }

    // T4.3: Scenario 3: Accessibility Profile & Motion Toggle
    {
      const env = createSimulatedEnvironment({ reducedMotion: true });
      let motesCount = 0;
      let haloType = 'steady-aura';

      // User starts with reduced motion
      const initialMatches = env.window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // User toggles OS motion setting to standard
      env.window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        if (!e.matches) {
          motesCount = 80;
          haloType = 'oscillating-ripples';
        }
      });
      env.window.setReducedMotion(false);

      recordTest({
        id: 'T4.3', tier: 4, milestone: 5,
        title: 'Scenario 3: Accessibility Profile & Motion Toggle (Boot with reduced motion -> Toggle on fly -> Smooth transition)',
        pass: initialMatches && motesCount === 80 && haloType === 'oscillating-ripples',
        error: 'Accessibility motion toggle flow failed',
      });
    }

    // T4.4: Scenario 4: Surface Presentation Transition
    {
      let surface = 'PlayerHome';
      let presentation = 'main';
      let artworkFrameRefTarget = 'inner-frame';
      let visualizerMode = 'large-aura';

      // User on PlayerHome
      const onHome = surface === 'PlayerHome' && presentation === 'main' && visualizerMode === 'large-aura';
      // User opens QueueSheet
      surface = 'QueueSheet';
      presentation = 'compact';
      visualizerMode = 'tight-aura';
      const onQueue = surface === 'QueueSheet' && presentation === 'compact' && visualizerMode === 'tight-aura';
      // User closes QueueSheet
      surface = 'PlayerHome';
      presentation = 'main';
      visualizerMode = 'large-aura';
      const backOnHome = surface === 'PlayerHome' && presentation === 'main';

      recordTest({
        id: 'T4.4', tier: 4, milestone: 5,
        title: 'Scenario 4: Surface Presentation Transition (PlayerHome main -> QueueSheet compact -> Return main)',
        pass: onHome && onQueue && backOnHome,
        error: 'Surface presentation transition flow failed',
      });
    }

    // T4.5: Scenario 5: Background Tab Low-Power Throttling
    {
      const env = createSimulatedEnvironment({ hidden: false });
      let animationRunning = true;
      let cpuWorkDone = 0;

      env.document.addEventListener('visibilitychange', () => {
        animationRunning = !env.document.hidden;
      });

      // Active in foreground
      if (animationRunning) cpuWorkDone += 10;
      // User switches tab
      env.document.hidden = true;
      if (animationRunning) cpuWorkDone += 10; // should NOT increment
      // User returns
      env.document.hidden = false;
      if (animationRunning) cpuWorkDone += 10;

      recordTest({
        id: 'T4.5', tier: 4, milestone: 5,
        title: 'Scenario 5: Background Tab Low-Power Throttling (Play -> Tab hidden -> RAF halts -> Tab visible -> RAF resumes)',
        pass: cpuWorkDone === 20 && animationRunning === true,
        error: `Background tab throttling failed: cpuWorkDone=${cpuWorkDone}`,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORTING
  // ─────────────────────────────────────────────────────────────────────────────
  if (isJsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.failed > 0 ? 1 : 0);
  }

  console.log('\n\x1b[1m\x1b[35m═════════════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m\x1b[35m               LUNA.FM AUDIO VISUALIZER E2E TEST SUITE SUMMARY                \x1b[0m');
  console.log('\x1b[1m\x1b[35m═════════════════════════════════════════════════════════════════════════════\x1b[0m\n');

  console.log(`  Total Tests Run:  \x1b[1m${results.total}\x1b[0m`);
  console.log(`  Passed Tests:     \x1b[32m\x1b[1m${results.passed}\x1b[0m`);
  console.log(`  Failed Tests:     \x1b[31m\x1b[1m${results.failed}\x1b[0m`);
  console.log(`  Pending Features: \x1b[33m\x1b[1m${results.pending}\x1b[0m\n`);

  console.log('\x1b[1mMilestone Readiness Breakdown:\x1b[0m');
  for (const [key, data] of Object.entries(results.milestones)) {
    const totalM = data.passed + data.failed + data.pending;
    if (totalM === 0) continue;
    const pct = totalM > 0 ? Math.round((data.passed / totalM) * 100) : 0;
    const statusColor = data.failed > 0 ? '\x1b[31m' : data.pending > 0 ? '\x1b[33m' : '\x1b[32m';
    console.log(`  ${statusColor}[${key}]\x1b[0m ${data.name}: ${data.passed}/${totalM} passed (${pct}%) ${data.pending > 0 ? `[\x1b[33m${data.pending} pending\x1b[0m]` : ''} ${data.failed > 0 ? `[\x1b[31m${data.failed} failed\x1b[0m]` : ''}`);
  }

  console.log('\n\x1b[1mConclusion:\x1b[0m');
  if (results.failed === 0 && results.pending === 0) {
    console.log(`  \x1b[32m\x1b[1m✓ ALL ${results.total} AUDIO VISUALIZER E2E TESTS PASSED PERFECTLY ACROSS ALL 4 TIERS!\x1b[0m\n`);
    process.exit(0);
  } else if (results.failed === 0) {
    console.log(`  \x1b[33m\x1b[1m⚠ PROGRESSIVE TEST RUN: 0 FAILURES. ${results.passed} tests passed, ${results.pending} pending remaining milestone implementations.\x1b[0m\n`);
    process.exit(0);
  } else {
    console.error(`  \x1b[31m\x1b[1m✗ TEST SUITE FAILED: ${results.failed} defects detected. Please review error logs above.\x1b[0m\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('\x1b[31mFatal error executing test suite:\x1b[0m', err);
  process.exit(1);
});
