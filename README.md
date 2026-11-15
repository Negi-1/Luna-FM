# ☾⋆⁺₊ LUNA.FM v2 ⁺₊𖤐
> **A high-fidelity nocturnal personal web radio & music archive.**

![License](https://img.shields.io/badge/license-MIT-purple.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![Vite](https://img.shields.io/badge/Vite-6-yellow.svg)

---

## 🌟 Overview

**LUNA.FM** is an atmospheric, client-driven music streaming web application designed with a nocturnal aesthetic, Japanese bilingual telemetry, fluid touch physics, and an audiophile playback engine. 

---

## ✨ Key Features

- **Dual-Element Audio Engine**: Seamless 300ms crossfading between tracks with pre-buffering, volume slope interpolation, and state machine persistence.
- **Audio-Reactive Artwork Visualizer**: Web Audio API integration extracting real-time FFT frequency bin amplitudes, driving an ambient canvas glow.
- **Gesture-Driven Mobile Physics**:
  - Pull-down full-player collapse into a floating minimized player island.
  - Pull-up queue drawer with smooth opacity and blur interpolation.
  - Left-edge swipe gestures for menu and playlist navigation.
- **Curated Discover & Playlist System**: Editorial playlist collections, recently added tracks, mood filtering, and last-played history.
- **Zero-Duplication Catalog Engine**: Centralized static audio pool (`public/songs/songs-list/`) referenced by lightweight JSON playlists (`info.json`).
- **Dynamic Ambient Glow**: Dynamic color sampling from current album artwork casting an atmospheric aura.
- **PWA & MediaSession Integration**: Lock-screen playback controls, background playback, and responsive viewport sizing (`dvh`/`svh`).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Music Catalog
Index songs and playlists into the catalog:
```bash
npm run catalog
```

### 3. Run Dev Server
```bash
npm run dev
```

### 4. Production Build
```bash
npm run build
```

---

## 📁 Project Architecture

```
luna-fm/
├── public/
│   ├── fonts/               # Locally bundled webfonts
│   └── songs/
│       ├── songs-list/      # Central audio & 1:1 artwork pool
│       ├── night-drive/     # Curated playlist (info.json)
│       └── ...
├── src/
│   ├── components/          # React components (PlayerHome, Transport, Visualizer, etc.)
│   ├── context/             # PlayerContext & state provider
│   ├── hooks/               # useAudioEngine, useArtworkGlow
│   ├── services/            # Web Audio analyser, music catalog, discover
│   ├── themes/              # Color schemes & CSS tokens
│   ├── App.tsx
│   └── main.tsx
└── scripts/
    └── generate-music-catalog.mjs
```

---

## 📜 License
MIT © [Negi-1](https://github.com/Negi-1)
