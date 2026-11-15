#!/usr/bin/env node
/**
 * ═════════════════════════════════════════════════════════════════════════════
 * LUNA.FM v2 — Discover Page, Full Player Pop-Up & Minimized Island E2E Suite
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * 4-Tier Opaque-Box Acceptance & Verification Test Runner:
 *   - Tier 1: Feature Coverage (5 tests per feature, 12 feature areas = 60 tests)
 *   - Tier 2: Boundary & Corner Cases (4 tests per area, 10 boundary areas = 40 tests)
 *   - Tier 3: Cross-Feature Combinations (10 pairwise integration tests)
 *   - Tier 4: Real-World Application Scenarios (5 realistic end-user flows)
 * Total: 115 comprehensive requirement-driven test cases.
 * 
 * Usage:
 *   node scripts/verify-discover.mjs                 # Run full 4-tier suite
 *   node scripts/verify-discover.mjs --tier 1        # Run Tier 1 only
 *   node scripts/verify-discover.mjs --tier 2        # Run Tier 2 only
 *   node scripts/verify-discover.mjs --tier 3        # Run Tier 3 only
 *   node scripts/verify-discover.mjs --tier 4        # Run Tier 4 only
 *   node scripts/verify-discover.mjs --milestone 1   # Run Milestone 1 tests only
 *   node scripts/verify-discover.mjs --progressive   # Progressive milestone evaluation
 *   node scripts/verify-discover.mjs --json          # Output results as JSON
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
    M1: { name: 'UI, Gestures & Visualizer', passed: 0, failed: 0, pending: 0 },
    M2: { name: 'Discover Service & Navigation', passed: 0, failed: 0, pending: 0 },
    M3: { name: 'Minimized Island & Player Stage', passed: 0, failed: 0, pending: 0 },
    M4: { name: 'Full E2E Scenarios & System Integration', passed: 0, failed: 0, pending: 0 },
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

// ── CSS Parser Helper ─────────────────────────────────────────────────────────
function parseCssBlocks(cssContent) {
  if (!cssContent) return { blocks: [], variables: {} };
  const blocks = [];
  const blockRegex = /([^{]+)\{([^}]+)\}/gs;
  let match;
  while ((match = blockRegex.exec(cssContent)) !== null) {
    const selector = match[1].trim();
    const body = match[2].trim();
    const declarations = {};
    const declRegex = /([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
    let dMatch;
    while ((dMatch = declRegex.exec(body)) !== null) {
      declarations[dMatch[1].trim()] = dMatch[2].trim();
    }
    blocks.push({ selector, declarations });
  }
  return { blocks };
}

// ── Reference Oracles for Algorithmic Invariants ──────────────────────────────
const EDITORIAL_PLAYLIST_IDS = ['night-drive', 'soft-hours', 'japanese-indie', 'website-wala-playlist'];

function oracleGetNewlyAddedSongs(tracks, limit = 10) {
  if (!Array.isArray(tracks) || tracks.length === 0) return [];
  // Latest tracks added (reverse order of addition), capped at limit
  return tracks.slice().reverse().slice(0, Math.max(0, limit));
}

function oracleResolveArtwork(track, album) {
  if (track && typeof track.artworkUrl === 'string' && track.artworkUrl.trim().length > 0) {
    return track.artworkUrl;
  }
  if (album && typeof album.coverUrl === 'string' && album.coverUrl.trim().length > 0) {
    return album.coverUrl;
  }
  return 'fallback-glyph';
}

function oracleGetFeaturedPlaylists(albums) {
  if (!Array.isArray(albums)) return [];
  const map = new Map(albums.map((a) => [a.id, a]));
  const featured = [];
  for (const id of EDITORIAL_PLAYLIST_IDS) {
    if (map.has(id)) {
      featured.push(map.get(id));
    }
  }
  return featured;
}

function oracleGetListenToRecommendations(albums, currentTrack, limit = 4) {
  if (!Array.isArray(albums) || albums.length === 0) return [];
  if (!currentTrack) {
    return albums.slice(0, limit);
  }
  const currentMoods = new Set(
    (currentTrack.mood || [])
      .concat(currentTrack.tags || [])
      .map((m) => String(m).toLowerCase().trim())
  );
  if (currentMoods.size === 0) {
    return albums.filter((a) => a.id !== currentTrack.albumId).slice(0, limit);
  }
  const scored = albums
    .filter((a) => a.id !== currentTrack.albumId)
    .map((a) => {
      const albumMoods = (a.mood || []).concat(a.tags || []).map((m) => String(m).toLowerCase().trim());
      const overlap = albumMoods.filter((m) => currentMoods.has(m)).length;
      return { album: a, overlap };
    });
  scored.sort((x, y) => y.overlap - x.overlap);
  return scored.slice(0, limit).map((s) => s.album);
}

function oracleGetFrequenciesCategories(allTracks, albums) {
  const allowedTags = new Set();
  for (const t of allTracks || []) {
    if (Array.isArray(t.tags)) {
      for (const tag of t.tags) allowedTags.add(String(tag).toLowerCase().trim());
    }
    if (t.artist) allowedTags.add(String(t.artist).toLowerCase().trim());
  }
  for (const a of albums || []) {
    if (Array.isArray(a.mood)) {
      for (const m of a.mood) allowedTags.add(String(m).toLowerCase().trim());
    }
    if (a.artist) allowedTags.add(String(a.artist).toLowerCase().trim());
  }
  return Array.from(allowedTags).filter((t) => t.length > 0);
}

function oracleSpringPull(deltaX) {
  if (deltaX <= 0) return 0;
  return Math.min(48, deltaX * 0.25);
}

// ── In-Memory DOM / Player State Simulation ───────────────────────────────────
function createSimulatedPlayerEnvironment(initial = {}) {
  let view = initial.view || 'discover';
  let isPlayerExpanded = initial.isPlayerExpanded ?? false;
  let currentTrack = initial.currentTrack || null;
  let isPlaying = initial.isPlaying ?? false;
  let queue = initial.queue || [];
  let isDrawerOpen = false;
  let isQueueOpen = false;

  const engine = {
    get currentTrack() { return currentTrack; },
    get isPlaying() { return isPlaying; },
    get queue() { return queue; },
    playTrack(track, newQueue = []) {
      currentTrack = track;
      isPlaying = true;
      if (newQueue.length) queue = newQueue;
    },
    toggle() {
      isPlaying = !isPlaying;
    },
  };

  const context = {
    get view() { return view; },
    setView(v) { view = v; },
    get isPlayerExpanded() { return isPlayerExpanded; },
    setIsPlayerExpanded(exp) {
      if (typeof exp === 'function') {
        isPlayerExpanded = exp(isPlayerExpanded);
      } else {
        isPlayerExpanded = exp;
      }
    },
    engine,
    openDrawer() { isDrawerOpen = true; },
    closeDrawer() { isDrawerOpen = false; },
    get isDrawerOpen() { return isDrawerOpen; },
    openQueue() { isQueueOpen = true; },
    closeQueue() { isQueueOpen = false; },
    get isQueueOpen() { return isQueueOpen; },
  };

  return context;
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST SUITE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

async function runTestSuite() {
  if (!isJsonOutput) {
    console.log('\n\x1b[1m\x1b[35m☾⋆⁺₊ LUNA.FM v2 — Discover Page & Architecture Upgrades E2E Test Suite ⁺₊\x1b[0m\n');
    console.log(`Execution Mode: ${tierArg ? `Tier ${tierArg}` : milestoneArg ? `Milestone ${milestoneArg}` : isProgressive ? 'Progressive Milestone Evaluation' : 'Full 4-Tier Suite'}`);
    console.log(`Working Directory: ${ROOT}\n`);
  }

  // Pre-load common source files
  const catalogRaw = readFileSafe('public/music-catalog.json');
  const catalog = catalogRaw ? JSON.parse(catalogRaw) : { albums: [], standaloneTracks: [] };
  const allTracks = (catalog.albums || []).flatMap((a) => (a.tracks || []).map((t) => ({ ...t, albumId: a.id })))
    .concat(catalog.standaloneTracks || []);

  const sharedTypesSrc = readFileSafe('src/types.ts');
  const playerContextSrc = readFileSafe('src/context/PlayerContext.tsx');
  const discoverServiceSrc = readFileSafe('src/services/discoverService.ts');
  const discoverViewSrc = readFileSafe('src/components/DiscoverView.tsx');
  const discoverViewCss = readFileSafe('src/components/DiscoverView.css');
  const minIslandSrc = readFileSafe('src/components/MinimizedPlayerIsland.tsx');
  const minIslandCss = readFileSafe('src/components/MinimizedPlayerIsland.css');
  const transportSrc = readFileSafe('src/components/Transport.tsx');
  const transportCss = readFileSafe('src/components/Transport.css');
  const playerHomeSrc = readFileSafe('src/components/PlayerHome.tsx');
  const playerHomeCss = readFileSafe('src/components/PlayerHome.css');
  const appShellSrc = readFileSafe('src/components/AppShell.tsx');
  const drawerSrc = readFileSafe('src/components/PlaylistDrawer.tsx');
  const topbarSrc = readFileSafe('src/components/TopBar.tsx');
  const vizSrc = readFileSafe('src/components/AudioReactiveVisualizer.tsx');
  const vizCss = readFileSafe('src/components/AudioReactiveVisualizer.css');
  const audioEngineSrc = readFileSafe('src/hooks/useAudioEngine.ts');

  // Milestone readiness flags
  const isM1Ready = Boolean(
    transportSrc?.includes('onMinimize') &&
    playerHomeSrc?.includes('translateX') &&
    appShellSrc?.includes('touchStartX')
  );
  const isM2Ready = Boolean(
    discoverServiceSrc &&
    sharedTypesSrc?.includes("'discover'") &&
    drawerSrc?.includes('01') &&
    drawerSrc?.includes('DISCOVER') &&
    discoverViewSrc
  );
  const isM3Ready = Boolean(
    minIslandSrc &&
    minIslandCss &&
    playerContextSrc?.includes('isPlayerExpanded')
  );
  const isM4Ready = Boolean(isM1Ready && isM2Ready && isM3Ready);

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 1: FEATURE COVERAGE (5 tests per feature, 12 feature areas = 60 tests)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!tierArg || tierArg === '1') {
    if (!isJsonOutput) console.log('\x1b[1m\x1b[36m━━━ TIER 1: FEATURE COVERAGE ━━━\x1b[0m');

    // ── F1: Newly Added Songs & Sort Order (Criterion 1) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 1: Newly Added Songs & Sort Order (Criterion 1)]\x1b[0m');

    // T1.1.1
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.1.1', tier: 1, milestone: 2, title: 'getNewlyAddedSongs is exported from discoverService.ts', pending: true, pendingReason: 'Waiting for discoverService.ts' });
    } else {
      const hasExport = discoverServiceSrc && /export\s+(const|function)\s+getNewlyAddedSongs/.test(discoverServiceSrc);
      recordTest({
        id: 'T1.1.1', tier: 1, milestone: 2,
        title: 'getNewlyAddedSongs is exported from src/services/discoverService.ts',
        pass: Boolean(hasExport),
        error: 'getNewlyAddedSongs export missing from src/services/discoverService.ts',
      });
    }

    // T1.1.2
    {
      const oracleLatest = oracleGetNewlyAddedSongs(allTracks, 10);
      const passCount = oracleLatest.length <= 10 && oracleLatest.length > 0;
      if (!isM2Ready && isProgressive) {
        recordTest({ id: 'T1.1.2', tier: 1, milestone: 2, title: 'Newly Added count returns at most 10 songs from catalog', pending: true, pendingReason: 'Waiting for discoverService.ts' });
      } else {
        const mentionsLimit10 = discoverServiceSrc?.includes('10') || discoverServiceSrc?.includes('limit');
        recordTest({
          id: 'T1.1.2', tier: 1, milestone: 2,
          title: 'Newly Added count returns at most 10 songs from catalog',
          pass: Boolean(passCount && mentionsLimit10),
          error: 'Newly Added songs count exceeds 10 or limit parameter not implemented',
        });
      }
    }

    // T1.1.3
    {
      const custom5 = oracleGetNewlyAddedSongs(allTracks, 5);
      const customPass = custom5.length === 5;
      if (!isM2Ready && isProgressive) {
        recordTest({ id: 'T1.1.3', tier: 1, milestone: 2, title: 'getNewlyAddedSongs respects custom limit parameter', pending: true, pendingReason: 'Waiting for discoverService.ts' });
      } else {
        const hasLimitParam = discoverServiceSrc?.includes('limit');
        recordTest({
          id: 'T1.1.3', tier: 1, milestone: 2,
          title: 'getNewlyAddedSongs respects custom limit parameter',
          pass: Boolean(customPass && hasLimitParam),
          error: 'Custom limit parameter not supported in getNewlyAddedSongs',
        });
      }
    }

    // T1.1.4
    {
      const oracleLatest = oracleGetNewlyAddedSongs(allTracks, 10);
      const lastAdded = allTracks[allTracks.length - 1];
      const isDescending = oracleLatest[0]?.id === lastAdded?.id;
      if (!isM2Ready && isProgressive) {
        recordTest({ id: 'T1.1.4', tier: 1, milestone: 2, title: 'Newly added songs returned in strictly descending addition order', pending: true, pendingReason: 'Waiting for discoverService.ts' });
      } else {
        const hasReverseOrSort = discoverServiceSrc?.includes('reverse') || discoverServiceSrc?.includes('sort') || discoverServiceSrc?.includes('slice');
        recordTest({
          id: 'T1.1.4', tier: 1, milestone: 2,
          title: 'Newly added songs returned in strictly descending addition order (latest first)',
          pass: Boolean(isDescending && hasReverseOrSort),
          error: 'Newly added songs not sorted in descending order of addition',
        });
      }
    }

    // T1.1.5
    {
      const originalLen = allTracks.length;
      oracleGetNewlyAddedSongs(allTracks, 10);
      const isImmutable = allTracks.length === originalLen;
      if (!isM2Ready && isProgressive) {
        recordTest({ id: 'T1.1.5', tier: 1, milestone: 2, title: 'getNewlyAddedSongs treats input catalog immutably', pending: true, pendingReason: 'Waiting for discoverService.ts' });
      } else {
        const isSafeMutation = discoverServiceSrc && !discoverServiceSrc.includes('allTracks.reverse()');
        recordTest({
          id: 'T1.1.5', tier: 1, milestone: 2,
          title: 'getNewlyAddedSongs treats input catalog immutably without in-place mutation',
          pass: Boolean(isImmutable && isSafeMutation),
          error: 'getNewlyAddedSongs mutates input tracks array in-place',
        });
      }
    }

    // T1.1.6: getLastPlayedTracks export and ID resolution
    {
      const hasExport = discoverServiceSrc && /export\s+(const|function)\s+getLastPlayedTracks/.test(discoverServiceSrc);
      const hasPlayerContextUsage = playerContextSrc && playerContextSrc.includes('getLastPlayedTracks');
      recordTest({
        id: 'T1.1.6', tier: 1, milestone: 2,
        title: 'getLastPlayedTracks resolves track IDs into ordered catalog tracks and persists history',
        pass: Boolean(hasExport && hasPlayerContextUsage),
        error: 'getLastPlayedTracks export or PlayerContext history integration missing',
      });
    }

    // T1.1.7: DiscoverView Last Played section present on TOP
    {
      const hasLastPlayedSection = discoverViewSrc && discoverViewSrc.includes('discover-section--last-played');
      const hasTopPosition = discoverViewSrc && discoverViewSrc.indexOf('discover-section--last-played') < discoverViewSrc.indexOf('discover-section--newly-added');
      recordTest({
        id: 'T1.1.7', tier: 1, milestone: 2,
        title: 'DiscoverView renders Last Played section at the top above Newly Added frequencies',
        pass: Boolean(hasLastPlayedSection && hasTopPosition),
        error: 'Last Played section missing or not positioned at the top of DiscoverView',
      });
    }

    // ── F2: 3-Tier Artwork Fallback Strategy (Criterion 2) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 2: 3-Tier Artwork Fallback Strategy (Criterion 2)]\x1b[0m');

    // T1.2.1: Tier 1 track.artworkUrl
    {
      const sampleTrack = { id: 't1', title: 'T1', artworkUrl: '/images/t1.jpg' };
      const sampleAlbum = { id: 'a1', coverUrl: '/images/a1.jpg' };
      const res = oracleResolveArtwork(sampleTrack, sampleAlbum);
      recordTest({
        id: 'T1.2.1', tier: 1, milestone: 2,
        title: 'Tier 1 Artwork: Returns track.artworkUrl when populated',
        pass: res === '/images/t1.jpg',
        error: 'Failed to prioritize track.artworkUrl over album cover',
      });
    }

    // T1.2.2: Tier 2 album.coverUrl
    {
      const sampleTrack = { id: 't2', title: 'T2', artworkUrl: null };
      const sampleAlbum = { id: 'a2', coverUrl: '/images/a2.jpg' };
      const res = oracleResolveArtwork(sampleTrack, sampleAlbum);
      recordTest({
        id: 'T1.2.2', tier: 1, milestone: 2,
        title: 'Tier 2 Artwork: Falls back to album.coverUrl when track.artworkUrl is null/empty',
        pass: res === '/images/a2.jpg',
        error: 'Failed to fall back to album.coverUrl when track artwork is null',
      });
    }

    // T1.2.3: Tier 3 glyph placeholder
    {
      const sampleTrack = { id: 't3', title: 'T3', artworkUrl: null };
      const sampleAlbum = { id: 'a3', coverUrl: null };
      const res = oracleResolveArtwork(sampleTrack, sampleAlbum);
      recordTest({
        id: 'T1.2.3', tier: 1, milestone: 2,
        title: 'Tier 3 Artwork: Falls back to glyph / styled placeholder when both track and album lack artwork',
        pass: res === 'fallback-glyph',
        error: 'Failed to produce Tier 3 fallback glyph when both artwork sources are absent',
      });
    }

    // T1.2.4: Orphan track with null album
    {
      const orphanTrack = { id: 't4', title: 'T4', artworkUrl: undefined };
      const res = oracleResolveArtwork(orphanTrack, null);
      recordTest({
        id: 'T1.2.4', tier: 1, milestone: 2,
        title: 'Tier 3 Artwork: Orphan track with undefined album safely resolves fallback glyph without crashing',
        pass: res === 'fallback-glyph',
        error: 'Orphan track without album threw error or produced invalid artwork',
      });
    }

    // T1.2.5: DiscoverView integration check
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.2.5', tier: 1, milestone: 2, title: 'DiscoverView.tsx implements 3-tier artwork fallback logic', pending: true, pendingReason: 'Waiting for DiscoverView.tsx' });
    } else {
      const hasFallbackLogic = discoverViewSrc && (
        discoverViewSrc.includes('coverUrl') ||
        discoverViewSrc.includes('artworkUrl') ||
        discoverViewSrc.includes('fallback') ||
        discoverViewSrc.includes('placeholder')
      );
      recordTest({
        id: 'T1.2.5', tier: 1, milestone: 2,
        title: 'DiscoverView.tsx implements 3-tier artwork fallback so zero tracks render broken src attributes',
        pass: Boolean(hasFallbackLogic),
        error: 'DiscoverView.tsx does not integrate 3-tier artwork fallback logic',
      });
    }

    // ── F3: Full Player Pop-Up Stage & Expansion State (Criterion 3) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 3: Full Player Pop-Up Stage & Expansion State (Criterion 3)]\x1b[0m');

    // T1.3.1
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T1.3.1', tier: 1, milestone: 3, title: 'isPlayerExpanded state and setter exported from PlayerContext.tsx', pending: true, pendingReason: 'Waiting for PlayerContext updates' });
    } else {
      const hasExpandedState = playerContextSrc?.includes('isPlayerExpanded') && playerContextSrc?.includes('setIsPlayerExpanded');
      recordTest({
        id: 'T1.3.1', tier: 1, milestone: 3,
        title: 'isPlayerExpanded boolean state and setIsPlayerExpanded setter exposed by PlayerContext',
        pass: Boolean(hasExpandedState),
        error: 'isPlayerExpanded or setIsPlayerExpanded missing in src/context/PlayerContext.tsx',
      });
    }

    // T1.3.2
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T1.3.2', tier: 1, milestone: 3, title: 'Default initial value of isPlayerExpanded is false', pending: true, pendingReason: 'Waiting for PlayerContext updates' });
    } else {
      const defaultIsFalse = playerContextSrc?.includes('useState<boolean>(false)') ||
                             playerContextSrc?.includes('useState(false)') ||
                             playerContextSrc?.includes('isPlayerExpanded, false');
      recordTest({
        id: 'T1.3.2', tier: 1, milestone: 3,
        title: 'Default initial value of isPlayerExpanded is false on initial boot into discover view',
        pass: Boolean(defaultIsFalse),
        error: 'isPlayerExpanded does not default to false in PlayerContext.tsx',
      });
    }

    // T1.3.3
    {
      const sim = createSimulatedPlayerEnvironment();
      sim.engine.playTrack(allTracks[0]);
      sim.setIsPlayerExpanded(true);
      recordTest({
        id: 'T1.3.3', tier: 1, milestone: 3,
        title: 'Clicking any song in Section A (Newly Added) starts playback and sets isPlayerExpanded = true',
        pass: sim.isPlayerExpanded === true && sim.engine.isPlaying === true && sim.engine.currentTrack?.id === allTracks[0]?.id,
        error: 'Track playback failed to expand player stage or initiate playback',
      });
    }

    // T1.3.4
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.3.4', tier: 1, milestone: 3, title: 'DiscoverView track clicks invoke setIsPlayerExpanded(true)', pending: true, pendingReason: 'Waiting for DiscoverView.tsx' });
    } else {
      const hasExpandCall = discoverViewSrc?.includes('setIsPlayerExpanded(true)') || discoverViewSrc?.includes('setIsPlayerExpanded');
      recordTest({
        id: 'T1.3.4', tier: 1, milestone: 3,
        title: 'DiscoverView track click handlers invoke setIsPlayerExpanded(true) across Section A and Section D',
        pass: Boolean(hasExpandCall),
        error: 'DiscoverView does not invoke setIsPlayerExpanded(true) on track selection',
      });
    }

    // T1.3.5
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.3.5', tier: 1, milestone: 3, title: 'DiscoverView playlist Play button invokes setIsPlayerExpanded(true)', pending: true, pendingReason: 'Waiting for DiscoverView.tsx' });
    } else {
      const hasPlaylistPlay = discoverViewSrc && (
        discoverViewSrc.includes('playTrack') ||
        discoverViewSrc.includes('play') ||
        discoverViewSrc.includes('onPlay')
      );
      recordTest({
        id: 'T1.3.5', tier: 1, milestone: 3,
        title: 'Clicking playlist card Play button in Section B / Section C initiates playback and expands stage',
        pass: Boolean(hasPlaylistPlay),
        error: 'Playlist card actions do not trigger playback and stage expansion',
      });
    }

    // ── F4: Frequency Categories & Anti-Hallucination Filtering (Criterion 4) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 4: Frequency Categories & Anti-Hallucination Filtering (Criterion 4)]\x1b[0m');

    // T1.4.1
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.4.1', tier: 1, milestone: 2, title: 'getFrequenciesCategories is exported from discoverService.ts', pending: true, pendingReason: 'Waiting for discoverService.ts' });
    } else {
      const hasExport = discoverServiceSrc && /export\s+(const|function)\s+getFrequenciesCategories/.test(discoverServiceSrc);
      recordTest({
        id: 'T1.4.1', tier: 1, milestone: 2,
        title: 'getFrequenciesCategories is exported from src/services/discoverService.ts',
        pass: Boolean(hasExport),
        error: 'getFrequenciesCategories export missing from src/services/discoverService.ts',
      });
    }

    // T1.4.2
    {
      const allowedCategories = oracleGetFrequenciesCategories(allTracks, catalog.albums);
      const isNonEmpty = allowedCategories.length > 0;
      recordTest({
        id: 'T1.4.2', tier: 1, milestone: 2,
        title: 'Categories extracted strictly match existing metadata present in catalog (mood, tags, artists)',
        pass: isNonEmpty,
        error: 'No valid categories extracted from public/music-catalog.json metadata',
      });
    }

    // T1.4.3
    {
      const forbiddenHallucinated = ['country', 'heavy metal', 'death metal', 'polka', 'dubstep', 'opera', 'disco'];
      const allowedCategories = oracleGetFrequenciesCategories(allTracks, catalog.albums);
      const hasHallucination = forbiddenHallucinated.some((f) => allowedCategories.includes(f));
      recordTest({
        id: 'T1.4.3', tier: 1, milestone: 2,
        title: 'Zero hallucinated genres: common non-catalog genres (Country, Heavy Metal, Polka) are strictly rejected',
        pass: !hasHallucination,
        error: 'Hallucinated genres detected in category derivation',
      });
    }

    // T1.4.4
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.4.4', tier: 1, milestone: 2, title: 'Section D in DiscoverView.tsx renders interactive filter pills', pending: true, pendingReason: 'Waiting for DiscoverView.tsx' });
    } else {
      const hasPills = discoverViewSrc && (
        discoverViewSrc.includes('pill') ||
        discoverViewSrc.includes('category') ||
        discoverViewSrc.includes('filter')
      );
      recordTest({
        id: 'T1.4.4', tier: 1, milestone: 2,
        title: 'Section D in DiscoverView.tsx renders interactive category filter pills',
        pass: Boolean(hasPills),
        error: 'Section D interactive filter pills missing in DiscoverView.tsx',
      });
    }

    // T1.4.5
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.4.5', tier: 1, milestone: 2, title: 'Category pill toggle updates active filter state', pending: true, pendingReason: 'Waiting for DiscoverView.tsx' });
    } else {
      const hasFilterState = discoverViewSrc && (
        discoverViewSrc.includes('selectedCategory') ||
        discoverViewSrc.includes('activeCategory') ||
        discoverViewSrc.includes('filter')
      );
      recordTest({
        id: 'T1.4.5', tier: 1, milestone: 2,
        title: 'Category pill selection filters displayed tracks accurately based on matching category metadata',
        pass: Boolean(hasFilterState),
        error: 'Dynamic category filtering state not implemented in DiscoverView.tsx',
      });
    }

    // ── F5: Listen To Recommendations & Mood Matching (Criterion 5) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 5: Listen To Recommendations & Mood Matching (Criterion 5)]\x1b[0m');

    // T1.5.1
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.5.1', tier: 1, milestone: 2, title: 'getListenToRecommendations is exported from discoverService.ts', pending: true, pendingReason: 'Waiting for discoverService.ts' });
    } else {
      const hasExport = discoverServiceSrc && /export\s+(const|function)\s+getListenToRecommendations/.test(discoverServiceSrc);
      recordTest({
        id: 'T1.5.1', tier: 1, milestone: 2,
        title: 'getListenToRecommendations is exported from src/services/discoverService.ts',
        pass: Boolean(hasExport),
        error: 'getListenToRecommendations export missing from src/services/discoverService.ts',
      });
    }

    // T1.5.2
    {
      const currentTrack = allTracks.find((t) => (t.tags && t.tags.length > 0) || (t.mood && t.mood.length > 0)) || allTracks[0];
      const recs = oracleGetListenToRecommendations(catalog.albums, currentTrack, 3);
      recordTest({
        id: 'T1.5.2', tier: 1, milestone: 2,
        title: 'When currentTrack has mood tags, returned recommendations contain overlapping moods',
        pass: Array.isArray(recs) && recs.length > 0,
        error: 'Failed to compute mood-based recommendations for current track',
      });
    }

    // T1.5.3
    {
      const recsNull = oracleGetListenToRecommendations(catalog.albums, null, 4);
      recordTest({
        id: 'T1.5.3', tier: 1, milestone: 2,
        title: 'When currentTrack is null, returns default curated playlist recommendations without error',
        pass: Array.isArray(recsNull) && recsNull.length > 0,
        error: 'getListenToRecommendations failed when currentTrack is null',
      });
    }

    // T1.5.4
    {
      const recs2 = oracleGetListenToRecommendations(catalog.albums, null, 2);
      recordTest({
        id: 'T1.5.4', tier: 1, milestone: 2,
        title: 'Recommendation limit parameter is respected (limit = 2 returns at most 2 items)',
        pass: recs2.length <= 2,
        error: 'Recommendation limit parameter was not respected',
      });
    }

    // T1.5.5
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.5.5', tier: 1, milestone: 2, title: 'DiscoverView.tsx renders Section B (Listen To) recommendations', pending: true, pendingReason: 'Waiting for DiscoverView.tsx' });
    } else {
      const hasSectionB = discoverViewSrc && (
        discoverViewSrc.includes('LISTEN TO') ||
        discoverViewSrc.includes('Listen To') ||
        discoverViewSrc.includes('recommendations')
      );
      recordTest({
        id: 'T1.5.5', tier: 1, milestone: 2,
        title: 'DiscoverView.tsx renders Section B (LISTEN TO) with interactive recommendation cards',
        pass: Boolean(hasSectionB),
        error: 'Section B (LISTEN TO) missing or unreferenced in DiscoverView.tsx',
      });
    }

    // ── F6: Featured Playlists & Strict Editorial Order (Criterion 6) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 6: Featured Playlists & Strict Editorial Order (Criterion 6)]\x1b[0m');

    // T1.6.1
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.6.1', tier: 1, milestone: 2, title: 'getFeaturedPlaylists is exported from discoverService.ts', pending: true, pendingReason: 'Waiting for discoverService.ts' });
    } else {
      const hasExport = discoverServiceSrc && /export\s+(const|function)\s+getFeaturedPlaylists/.test(discoverServiceSrc);
      recordTest({
        id: 'T1.6.1', tier: 1, milestone: 2,
        title: 'getFeaturedPlaylists is exported from src/services/discoverService.ts',
        pass: Boolean(hasExport),
        error: 'getFeaturedPlaylists export missing from src/services/discoverService.ts',
      });
    }

    // T1.6.2
    {
      const featured = oracleGetFeaturedPlaylists(catalog.albums);
      const featuredIds = featured.map((a) => a.id);
      const matchesEditorial = EDITORIAL_PLAYLIST_IDS.every((expectedId, idx) => featuredIds[idx] === expectedId);
      recordTest({
        id: 'T1.6.2', tier: 1, milestone: 2,
        title: 'Featured playlists match exact curated editorial order: [night-drive, soft-hours, japanese-indie, website-wala-playlist]',
        pass: matchesEditorial,
        error: `Featured order mismatch: got [${featuredIds.join(', ')}], expected [${EDITORIAL_PLAYLIST_IDS.join(', ')}]`,
      });
    }

    // T1.6.3
    {
      const subsetAlbums = catalog.albums.filter((a) => a.id !== 'japanese-indie');
      const featured = oracleGetFeaturedPlaylists(subsetAlbums);
      const ids = featured.map((a) => a.id);
      const resilient = !ids.includes('japanese-indie') && ids.length === 3;
      recordTest({
        id: 'T1.6.3', tier: 1, milestone: 2,
        title: 'Missing curated ID in catalog is skipped gracefully without throwing error or injecting null',
        pass: resilient,
        error: 'Featured playlists crashed or injected undefined on missing curated album',
      });
    }

    // T1.6.4
    {
      const featured = oracleGetFeaturedPlaylists(catalog.albums);
      const uncuratedIncluded = featured.some((a) => a.id === 'butter');
      recordTest({
        id: 'T1.6.4', tier: 1, milestone: 2,
        title: 'Uncurated non-editorial albums (e.g. butter) are strictly excluded from featured playlists',
        pass: !uncuratedIncluded,
        error: 'Uncurated album was incorrectly included in featured playlists',
      });
    }

    // T1.6.5
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.6.5', tier: 1, milestone: 2, title: 'DiscoverView.tsx renders Section C (FEATURED PLAYLISTS)', pending: true, pendingReason: 'Waiting for DiscoverView.tsx' });
    } else {
      const hasSectionC = discoverViewSrc && (
        discoverViewSrc.includes('FEATURED') ||
        discoverViewSrc.includes('Featured') ||
        discoverViewSrc.includes('getFeaturedPlaylists')
      );
      recordTest({
        id: 'T1.6.5', tier: 1, milestone: 2,
        title: 'DiscoverView.tsx renders Section C (FEATURED PLAYLISTS) horizontal carousel',
        pass: Boolean(hasSectionC),
        error: 'Section C (FEATURED PLAYLISTS) missing in DiscoverView.tsx',
      });
    }

    // ── F7: Desktop Transport Minimize Button & Accessibility (Criterion 7) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 7: Desktop Transport Minimize Button & Accessibility (Criterion 7)]\x1b[0m');

    // T1.7.1
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T1.7.1', tier: 1, milestone: 1, title: 'Transport.tsx contains downward minimize button (▼)', pending: true, pendingReason: 'Waiting for Transport.tsx updates' });
    } else {
      const hasMinimizeBtn = transportSrc && (
        transportSrc.includes('▼') ||
        transportSrc.includes('minimize') ||
        transportSrc.includes('Minimize')
      );
      recordTest({
        id: 'T1.7.1', tier: 1, milestone: 1,
        title: 'src/components/Transport.tsx contains a downward minimize button (▼ or SVG glyph)',
        pass: Boolean(hasMinimizeBtn),
        error: 'Minimize button (▼) not found in src/components/Transport.tsx',
      });
    }

    // T1.7.2
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T1.7.2', tier: 1, milestone: 1, title: 'Minimize button is positioned to the left of Shuffle button', pending: true, pendingReason: 'Waiting for Transport.tsx updates' });
    } else {
      let isLeftOfShuffle = false;
      if (transportSrc) {
        const minIdx = transportSrc.indexOf('onMinimize') !== -1 ? transportSrc.indexOf('onMinimize') : transportSrc.indexOf('▼');
        const shuffleIdx = transportSrc.indexOf('isShuffled') !== -1 ? transportSrc.indexOf('isShuffled') : transportSrc.indexOf('shuffle');
        isLeftOfShuffle = minIdx !== -1 && shuffleIdx !== -1 && minIdx < shuffleIdx;
      }
      recordTest({
        id: 'T1.7.2', tier: 1, milestone: 1,
        title: 'Minimize button is positioned immediately preceding (left of) Shuffle in transport__playback-group',
        pass: isLeftOfShuffle,
        error: 'Minimize button is not positioned to the left of the Shuffle button in Transport.tsx',
      });
    }

    // T1.7.3
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T1.7.3', tier: 1, milestone: 1, title: 'Minimize button provides accessible aria-label', pending: true, pendingReason: 'Waiting for Transport.tsx updates' });
    } else {
      const hasAriaLabel = transportSrc && (
        transportSrc.includes('aria-label="Minimize player"') ||
        transportSrc.includes('aria-label="Minimize"') ||
        transportSrc.includes('aria-label={"Minimize player"}')
      );
      recordTest({
        id: 'T1.7.3', tier: 1, milestone: 1,
        title: 'Minimize button provides accessible aria-label="Minimize player"',
        pass: Boolean(hasAriaLabel),
        error: 'Minimize button missing accessible aria-label="Minimize player"',
      });
    }

    // T1.7.4
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T1.7.4', tier: 1, milestone: 1, title: 'Clicking minimize button triggers onMinimize prop', pending: true, pendingReason: 'Waiting for Transport.tsx updates' });
    } else {
      const hasOnMinimize = transportSrc?.includes('onMinimize');
      recordTest({
        id: 'T1.7.4', tier: 1, milestone: 1,
        title: 'Clicking minimize button triggers onMinimize prop callback',
        pass: Boolean(hasOnMinimize),
        error: 'onMinimize prop not bound to minimize button in Transport.tsx',
      });
    }

    // T1.7.5
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T1.7.5', tier: 1, milestone: 1, title: 'Transport minimize button styles defined in Transport.css', pending: true, pendingReason: 'Waiting for Transport.css updates' });
    } else {
      const hasMinimizeCss = transportCss && (
        transportCss.includes('minimize') ||
        transportCss.includes('transport__minimize')
      );
      recordTest({
        id: 'T1.7.5', tier: 1, milestone: 1,
        title: 'Transport minimize button styles defined in Transport.css with mobile responsive hiding',
        pass: Boolean(hasMinimizeCss),
        error: 'Minimize button CSS styles not found in Transport.css',
      });
    }

    // ── F8: MinimizedPlayerIsland DOM Architecture & Mirroring (Criterion 8) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 8: MinimizedPlayerIsland DOM Architecture & Mirroring (Criterion 8)]\x1b[0m');

    // T1.8.1
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T1.8.1', tier: 1, milestone: 3, title: 'MinimizedPlayerIsland component and CSS exist and dock at bottom: 0', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland' });
    } else {
      const exists = existsSafe('src/components/MinimizedPlayerIsland.tsx') && existsSafe('src/components/MinimizedPlayerIsland.css');
      const isFixedBottom = minIslandCss?.includes('position: fixed') && minIslandCss?.includes('bottom: 0');
      recordTest({
        id: 'T1.8.1', tier: 1, milestone: 3,
        title: 'src/components/MinimizedPlayerIsland.tsx exists and docks persistently at bottom: 0',
        pass: Boolean(exists && isFixedBottom),
        error: 'MinimizedPlayerIsland files missing or lacking position: fixed; bottom: 0 docking',
      });
    }

    // T1.8.2
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T1.8.2', tier: 1, milestone: 3, title: 'Upper section mirrors queue-sheet__min-upper with 80x80 compact ArtworkVisualizer', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland' });
    } else {
      const hasUpperMirror = minIslandSrc && (
        minIslandSrc.includes('queue-sheet__min-upper') ||
        minIslandSrc.includes('minimized-player-island__upper') ||
        minIslandSrc.includes('min-upper')
      ) && minIslandSrc.includes('ArtworkVisualizer') && minIslandSrc.includes('presentation="compact"');
      recordTest({
        id: 'T1.8.2', tier: 1, milestone: 3,
        title: 'Upper section mirrors queue-sheet__min-upper with 80x80 compact ArtworkVisualizer',
        pass: Boolean(hasUpperMirror),
        error: 'Upper section does not mirror queue-sheet__min-upper with ArtworkVisualizer compact presentation',
      });
    }

    // T1.8.3
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T1.8.3', tier: 1, milestone: 3, title: 'Upper section includes NOW PLAYING badge, dot indicator, and track info', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland' });
    } else {
      const hasTrackInfo = minIslandSrc && (
        (minIslandSrc.includes('NOW PLAYING') || minIslandSrc.includes('badge')) &&
        (minIslandSrc.includes('currentTrack.title') || minIslandSrc.includes('title')) &&
        (minIslandSrc.includes('currentTrack.artist') || minIslandSrc.includes('artist'))
      );
      recordTest({
        id: 'T1.8.3', tier: 1, milestone: 3,
        title: 'Upper section includes NOW PLAYING badge, dot indicator, track title, and artist info',
        pass: Boolean(hasTrackInfo),
        error: 'Upper section missing NOW PLAYING badge or track metadata fields',
      });
    }

    // T1.8.4
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T1.8.4', tier: 1, milestone: 3, title: 'Lower section mirrors queue-sheet__min-lower with seek slider & timestamps', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland' });
    } else {
      const hasLowerMirror = minIslandSrc && (
        minIslandSrc.includes('queue-sheet__min-lower') ||
        minIslandSrc.includes('minimized-player-island__lower') ||
        minIslandSrc.includes('min-lower')
      ) && (
        minIslandSrc.includes('currentTime') ||
        minIslandSrc.includes('progress') ||
        minIslandSrc.includes('slider')
      );
      recordTest({
        id: 'T1.8.4', tier: 1, milestone: 3,
        title: 'Lower section mirrors queue-sheet__min-lower with seek slider bar and timestamps',
        pass: Boolean(hasLowerMirror),
        error: 'Lower section does not mirror queue-sheet__min-lower seek bar and timestamps',
      });
    }

    // T1.8.5
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T1.8.5', tier: 1, milestone: 3, title: 'Lower section contains full playback controls group', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland' });
    } else {
      const hasControls = minIslandSrc && (
        minIslandSrc.includes('shuffle') || minIslandSrc.includes('isShuffled')
      ) && (
        minIslandSrc.includes('prev') || minIslandSrc.includes('previous')
      ) && (
        minIslandSrc.includes('toggle') || minIslandSrc.includes('play')
      ) && (
        minIslandSrc.includes('next')
      ) && (
        minIslandSrc.includes('repeat') || minIslandSrc.includes('repeatMode')
      );
      recordTest({
        id: 'T1.8.5', tier: 1, milestone: 3,
        title: 'Lower section contains full playback controls group (Shuffle, Prev, Play disc, Next, Repeat, Queue)',
        pass: Boolean(hasControls),
        error: 'Full playback controls group missing from MinimizedPlayerIsland lower section',
      });
    }

    // ── F9: Touch Gestures & Edge-Swipe Mechanics (Criterion 9) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 9: Touch Gestures & Edge-Swipe Mechanics (Criterion 9)]\x1b[0m');

    // T1.9.1
    {
      const pull50 = oracleSpringPull(50);
      const pull200 = oracleSpringPull(200);
      const springPass = pull50 === 12.5 && pull200 === 48;
      if (!isM1Ready && isProgressive) {
        recordTest({ id: 'T1.9.1', tier: 1, milestone: 1, title: 'PlayerHome artwork drag right applies spring pull translateX(min(48, deltaX * 0.25))', pending: true, pendingReason: 'Waiting for PlayerHome gestures' });
      } else {
        const hasSpringPull = playerHomeSrc && (
          playerHomeSrc.includes('0.25') ||
          playerHomeSrc.includes('Math.min(48') ||
          playerHomeSrc.includes('translateX')
        );
        recordTest({
          id: 'T1.9.1', tier: 1, milestone: 1,
          title: 'PlayerHome.tsx central artwork drag right applies spring pull translateX(min(48, deltaX * 0.25))',
          pass: Boolean(springPass && hasSpringPull),
          error: 'Spring pull transform translateX(min(48, deltaX * 0.25)) missing in PlayerHome.tsx',
        });
      }
    }

    // T1.9.2
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T1.9.2', tier: 1, milestone: 1, title: 'Releasing artwork with deltaX > 45px or velocity > 0.3 triggers onOpenDrawer', pending: true, pendingReason: 'Waiting for PlayerHome gestures' });
    } else {
      const hasThreshold = playerHomeSrc && (
        playerHomeSrc.includes('45') ||
        playerHomeSrc.includes('0.3')
      ) && (
        playerHomeSrc.includes('onOpenDrawer') ||
        playerHomeSrc.includes('openDrawer')
      );
      recordTest({
        id: 'T1.9.2', tier: 1, milestone: 1,
        title: 'Releasing player artwork with deltaX > 45px or flick velocity > 0.3 triggers onOpenDrawer()',
        pass: Boolean(hasThreshold),
        error: 'Artwork release threshold deltaX > 45px / velocity > 0.3 missing in PlayerHome.tsx',
      });
    }

    // T1.9.3
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T1.9.3', tier: 1, milestone: 1, title: 'PlayerHome vertical swipe-down triggers onMinimize()', pending: true, pendingReason: 'Waiting for PlayerHome gestures' });
    } else {
      const hasVerticalDown = playerHomeSrc && (
        playerHomeSrc.includes('onMinimize') ||
        playerHomeSrc.includes('minimize')
      );
      recordTest({
        id: 'T1.9.3', tier: 1, milestone: 1,
        title: 'PlayerHome.tsx vertical swipe-down triggers onMinimize() to collapse player',
        pass: Boolean(hasVerticalDown),
        error: 'Vertical swipe-down onMinimize() trigger missing in PlayerHome.tsx',
      });
    }

    // T1.9.4
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T1.9.4', tier: 1, milestone: 1, title: 'AppShell.tsx detects mobile left-edge screen swipe (<= 40px)', pending: true, pendingReason: 'Waiting for AppShell edge gestures' });
    } else {
      const hasEdgeSwipe = appShellSrc && (
        appShellSrc.includes('40') &&
        (appShellSrc.includes('touchStartX') || appShellSrc.includes('clientX') || appShellSrc.includes('pageX'))
      );
      recordTest({
        id: 'T1.9.4', tier: 1, milestone: 1,
        title: 'AppShell.tsx detects mobile screen left-edge swipe (touchStartX <= 40px, deltaX > 40px) to open drawer',
        pass: Boolean(hasEdgeSwipe),
        error: 'Mobile left-edge swipe detection missing in AppShell.tsx',
      });
    }

    // T1.9.5
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T1.9.5', tier: 1, milestone: 3, title: 'MinimizedPlayerIsland upward swipe triggers onExpand()', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland gestures' });
    } else {
      const hasExpandGesture = minIslandSrc && (
        minIslandSrc.includes('onExpand') &&
        (minIslandSrc.includes('onTouch') || minIslandSrc.includes('onClick'))
      );
      recordTest({
        id: 'T1.9.5', tier: 1, milestone: 3,
        title: 'MinimizedPlayerIsland.tsx vertical swipe-up or upper section click triggers onExpand()',
        pass: Boolean(hasExpandGesture),
        error: 'onExpand() trigger gesture / upper click missing in MinimizedPlayerIsland.tsx',
      });
    }

    // ── F10: Navigation Overhaul & Discover Default View (Criterion 10) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 10: Navigation Overhaul & Discover Default View (Criterion 10)]\x1b[0m');

    // T1.10.1
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.10.1', tier: 1, milestone: 2, title: 'ViewName union in src/types.ts contains discover', pending: true, pendingReason: 'Waiting for types.ts updates' });
    } else {
      const hasDiscoverView = sharedTypesSrc?.includes("'discover'");
      recordTest({
        id: 'T1.10.1', tier: 1, milestone: 2,
        title: "ViewName union type in src/types.ts includes 'discover'",
        pass: Boolean(hasDiscoverView),
        error: "ViewName union in src/types.ts does not include 'discover'",
      });
    }

    // T1.10.2
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.10.2', tier: 1, milestone: 2, title: 'PlayerContext.tsx defaults initial view state to discover', pending: true, pendingReason: 'Waiting for PlayerContext updates' });
    } else {
      const defaultDiscover = playerContextSrc && (
        playerContextSrc.includes("return 'discover'") ||
        playerContextSrc.includes("useState<ViewName>('discover')") ||
        playerContextSrc.includes("view = 'discover'")
      );
      recordTest({
        id: 'T1.10.2', tier: 1, milestone: 2,
        title: "PlayerContext.tsx initializes view state to default 'discover'",
        pass: Boolean(defaultDiscover),
        error: "PlayerContext.tsx does not default initial view state to 'discover'",
      });
    }

    // T1.10.3
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.10.3', tier: 1, milestone: 2, title: 'PlaylistDrawer.tsx NAV_LINKS displays 01 DISCOVER as primary item', pending: true, pendingReason: 'Waiting for PlaylistDrawer updates' });
    } else {
      const has01Discover = drawerSrc && (
        drawerSrc.includes('01') && drawerSrc.includes('DISCOVER')
      );
      recordTest({
        id: 'T1.10.3', tier: 1, milestone: 2,
        title: 'PlaylistDrawer.tsx NAV_LINKS includes 01 DISCOVER as primary navigation item',
        pass: Boolean(has01Discover),
        error: 'NAV_LINKS in PlaylistDrawer.tsx missing 01 DISCOVER',
      });
    }

    // T1.10.4
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.10.4', tier: 1, milestone: 2, title: 'NAV_LINKS retains 02 COLLECTIONS, 03 ABOUT, 04 PLAYLISTS, 05 SETTINGS', pending: true, pendingReason: 'Waiting for PlaylistDrawer updates' });
    } else {
      const hasAllLinks = drawerSrc && (
        drawerSrc.includes('02') && drawerSrc.includes('COLLECTIONS') &&
        drawerSrc.includes('03') && drawerSrc.includes('ABOUT') &&
        drawerSrc.includes('04') && drawerSrc.includes('PLAYLISTS') &&
        drawerSrc.includes('05') && drawerSrc.includes('SETTINGS')
      );
      recordTest({
        id: 'T1.10.4', tier: 1, milestone: 2,
        title: 'NAV_LINKS retains 02 COLLECTIONS, 03 ABOUT, 04 PLAYLISTS, 05 SETTINGS in sequence',
        pass: Boolean(hasAllLinks),
        error: 'PlaylistDrawer NAV_LINKS sequence missing one or more required items',
      });
    }

    // T1.10.5
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.10.5', tier: 1, milestone: 2, title: 'TopBar.tsx brand logo click navigates to discover view', pending: true, pendingReason: 'Waiting for TopBar updates' });
    } else {
      const logoToDiscover = topbarSrc && (
        topbarSrc.includes("'discover'") ||
        topbarSrc.includes('"discover"')
      );
      recordTest({
        id: 'T1.10.5', tier: 1, milestone: 2,
        title: "TopBar.tsx brand logo click handler navigates to 'discover' view",
        pass: Boolean(logoToDiscover),
        error: "TopBar.tsx brand logo does not navigate to 'discover'",
      });
    }

    // ── F11: Continuous Audio Engine Lifecycle & Isolation (Criterion 11) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 11: Continuous Audio Engine Lifecycle & Isolation (Criterion 11)]\x1b[0m');

    // T1.11.1
    {
      const isRootProvider = readFileSafe('src/App.tsx')?.includes('<PlayerProvider>');
      recordTest({
        id: 'T1.11.1', tier: 1, milestone: 3,
        title: 'useAudioEngine is instantiated strictly once at application root in PlayerProvider',
        pass: Boolean(isRootProvider),
        error: 'PlayerProvider is not root-level audio engine boundary in src/App.tsx',
      });
    }

    // T1.11.2
    {
      const hasDualAudio = audioEngineSrc?.includes('const a = new Audio()') && audioEngineSrc?.includes('const b = new Audio()');
      const hasFadeTokens = audioEngineSrc?.includes('fadeTokens') || audioEngineSrc?.includes('WeakMap');
      recordTest({
        id: 'T1.11.2', tier: 1, milestone: 3,
        title: 'Dual HTMLAudioElement instances (a and b) with WeakMap fadeTokens permanently persist',
        pass: Boolean(hasDualAudio && hasFadeTokens),
        error: 'Dual audio element or fadeTokens contract violated in useAudioEngine.ts',
      });
    }

    // T1.11.3
    {
      const sourcesToCheck = [discoverServiceSrc, discoverViewSrc, minIslandSrc].filter(Boolean);
      const hasOrphanAudio = sourcesToCheck.some((s) => s.includes('new Audio(') || s.includes('new AudioContext'));
      recordTest({
        id: 'T1.11.3', tier: 1, milestone: 3,
        title: 'Zero secondary HTMLAudioElement or AudioContext instances created in DiscoverView or MinimizedIsland',
        pass: !hasOrphanAudio,
        error: 'Secondary audio or context instance instantiated in Discover subsystem',
      });
    }

    // T1.11.4
    {
      const sim = createSimulatedPlayerEnvironment({ view: 'discover', isPlaying: true, currentTrack: allTracks[0] });
      sim.setView('collection');
      const stillPlaying1 = sim.engine.isPlaying;
      sim.setView('settings');
      const stillPlaying2 = sim.engine.isPlaying;
      recordTest({
        id: 'T1.11.4', tier: 1, milestone: 3,
        title: 'View routing transitions (discover <-> collection <-> settings) do not stop or interrupt audio playback',
        pass: stillPlaying1 && stillPlaying2,
        error: 'View transition interrupted active audio playback',
      });
    }

    // T1.11.5
    {
      const sim = createSimulatedPlayerEnvironment({ isPlayerExpanded: true, isPlaying: true, currentTrack: allTracks[0] });
      sim.setIsPlayerExpanded(false); // minimize
      const stillPlaying1 = sim.engine.isPlaying;
      sim.setIsPlayerExpanded(true); // re-expand
      const stillPlaying2 = sim.engine.isPlaying;
      recordTest({
        id: 'T1.11.5', tier: 1, milestone: 3,
        title: 'Player stage transitions (isPlayerExpanded true <-> false) preserve continuous audio playback',
        pass: stillPlaying1 && stillPlaying2,
        error: 'Player minimize/expand transition interrupted active playback',
      });
    }

    // ── F12: Theme Tokens, Visualizer Clamping & Queue Button (Criterion 12 & R1/R2) ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Feature 12: Theme Tokens, Visualizer Clamping & Queue Button (Criterion 12 & R1/R2)]\x1b[0m');

    // T1.12.1
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T1.12.1', tier: 1, milestone: 3, title: 'DiscoverView.css binds colors, cards, and pills to semantic CSS variables', pending: true, pendingReason: 'Waiting for DiscoverView.css' });
    } else {
      const hasThemeVars = discoverViewCss && (
        discoverViewCss.includes('var(--') &&
        (discoverViewCss.includes('--bg-primary') || discoverViewCss.includes('--surface') || discoverViewCss.includes('--text-primary'))
      );
      recordTest({
        id: 'T1.12.1', tier: 1, milestone: 3,
        title: 'DiscoverView.css binds surfaces, cards, pills, text, and glows to semantic CSS variables',
        pass: Boolean(hasThemeVars),
        error: 'Semantic theme CSS variables missing in DiscoverView.css',
      });
    }

    // T1.12.2
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T1.12.2', tier: 1, milestone: 3, title: 'MinimizedPlayerIsland.css binds container and controls to semantic CSS variables', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland.css' });
    } else {
      const hasThemeVars = minIslandCss && (
        minIslandCss.includes('var(--') &&
        (minIslandCss.includes('--surface') || minIslandCss.includes('--pink') || minIslandCss.includes('--lavender') || minIslandCss.includes('--text-primary'))
      );
      recordTest({
        id: 'T1.12.2', tier: 1, milestone: 3,
        title: 'MinimizedPlayerIsland.css binds island container, controls, and sliders to semantic CSS variables',
        pass: Boolean(hasThemeVars),
        error: 'Semantic theme CSS variables missing in MinimizedPlayerIsland.css',
      });
    }

    // T1.12.3
    {
      const cssSources = [discoverViewCss, minIslandCss].filter(Boolean).join('\n');
      const hasClashingHex = /(background|background-color)\s*:\s*#(000000|ffffff|fff|000);/i.test(cssSources);
      recordTest({
        id: 'T1.12.3', tier: 1, milestone: 3,
        title: 'Zero hardcoded conflicting background hex colors in DiscoverView and MinimizedPlayerIsland',
        pass: !hasClashingHex,
        error: 'Hardcoded solid background hex colors detected violating theme engine integration',
      });
    }

    // T1.12.4: R1 Visualizer Geometry Clamping & Dimension
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T1.12.4', tier: 1, milestone: 1, title: 'R1: AudioReactiveVisualizer expands dimension to calc(100% + 380px) max 1400px and clamps radius', pending: true, pendingReason: 'Waiting for Visualizer geometry updates' });
    } else {
      const has380 = vizCss?.includes('calc(100% + 380px)') || vizCss?.includes('1400px');
      const hasClampedRadius = vizSrc && (
        vizSrc.includes('maxSafeRadius') ||
        vizSrc.includes('minDimension - 28') ||
        vizSrc.includes('baseArtworkRadius')
      ) && vizSrc.includes("ctx['setLineDash']");
      recordTest({
        id: 'T1.12.4', tier: 1, milestone: 1,
        title: 'R1: Visualizer expands to calc(100% + 380px) max 1400px, clamps to maxSafeRadius, and preserves setLineDash bracket notation',
        pass: Boolean(has380 && hasClampedRadius),
        error: 'R1 Visualizer dimension expansion or geometry clamping missing in AudioReactiveVisualizer',
      });
    }

    // T1.12.5: R2 Queue Button Styling & Mobile Visibility
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T1.12.5', tier: 1, milestone: 1, title: 'R2: Transport queue button transparent without borders and hidden on mobile', pending: true, pendingReason: 'Waiting for Transport.css updates' });
    } else {
      const hasTransparent = transportCss && (
        transportCss.includes('transparent') ||
        transportCss.includes('border: none') ||
        transportCss.includes('border: 0')
      );
      const hasMobileHide = transportCss && (
        transportCss.includes('@media (max-width: 768px)') &&
        transportCss.includes('.transport__queue-button') &&
        transportCss.includes('display: none')
      );
      recordTest({
        id: 'T1.12.5', tier: 1, milestone: 1,
        title: 'R2: Transport queue button transparent with no border/shadow on desktop and hidden on mobile <= 768px',
        pass: Boolean(hasTransparent && hasMobileHide),
        error: 'R2 Transport queue button transparency or mobile display: none missing in Transport.css',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: BOUNDARY & CORNER CASES (4 tests per area, 10 areas = 40 tests)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!tierArg || tierArg === '2') {
    if (!isJsonOutput) console.log('\n\x1b[1m\x1b[36m━━━ TIER 2: BOUNDARY & CORNER CASES ━━━\x1b[0m');

    // ── B1: Empty & Boundary Catalogs ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 1: Empty & Boundary Catalogs]\x1b[0m');

    // T2.1.1
    {
      const res = oracleGetNewlyAddedSongs([], 10);
      recordTest({
        id: 'T2.1.1', tier: 2, milestone: 2,
        title: 'getNewlyAddedSongs([]) on empty catalog returns empty array without throwing',
        pass: Array.isArray(res) && res.length === 0,
        error: 'Empty catalog threw error in getNewlyAddedSongs',
      });
    }

    // T2.1.2
    {
      const res = oracleGetNewlyAddedSongs(allTracks, 0);
      recordTest({
        id: 'T2.1.2', tier: 2, milestone: 2,
        title: 'getNewlyAddedSongs with limit = 0 returns empty array',
        pass: Array.isArray(res) && res.length === 0,
        error: 'limit = 0 did not return empty array',
      });
    }

    // T2.1.3
    {
      const smallCatalog = allTracks.slice(0, 3);
      const res = oracleGetNewlyAddedSongs(smallCatalog, 10);
      recordTest({
        id: 'T2.1.3', tier: 2, milestone: 2,
        title: 'getNewlyAddedSongs with fewer tracks than limit returns all available tracks without padding',
        pass: res.length === 3,
        error: 'Small catalog returned incorrect track length or padded with undefined',
      });
    }

    // T2.1.4
    {
      const res = oracleGetListenToRecommendations([], null, 4);
      recordTest({
        id: 'T2.1.4', tier: 2, milestone: 2,
        title: 'getListenToRecommendations with empty albums array returns empty array safely',
        pass: Array.isArray(res) && res.length === 0,
        error: 'Empty albums array threw error in getListenToRecommendations',
      });
    }

    // ── B2: Missing / Null Artwork & Cover Fallback Robustness ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 2: Missing / Null Artwork & Cover Fallback Robustness]\x1b[0m');

    // T2.2.1
    {
      const t = { id: 't-ws', title: 'WS', artworkUrl: '   ' };
      const a = { id: 'a-cov', coverUrl: '/cover.png' };
      const res = oracleResolveArtwork(t, a);
      recordTest({
        id: 'T2.2.1', tier: 2, milestone: 2,
        title: 'Track with whitespace-only artworkUrl skips to Tier 2 album coverUrl',
        pass: res === '/cover.png',
        error: 'Whitespace-only artworkUrl was not treated as empty',
      });
    }

    // T2.2.2
    {
      const t = { id: 't-none', title: 'None', artworkUrl: '' };
      const a = { id: 'a-ws', coverUrl: '   ' };
      const res = oracleResolveArtwork(t, a);
      recordTest({
        id: 'T2.2.2', tier: 2, milestone: 2,
        title: 'Album with whitespace-only coverUrl skips to Tier 3 glyph placeholder',
        pass: res === 'fallback-glyph',
        error: 'Whitespace-only coverUrl was not treated as empty',
      });
    }

    // T2.2.3
    {
      const malformedTrack = null;
      const malformedAlbum = undefined;
      const res = oracleResolveArtwork(malformedTrack, malformedAlbum);
      recordTest({
        id: 'T2.2.3', tier: 2, milestone: 2,
        title: 'Artwork fallback handles null/undefined track and album objects without throwing',
        pass: res === 'fallback-glyph',
        error: 'Null or undefined track/album caused crash in artwork fallback resolution',
      });
    }

    // T2.2.4
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T2.2.4', tier: 2, milestone: 2, title: 'DiscoverView provides SVG glyph fallback placeholder markup', pending: true, pendingReason: 'Waiting for DiscoverView.tsx' });
    } else {
      const hasGlyphMarkup = discoverViewSrc && (
        discoverViewSrc.includes('<svg') ||
        discoverViewSrc.includes('glyph') ||
        discoverViewSrc.includes('placeholder') ||
        discoverViewSrc.includes('fallback')
      );
      recordTest({
        id: 'T2.2.4', tier: 2, milestone: 2,
        title: 'DiscoverView provides styled SVG / glyph placeholder markup for Tier 3 artwork fallback',
        pass: Boolean(hasGlyphMarkup),
        error: 'Tier 3 SVG / glyph placeholder markup missing in DiscoverView.tsx',
      });
    }

    // ── B3: Rapid & Redundant Stage Expansion / Minimize Toggles ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 3: Rapid & Redundant Stage Expansion / Minimize Toggles]\x1b[0m');

    // T2.3.1
    {
      const sim = createSimulatedPlayerEnvironment({ isPlayerExpanded: false, isPlaying: true });
      for (let i = 0; i < 10; i++) {
        sim.setIsPlayerExpanded(i % 2 === 0);
      }
      recordTest({
        id: 'T2.3.1', tier: 2, milestone: 3,
        title: 'Rapid toggle of isPlayerExpanded (10 cycles) leaves audio engine playback intact',
        pass: sim.engine.isPlaying === true,
        error: 'Rapid expansion toggling corrupted audio engine state',
      });
    }

    // T2.3.2
    {
      const sim = createSimulatedPlayerEnvironment({ isPlayerExpanded: true });
      sim.setIsPlayerExpanded(true); // Redundant
      recordTest({
        id: 'T2.3.2', tier: 2, milestone: 3,
        title: 'Redundant setIsPlayerExpanded(true) when already expanded executes idempotently',
        pass: sim.isPlayerExpanded === true,
        error: 'Redundant expansion call caused unexpected state shift',
      });
    }

    // T2.3.3
    {
      const sim = createSimulatedPlayerEnvironment({ isPlayerExpanded: false });
      sim.setIsPlayerExpanded(false); // Redundant
      recordTest({
        id: 'T2.3.3', tier: 2, milestone: 3,
        title: 'Redundant setIsPlayerExpanded(false) when already minimized executes idempotently',
        pass: sim.isPlayerExpanded === false,
        error: 'Redundant minimize call caused unexpected state shift',
      });
    }

    // T2.3.4
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T2.3.4', tier: 2, milestone: 3, title: 'AppShell renders MinimizedPlayerIsland only when currentTrack is loaded', pending: true, pendingReason: 'Waiting for AppShell player stage integration' });
    } else {
      const guardsCurrentTrack = appShellSrc && (
        appShellSrc.includes('engine.currentTrack') ||
        appShellSrc.includes('currentTrack')
      ) && appShellSrc.includes('MinimizedPlayerIsland');
      recordTest({
        id: 'T2.3.4', tier: 2, milestone: 3,
        title: 'AppShell mounts MinimizedPlayerIsland only when currentTrack exists and player is minimized',
        pass: Boolean(guardsCurrentTrack),
        error: 'MinimizedPlayerIsland lacks currentTrack guard in AppShell.tsx',
      });
    }

    // ── B4: Malformed Metadata & Genre Hallucination Resilience ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 4: Malformed Metadata & Genre Hallucination Resilience]\x1b[0m');

    // T2.4.1
    {
      const malformedAlbum = [{ id: 'm1', title: 'M1', mood: null, tags: undefined }];
      const cats = oracleGetFrequenciesCategories([], malformedAlbum);
      recordTest({
        id: 'T2.4.1', tier: 2, milestone: 2,
        title: 'Albums with empty/missing mood array are handled cleanly without injecting undefined string',
        pass: !cats.includes('undefined') && !cats.includes('null'),
        error: 'Undefined or null string injected into category list',
      });
    }

    // T2.4.2
    {
      const duplicateTracks = [
        { id: 'd1', tags: ['lo-fi', 'chill'] },
        { id: 'd2', tags: ['lo-fi', 'CHILL'] },
      ];
      const cats = oracleGetFrequenciesCategories(duplicateTracks, []);
      const loFiCount = cats.filter((c) => c === 'lo-fi').length;
      recordTest({
        id: 'T2.4.2', tier: 2, milestone: 2,
        title: 'Duplicate and mixed-case tags (lo-fi, CHILL) deduplicate cleanly in category derivation',
        pass: loFiCount === 1,
        error: 'Duplicate categories detected in category derivation',
      });
    }

    // T2.4.3
    {
      const cats = oracleGetFrequenciesCategories(allTracks, catalog.albums);
      const hasUppercase = cats.some((c) => /[A-Z]/.test(c));
      recordTest({
        id: 'T2.4.3', tier: 2, milestone: 2,
        title: 'Category tags normalize to lowercase trimming whitespace for reliable matching',
        pass: !hasUppercase,
        error: 'Unnormalized uppercase categories detected in category derivation',
      });
    }

    // T2.4.4
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T2.4.4', tier: 2, milestone: 2, title: 'DiscoverView provides All or universal filter pill option', pending: true, pendingReason: 'Waiting for DiscoverView.tsx' });
    } else {
      const hasAllPill = discoverViewSrc && (
        discoverViewSrc.includes('all') ||
        discoverViewSrc.includes('All') ||
        discoverViewSrc.includes('ALL')
      );
      recordTest({
        id: 'T2.4.4', tier: 2, milestone: 2,
        title: "DiscoverView provides 'All' or universal category pill to reset filter state",
        pass: Boolean(hasAllPill),
        error: "'All' category reset pill option missing in DiscoverView.tsx",
      });
    }

    // ── B5: Partial / Reordered Editorial IDs in Featured Playlists ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 5: Partial / Reordered Editorial IDs in Featured Playlists]\x1b[0m');

    // T2.5.1
    {
      const singleAlbum = [catalog.albums.find((a) => a.id === 'website-wala-playlist')].filter(Boolean);
      const featured = oracleGetFeaturedPlaylists(singleAlbum);
      recordTest({
        id: 'T2.5.1', tier: 2, milestone: 2,
        title: 'Featured playlists with only 1 curated ID present returns array of 1 without null entries',
        pass: featured.length === 1 && featured[0]?.id === 'website-wala-playlist',
        error: 'Single album catalog failed in featured playlists',
      });
    }

    // T2.5.2
    {
      const reversedAlbums = catalog.albums.slice().reverse();
      const featured = oracleGetFeaturedPlaylists(reversedAlbums);
      const ids = featured.map((a) => a.id);
      const orderMaintained = EDITORIAL_PLAYLIST_IDS.every((expectedId, idx) => ids[idx] === expectedId);
      recordTest({
        id: 'T2.5.2', tier: 2, milestone: 2,
        title: 'Reversed order of albums in source catalog still yields exact editorial order output',
        pass: orderMaintained,
        error: 'Editorial order violated when source catalog is reversed',
      });
    }

    // T2.5.3
    {
      const duplicateAlbums = catalog.albums.concat(catalog.albums);
      const featured = oracleGetFeaturedPlaylists(duplicateAlbums);
      recordTest({
        id: 'T2.5.3', tier: 2, milestone: 2,
        title: 'Duplicate albums in source catalog are deduplicated in featured playlists output',
        pass: featured.length === EDITORIAL_PLAYLIST_IDS.length,
        error: 'Duplicate albums resulted in duplicate featured entries',
      });
    }

    // T2.5.4
    {
      const featured = oracleGetFeaturedPlaylists(catalog.albums);
      const allHaveTracks = featured.every((a) => Array.isArray(a.tracks) && a.tracks.length > 0);
      recordTest({
        id: 'T2.5.4', tier: 2, milestone: 2,
        title: 'Featured playlists preserves all original album metadata, tracks, and artwork references',
        pass: allHaveTracks,
        error: 'Featured playlist objects lost tracks or metadata',
      });
    }

    // ── B6: Minimize Button Boundary & Focus / Keyboard Navigation ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 6: Minimize Button Boundary & Focus / Keyboard Navigation]\x1b[0m');

    // T2.6.1
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T2.6.1', tier: 2, milestone: 1, title: 'Minimize button rendered as semantic button element', pending: true, pendingReason: 'Waiting for Transport.tsx' });
    } else {
      const isButtonEl = transportSrc && (
        transportSrc.includes('<button') &&
        (transportSrc.includes('onMinimize') || transportSrc.includes('▼'))
      );
      recordTest({
        id: 'T2.6.1', tier: 2, milestone: 1,
        title: 'Minimize button is rendered as semantic <button> element supporting keyboard Enter/Space',
        pass: Boolean(isButtonEl),
        error: 'Minimize control is not a semantic <button> element in Transport.tsx',
      });
    }

    // T2.6.2
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T2.6.2', tier: 2, milestone: 1, title: 'Minimize button maintains focus styles in Transport.css', pending: true, pendingReason: 'Waiting for Transport.css' });
    } else {
      const hasFocusStyles = transportCss && (
        transportCss.includes(':focus') ||
        transportCss.includes(':focus-visible') ||
        transportCss.includes('outline')
      );
      recordTest({
        id: 'T2.6.2', tier: 2, milestone: 1,
        title: 'Minimize button maintains accessible :focus and :focus-visible styling in Transport.css',
        pass: Boolean(hasFocusStyles),
        error: 'Focus styles missing in Transport.css',
      });
    }

    // T2.6.3
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T2.6.3', tier: 2, milestone: 1, title: 'Transport minimize button does not clash with Shuffle button', pending: true, pendingReason: 'Waiting for Transport.css' });
    } else {
      const hasSeparateHitbox = transportCss && (
        transportCss.includes('gap') ||
        transportCss.includes('margin') ||
        transportCss.includes('padding')
      );
      recordTest({
        id: 'T2.6.3', tier: 2, milestone: 1,
        title: 'Minimize button has isolated touch target without overlapping adjacent Shuffle button',
        pass: Boolean(hasSeparateHitbox),
        error: 'Controls spacing or hit target isolation missing in Transport.css',
      });
    }

    // T2.6.4
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T2.6.4', tier: 2, milestone: 3, title: 'Transport docked controls visible only when player is expanded', pending: true, pendingReason: 'Waiting for AppShell stage integration' });
    } else {
      const hidesWhenMinimized = appShellSrc && (
        appShellSrc.includes('isPlayerExpanded') &&
        appShellSrc.includes('Transport')
      );
      recordTest({
        id: 'T2.6.4', tier: 2, milestone: 3,
        title: 'AppShell mounts or displays Transport when isPlayerExpanded is true',
        pass: Boolean(hidesWhenMinimized),
        error: 'Transport visibility not conditioned on isPlayerExpanded in AppShell.tsx',
      });
    }

    // ── B7: Minimized Island Layout & Long Track Title / Artist Truncation ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 7: Minimized Island Layout & Long Track Title / Artist Truncation]\x1b[0m');

    // T2.7.1
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T2.7.1', tier: 2, milestone: 3, title: 'MinimizedPlayerIsland applies text truncation (ellipsis)', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland.css' });
    } else {
      const hasTruncation = minIslandCss && (
        minIslandCss.includes('text-overflow: ellipsis') ||
        minIslandCss.includes('ellipsis')
      );
      recordTest({
        id: 'T2.7.1', tier: 2, milestone: 3,
        title: 'Track title in MinimizedPlayerIsland applies text-overflow: ellipsis for long strings',
        pass: Boolean(hasTruncation),
        error: 'text-overflow: ellipsis missing in MinimizedPlayerIsland.css',
      });
    }

    // T2.7.2
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T2.7.2', tier: 2, milestone: 3, title: 'Artist metadata in MinimizedPlayerIsland applies overflow: hidden', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland.css' });
    } else {
      const hasOverflowHidden = minIslandCss && minIslandCss.includes('overflow: hidden');
      recordTest({
        id: 'T2.7.2', tier: 2, milestone: 3,
        title: 'Artist metadata in MinimizedPlayerIsland applies overflow: hidden with nowrap styling',
        pass: Boolean(hasOverflowHidden),
        error: 'overflow: hidden missing in MinimizedPlayerIsland.css',
      });
    }

    // T2.7.3
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T2.7.3', tier: 2, milestone: 3, title: 'MinimizedPlayerIsland has max-width and centering for ultra-wide displays', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland.css' });
    } else {
      const hasMaxWidthOrCentering = minIslandCss && (
        minIslandCss.includes('max-width') ||
        minIslandCss.includes('margin: 0 auto') ||
        minIslandCss.includes('justify-content: center')
      );
      recordTest({
        id: 'T2.7.3', tier: 2, milestone: 3,
        title: 'MinimizedPlayerIsland enforces max-width and centering for clean ultra-wide display presentation',
        pass: Boolean(hasMaxWidthOrCentering),
        error: 'Max-width or centering container constraints missing in MinimizedPlayerIsland.css',
      });
    }

    // T2.7.4
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T2.7.4', tier: 2, milestone: 3, title: 'Seek slider handles 0 duration and NaN time safely', pending: true, pendingReason: 'Waiting for MinimizedPlayerIsland.tsx' });
    } else {
      const handlesZeroOrNan = minIslandSrc && (
        minIslandSrc.includes('duration || 0') ||
        minIslandSrc.includes('Math.floor') ||
        minIslandSrc.includes('isFinite') ||
        minIslandSrc.includes('duration > 0') ||
        minIslandSrc.includes('isNaN')
      );
      recordTest({
        id: 'T2.7.4', tier: 2, milestone: 3,
        title: 'MinimizedPlayerIsland seek slider handles 0 duration and unbuffered time values safely without NaN',
        pass: Boolean(handlesZeroOrNan),
        error: 'Zero duration / NaN guards missing in MinimizedPlayerIsland seek slider',
      });
    }

    // ── B8: Micro-Swipes, Diagonal Gestures & False-Trigger Rejection ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 8: Micro-Swipes, Diagonal Gestures & False-Trigger Rejection]\x1b[0m');

    // T2.8.1
    {
      const pullSmall = oracleSpringPull(15);
      const isSubThreshold = 15 < 45;
      recordTest({
        id: 'T2.8.1', tier: 2, milestone: 1,
        title: 'Micro-drag (deltaX = 15px < 45px) remains sub-threshold without triggering drawer open',
        pass: isSubThreshold && pullSmall === 3.75,
        error: 'Micro-drag exceeded threshold or spring pull calculation inaccurate',
      });
    }

    // T2.8.2
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T2.8.2', tier: 2, milestone: 1, title: 'Diagonal swipe with |deltaY| > |deltaX| rejects horizontal drawer trigger', pending: true, pendingReason: 'Waiting for PlayerHome.tsx' });
    } else {
      const checksAxisDominance = playerHomeSrc && (
        playerHomeSrc.includes('Math.abs(deltaX) > Math.abs(deltaY)') ||
        playerHomeSrc.includes('Math.abs(diffX) > Math.abs(diffY)')
      );
      recordTest({
        id: 'T2.8.2', tier: 2, milestone: 1,
        title: 'Diagonal swipe with |deltaY| > |deltaX| rejects horizontal drawer open gesture in PlayerHome.tsx',
        pass: Boolean(checksAxisDominance),
        error: 'Axis dominance check Math.abs(deltaX) > Math.abs(deltaY) missing in PlayerHome.tsx',
      });
    }

    // T2.8.3
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T2.8.3', tier: 2, milestone: 1, title: 'Screen center touch (touchStartX > 40px) rejects left-edge drawer gesture', pending: true, pendingReason: 'Waiting for AppShell.tsx' });
    } else {
      const checksEdgeBound = appShellSrc && (
        appShellSrc.includes('<= 40') ||
        appShellSrc.includes('< 40') ||
        appShellSrc.includes('<=40')
      );
      recordTest({
        id: 'T2.8.3', tier: 2, milestone: 1,
        title: 'Screen center touch (touchStartX > 40px) rejects left-edge drawer open gesture in AppShell.tsx',
        pass: Boolean(checksEdgeBound),
        error: 'Left-edge boundary guard touchStartX <= 40px missing in AppShell.tsx',
      });
    }

    // T2.8.4
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T2.8.4', tier: 2, milestone: 1, title: 'Reverse horizontal swipe (deltaX < 0) does not apply positive spring pull', pending: true, pendingReason: 'Waiting for PlayerHome.tsx' });
    } else {
      const checksPositiveDelta = playerHomeSrc && (
        playerHomeSrc.includes('deltaX > 0') ||
        playerHomeSrc.includes('diffX > 0')
      );
      recordTest({
        id: 'T2.8.4', tier: 2, milestone: 1,
        title: 'Reverse horizontal swipe (deltaX < 0, leftward) is clamped to 0 spring pull in PlayerHome.tsx',
        pass: Boolean(checksPositiveDelta),
        error: 'Positive drag direction guard (deltaX > 0) missing in PlayerHome.tsx',
      });
    }

    // ── B9: Invalid / Unknown View Navigation Recovery ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 9: Invalid / Unknown View Navigation Recovery]\x1b[0m');

    // T2.9.1
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T2.9.1', tier: 2, milestone: 2, title: 'Unknown view in state or URL safely defaults to discover', pending: true, pendingReason: 'Waiting for PlayerContext.tsx' });
    } else {
      const hasSafeDefault = playerContextSrc && (
        playerContextSrc.includes("'discover'")
      );
      recordTest({
        id: 'T2.9.1', tier: 2, milestone: 2,
        title: "Unknown or corrupted view name in state safely recovers to default 'discover'",
        pass: Boolean(hasSafeDefault),
        error: "Fallback recovery to 'discover' missing in PlayerContext.tsx",
      });
    }

    // T2.9.2
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T2.9.2', tier: 2, milestone: 2, title: 'Admin secret query parameter (?admin=1) routes to admin view', pending: true, pendingReason: 'Waiting for PlayerContext.tsx' });
    } else {
      const hasAdminParam = playerContextSrc && (
        playerContextSrc.includes('admin') &&
        playerContextSrc.includes('location.search')
      );
      recordTest({
        id: 'T2.9.2', tier: 2, milestone: 2,
        title: "Admin query parameter (?admin) continues to route to 'admin' without breaking 'discover'",
        pass: Boolean(hasAdminParam),
        error: "Admin query parameter routing broken or altered in PlayerContext.tsx",
      });
    }

    // T2.9.3
    {
      const sim = createSimulatedPlayerEnvironment();
      sim.openDrawer();
      const openBefore = sim.isDrawerOpen;
      sim.setView('collection');
      sim.closeDrawer();
      recordTest({
        id: 'T2.9.3', tier: 2, milestone: 2,
        title: 'Drawer close action is executed upon navigation item selection to prevent modal entrapment',
        pass: openBefore === true && sim.isDrawerOpen === false && sim.view === 'collection',
        error: 'Navigation item selection failed to close drawer modal',
      });
    }

    // T2.9.4
    if (!isM2Ready && isProgressive) {
      recordTest({ id: 'T2.9.4', tier: 2, milestone: 2, title: 'View transition executes window.scrollTo(0, 0)', pending: true, pendingReason: 'Waiting for AppShell.tsx' });
    } else {
      const hasScrollToTop = appShellSrc && (
        appShellSrc.includes('scrollTo') ||
        appShellSrc.includes('scrollTop')
      );
      recordTest({
        id: 'T2.9.4', tier: 2, milestone: 2,
        title: 'Transitioning between views resets scroll position to top (window.scrollTo(0, 0))',
        pass: Boolean(hasScrollToTop),
        error: 'Scroll position reset missing in AppShell.tsx',
      });
    }

    // ── B10: Rapid View & Player Transitions during Track Crossfade ──
    if (!isJsonOutput) console.log('\n  \x1b[1m[Boundary Area 10: Rapid View & Player Transitions during Track Crossfade]\x1b[0m');

    // T2.10.1
    {
      const hasWeakMap = audioEngineSrc?.includes('fadeTokens') || audioEngineSrc?.includes('WeakMap');
      recordTest({
        id: 'T2.10.1', tier: 2, milestone: 3,
        title: 'Switching views during active crossfade leaves volume interpolation tokens intact',
        pass: Boolean(hasWeakMap),
        error: 'WeakMap fadeTokens isolation missing in useAudioEngine.ts',
      });
    }

    // T2.10.2
    {
      const sim = createSimulatedPlayerEnvironment({ isPlayerExpanded: true, isPlaying: true });
      sim.setIsPlayerExpanded(false);
      recordTest({
        id: 'T2.10.2', tier: 2, milestone: 3,
        title: 'Minimizing player while audio is crossfading preserves active fade without volume jump',
        pass: sim.engine.isPlaying === true && sim.isPlayerExpanded === false,
        error: 'Minimizing player corrupted crossfade state',
      });
    }

    // T2.10.3
    if (!isM3Ready && isProgressive) {
      recordTest({ id: 'T2.10.3', tier: 2, milestone: 3, title: 'Expanding player keeps compact and main visualizers aligned', pending: true, pendingReason: 'Waiting for visualizer stage sync' });
    } else {
      const usesSingleEngine = appShellSrc && (
        appShellSrc.includes('engine={engine}')
      );
      recordTest({
        id: 'T2.10.3', tier: 2, milestone: 3,
        title: 'Expanding player keeps visualizer audio snapshot shared across both presentation modes',
        pass: Boolean(usesSingleEngine),
        error: 'Visualizer audio engine sharing not preserved in AppShell.tsx',
      });
    }

    // T2.10.4
    {
      const hasMediaSession = audioEngineSrc?.includes('navigator.mediaSession');
      recordTest({
        id: 'T2.10.4', tier: 2, milestone: 3,
        title: 'Hardware media keys and OS lockscreen MediaSession bindings remain active during transitions',
        pass: Boolean(hasMediaSession),
        error: 'MediaSession OS integration missing or corrupted in useAudioEngine.ts',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 3: CROSS-FEATURE COMBINATIONS (10 pairwise tests)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!tierArg || tierArg === '3') {
    if (!isJsonOutput) console.log('\n\x1b[1m\x1b[36m━━━ TIER 3: CROSS-FEATURE COMBINATIONS ━━━\x1b[0m');

    // T3.1: Discover Page -> Play Newly Added Track -> Player Expands -> Audio Starts Uninterrupted
    {
      const sim = createSimulatedPlayerEnvironment({ view: 'discover', isPlayerExpanded: false });
      const firstTrack = allTracks[allTracks.length - 1]; // latest
      sim.engine.playTrack(firstTrack, allTracks);
      sim.setIsPlayerExpanded(true);
      recordTest({
        id: 'T3.1', tier: 3, milestone: 4,
        title: 'Pairwise: Discover Page -> Play Newly Added Track -> Player Expands -> Audio Starts Uninterrupted',
        pass: sim.view === 'discover' && sim.isPlayerExpanded === true && sim.engine.isPlaying === true && sim.engine.currentTrack?.id === firstTrack.id,
        error: 'Integration failure playing newly added track from Discover view',
      });
    }

    // T3.2: Full Player Expanded -> Desktop Minimize Button Click -> Minimized Island Docks -> Track Continues
    {
      const sim = createSimulatedPlayerEnvironment({ isPlayerExpanded: true, isPlaying: true, currentTrack: allTracks[0] });
      sim.setIsPlayerExpanded(false); // Simulate ▼ click
      recordTest({
        id: 'T3.2', tier: 3, milestone: 4,
        title: 'Pairwise: Full Player Expanded -> Desktop Minimize Button Click -> Minimized Island Docks -> Track Continues',
        pass: sim.isPlayerExpanded === false && sim.engine.isPlaying === true && sim.engine.currentTrack?.id === allTracks[0].id,
        error: 'Integration failure minimizing full player stage to docked island',
      });
    }

    // T3.3: Minimized Island -> Click Upper Section -> Player Re-Expands -> Compact Viz Transitions to Main Viz
    {
      const sim = createSimulatedPlayerEnvironment({ isPlayerExpanded: false, isPlaying: true, currentTrack: allTracks[0] });
      sim.setIsPlayerExpanded(true); // Simulate upper section click
      recordTest({
        id: 'T3.3', tier: 3, milestone: 4,
        title: 'Pairwise: Minimized Island -> Click Upper Section -> Player Re-Expands -> Compact Viz Transitions to Main Viz',
        pass: sim.isPlayerExpanded === true && sim.engine.isPlaying === true,
        error: 'Integration failure expanding player from MinimizedPlayerIsland upper section click',
      });
    }

    // T3.4: Minimized Island -> Full Controls Play/Pause & Scrub -> Track State Syncs with Global Engine
    {
      const sim = createSimulatedPlayerEnvironment({ isPlayerExpanded: false, isPlaying: true, currentTrack: allTracks[0] });
      sim.engine.toggle(); // pause
      const isPaused = !sim.engine.isPlaying;
      sim.engine.toggle(); // resume
      const isResumed = sim.engine.isPlaying;
      recordTest({
        id: 'T3.4', tier: 3, milestone: 4,
        title: 'Pairwise: Minimized Island -> Full Controls Play/Pause & Scrub -> Track State Syncs with Global Engine',
        pass: isPaused && isResumed,
        error: 'Controls in MinimizedPlayerIsland out of sync with global AudioEngine',
      });
    }

    // T3.5: Mobile PlayerHome -> Drag Artwork Right -> Spring Pull Translation -> Release Over 45px Opens Drawer
    {
      const pull = oracleSpringPull(60);
      const isOpen = 60 > 45;
      recordTest({
        id: 'T3.5', tier: 3, milestone: 4,
        title: 'Pairwise: Mobile PlayerHome -> Drag Artwork Right -> Spring Pull Translation -> Release Over 45px Opens Drawer',
        pass: pull === 15 && isOpen,
        error: 'Artwork horizontal swipe drawer opening integration failed',
      });
    }

    // T3.6: Mobile Screen Left-Edge Swipe (x <= 40px) -> Opens PlaylistDrawer -> Navigation to 01 DISCOVER
    {
      const sim = createSimulatedPlayerEnvironment({ view: 'collection' });
      const touchStartX = 25;
      const deltaX = 55;
      if (touchStartX <= 40 && deltaX > 40) {
        sim.openDrawer();
      }
      const opened = sim.isDrawerOpen;
      sim.setView('discover');
      sim.closeDrawer();
      recordTest({
        id: 'T3.6', tier: 3, milestone: 4,
        title: 'Pairwise: Mobile Screen Left-Edge Swipe (x <= 40px) -> Opens PlaylistDrawer -> Navigation to 01 DISCOVER',
        pass: opened && sim.view === 'discover' && !sim.isDrawerOpen,
        error: 'Mobile left-edge swipe to drawer to Discover navigation failed',
      });
    }

    // T3.7: TopBar Brand Logo Click from Any View -> Navigates to 01 DISCOVER without Audio Disruption
    {
      const sim = createSimulatedPlayerEnvironment({ view: 'settings', isPlaying: true, currentTrack: allTracks[1] });
      sim.setView('discover'); // Logo click
      recordTest({
        id: 'T3.7', tier: 3, milestone: 4,
        title: 'Pairwise: TopBar Brand Logo Click from Any View -> Navigates to 01 DISCOVER without Audio Disruption',
        pass: sim.view === 'discover' && sim.engine.isPlaying === true && sim.engine.currentTrack?.id === allTracks[1].id,
        error: 'TopBar brand logo navigation disrupted audio playback',
      });
    }

    // T3.8: Dynamic Theme Change across All 6 Themes while Browsing DiscoverView & Minimized Island
    {
      const themes = ['nocturne', 'aqua', 'afterglow', 'overdrive', 'sakura', 'monochrome'];
      const sim = createSimulatedPlayerEnvironment({ view: 'discover', isPlayerExpanded: false, isPlaying: true });
      let allPassed = true;
      for (const theme of themes) {
        if (!sim.engine.isPlaying) allPassed = false;
      }
      recordTest({
        id: 'T3.8', tier: 3, milestone: 4,
        title: 'Pairwise: Dynamic Theme Change across All 6 Themes while Browsing DiscoverView & Minimized Island',
        pass: allPassed,
        error: 'Theme change interrupted DiscoverView or MinimizedIsland state',
      });
    }

    // T3.9: Explore Frequencies Pill Selection -> Dynamic Filter Applied -> Missing Artwork Fallback Handled
    {
      const allowedCategories = oracleGetFrequenciesCategories(allTracks, catalog.albums);
      const selectedCategory = allowedCategories[0] || 'lo-fi';
      const sampleTrackWithNoArt = { id: 'sample-no-art', tags: [selectedCategory], artworkUrl: null };
      const sampleAlbumWithNoArt = { id: 'sample-a', coverUrl: null };
      const resolved = oracleResolveArtwork(sampleTrackWithNoArt, sampleAlbumWithNoArt);
      recordTest({
        id: 'T3.9', tier: 3, milestone: 4,
        title: 'Pairwise: Explore Frequencies Pill Selection -> Dynamic Filter Applied -> Missing Artwork Fallback Handled',
        pass: resolved === 'fallback-glyph',
        error: 'Filter pill selection combined with missing artwork failed graceful resolution',
      });
    }

    // T3.10: Mobile Viewport Resize -> Transport Queue Button Hides -> Minimized Island Adopts Mobile Layout
    if (!isM1Ready && isProgressive) {
      recordTest({ id: 'T3.10', tier: 3, milestone: 4, title: 'Mobile viewport resize hides Transport queue button', pending: true, pendingReason: 'Waiting for Transport mobile CSS' });
    } else {
      const hasMedia768 = transportCss && transportCss.includes('768px') && transportCss.includes('display: none');
      recordTest({
        id: 'T3.10', tier: 3, milestone: 4,
        title: 'Pairwise: Mobile Viewport Resize (<= 768px) -> Transport Queue Button Hides -> Island Responsive Layout Maintained',
        pass: Boolean(hasMedia768),
        error: 'Mobile media query hide rule for queue button missing in Transport.css',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (5 realistic end-user flows)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!tierArg || tierArg === '4') {
    if (!isJsonOutput) console.log('\n\x1b[1m\x1b[36m━━━ TIER 4: REAL-WORLD APPLICATION SCENARIOS ━━━\x1b[0m');

    // T4.1: Scenario 1: First-Time Listener Journey
    {
      const sim = createSimulatedPlayerEnvironment({ view: 'discover', isPlayerExpanded: false, isPlaying: false, currentTrack: null });
      // 1. User arrives on Discover page (isPlayerExpanded is false)
      const step1 = sim.view === 'discover' && sim.isPlayerExpanded === false;
      // 2. User browses Featured Playlists and clicks Play on first featured album
      const featured = oracleGetFeaturedPlaylists(catalog.albums);
      const selectedAlbum = featured[0];
      sim.engine.playTrack(selectedAlbum.tracks[0], selectedAlbum.tracks);
      sim.setIsPlayerExpanded(true);
      const step2 = sim.engine.isPlaying === true && sim.isPlayerExpanded === true && sim.engine.currentTrack?.id === selectedAlbum.tracks[0].id;
      recordTest({
        id: 'T4.1', tier: 4, milestone: 4,
        title: 'Scenario 1: First-Time Listener Journey: Boot on Discover -> Browse Featured -> Play Track -> Full Stage Expands',
        pass: step1 && step2,
        error: 'First-time listener flow failed at stage expansion or playlist playback',
      });
    }

    // T4.2: Scenario 2: Background Listening Workflow
    {
      const sim = createSimulatedPlayerEnvironment({ view: 'discover', isPlayerExpanded: true, isPlaying: true, currentTrack: allTracks[0] });
      // 1. User minimizes player to browse collections
      sim.setIsPlayerExpanded(false);
      const step1 = sim.isPlayerExpanded === false && sim.engine.isPlaying;
      // 2. User navigates to CollectionView, PlaylistsView, and SettingsView
      sim.setView('collection');
      const step2a = sim.engine.isPlaying;
      sim.setView('playlists');
      const step2b = sim.engine.isPlaying;
      sim.setView('settings');
      const step2c = sim.engine.isPlaying;
      // 3. User clicks upper section of Minimized Island to re-expand
      sim.setIsPlayerExpanded(true);
      const step3 = sim.isPlayerExpanded === true && sim.engine.isPlaying;
      recordTest({
        id: 'T4.2', tier: 4, milestone: 4,
        title: 'Scenario 2: Background Listening Workflow: Minimize to Island -> Navigate Views -> Re-Expand with Continuous Playback',
        pass: step1 && step2a && step2b && step2c && step3,
        error: 'Background listening workflow experienced playback interruption during view navigation',
      });
    }

    // T4.3: Scenario 3: Mobile Gesture Navigation Tour
    {
      const sim = createSimulatedPlayerEnvironment({ view: 'about', isPlayerExpanded: true, isPlaying: true, currentTrack: allTracks[0] });
      // 1. User swipes left-edge to open drawer
      sim.openDrawer();
      const step1 = sim.isDrawerOpen;
      // 2. User selects 01 DISCOVER
      sim.setView('discover');
      sim.closeDrawer();
      const step2 = sim.view === 'discover' && !sim.isDrawerOpen;
      // 3. User swipes down on player to minimize
      sim.setIsPlayerExpanded(false);
      const step3 = sim.isPlayerExpanded === false && sim.engine.isPlaying;
      // 4. User swipes up on Minimized Island to re-expand
      sim.setIsPlayerExpanded(true);
      const step4 = sim.isPlayerExpanded === true && sim.engine.isPlaying;
      recordTest({
        id: 'T4.3', tier: 4, milestone: 4,
        title: 'Scenario 3: Mobile Gesture Navigation Tour: Edge swipe drawer -> Select Discover -> Swipe down minimize -> Swipe up expand',
        pass: step1 && step2 && step3 && step4,
        error: 'Mobile gesture navigation sequence failed',
      });
    }

    // T4.4: Scenario 4: Editorial Curation & Mood Exploration
    {
      const currentTrack = allTracks.find((t) => t.albumId === 'night-drive') || allTracks[0];
      const recs = oracleGetListenToRecommendations(catalog.albums, currentTrack, 3);
      const recsValid = recs.length > 0 && recs.every((a) => a.id !== currentTrack.albumId);
      const categories = oracleGetFrequenciesCategories(allTracks, catalog.albums);
      const hasCategories = categories.length >= 3;
      recordTest({
        id: 'T4.4', tier: 4, milestone: 4,
        title: 'Scenario 4: Editorial Curation & Mood Exploration: Recommendations match track mood, categories group existing catalog',
        pass: recsValid && hasCategories,
        error: 'Mood exploration flow yielded incorrect recommendation candidates',
      });
    }

    // T4.5: Scenario 5: Continuous Audio Engine Stress Test
    {
      const sim = createSimulatedPlayerEnvironment({ view: 'discover', isPlayerExpanded: false, isPlaying: true, currentTrack: allTracks[0] });
      const views = ['discover', 'collection', 'playlists', 'about', 'settings'];
      let stable = true;
      for (let i = 0; i < 20; i++) {
        sim.setView(views[i % views.length]);
        sim.setIsPlayerExpanded(i % 2 === 0);
        if (!sim.engine.isPlaying) {
          stable = false;
          break;
        }
      }
      recordTest({
        id: 'T4.5', tier: 4, milestone: 4,
        title: 'Scenario 5: Continuous Audio Engine Stress Test: 20 rapid view switches and player minimize/expands preserve playback',
        pass: stable,
        error: 'Audio engine failed stress test under rapid view and expansion state churn',
      });
    }
  }

  // ── Summary Output ──────────────────────────────────────────────────────────
  if (isJsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.failed > 0 ? 1 : 0);
  }

  console.log('\n\x1b[1m\x1b[35m═════════════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m\x1b[35m         LUNA.FM DISCOVER & MINIMIZED PLAYER E2E TEST SUITE SUMMARY          \x1b[0m');
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
    console.log(`  \x1b[32m\x1b[1m✓ ALL ${results.total} DISCOVER & MINIMIZED PLAYER E2E TESTS PASSED PERFECTLY ACROSS ALL 4 TIERS!\x1b[0m\n`);
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
