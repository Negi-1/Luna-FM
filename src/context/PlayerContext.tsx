/**
 * LUNA.FM v2 — Player Context & Persistence
 * Manages music catalog, active view, persistence via sessionStorage, and toasts.
 * See BACKEND.md §6 & §8 for the full contracts.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  Album,
  Track,
  AudioEngine,
  ViewName,
  EngineSnapshot,
} from '../types';
import { getMusicCatalog, CatalogError } from '../services/musicCatalog';
import { getLastPlayedTracks } from '../services/discoverService';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useArtworkGlow } from '../hooks/useArtworkGlow';

const STORAGE_KEY = 'luna-fm-player-v2';
const LAST_PLAYED_KEY = 'luna-fm-last-played';

interface PlayerContextValue {
  engine: AudioEngine;
  albums: Album[];
  standaloneTracks: Track[];
  allTracks: Track[];
  byId: Map<string, Track>;
  lastPlayed: Track[];
  recordLastPlayed: (trackId: string) => void;
  clearLastPlayed: () => void;
  status: 'loading' | 'ready' | 'error';
  catalogError: string | null;
  notice: string | null;
  notify: (msg: string) => void;
  clearNotice: () => void;
  view: ViewName;
  setView: (v: ViewName) => void;
  isPlayerExpanded: boolean;
  setIsPlayerExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  retryCatalog: () => void;
  isAdmin: boolean;
  unlockAdmin: () => void;
  lockAdmin: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const engine = useAudioEngine();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [standaloneTracks, setStandaloneTracks] = useState<Track[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('luna-admin-unlocked') === '1' || window.location.search.includes('admin');
  });

  const unlockAdmin = useCallback(() => {
    setIsAdmin(true);
    try {
      sessionStorage.setItem('luna-admin-unlocked', '1');
    } catch {
      // ignore
    }
  }, []);

  const lockAdmin = useCallback(() => {
    setIsAdmin(false);
    try {
      sessionStorage.removeItem('luna-admin-unlocked');
    } catch {
      // ignore
    }
  }, []);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [fetchCounter, setFetchCounter] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<ViewName>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('admin')) {
      return 'admin';
    }
    return 'discover';
  });
  const [isPlayerExpanded, setIsPlayerExpanded] = useState<boolean>(false);

  // Last Played tracks persistence via localStorage
  const [lastPlayedIds, setLastPlayedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LAST_PLAYED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
        }
      }
    } catch {
      // ignore storage access errors
    }
    return [];
  });

  const recordLastPlayed = useCallback((trackId: string) => {
    if (!trackId) return;
    setLastPlayedIds((prev) => {
      if (prev[0] === trackId) return prev;
      const next = [trackId, ...prev.filter((id) => id !== trackId)].slice(0, 15);
      try {
        localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const clearLastPlayed = useCallback(() => {
    setLastPlayedIds([]);
    try {
      localStorage.removeItem(LAST_PLAYED_KEY);
    } catch {
      // ignore
    }
  }, []);

  const hydratedRef = useRef(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Notify helper with 3200ms auto-dismiss
  const notify = useCallback((msg: string) => {
    setNotice(msg);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
    }, 3200);
  }, []);

  const clearNotice = useCallback(() => {
    clearTimeout(noticeTimerRef.current);
    setNotice(null);
  }, []);

  // Listen to engine errors and forward to toast
  useEffect(() => {
    if (engine.error) {
      notify(engine.error);
    }
  }, [engine.error, notify]);

  // Derived tracks & byId map: merges album playlist tracks and central songs-list pool tracks
  const allTracks = useMemo(() => {
    const albumTracks = albums.flatMap((a) => a.tracks);
    const seen = new Set<string>();
    const combined: Track[] = [];

    for (const t of albumTracks) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        combined.push(t);
      }
    }
    for (const t of standaloneTracks) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        combined.push(t);
      }
    }
    return combined;
  }, [albums, standaloneTracks]);
  const byId = useMemo(() => {
    const map = new Map<string, Track>();
    for (const t of allTracks) {
      map.set(t.id, t);
    }
    return map;
  }, [allTracks]);

  // Derived recently played tracks
  const lastPlayed = useMemo(() => {
    return getLastPlayedTracks(lastPlayedIds, byId, 15);
  }, [lastPlayedIds, byId]);

  // Automatically record played tracks to history whenever currentTrack changes
  useEffect(() => {
    if (engine.currentTrack?.id) {
      recordLastPlayed(engine.currentTrack.id);
    }
  }, [engine.currentTrack?.id, recordLastPlayed]);

  // Connect ambient artwork glow
  useArtworkGlow(engine.currentTrack);

  // Fetch catalog
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setCatalogError(null);

    getMusicCatalog()
      .then((cat) => {
        if (cancelled) return;
        setAlbums(cat.albums);
        setStandaloneTracks(cat.standaloneTracks ?? []);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof CatalogError ? err.message : 'Failed to load catalog';
        setCatalogError(msg);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [fetchCounter]);

  const retryCatalog = useCallback(() => {
    setFetchCounter((c) => c + 1);
  }, []);

  // Hydrate once from sessionStorage on ready, or pre-load first track paused
  useEffect(() => {
    if (status !== 'ready' || hydratedRef.current) return;
    hydratedRef.current = true;

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const snap = JSON.parse(raw) as EngineSnapshot;
        if (snap && typeof snap === 'object') {
          engine.hydrate(snap, byId);
          if (snap.currentTrackId && byId.has(snap.currentTrackId)) {
            notify('press play to resume');
            return;
          }
        }
      }
    } catch {
      // Ignore corrupt session state
    }

    // Fresh session: pre-load the first track from the archive paused (no autoplay)
    if (allTracks.length > 0 && !engine.currentTrack) {
      engine.playTrack(allTracks[0], allTracks, { autoplay: false });
    }
  }, [status, byId, allTracks, engine, notify]);

  // Debounced sessionStorage write (600ms)
  useEffect(() => {
    if (status !== 'ready' || !hydratedRef.current) return;

    const timer = setTimeout(() => {
      try {
        const snap = engine.snapshot();
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
      } catch {
        // Ignore quota errors in Safari private mode
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    status,
    engine.currentTrack,
    engine.queue,
    engine.volume,
    engine.isMuted,
    engine.repeatMode,
    engine.isShuffled,
    engine.currentTime,
    engine,
  ]);

  return (
    <PlayerContext.Provider
      value={{
        engine,
        albums,
        standaloneTracks,
        allTracks,
        byId,
        lastPlayed,
        recordLastPlayed,
        clearLastPlayed,
        status,
        catalogError,
        notice,
        notify,
        clearNotice,
        view,
        setView,
        isPlayerExpanded,
        setIsPlayerExpanded,
        retryCatalog,
        isAdmin,
        unlockAdmin,
        lockAdmin,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
}
