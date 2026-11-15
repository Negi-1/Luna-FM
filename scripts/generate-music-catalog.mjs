#!/usr/bin/env node
/**
 * LUNA.FM v2 — Music Catalog Generator
 * Scans public/songs/* and public/songs/songs-list/ and emits public/music-catalog.json
 * Supports central song pool and zero-duplication playlist references.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SONGS_DIR = path.join(ROOT, 'public', 'songs');
const SONGS_LIST_DIR = path.join(SONGS_DIR, 'songs-list');
const OUT = path.join(ROOT, 'public', 'music-catalog.json');

const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif']);
const COVER_NAMES = [
  'cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp', 'cover.svg',
  'image.png', 'image.jpg', 'image.jpeg', 'image.webp',
  'artwork.png', 'artwork.jpg', 'artwork.jpeg', 'artwork.webp',
  'poster.png', 'poster.jpg', 'poster.jpeg', 'poster.webp',
];
const SKIP_DIRS = new Set(['node_modules', '__MACOSX', 'songs-list']);

const GRADIENTS = [
  ['#4b244a', '#f3b8d8'],
  ['#161426', '#5c4b8a'],
  ['#231b2e', '#b9a9d6'],
  ['#3c1f33', '#f3b8d8'],
  ['#1f2238', '#b9a9d6'],
  ['#2b212e', '#d6b6c9'],
];

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function gradientFor(id) {
  const [a, b] = GRADIENTS[hash(id) % GRADIENTS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

function slugify(name) {
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || encodeURIComponent(name);
}

function deriveTitle(filename) {
  let name = filename;
  try { name = decodeURIComponent(name); } catch { /* keep original */ }
  const lastDot = name.lastIndexOf('.');
  if (lastDot > 0) name = name.slice(0, lastDot);
  name = name.replace(/[_-]+/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  return name || filename;
}

function deriveTitleAndArtist(filename) {
  let name = filename;
  try { name = decodeURIComponent(name); } catch { /* keep original */ }
  const lastDot = name.lastIndexOf('.');
  if (lastDot > 0) name = name.slice(0, lastDot);

  // If filename has "Artist - Title" format
  if (name.includes(' - ')) {
    const parts = name.split(' - ');
    const artist = parts[0].replace(/^\d+[\s._-]*/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const title = parts.slice(1).join(' - ').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (artist && title) {
      return { title, artist };
    }
  }

  // Strip leading digits "01 ", "01-", "01_", "01. "
  let clean = name.replace(/^\d+[\s._-]+/, '');
  clean = clean.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { title: clean || deriveTitle(filename), artist: 'various' };
}

function hasForbiddenChars(filename) {
  if (filename.includes('..') && !filename.startsWith('../songs-list')) return true;
  if (filename.startsWith('/') || filename.startsWith('\\')) return true;
  if (/[\x00-\x1f]/.test(filename)) return true;
  if (filename.includes('?') || filename.includes('#')) return true;
  return false;
}

function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
}

function getAudioDuration(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.wav') {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(48);
      fs.readSync(fd, buf, 0, 48, 0);
      fs.closeSync(fd);
      const byteRate = buf.readUInt32LE(28);
      const dataSize = buf.readUInt32LE(40);
      if (byteRate > 0 && dataSize > 0) {
        return Math.round(dataSize / byteRate);
      }
    }
    if (ext === '.mp3') {
      const stats = fs.statSync(filePath);
      return Math.round(stats.size / 24000);
    }
  } catch { /* ignore */ }
  return 0;
}

function findTrackCover(dir, trackFileName) {
  const base = path.parse(trackFileName).name;
  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
  for (const ext of exts) {
    if (fs.existsSync(path.join(dir, `${base}${ext}`))) {
      return `${base}${ext}`;
    }
    if (fs.existsSync(path.join(dir, `${base}-cover${ext}`))) {
      return `${base}-cover${ext}`;
    }
  }
  return null;
}

function resolveTrackFile(albumDir, fileStr) {
  let cleanFile = fileStr;
  if (cleanFile.startsWith('../songs-list/')) cleanFile = cleanFile.replace('../songs-list/', '');
  if (cleanFile.startsWith('songs-list/')) cleanFile = cleanFile.replace('songs-list/', '');

  // 1. Check if file exists in central songs-list pool
  if (fs.existsSync(path.join(SONGS_LIST_DIR, cleanFile))) {
    return {
      folder: 'songs-list',
      fileName: cleanFile,
      fullPath: path.join(SONGS_LIST_DIR, cleanFile),
    };
  }

  // 2. Check if file exists in albumDir
  if (fs.existsSync(path.join(albumDir, fileStr))) {
    return {
      folder: path.basename(albumDir),
      fileName: fileStr,
      fullPath: path.join(albumDir, fileStr),
    };
  }

  if (fs.existsSync(path.join(albumDir, cleanFile))) {
    return {
      folder: path.basename(albumDir),
      fileName: cleanFile,
      fullPath: path.join(albumDir, cleanFile),
    };
  }

  return null;
}

function main() {
  console.log('[luna] catalog generator v2 — central pool & referenced playlists');

  if (!fs.existsSync(SONGS_DIR)) {
    console.log('[luna] public/songs/ not found — emitting empty catalog');
    fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), albums: [], standaloneTracks: [] }, null, 2) + '\n');
    return;
  }

  // ── 1. Scan Central Song Pool: public/songs/songs-list/ ─────
  const standaloneTracks = [];
  const poolTrackMap = new Map(); // fileName -> standalone Track

  if (fs.existsSync(SONGS_LIST_DIR)) {
    const listFiles = fs.readdirSync(SONGS_LIST_DIR);
    const audioFilesInPool = listFiles.filter(f => AUDIO_EXTS.has(path.extname(f).toLowerCase()));

    for (const file of audioFilesInPool) {
      const { title, artist } = deriveTitleAndArtist(file);
      const trackSlug = slugify(title);
      const individualCover = findTrackCover(SONGS_LIST_DIR, file);
      const trackArtwork = individualCover
        ? `/songs/songs-list/${encodeURIComponent(individualCover)}`
        : null;

      const duration = getAudioDuration(path.join(SONGS_LIST_DIR, file));
      const track = {
        id: `pool/${trackSlug}`,
        albumId: 'pool',
        title,
        artist,
        album: '', // Standalone pool track: exists without a playlist!
        src: `/songs/songs-list/${encodeURIComponent(file)}`,
        artworkUrl: trackArtwork,
        isStandalone: true,
        ...(duration > 0 ? { duration } : {}),
      };

      standaloneTracks.push(track);
      poolTrackMap.set(file, track);
    }

    // Ensure unique IDs in standalone pool
    const poolIdSet = new Set();
    for (let i = 0; i < standaloneTracks.length; i++) {
      let tid = standaloneTracks[i].id;
      let counter = 1;
      while (poolIdSet.has(tid)) {
        tid = `${standaloneTracks[i].id}-${counter++}`;
      }
      standaloneTracks[i].id = tid;
      poolIdSet.add(tid);
    }
  }

  // ── 2. Scan Curated Playlists / Albums ───────────────────────
  const entries = fs.readdirSync(SONGS_DIR, { withFileTypes: true });
  const albums = [];
  let totalTracksInAlbums = 0;
  let hadFatalError = false;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const albumDir = path.join(SONGS_DIR, entry.name);
    const folderName = entry.name;

    const contents = fs.readdirSync(albumDir);
    if (contents.length === 0 || (contents.length === 1 && contents[0] === '.DS_Store')) {
      continue;
    }

    const infoPath = path.join(albumDir, 'info.json');
    if (!fs.existsSync(infoPath)) {
      warn(`${folderName}: no info.json — album skipped`);
      continue;
    }

    let info;
    try {
      const raw = fs.readFileSync(infoPath, 'utf-8');
      info = JSON.parse(raw);
    } catch (err) {
      console.error(`✗ ${folderName}/info.json: ${err.message}`);
      hadFatalError = true;
      continue;
    }

    if (!info.title || typeof info.title !== 'string' || !info.title.trim()) {
      console.error(`✗ ${folderName}/info.json: missing required field "title"`);
      hadFatalError = true;
      continue;
    }

    const title = info.title.trim();
    const description = typeof info.description === 'string' ? info.description : '';
    const defaultArtist = typeof info.artist === 'string' ? info.artist : 'various';
    const subtitle = typeof info.subtitle === 'string' && info.subtitle.trim() ? info.subtitle.trim() : undefined;
    const mood = Array.isArray(info.mood) && info.mood.every(m => typeof m === 'string') ? info.mood : [];
    const order = typeof info.order === 'number' && Number.isFinite(info.order) ? info.order : 999;

    let coverFile = null;
    if (typeof info.cover === 'string' && fs.existsSync(path.join(albumDir, info.cover))) {
      coverFile = info.cover;
    } else {
      for (const cn of COVER_NAMES) {
        if (fs.existsSync(path.join(albumDir, cn))) {
          coverFile = cn;
          break;
        }
      }
      if (!coverFile) {
        const anyImg = contents.find(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()));
        if (anyImg) {
          coverFile = anyImg;
        }
      }
    }
    if (!coverFile) {
      warn(`${folderName}: no cover image found — using gradient fallback`);
    }

    const albumId = slugify(folderName);
    const coverUrl = coverFile ? `/songs/${encodeURIComponent(folderName)}/${encodeURIComponent(coverFile)}` : null;

    // Discover audio files local to the album folder (for legacy standalone folders)
    const allFiles = fs.readdirSync(albumDir);
    const localAudioFiles = allFiles.filter(f => AUDIO_EXTS.has(path.extname(f).toLowerCase()));

    const tracksOverride = Array.isArray(info.tracks) ? info.tracks : [];
    const orderedFiles = [];
    const seenFiles = new Set();
    let albumSkipped = false;

    for (const t of tracksOverride) {
      if (!t || typeof t.file !== 'string') continue;
      if (seenFiles.has(t.file)) {
        warn(`${folderName}: duplicate track entry "${t.file}" — first wins`);
        continue;
      }

      // Check if track resolves either in central songs-list or in albumDir
      const resolved = resolveTrackFile(albumDir, t.file);
      if (!resolved) {
        warn(`${folderName}: track file "${t.file}" not found in songs-list/ or ${folderName}/ — skipped`);
        albumSkipped = true;
        break;
      }

      seenFiles.add(t.file);
      orderedFiles.push({
        file: t.file,
        resolved,
        title: typeof t.title === 'string' && t.title.trim() ? t.title.trim() : deriveTitle(resolved.fileName),
        artist: typeof t.artist === 'string' && t.artist.trim() ? t.artist.trim() : defaultArtist,
        cover: typeof t.cover === 'string' && t.cover.trim() ? t.cover.trim() : undefined,
        duration: typeof t.duration === 'number' && Number.isFinite(t.duration) ? t.duration : undefined,
      });
    }

    if (albumSkipped) continue;

    // Add remaining local audio files not explicitly listed in tracks[]
    const remaining = localAudioFiles
      .filter(f => !seenFiles.has(f))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    for (const f of remaining) {
      const resolved = resolveTrackFile(albumDir, f);
      if (resolved) {
        orderedFiles.push({
          file: f,
          resolved,
          title: deriveTitle(f),
          artist: defaultArtist,
        });
      }
    }

    // Build tracks with zero-duplication src
    const tracks = orderedFiles.map(t => {
      const trackSlug = slugify(t.title);
      const individualCover = t.cover || findTrackCover(t.resolved.fullPath ? path.dirname(t.resolved.fullPath) : albumDir, t.resolved.fileName);
      const trackArtwork = individualCover
        ? `/songs/${encodeURIComponent(t.resolved.folder)}/${encodeURIComponent(individualCover)}`
        : coverUrl;

      const duration = typeof t.duration === 'number' && t.duration > 0
        ? t.duration
        : getAudioDuration(t.resolved.fullPath);

      return {
        id: `${albumId}/${trackSlug}`,
        albumId,
        title: t.title,
        artist: t.artist,
        album: title,
        src: `/songs/${encodeURIComponent(t.resolved.folder)}/${encodeURIComponent(t.resolved.fileName)}`,
        artworkUrl: trackArtwork,
        ...(duration > 0 ? { duration } : {}),
      };
    });

    // Ensure unique track IDs in album
    const idSet = new Set();
    for (let i = 0; i < tracks.length; i++) {
      let tid = tracks[i].id;
      let counter = 1;
      while (idSet.has(tid)) {
        tid = `${albumId}/${slugify(orderedFiles[i].title)}-${counter++}`;
      }
      tracks[i].id = tid;
      idSet.add(tid);
    }

    totalTracksInAlbums += tracks.length;

    albums.push({
      id: albumId,
      title,
      description,
      ...(subtitle ? { subtitle } : {}),
      mood,
      order,
      coverUrl,
      gradient: gradientFor(albumId),
      tracks,
    });
  }

  if (hadFatalError) {
    console.error('\n✗ Build aborted due to fatal catalog errors.');
    process.exit(1);
  }

  // Sort: order asc, then title A→Z
  albums.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  const catalog = {
    generatedAt: new Date().toISOString(),
    albums,
    standaloneTracks,
  };

  fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`[luna] catalog: ${albums.length} albums · ${standaloneTracks.length} pool tracks in songs-list · ${totalTracksInAlbums} album tracks → public/music-catalog.json`);
}

main();
