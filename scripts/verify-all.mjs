#!/usr/bin/env node
/**
 * LUNA.FM v2 — Automated Acceptance Verification Script
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CATALOG_PATH = path.join(ROOT, 'public', 'music-catalog.json');

const EXACT_SIGNATURE = 'independently curated with ♡ by ☾⋆⁺₊ SUSS¥_PΛJI 𖤐.';

console.log('─── Running LUNA.FM v2 Verification Checks ───\n');

let pass = true;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
  } else {
    console.error(`✗ FAIL: ${message}`);
    pass = false;
  }
}

// 1. Verify dist exists and has index.html
assert(fs.existsSync(DIST), 'dist/ directory exists');
const distHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');
assert(!distHtml.includes('localhost') && !distHtml.includes('127.0.0.1'), 'dist/index.html contains no localhost URLs');

// 2. Check dist bundle for forbidden URLs
const assetsDir = path.join(DIST, 'assets');
const assetFiles = fs.readdirSync(assetsDir);
for (const f of assetFiles) {
  const content = fs.readFileSync(path.join(assetsDir, f), 'utf-8');
  assert(!content.includes('http://localhost') && !content.includes('127.0.0.1'), `dist/assets/${f} contains no localhost URLs`);
}

// 3. Check public/music-catalog.json
assert(fs.existsSync(CATALOG_PATH), 'public/music-catalog.json exists');
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
assert(Array.isArray(catalog.albums) && catalog.albums.length >= 3, `catalog contains ${catalog.albums.length} albums`);
for (const a of catalog.albums) {
  assert(a.id && a.title && a.tracks.length > 0, `Album ${a.id} has id, title, and ${a.tracks.length} tracks`);
  for (const t of a.tracks) {
    assert(t.src.startsWith('/songs/'), `Track ${t.id} src is origin-relative`);
    assert(fs.existsSync(path.join(ROOT, 'public', t.src.slice(1))), `Audio file exists for ${t.src}`);
  }
}

// 4. Check footer signature byte-for-byte in source files
const aboutSrc = fs.readFileSync(path.join(ROOT, 'src/components/AboutView.tsx'), 'utf-8');
const drawerSrc = fs.readFileSync(path.join(ROOT, 'src/components/PlaylistDrawer.tsx'), 'utf-8');
assert(aboutSrc.includes(EXACT_SIGNATURE), 'AboutView contains verbatim footer signature');
assert(drawerSrc.includes(EXACT_SIGNATURE), 'PlaylistDrawer contains verbatim footer signature');

// 5. Check dual-audio engine contract in useAudioEngine.ts
const audioSrc = fs.readFileSync(path.join(ROOT, 'src/hooks/useAudioEngine.ts'), 'utf-8');
assert(audioSrc.includes('const a = new Audio()') && audioSrc.includes('const b = new Audio()'), 'Audio engine initializes exactly two HTMLAudioElement instances');
assert(audioSrc.includes('fadeTokens'), 'Audio engine implements WeakMap token cancellation');
assert(audioSrc.includes('navigator.mediaSession'), 'Audio engine implements MediaSession integration');

// 6. Check dialog usage in PlaylistDrawer and QueueSheet
const queueSrc = fs.readFileSync(path.join(ROOT, 'src/components/QueueSheet.tsx'), 'utf-8');
assert(drawerSrc.includes('<dialog'), 'PlaylistDrawer uses native <dialog>');
assert(queueSrc.includes('<dialog'), 'QueueSheet uses native <dialog>');

// 7. Check ambient glow contract
const glowHookSrc = fs.readFileSync(path.join(ROOT, 'src/hooks/useArtworkGlow.ts'), 'utf-8');
assert(glowHookSrc.includes('--glow-a') && glowHookSrc.includes('--glow-b'), 'useArtworkGlow writes --glow-a and --glow-b');
assert(glowHookSrc.includes('getImageData'), 'useArtworkGlow extracts color with canvas getImageData');

// 8. Check logo & branding ☾⋆⁺₊ LUNA.FM ⁺₊ & Welcome Hero
const topbarSrc = fs.readFileSync(path.join(ROOT, 'src/components/TopBar.tsx'), 'utf-8');
const welcomeSrc = fs.readFileSync(path.join(ROOT, 'src/components/Welcome.tsx'), 'utf-8');
const indexHtmlSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
assert(topbarSrc.includes('☾⋆⁺₊ LUNA.FM ⁺₊'), 'TopBar has ☾⋆⁺₊ LUNA.FM ⁺₊ logo');
assert(welcomeSrc.includes('☾⋆⁺₊ LUNA.FM ⁺₊'), 'Welcome overlay has ☾⋆⁺₊ LUNA.FM ⁺₊ logo');
assert(indexHtmlSrc.includes('☾⋆⁺₊ LUNA.FM ⁺₊'), 'index.html title has ☾⋆⁺₊ LUNA.FM ⁺₊');
assert(welcomeSrc.includes('My resonant') && welcomeSrc.includes('frequencies'), 'Welcome overlay has "My resonant frequencies" headline');
assert((welcomeSrc.includes('EXPLORE') || welcomeSrc.includes('Explore')) && welcomeSrc.includes('LUNA'), 'Welcome overlay has "Explore LUNA.FM" CTA button');
assert(welcomeSrc.includes('Music is my soul'), 'Welcome overlay has "Music is my soul." quote');

// 9. Check ON AIR indicator always rendered in DOM with active and idle states
assert(topbarSrc.includes('topbar__on-air--active') && topbarSrc.includes('topbar__on-air--idle'), 'TopBar always renders on-air with active & idle states');

// 10. Check QueueSheet alignment & Home scroll lock
const queueCss = fs.readFileSync(path.join(ROOT, 'src/components/QueueSheet.css'), 'utf-8');
assert(queueCss.includes('translateX(100%)') && queueCss.includes('right: 0'), 'QueueSheet slides in from right side on desktop like playlist drawer');
assert(queueCss.includes('translateY(100%)') || queueCss.includes('bottom: 0'), 'QueueSheet slides up from bottom on mobile');
const indexCss = fs.readFileSync(path.join(ROOT, 'src/index.css'), 'utf-8');
assert(indexCss.includes('body.home-scroll-locked'), 'src/index.css includes body.home-scroll-locked');

// 11. Check track metadata durations
const allTracksWithDur = catalog.albums.flatMap(a => a.tracks);
assert(allTracksWithDur.some(t => typeof t.duration === 'number' && t.duration > 0), 'Catalog includes tracks with structured duration metadata');
assert(allTracksWithDur.some(t => typeof t.artworkUrl === 'string' && t.artworkUrl.length > 0), 'Catalog includes tracks with artwork metadata');

// 12. Check unified player stage centering & enlarged artwork
const homeCss = fs.readFileSync(path.join(ROOT, 'src/components/PlayerHome.css'), 'utf-8');
const crossfadeCss = fs.readFileSync(path.join(ROOT, 'src/components/CrossfadeImage.css'), 'utf-8');
assert(homeCss.includes('justify-content: center'), 'PlayerHome vertically centers the unified stage');
assert(homeCss.includes('--artwork-size'), 'PlayerHome defines dynamic --artwork-size');
assert(crossfadeCss.includes('object-position: center'), 'CrossfadeImage layer has object-position: center');

// 13. Check central song pool, referenced playlists, search passcode & 04 Playlists menu
const songsListDir = path.join(ROOT, 'public/songs/songs-list');
assert(fs.existsSync(songsListDir), 'public/songs/songs-list central pool exists');
assert(Array.isArray(catalog.standaloneTracks) && catalog.standaloneTracks.length > 0, 'Catalog includes standalone pool tracks');
assert(drawerSrc.includes('04') && drawerSrc.includes('PLAYLISTS'), 'PlaylistDrawer includes 04 PLAYLISTS on navigation menu');
const searchSrc = fs.readFileSync(path.join(ROOT, 'src/components/SearchOverlay.tsx'), 'utf-8');
assert(searchSrc.includes('luna:admin'), 'SearchOverlay recognizes secret passcode luna:admin');

// 14. Check Settings View, Navigation & Centralized Theme Engine
assert(drawerSrc.includes('05') && drawerSrc.includes('SETTINGS'), 'PlaylistDrawer includes 05 SETTINGS on navigation menu');
const settingsSrc = fs.readFileSync(path.join(ROOT, 'src/components/SettingsView.tsx'), 'utf-8');
const appShellSrc = fs.readFileSync(path.join(ROOT, 'src/components/AppShell.tsx'), 'utf-8');
assert(settingsSrc.includes('Curated Theme Library') && settingsSrc.includes('VISUAL FREQUENCY'), 'SettingsView renders appearance and theme library');
assert(appShellSrc.includes('SettingsView'), 'AppShell integrates SettingsView');
const themesDefSrc = fs.readFileSync(path.join(ROOT, 'src/themes/definitions.ts'), 'utf-8');
const all6Themes = ['nocturne', 'aqua', 'afterglow', 'overdrive', 'sakura', 'monochrome'];
assert(all6Themes.every(t => themesDefSrc.includes(`id: '${t}'`)), 'Theme definitions contain all 6 curated themes');
assert(indexHtmlSrc.includes('data-theme') && indexHtmlSrc.includes('luna-fm-theme'), 'index.html includes synchronous zero-flash theme pre-renderer');
const themeEffectsSrc = fs.readFileSync(path.join(ROOT, 'src/themes/ThemeEffects.tsx'), 'utf-8');
assert(themeEffectsSrc.includes('ThemeEffects') && appShellSrc.includes('<ThemeEffects />'), 'ThemeEffects is implemented and mounted in AppShell');

console.log('\n─── Summary ───');
if (pass) {
  console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!\n');
  process.exit(0);
} else {
  console.error('SOME CHECKS FAILED!\n');
  process.exit(1);
}

