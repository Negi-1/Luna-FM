#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SONGS_DIR = path.join(ROOT, 'public', 'songs');

/** Generate a valid PCM 16-bit mono 44.1kHz WAV buffer */
function generateWav(freqs, durationSec = 12) {
  const sampleRate = 44100;
  const numSamples = sampleRate * durationSec;
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Synthesize chord
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let env = 1;
    if (t < 0.3) env = t / 0.3;
    else if (t > durationSec - 0.5) env = (durationSec - t) / 0.5;

    let sample = 0;
    for (const f of freqs) {
      sample += Math.sin(2 * Math.PI * f * t);
    }
    sample = (sample / freqs.length) * env * 0.35;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

const albums = [
  {
    folder: 'night-drive',
    info: {
      title: 'Night Drive',
      description: 'songs for empty highways and neon signs.',
      subtitle: '夜のドライブ',
      artist: 'various',
      mood: ['driving', 'chill', '3am'],
      order: 10,
      tracks: [
        { file: '01-after-dark.wav', title: 'After Dark', artist: 'Mr.Kitty', duration: 248 },
        { file: '02-resonance.wav', title: 'Resonance', artist: 'HOME', duration: 212 },
        { file: '03-midnight-city.wav', title: 'Midnight City', artist: 'M83', duration: 243 },
      ],
    },
    albumCoverSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#19171E" />
      <stop offset="50%" stop-color="#3c1f33" />
      <stop offset="100%" stop-color="#F3B8D8" />
    </linearGradient>
    <radialGradient id="neon" cx="50%" cy="40%" r="40%">
      <stop offset="0%" stop-color="#F3B8D8" stop-opacity="0.9" />
      <stop offset="60%" stop-color="#B9A9D6" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#19171E" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="500" height="500" fill="url(#bg)" />
  <circle cx="250" cy="200" r="160" fill="url(#neon)" />
  <circle cx="250" cy="200" r="80" fill="none" stroke="#F3B8D8" stroke-width="2" opacity="0.6" />
  <circle cx="250" cy="200" r="130" fill="none" stroke="#B9A9D6" stroke-width="1" stroke-dasharray="4,6" opacity="0.4" />
  <text x="250" y="215" font-family="serif" font-size="72" font-style="italic" fill="#F5F0F5" text-anchor="middle" opacity="0.95">☾</text>
  <text x="250" y="380" font-family="monospace" font-size="14" letter-spacing="4" fill="#F3B8D8" text-anchor="middle">NIGHT DRIVE // 88.7 MHZ</text>
  <text x="250" y="410" font-family="sans-serif" font-size="11" letter-spacing="2" fill="#C7C5CE" text-anchor="middle">夜のドライブ · LUNA.FM</text>
</svg>`,
    tracks: [
      {
        name: '01-after-dark.wav',
        freqs: [220, 277.18, 329.63],
        coverSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <rect width="500" height="500" fill="#1b1220" />
  <circle cx="250" cy="250" r="180" fill="#f3b8d8" opacity="0.25" />
  <circle cx="250" cy="250" r="110" fill="#3c1f33" stroke="#f3b8d8" stroke-width="2" />
  <text x="250" y="270" font-family="serif" font-size="64" font-style="italic" fill="#F5F0F5" text-anchor="middle">☾</text>
  <text x="250" y="420" font-family="monospace" font-size="15" letter-spacing="4" fill="#f3b8d8" text-anchor="middle">AFTER DARK · MR.KITTY</text>
</svg>`,
      },
      {
        name: '02-resonance.wav',
        freqs: [261.63, 329.63, 392.0],
        coverSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <rect width="500" height="500" fill="#141824" />
  <circle cx="250" cy="230" r="140" fill="#5c4b8a" opacity="0.4" />
  <polygon points="250,130 350,310 150,310" fill="none" stroke="#b9a9d6" stroke-width="2" />
  <text x="250" y="250" font-family="serif" font-size="40" fill="#F5F0F5" text-anchor="middle">✧</text>
  <text x="250" y="420" font-family="monospace" font-size="15" letter-spacing="4" fill="#b9a9d6" text-anchor="middle">RESONANCE · HOME</text>
</svg>`,
      },
      {
        name: '03-midnight-city.wav',
        freqs: [174.61, 220, 261.63],
      },
    ],
  },
  {
    folder: 'soft-hours',
    info: {
      title: 'Soft Hours',
      description: 'for the quiet part of the night.',
      subtitle: '優しい時間',
      artist: 'various',
      mood: ['chill', 'lovesick', 'dreamcore'],
      order: 20,
      tracks: [
        { file: '01-velvet.wav', title: 'Velvet', artist: 'Cigarettes After Sex', duration: 278 },
        { file: '02-moonlight.wav', title: 'Moonlight Reflection', artist: 'Lamp', duration: 195 },
      ],
    },
    albumCoverSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <linearGradient id="bg2" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#161426" />
      <stop offset="60%" stop-color="#292231" />
      <stop offset="100%" stop-color="#B9A9D6" />
    </linearGradient>
    <radialGradient id="glow2" cx="60%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#B9A9D6" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#161426" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="500" height="500" fill="url(#bg2)" />
  <circle cx="300" cy="250" r="140" fill="url(#glow2)" />
  <text x="250" y="220" font-family="serif" font-size="80" fill="#F5F0F5" text-anchor="middle" opacity="0.85">✧</text>
  <text x="250" y="360" font-family="monospace" font-size="14" letter-spacing="4" fill="#B9A9D6" text-anchor="middle">SOFT HOURS</text>
  <text x="250" y="390" font-family="sans-serif" font-size="11" letter-spacing="2" fill="#C7C5CE" text-anchor="middle">優しい時間 · 03:00 AM</text>
</svg>`,
    tracks: [
      {
        name: '01-velvet.wav',
        freqs: [196, 246.94, 293.66],
        coverSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <rect width="500" height="500" fill="#201a24" />
  <circle cx="250" cy="240" r="160" fill="#d6b6c9" opacity="0.3" />
  <text x="250" y="260" font-family="serif" font-size="70" font-style="italic" fill="#F5F0F5" text-anchor="middle">♡</text>
  <text x="250" y="420" font-family="monospace" font-size="15" letter-spacing="3" fill="#f3b8d8" text-anchor="middle">VELVET · CAS</text>
</svg>`,
      },
      {
        name: '02-moonlight.wav',
        freqs: [220, 261.63, 329.63],
      },
    ],
  },
  {
    folder: 'japanese-indie',
    info: {
      title: 'Japanese Indie',
      description: 'tokyo rain, tape hiss, cassette tape memories.',
      subtitle: '深夜放送',
      artist: 'various',
      mood: ['dreamcore', '3am'],
      order: 30,
      tracks: [
        { file: '01-tokyo-rain.wav', title: 'Tokyo Rain (1998)', artist: 'Fishmans', duration: 320 },
        { file: '02-subway-echoes.wav', title: 'Subway Echoes', artist: 'Yura Yura Teikoku', duration: 254 },
      ],
    },
    albumCoverSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <linearGradient id="bg3" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#19171E" />
      <stop offset="50%" stop-color="#231b2e" />
      <stop offset="100%" stop-color="#5c4b8a" />
    </linearGradient>
  </defs>
  <rect width="500" height="500" fill="url(#bg3)" />
  <rect x="75" y="160" width="350" height="180" rx="16" fill="#292231" stroke="#F3B8D8" stroke-width="1.5" opacity="0.8" />
  <circle cx="160" cy="250" r="38" fill="#19171E" stroke="#B9A9D6" stroke-width="2" />
  <circle cx="340" cy="250" r="38" fill="#19171E" stroke="#B9A9D6" stroke-width="2" />
  <rect x="210" y="235" width="80" height="30" rx="4" fill="#19171E" />
  <text x="250" y="130" font-family="serif" font-size="28" font-style="italic" fill="#F5F0F5" text-anchor="middle">Japanese Indie</text>
  <text x="250" y="400" font-family="monospace" font-size="12" letter-spacing="3" fill="#F3B8D8" text-anchor="middle">SIDE A // 33⅓ RPM · 深夜放送</text>
</svg>`,
    tracks: [
      { name: '01-tokyo-rain.wav', freqs: [146.83, 174.61, 220] },
      { name: '02-subway-echoes.wav', freqs: [164.81, 196, 246.94] },
    ],
  },
];

for (const album of albums) {
  const dir = path.join(SONGS_DIR, album.folder);
  fs.mkdirSync(dir, { recursive: true });

  // info.json
  fs.writeFileSync(path.join(dir, 'info.json'), JSON.stringify(album.info, null, 2) + '\n');

  // Album cover.svg
  fs.writeFileSync(path.join(dir, 'cover.svg'), album.albumCoverSvg);

  // wav tracks and individual cover SVGs if present
  for (const track of album.tracks) {
    const wavBuf = generateWav(track.freqs, 10);
    fs.writeFileSync(path.join(dir, track.name), wavBuf);

    if (track.coverSvg) {
      const baseName = path.parse(track.name).name;
      fs.writeFileSync(path.join(dir, `${baseName}.svg`), track.coverSvg);
      console.log(`[sample] created individual track cover for ${track.name}`);
    }
  }

  console.log(`[sample] created album "${album.info.title}" with ${album.tracks.length} tracks`);
}
