/**
 * LUNA.FM v2 — Audio Engine Hook
 * Dual-element crossfade, full playback control.
 * See BACKEND.md §7 for the exhaustive contract.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Track, AudioEngine, RepeatMode, EngineSnapshot } from '../types';
import { clamp, prefersReducedMotion, shuffle, inferMime } from '../utils/helpers';
import {
  attachAudioElement,
  resumeAudioContext,
  getAudioAnalysisData,
  type AudioAnalysisData,
} from '../services/audioAnalysis';

const FADE_MS = 300;

/** Token-based fade using requestAnimationFrame */
const fadeTokens = new WeakMap<HTMLAudioElement, number>();

function fade(
  el: HTMLAudioElement,
  target: number,
  ms: number,
  done?: () => void,
) {
  const token = (fadeTokens.get(el) ?? 0) + 1;
  fadeTokens.set(el, token);

  if (ms <= 0 || prefersReducedMotion()) {
    el.volume = target;
    done?.();
    return;
  }

  const from = el.volume;
  const start = performance.now();
  const step = (now: number) => {
    if (fadeTokens.get(el) !== token) return; // cancelled
    const t = Math.min(1, (now - start) / ms);
    el.volume = from + (target - from) * t;
    if (t < 1) requestAnimationFrame(step);
    else done?.();
  };
  requestAnimationFrame(step);
}

function cancelFade(el: HTMLAudioElement) {
  fadeTokens.set(el, (fadeTokens.get(el) ?? 0) + 1);
}

export function useAudioEngine(): AudioEngine {
  // ── State ──────────────────────────────────────────────────
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffled, setIsShuffled] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // ── Refs ───────────────────────────────────────────────────
  const elsRef = useRef<{ a: HTMLAudioElement; b: HTMLAudioElement; active: 'a' | 'b' } | null>(null);
  const volumeRef = useRef(0.75);
  const mutedRef = useRef(false);
  const activeTrackIdRef = useRef<string | null>(null);
  const playTokenRef = useRef(0);
  const repeatRef = useRef<RepeatMode>('off');
  const queueRef = useRef<Track[]>([]);
  const currentIndexRef = useRef(-1);
  const preShuffleRef = useRef<Track[] | null>(null);
  const isShuffledRef = useRef(false);
  const currentTrackRef = useRef<Track | null>(null);
  const isPlayingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { repeatRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { isShuffledRef.current = isShuffled; }, [isShuffled]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // ── Init elements ─────────────────────────────────────────
  useEffect(() => {
    const a = new Audio();
    const b = new Audio();
    a.preload = 'metadata';
    b.preload = 'metadata';
    elsRef.current = { a, b, active: 'a' };

    attachAudioElement(a);
    attachAudioElement(b);

    const getActive = () => {
      const els = elsRef.current!;
      return els[els.active];
    };

    const wireEvents = (el: HTMLAudioElement) => {
      el.addEventListener('timeupdate', () => {
        if (el === getActive()) setCurrentTime(el.currentTime);
      });
      el.addEventListener('loadedmetadata', () => {
        if (el === getActive()) {
          const d = Number.isFinite(el.duration) && el.duration > 0
            ? el.duration
            : (currentTrackRef.current?.duration ?? 0);
          setDuration(d);
        }
      });
      el.addEventListener('durationchange', () => {
        if (el === getActive()) {
          const d = Number.isFinite(el.duration) && el.duration > 0
            ? el.duration
            : (currentTrackRef.current?.duration ?? 0);
          setDuration(d);
        }
      });
      el.addEventListener('play', () => {
        if (el === getActive()) setIsPlaying(true);
      });
      el.addEventListener('pause', () => {
        if (el === getActive()) setIsPlaying(false);
      });
      el.addEventListener('waiting', () => {
        if (el === getActive()) setIsBuffering(true);
      });
      el.addEventListener('playing', () => {
        if (el === getActive()) {
          setIsBuffering(false);
          setIsPlaying(true);
        }
      });
      el.addEventListener('ended', () => {
        if (el === getActive()) nextAuto();
      });
      el.addEventListener('error', () => {
        if (el === getActive()) {
          const msg = el.error?.message || 'audio playback error';
          setError(msg);
          setIsPlaying(false);
          setIsBuffering(false);
        }
      });
    };

    wireEvents(a);
    wireEvents(b);

    return () => {
      a.pause(); a.src = '';
      b.pause(); b.src = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── nextAuto (from ended event) ───────────────────────────
  const nextAuto = useCallback(() => {
    const els = elsRef.current;
    if (!els) return;
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    const rm = repeatRef.current;

    if (q.length === 0) return;

    if (rm === 'one') {
      const active = els[els.active];
      active.currentTime = 0;
      active.play().catch(() => {});
      return;
    }

    if (idx + 1 < q.length) {
      playTrackImpl(q[idx + 1], q);
    } else if (rm === 'all') {
      playTrackImpl(q[0], q);
    } else {
      setIsPlaying(false);
      els[els.active].pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── playTrack ─────────────────────────────────────────────
  const playTrackImpl = useCallback((
    track: Track,
    newQueue?: Track[],
    opts?: { autoplay?: boolean; startAt?: number },
  ) => {
    const els = elsRef.current;
    if (!els) return;

    resumeAudioContext().catch(() => {});

    const autoplay = opts?.autoplay !== false;
    const startAt = opts?.startAt;

    // Fast path: same track already active
    if (startAt === undefined && activeTrackIdRef.current === track.id) {
      if (autoplay) {
        toggleImpl();
      }
      return;
    }

    // Queue resolution
    let resolvedQueue = newQueue ?? queueRef.current;
    if (resolvedQueue.length === 0) resolvedQueue = [track];
    let trackIdx = resolvedQueue.findIndex(t => t.id === track.id);
    if (trackIdx === -1) {
      resolvedQueue = [...resolvedQueue, track];
      trackIdx = resolvedQueue.length - 1;
    }

    setQueue(resolvedQueue);
    setCurrentIndex(trackIdx);
    setCurrentTrack(track);
    currentTrackRef.current = track;
    setCurrentTime(startAt ?? 0);
    const initialDuration = track.duration && track.duration > 0 ? track.duration : 0;
    setDuration(initialDuration);
    setError(null);
    setIsBuffering(true);

    // Prepare idle element
    const activeKey = els.active;
    const idleKey = activeKey === 'a' ? 'b' : 'a';
    const idle = els[idleKey];
    const prev = els[activeKey];

    cancelFade(idle);
    idle.pause();
    idle.src = track.src;
    idle.volume = 0;
    idle.muted = mutedRef.current;
    idle.load();

    if (!autoplay) {
      // Session restore path — load paused
      els.active = idleKey;
      activeTrackIdRef.current = track.id;

      const setTime = () => {
        if (startAt !== undefined && Number.isFinite(startAt)) {
          idle.currentTime = startAt;
          setCurrentTime(startAt);
        }
        setDuration(Number.isFinite(idle.duration) ? idle.duration : 0);
      };

      if (idle.readyState >= 1) { // HAVE_METADATA
        setTime();
      } else {
        idle.addEventListener('loadedmetadata', setTime, { once: true });
      }

      setIsBuffering(false);
      setIsPlaying(false);

      // Clean up previous element
      cancelFade(prev);
      prev.pause();
      prev.src = '';

      updateMediaSession(track);
      return;
    }

    // Autoplay path
    const token = ++playTokenRef.current;

    idle.play().then(() => {
      if (playTokenRef.current !== token) return; // stale

      // Swap active
      els.active = idleKey;
      activeTrackIdRef.current = track.id;

      if (startAt !== undefined && Number.isFinite(startAt)) {
        idle.currentTime = startAt;
      }

      // Fade in new
      fade(idle, volumeRef.current, FADE_MS);

      // Fade out old
      if (prev.src && !prev.paused) {
        fade(prev, 0, FADE_MS, () => {
          prev.pause();
          prev.src = '';
        });
      }

      setIsBuffering(false);
      setIsPlaying(true);
      updateMediaSession(track);
    }).catch((err: DOMException) => {
      if (playTokenRef.current !== token) return;

      if (err.name === 'NotAllowedError') {
        cancelFade(idle);
        cancelFade(prev);
        prev.pause();
        prev.src = '';

        els.active = idleKey;
        activeTrackIdRef.current = track.id;
        idle.volume = 0;

        setIsBuffering(false);
        setIsPlaying(false);
        updateMediaSession(track);
        // Toast surfaced by context
      } else {
        // Network / decode error — don't swap
        cancelFade(idle);
        idle.pause();
        idle.src = '';

        setCurrentTrack(prev.src ? (queueRef.current.find(t => t.id === activeTrackIdRef.current) ?? null) : null);
        setError('this signal dropped — could not load the audio.');
        setIsBuffering(false);
      }
    });
  }, []);

  // ── toggle ────────────────────────────────────────────────
  const toggleImpl = useCallback(() => {
    const els = elsRef.current;
    if (!els) return;
    const active = els[els.active];

    resumeAudioContext().catch(() => {});

    if (!active.src && queueRef.current.length > 0) {
      playTrackImpl(queueRef.current[0], queueRef.current);
      return;
    }

    if (active.paused) {
      active.play().then(() => {
        if (active.volume < volumeRef.current && !mutedRef.current) {
          fade(active, volumeRef.current, FADE_MS);
        }
        setIsPlaying(true);
      }).catch((err: DOMException) => {
        if (err.name === 'NotAllowedError') {
          setError('playback was blocked — tap play.');
        }
      });
    } else {
      active.pause();
      setIsPlaying(false);
    }
  }, [playTrackImpl]);

  // ── next (manual) ─────────────────────────────────────────
  const nextManual = useCallback(() => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    const rm = repeatRef.current;
    if (q.length === 0) return;

    if (idx + 1 < q.length) {
      playTrackImpl(q[idx + 1], q);
    } else if (rm === 'all') {
      playTrackImpl(q[0], q);
    } else {
      // End of queue, no repeat — pause
      const els = elsRef.current;
      if (els) {
        els[els.active].pause();
        setIsPlaying(false);
      }
    }
  }, [playTrackImpl]);

  // ── prev ──────────────────────────────────────────────────
  const prevImpl = useCallback(() => {
    const els = elsRef.current;
    if (!els) return;
    const active = els[els.active];
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    const rm = repeatRef.current;

    if (active.currentTime > 3) {
      active.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (idx > 0) {
      playTrackImpl(q[idx - 1], q);
    } else if (rm === 'all') {
      playTrackImpl(q[q.length - 1], q);
    } else {
      active.currentTime = 0;
      setCurrentTime(0);
    }
  }, [playTrackImpl]);

  // ── seek ──────────────────────────────────────────────────
  const seekImpl = useCallback((seconds: number) => {
    const els = elsRef.current;
    if (!els) return;
    const active = els[els.active];
    const maxDur = Number.isFinite(active.duration) && active.duration > 0
      ? active.duration
      : (currentTrackRef.current?.duration ?? 0);
    const clamped = maxDur > 0 ? clamp(seconds, 0, maxDur) : Math.max(0, seconds);
    try {
      active.currentTime = clamped;
    } catch {
      // Audio element might not be ready or seekable yet
    }
    setCurrentTime(clamped);
  }, []);

  // ── setVolume ─────────────────────────────────────────────
  const setVolumeImpl = useCallback((v: number) => {
    const clamped = clamp(v, 0, 1);
    volumeRef.current = clamped;
    setVolumeState(clamped);

    const els = elsRef.current;
    if (els) {
      const active = els[els.active];
      cancelFade(active);
      active.volume = clamped;
    }

    if (clamped > 0 && mutedRef.current) {
      mutedRef.current = false;
      setIsMuted(false);
      if (els) {
        els.a.muted = false;
        els.b.muted = false;
      }
    }
  }, []);

  // ── toggleMute ────────────────────────────────────────────
  const toggleMuteImpl = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setIsMuted(next);
    const els = elsRef.current;
    if (els) {
      els.a.muted = next;
      els.b.muted = next;
    }
  }, []);

  // ── toggleShuffle ─────────────────────────────────────────
  const toggleShuffleImpl = useCallback(() => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    const currentTrackInQueue = idx >= 0 && idx < q.length ? q[idx] : null;

    if (!isShuffledRef.current) {
      preShuffleRef.current = [...q];
      const others = q.filter((_, i) => i !== idx);
      const shuffled = currentTrackInQueue
        ? [currentTrackInQueue, ...shuffle(others)]
        : shuffle(q);
      setQueue(shuffled);
      setCurrentIndex(currentTrackInQueue ? 0 : -1);
      setIsShuffled(true);
    } else {
      const original = preShuffleRef.current ?? q;
      const restoredIdx = currentTrackInQueue
        ? original.findIndex(t => t.id === currentTrackInQueue.id)
        : -1;
      setQueue(original);
      setCurrentIndex(restoredIdx >= 0 ? restoredIdx : -1);
      preShuffleRef.current = null;
      setIsShuffled(false);
    }
  }, []);

  // ── cycleRepeat ───────────────────────────────────────────
  const cycleRepeatImpl = useCallback(() => {
    setRepeatMode(prev => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      repeatRef.current = next;
      return next;
    });
  }, []);

  // ── playAt ────────────────────────────────────────────────
  const playAtImpl = useCallback((index: number) => {
    const q = queueRef.current;
    if (index >= 0 && index < q.length) {
      playTrackImpl(q[index], q);
    }
  }, [playTrackImpl]);

  // ── enqueue ───────────────────────────────────────────────
  const enqueueImpl = useCallback((track: Track) => {
    setQueue(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  }, []);

  // ── removeFromQueue ───────────────────────────────────────
  const removeFromQueueImpl = useCallback((index: number) => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    if (index < 0 || index >= q.length) return;

    const isCurrentTrack = index === idx;
    const newQueue = q.filter((_, i) => i !== index);

    if (isCurrentTrack) {
      if (newQueue.length === 0) {
        const els = elsRef.current;
        if (els) {
          els[els.active].pause();
          els[els.active].src = '';
        }
        setCurrentTrack(null);
        setIsPlaying(false);
        setQueue([]);
        setCurrentIndex(-1);
        activeTrackIdRef.current = null;
      } else {
        const nextIdx = Math.min(index, newQueue.length - 1);
        setQueue(newQueue);
        playTrackImpl(newQueue[nextIdx], newQueue);
      }
    } else {
      setQueue(newQueue);
      if (index < idx) {
        setCurrentIndex(idx - 1);
      }
    }
  }, [playTrackImpl]);

  // ── clearQueue ────────────────────────────────────────────
  const clearQueueImpl = useCallback(() => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    if (idx >= 0 && idx < q.length) {
      const current = q[idx];
      setQueue([current]);
      setCurrentIndex(0);
    } else {
      setQueue([]);
      setCurrentIndex(-1);
    }
  }, []);

  // ── snapshot ──────────────────────────────────────────────
  const snapshotImpl = useCallback((): EngineSnapshot => ({
    currentTrackId: activeTrackIdRef.current,
    queueIds: queueRef.current.map(t => t.id),
    volume: volumeRef.current,
    isMuted: mutedRef.current,
    repeatMode: repeatRef.current,
    isShuffled: isShuffledRef.current,
    currentTime: elsRef.current ? elsRef.current[elsRef.current.active].currentTime : 0,
  }), []);

  // ── hydrate ───────────────────────────────────────────────
  const hydrateImpl = useCallback((snap: EngineSnapshot, byId: Map<string, Track>) => {
    // Volume, mute, repeat, shuffle
    const v = typeof snap.volume === 'number' ? clamp(snap.volume, 0, 1) : 0.75;
    volumeRef.current = v;
    setVolumeState(v);

    const m = typeof snap.isMuted === 'boolean' ? snap.isMuted : false;
    mutedRef.current = m;
    setIsMuted(m);
    if (elsRef.current) {
      elsRef.current.a.muted = m;
      elsRef.current.b.muted = m;
    }

    if (snap.repeatMode === 'off' || snap.repeatMode === 'all' || snap.repeatMode === 'one') {
      repeatRef.current = snap.repeatMode;
      setRepeatMode(snap.repeatMode);
    }

    if (typeof snap.isShuffled === 'boolean') {
      isShuffledRef.current = snap.isShuffled;
      setIsShuffled(snap.isShuffled);
    }

    // Rebuild queue
    const resolvedQueue = Array.isArray(snap.queueIds)
      ? snap.queueIds.map(id => byId.get(id)).filter(Boolean) as Track[]
      : [];

    if (resolvedQueue.length > 0) setQueue(resolvedQueue);

    // Restore track
    if (snap.currentTrackId && byId.has(snap.currentTrackId)) {
      const track = byId.get(snap.currentTrackId)!;
      const q = resolvedQueue.length > 0 ? resolvedQueue : [track];
      const startAt = typeof snap.currentTime === 'number' && Number.isFinite(snap.currentTime) ? snap.currentTime : 0;
      playTrackImpl(track, q, { autoplay: false, startAt });
    }
  }, [playTrackImpl]);

  // ── MediaSession ──────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => toggleImpl());
    navigator.mediaSession.setActionHandler('pause', () => toggleImpl());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevImpl());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextManual());
    navigator.mediaSession.setActionHandler('seekbackward', (d) => seekImpl(currentTime - (d.seekOffset ?? 10)));
    navigator.mediaSession.setActionHandler('seekforward', (d) => seekImpl(currentTime + (d.seekOffset ?? 10)));
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (d.seekTime != null) seekImpl(d.seekTime);
    });
  }, [toggleImpl, prevImpl, nextManual, seekImpl, currentTime]);

  const getAudioData = useCallback((): AudioAnalysisData => {
    return getAudioAnalysisData(isPlayingRef.current);
  }, []);

  return {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    queue,
    currentIndex,
    error,

    playTrack: playTrackImpl,
    toggle: toggleImpl,
    next: nextManual,
    prev: prevImpl,
    seek: seekImpl,
    setVolume: setVolumeImpl,
    toggleMute: toggleMuteImpl,
    toggleShuffle: toggleShuffleImpl,
    cycleRepeat: cycleRepeatImpl,
    playAt: playAtImpl,
    enqueue: enqueueImpl,
    removeFromQueue: removeFromQueueImpl,
    clearQueue: clearQueueImpl,

    snapshot: snapshotImpl,
    hydrate: hydrateImpl,
    getAudioData,
  };
}

function updateMediaSession(track: Track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork: track.artworkUrl
      ? [{ src: track.artworkUrl, sizes: '512x512', type: inferMime(track.artworkUrl) }]
      : [],
  });
}

