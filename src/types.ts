/* ═══════════════════════════════════════════════════════════════
   LUNA.FM v2 — Shared TypeScript types
   ═══════════════════════════════════════════════════════════════ */

import type { AudioAnalysisData } from './services/audioAnalysis';
export type { AudioAnalysisData };

export interface Track {
  id: string;
  albumId: string;
  title: string;
  artist: string;
  album: string;
  src: string;
  artworkUrl: string | null;
  duration?: number;
  isStandalone?: boolean;
}

export interface Album {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  mood: string[];
  order: number;
  coverUrl: string | null;
  gradient: string;
  tracks: Track[];
}

export interface MusicCatalog {
  generatedAt: string;
  albums: Album[];
  standaloneTracks?: Track[];
}

export interface EngineSnapshot {
  currentTrackId: string | null;
  queueIds: string[];
  volume: number;
  isMuted: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isShuffled: boolean;
  currentTime: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type ViewName = 'discover' | 'home' | 'collection' | 'about' | 'admin' | 'playlists' | 'settings';

export interface AudioEngine {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  queue: Track[];
  currentIndex: number;
  error: string | null;

  playTrack(track: Track, queue?: Track[], opts?: { autoplay?: boolean; startAt?: number }): void;
  toggle(): void;
  next(): void;
  prev(): void;
  seek(seconds: number): void;
  setVolume(v: number): void;
  toggleMute(): void;
  toggleShuffle(): void;
  cycleRepeat(): void;
  playAt(index: number): void;
  enqueue(track: Track): void;
  removeFromQueue(index: number): void;
  clearQueue(): void;

  snapshot(): EngineSnapshot;
  hydrate(snap: EngineSnapshot, byId: Map<string, Track>): void;
  getAudioData(): AudioAnalysisData;
}

