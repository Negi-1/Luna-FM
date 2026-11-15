/**
 * ═══════════════════════════════════════════════════════════════
 * LUNA.FM v2 — Discover Page Metadata Service
 * Pure, side-effect-free algorithms for newly added tracks, mood recommendations,
 * curated featured playlists, and frequency categorization without hallucinated genres.
 * ═══════════════════════════════════════════════════════════════
 */

import type { Album, Track } from '../types';

export const FEATURED_PLAYLIST_IDS = [
  'night-drive',
  'soft-hours',
  'japanese-indie',
  'website-wala-playlist',
] as const;

export interface FrequencyCategory {
  id: string;
  label: string;
  type: 'all' | 'mood' | 'artist' | 'tag';
  tracks: Track[];
  count: number;
}

export interface ArtworkResolution {
  src: string | null;
  tier: 1 | 2 | 3;
}

/**
 * 3-Tier Artwork Fallback Resolution:
 * - Tier 1: Track-specific artwork (track.artworkUrl)
 * - Tier 2: Parent album cover (album.coverUrl)
 * - Tier 3: Thematic moon glyph ☾ placeholder (null src)
 */
export function resolveArtworkFallback(track?: Track | null, album?: Album | null): ArtworkResolution {
  if (track?.artworkUrl && typeof track.artworkUrl === 'string' && track.artworkUrl.trim().length > 0) {
    return { src: track.artworkUrl.trim(), tier: 1 };
  }
  if (album?.coverUrl && typeof album.coverUrl === 'string' && album.coverUrl.trim().length > 0) {
    return { src: album.coverUrl.trim(), tier: 2 };
  }
  return { src: null, tier: 3 };
}

/**
 * Resolves recently played track IDs to valid Track objects from the catalog,
 * preserving order (newest played first) and eliminating missing or duplicate tracks.
 */
export function getLastPlayedTracks(
  trackIds: string[] = [],
  byId: Map<string, Track> | Record<string, Track> = new Map(),
  limit: number = 12,
): Track[] {
  if (!Array.isArray(trackIds) || limit <= 0) return [];
  const result: Track[] = [];
  const seen = new Set<string>();

  const getTrack = (id: string): Track | undefined => {
    if (byId instanceof Map) return byId.get(id);
    return (byId as Record<string, Track>)[id];
  };

  for (const id of trackIds) {
    if (result.length >= limit) break;
    if (id && !seen.has(id)) {
      seen.add(id);
      const track = getTrack(id);
      if (track) {
        result.push(track);
      }
    }
  }

  return result;
}

/**
 * Returns latest tracks in descending order of addition (newest first).
 * Reverses the catalog sequence to expose newest additions first, capped at limit.
 */
export function getNewlyAddedSongs(allTracks: Track[] = [], limit: number = 10): Track[] {
  if (limit <= 0) return [];
  if (!Array.isArray(allTracks) || allTracks.length === 0) return [];
  const reversed = [...allTracks].reverse();
  const seen = new Set<string>();
  const result: Track[] = [];

  for (const track of reversed) {
    if (result.length >= limit) break;
    if (track && track.id && !seen.has(track.id)) {
      seen.add(track.id);
      result.push(track);
    }
  }
  return result;
}

/**
 * Returns playlist recommendations based on mood overlap with currently playing track.
 */
export function getListenToRecommendations(
  albums: Album[] = [],
  currentTrack?: Track | null,
  limit: number = 4,
): Album[] {
  if (!Array.isArray(albums) || albums.length === 0) return [];
  const currentAlbum = currentTrack ? albums.find((a) => a.id === currentTrack.albumId) : null;
  const currentMoods = new Set(currentAlbum?.mood ?? []);

  if (currentMoods.size > 0) {
    const scored = albums
      .filter((a) => a.id !== currentAlbum?.id)
      .map((album) => {
        const overlap = album.mood ? album.mood.filter((m) => currentMoods.has(m)).length : 0;
        return { album, overlap };
      })
      .filter((item) => item.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap || a.album.order - b.album.order);

    if (scored.length > 0) {
      const recs = scored.map((s) => s.album);
      if (recs.length < limit) {
        const remaining = albums
          .filter((a) => a.id !== currentAlbum?.id && !recs.some((r) => r.id === a.id))
          .sort((a, b) => a.order - b.order);
        recs.push(...remaining);
      }
      return recs.slice(0, limit);
    }
  }

  // Fallback: exclude current album and return top ordered albums
  return albums
    .filter((a) => a.id !== currentAlbum?.id)
    .sort((a, b) => a.order - b.order)
    .slice(0, limit);
}

/**
 * Returns curated editorial playlists in exact ID sequence:
 * ['night-drive', 'soft-hours', 'japanese-indie', 'website-wala-playlist']
 */
export function getFeaturedPlaylists(albums: Album[] = []): Album[] {
  if (!Array.isArray(albums) || albums.length === 0) return [];
  const albumMap = new Map(albums.map((a) => [a.id, a]));
  const featured: Album[] = [];

  for (const id of FEATURED_PLAYLIST_IDS) {
    const album = albumMap.get(id);
    if (album) {
      featured.push(album);
    }
  }

  if (featured.length === 0) {
    return albums.slice(0, 4);
  }
  return featured;
}

/**
 * Groups songs into categories by existing moods, artists, and pool tags.
 * Strictly guarantees ZERO hallucinated genres (no invented 'Rock', 'Pop', etc.).
 */
export function getFrequenciesCategories(allTracks: Track[] = [], albums: Album[] = []): FrequencyCategory[] {
  if (!Array.isArray(allTracks)) return [];
  const albumMap = new Map((Array.isArray(albums) ? albums : []).map((a) => [a.id, a]));
  const categories: FrequencyCategory[] = [];

  // 1. ALL FREQUENCIES
  categories.push({
    id: 'all',
    label: 'ALL FREQUENCIES',
    type: 'all',
    tracks: allTracks,
    count: allTracks.length,
  });

  // 2. Existing Moods from albums
  const uniqueMoods = Array.from(
    new Set((Array.isArray(albums) ? albums : []).flatMap((a) => a.mood || [])),
  )
    .filter(Boolean)
    .sort();

  for (const mood of uniqueMoods) {
    const matchingTracks = allTracks.filter((t) => albumMap.get(t.albumId)?.mood?.includes(mood));
    if (matchingTracks.length > 0) {
      categories.push({
        id: `mood-${mood}`,
        label: mood.toUpperCase(),
        type: 'mood',
        tracks: matchingTracks,
        count: matchingTracks.length,
      });
    }
  }

  // 3. Standalone pool tracks tag
  const poolTracks = allTracks.filter((t) => t.isStandalone || t.albumId === 'pool' || !t.album);
  if (poolTracks.length > 0) {
    categories.push({
      id: 'tag-singles',
      label: 'SINGLES / POOL',
      type: 'tag',
      tracks: poolTracks,
      count: poolTracks.length,
    });
  }

  return categories;
}
