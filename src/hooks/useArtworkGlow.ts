/**
 * LUNA.FM v2 — Dynamic Ambient Glow Hook
 * Samples dominant hue and saturated accent from the active cover art.
 * Writes --glow-a and --glow-b to document.documentElement.
 * See BACKEND.md §11 for the full contract.
 */

import { useEffect, useRef } from 'react';
import type { Track } from '../types';

const FALLBACK_GLOW: [string, string] = ['#F3B8D8', '#B9A9D6'];
const glowCache = new Map<string, [string, string]>();

function applyGlow(a: string, b: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--glow-a', a);
  document.documentElement.style.setProperty('--glow-b', b);
}

function extractColors(img: HTMLImageElement): [string, string] {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  if (!ctx) return FALLBACK_GLOW;

  ctx.drawImage(img, 0, 0, 24, 24);
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, 24, 24);
  } catch {
    console.warn('[luna] Canvas tainted, using glow fallback');
    return FALLBACK_GLOW;
  }

  const data = imageData.data;
  let totalR = 0, totalG = 0, totalB = 0, count = 0;
  let highestScore = -1;
  let bestR = 243, bestG = 184, bestB = 216; // default pink

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    totalR += r;
    totalG += g;
    totalB += b;
    count++;

    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const saturation = max === 0 ? 0 : (max - min) / max;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const score = saturation * (1 - Math.abs(luminance - 0.55));

    if (score > highestScore) {
      highestScore = score;
      bestR = r;
      bestG = g;
      bestB = b;
    }
  }

  if (count === 0) return FALLBACK_GLOW;

  const avgR = Math.round(totalR / count);
  const avgG = Math.round(totalG / count);
  const avgB = Math.round(totalB / count);

  return [
    `rgb(${avgR}, ${avgG}, ${avgB})`,
    `rgb(${bestR}, ${bestG}, ${bestB})`,
  ];
}

export function useArtworkGlow(currentTrack: Track | null) {
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const artworkUrl = currentTrack?.artworkUrl ?? null;
    currentUrlRef.current = artworkUrl;

    if (!artworkUrl) {
      applyGlow(FALLBACK_GLOW[0], FALLBACK_GLOW[1]);
      return;
    }

    if (glowCache.has(artworkUrl)) {
      const [a, b] = glowCache.get(artworkUrl)!;
      applyGlow(a, b);
      return;
    }

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (currentUrlRef.current !== artworkUrl) return; // Stale
      const colors = extractColors(img);
      glowCache.set(artworkUrl, colors);
      applyGlow(colors[0], colors[1]);
    };
    img.onerror = () => {
      if (currentUrlRef.current !== artworkUrl) return;
      applyGlow(FALLBACK_GLOW[0], FALLBACK_GLOW[1]);
    };
    img.src = artworkUrl;
  }, [currentTrack?.artworkUrl]);
}

