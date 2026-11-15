/**
 * LUNA.FM v2 — Music Catalog Service
 * Fetches and validates /music-catalog.json at runtime.
 * See BACKEND.md §6 for the full contract.
 */

import type { MusicCatalog, Album, Track } from '../types';

export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogError';
  }
}

function validateTrack(raw: unknown, albumId: string): Track {
  if (!raw || typeof raw !== 'object') throw new CatalogError('Invalid track object');
  const t = raw as Record<string, unknown>;

  if (typeof t.id !== 'string' || !t.id) throw new CatalogError('Track missing id');
  if (typeof t.albumId !== 'string') throw new CatalogError('Track missing albumId');
  if (t.albumId !== albumId) throw new CatalogError(`Track albumId "${t.albumId}" does not match album "${albumId}"`);
  if (typeof t.title !== 'string') throw new CatalogError('Track missing title');
  if (typeof t.artist !== 'string') throw new CatalogError('Track missing artist');
  if (typeof t.album !== 'string') throw new CatalogError('Track missing album');
  if (typeof t.src !== 'string') throw new CatalogError('Track missing src');

  // Security: src must be origin-relative
  if (!t.src.startsWith('/') || t.src.startsWith('//')) {
    throw new CatalogError(`Track src "${t.src}" is not origin-relative`);
  }
  if (t.src.includes('..')) {
    throw new CatalogError(`Track src "${t.src}" contains path traversal`);
  }

  const artworkUrl = t.artworkUrl === null || typeof t.artworkUrl === 'string' ? t.artworkUrl as string | null : null;
  const duration = typeof t.duration === 'number' && Number.isFinite(t.duration) ? t.duration : undefined;
  const isStandalone = typeof t.isStandalone === 'boolean' ? t.isStandalone : (t.albumId === 'pool' || !t.album);

  return {
    id: t.id as string,
    albumId: t.albumId as string,
    title: t.title as string,
    artist: t.artist as string,
    album: t.album as string,
    src: t.src as string,
    artworkUrl,
    duration,
    ...(isStandalone ? { isStandalone: true } : {}),
  };
}

function validateAlbum(raw: unknown): Album {
  if (!raw || typeof raw !== 'object') throw new CatalogError('Invalid album object');
  const a = raw as Record<string, unknown>;

  if (typeof a.id !== 'string' || !a.id) throw new CatalogError('Album missing id');
  if (typeof a.title !== 'string' || !a.title) throw new CatalogError('Album missing title');

  const id = a.id as string;
  const tracks = Array.isArray(a.tracks) ? a.tracks.map(t => validateTrack(t, id)) : [];

  // Ensure unique track IDs
  const trackIds = new Set<string>();
  for (const track of tracks) {
    if (trackIds.has(track.id)) throw new CatalogError(`Duplicate track id "${track.id}"`);
    trackIds.add(track.id);
  }

  return {
    id,
    title: a.title as string,
    description: typeof a.description === 'string' ? a.description : '',
    subtitle: typeof a.subtitle === 'string' && a.subtitle ? a.subtitle : undefined,
    mood: Array.isArray(a.mood) ? (a.mood as string[]) : [],
    order: typeof a.order === 'number' ? a.order : 999,
    coverUrl: a.coverUrl === null || typeof a.coverUrl === 'string' ? (a.coverUrl as string | null) : null,
    gradient: typeof a.gradient === 'string' ? a.gradient : 'linear-gradient(135deg, #4b244a 0%, #f3b8d8 100%)',
    tracks,
  };
}

export function parseMusicCatalog(data: unknown): MusicCatalog {
  if (!data || typeof data !== 'object') throw new CatalogError('Catalog is not an object');
  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.albums)) throw new CatalogError('Catalog missing albums array');

  const albums = d.albums.map(validateAlbum);

  // Ensure unique album IDs
  const albumIds = new Set<string>();
  for (const album of albums) {
    if (albumIds.has(album.id)) throw new CatalogError(`Duplicate album id "${album.id}"`);
    albumIds.add(album.id);
  }

  // Parse standalone pool tracks if present
  const standaloneTracks: Track[] = Array.isArray(d.standaloneTracks)
    ? d.standaloneTracks.map((t) => validateTrack(t, typeof (t as any).albumId === 'string' ? (t as any).albumId : 'pool'))
    : [];

  return {
    generatedAt: typeof d.generatedAt === 'string' ? d.generatedAt : new Date().toISOString(),
    albums,
    standaloneTracks,
  };
}

export async function getMusicCatalog(): Promise<MusicCatalog> {
  let response: Response;
  try {
    response = await fetch('/music-catalog.json', { cache: 'no-cache' });
  } catch (err) {
    throw new CatalogError(`Network error loading catalog: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  if (!response.ok) {
    throw new CatalogError(`Catalog returned HTTP ${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new CatalogError('Catalog response is not valid JSON');
  }

  return parseMusicCatalog(data);
}

