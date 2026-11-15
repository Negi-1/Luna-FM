/**
 * ═══════════════════════════════════════════════════════════════
 * LUNA.FM v2 — Web Audio Frequency Analysis Service
 * Manages AudioContext singleton, AnalyserNode, dual-element attachment,
 * dynamic frequency band extraction (bass, mid, treble), RMS power,
 * and exponential decay smoothing with quiescent settlement.
 * ═══════════════════════════════════════════════════════════════
 */

export interface AudioAnalysisData {
  bass: number; // [0, 1] smoothed (20-250 Hz)
  mid: number; // [0, 1] smoothed (250-2500 Hz)
  treble: number; // [0, 1] smoothed (2500-16000 Hz)
  rms: number; // [0, 1] smoothed overall RMS power
  rawFrequencies: Uint8Array; // FFT frequency bins [0-255]
  isQuiescent: boolean; // true when paused and levels have decayed to 0
}

interface WindowWithAudio {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

// Module-level singletons
let audioCtx: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
const attachedElements = new WeakSet<HTMLAudioElement>();

// FFT buffers and smoothing state
const FFT_SIZE = 256;
const BIN_COUNT = FFT_SIZE / 2; // 128 bins
const freqBuffer = new Uint8Array(BIN_COUNT);
const timeBuffer = new Uint8Array(FFT_SIZE);

let smoothedBass = 0;
let smoothedMid = 0;
let smoothedTreble = 0;
let smoothedRms = 0;

/**
 * Returns or creates the global AudioContext singleton.
 * Safe in browser and headless/mock environments.
 */
export function getAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx;
  const g =
    typeof window !== 'undefined'
      ? (window as unknown as WindowWithAudio)
      : typeof globalThis !== 'undefined'
        ? (globalThis as unknown as WindowWithAudio)
        : null;

  if (!g) return null;
  const AudioCtxClass = g.AudioContext || g.webkitAudioContext;
  if (AudioCtxClass) {
    try {
      audioCtx = new AudioCtxClass();
    } catch (err) {
      console.warn('AudioContext instantiation failed:', err);
    }
  }
  return audioCtx;
}

/**
 * Returns or creates the global AnalyserNode singleton routed to destination.
 */
export function getAnalyser(): AnalyserNode | null {
  if (analyserNode) return analyserNode;
  const ctx = getAudioContext();
  if (!ctx) return null;

  try {
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = FFT_SIZE;
    analyserNode.smoothingTimeConstant = 0.82;
    // Route analyser output directly to destination for audio graph continuity
    analyserNode.connect(ctx.destination);
  } catch (err) {
    console.warn('AnalyserNode setup failed:', err);
  }
  return analyserNode;
}

/**
 * Attaches an HTMLAudioElement into the Web Audio analysis graph.
 * Guarded by WeakSet to ensure createMediaElementSource is executed strictly once per instance.
 */
export function attachAudioElement(el: HTMLAudioElement): void {
  if (!el) return;
  if (attachedElements.has(el)) return;

  const ctx = getAudioContext();
  const analyser = getAnalyser();
  if (!ctx || !analyser) return;

  try {
    const source = ctx.createMediaElementSource(el);
    source.connect(analyser);
    attachedElements.add(el);
  } catch (err) {
    console.warn('MediaElementSource attachment error:', err);
  }
}

/**
 * Resumes AudioContext on user gesture if currently suspended.
 */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (err) {
      console.warn('Failed to resume AudioContext:', err);
    }
  }
}

/**
 * Pure calculation: Extracts normalized [0, 1] energies for bass, mid, and treble bands.
 * - Bass: 20 Hz to 250 Hz
 * - Mid: 250 Hz to 2500 Hz
 * - Treble: 2500 Hz to 16000 Hz
 */
export function computeFrequencyBands(
  freqData: Uint8Array,
  sampleRate: number,
  fftSize: number,
): { bass: number; mid: number; treble: number } {
  if (!freqData || freqData.length === 0 || sampleRate <= 0 || fftSize <= 0) {
    return { bass: 0, mid: 0, treble: 0 };
  }

  const binWidth = sampleRate / fftSize;
  const maxBin = freqData.length;

  const bassStart = Math.max(0, Math.floor(20 / binWidth));
  const bassEnd = Math.min(maxBin, Math.max(bassStart + 1, Math.ceil(250 / binWidth)));

  const midStart = Math.min(maxBin, Math.max(bassEnd, Math.floor(250 / binWidth)));
  const midEnd = Math.min(maxBin, Math.max(midStart + 1, Math.ceil(2500 / binWidth)));

  const trebleStart = Math.min(maxBin, Math.max(midEnd, Math.floor(2500 / binWidth)));
  const trebleEnd = Math.min(maxBin, Math.max(trebleStart + 1, Math.ceil(16000 / binWidth)));

  function calcAverage(start: number, end: number): number {
    if (end <= start) return 0;
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += freqData[i];
    }
    return sum / ((end - start) * 255);
  }

  return {
    bass: Math.min(1, Math.max(0, calcAverage(bassStart, bassEnd))),
    mid: Math.min(1, Math.max(0, calcAverage(midStart, midEnd))),
    treble: Math.min(1, Math.max(0, calcAverage(trebleStart, trebleEnd))),
  };
}

/**
 * Pure calculation: Computes RMS power from time-domain byte waveform data [0, 255].
 * Center 128 corresponds to 0 amplitude.
 */
export function computeRMS(timeData: Uint8Array): number {
  if (!timeData || timeData.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < timeData.length; i++) {
    const normalized = (timeData[i] - 128) / 128;
    sumSquares += normalized * normalized;
  }
  const rms = Math.sqrt(sumSquares / timeData.length);
  return Math.min(1, Math.max(0, rms));
}

/**
 * Pure calculation: Applies exponential decay smoothing: prev * (1 - alpha) + current * alpha.
 * Default alpha is 0.15 (giving prev * 0.85 + current * 0.15).
 * Snaps to 0 when below 0.001 for clean quiescent settlement.
 */
export function applyExponentialSmoothing(
  prev: number,
  current: number,
  alpha = 0.15,
): number {
  const smoothed = prev * (1 - alpha) + current * alpha;
  return smoothed < 0.001 ? 0 : smoothed;
}

/**
 * Synchronous frame query for audio analysis data.
 * Zero React state updates. Decays to quiescent state (0) over 600-800ms upon pause.
 */
export function getAudioAnalysisData(isPlaying = true): AudioAnalysisData {
  const ctx = getAudioContext();
  const analyser = getAnalyser();

  let rawBass = 0;
  let rawMid = 0;
  let rawTreble = 0;
  let rawRms = 0;

  if (ctx && analyser && isPlaying) {
    try {
      analyser.getByteFrequencyData(freqBuffer);
      analyser.getByteTimeDomainData(timeBuffer);

      const sampleRate = ctx.sampleRate || 44100;
      const bands = computeFrequencyBands(freqBuffer, sampleRate, analyser.fftSize || FFT_SIZE);
      rawBass = bands.bass;
      rawMid = bands.mid;
      rawTreble = bands.treble;
      rawRms = computeRMS(timeBuffer);
    } catch {
      // In case analyser access fails in headless/test environments
    }
  } else if (!isPlaying) {
    // When paused, input target is 0, decaying exponentially: prev * 0.85
    rawBass = 0;
    rawMid = 0;
    rawTreble = 0;
    rawRms = 0;
  }

  smoothedBass = applyExponentialSmoothing(smoothedBass, rawBass, 0.15);
  smoothedMid = applyExponentialSmoothing(smoothedMid, rawMid, 0.15);
  smoothedTreble = applyExponentialSmoothing(smoothedTreble, rawTreble, 0.15);
  smoothedRms = applyExponentialSmoothing(smoothedRms, rawRms, 0.15);

  const isQuiescent =
    !isPlaying &&
    smoothedBass === 0 &&
    smoothedMid === 0 &&
    smoothedTreble === 0 &&
    smoothedRms === 0;

  if (isQuiescent) {
    freqBuffer.fill(0);
    timeBuffer.fill(128);
  }

  return {
    bass: smoothedBass,
    mid: smoothedMid,
    treble: smoothedTreble,
    rms: smoothedRms,
    rawFrequencies: freqBuffer,
    isQuiescent,
  };
}

/**
 * Resets all analysis buffers and smoothed values to initial state.
 */
export function resetAudioAnalysis(): void {
  smoothedBass = 0;
  smoothedMid = 0;
  smoothedTreble = 0;
  smoothedRms = 0;
  freqBuffer.fill(0);
  timeBuffer.fill(128);
}
