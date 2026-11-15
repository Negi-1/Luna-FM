import { useState, useRef } from 'react';
import type { AudioEngine } from '../types';
import ArtworkVisualizer from './ArtworkVisualizer';
import { formatTime, clamp } from '../utils/helpers';
import './MinimizedPlayerIsland.css';

interface MinimizedPlayerIslandProps {
  engine: AudioEngine;
  onExpand: () => void;
  onQueueOpen?: () => void;
}

export function MinimizedPlayerIsland({
  engine,
  onExpand,
  onQueueOpen,
}: MinimizedPlayerIslandProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    repeatMode,
    isShuffled,
    toggle,
    next,
    prev,
    seek,
    toggleShuffle,
    cycleRepeat,
  } = engine;

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  // Touch gesture tracking for continuous, interactive drawer expansion on phone view
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const lastTouchY = useRef<number>(0);
  const lastTouchTime = useRef<number>(0);
  const velocityY = useRef<number>(0);
  const isDraggingUp = useRef<boolean>(false);
  const isInteractingInput = useRef<boolean>(false);

  if (!currentTrack) return null;

  const effectiveDuration = duration > 0 ? duration : (currentTrack.duration ?? 0);
  const displayTime = isScrubbing ? scrubValue : currentTime;
  const progressPct = effectiveDuration > 0
    ? clamp((displayTime / effectiveDuration) * 100, 0, 100)
    : 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth > 768) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest('input[type="range"]')) {
      isInteractingInput.current = true;
      return;
    }
    isInteractingInput.current = false;

    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    touchStartTime.current = Date.now();
    lastTouchY.current = touch.clientY;
    lastTouchTime.current = Date.now();
    velocityY.current = 0;
    isDraggingUp.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isInteractingInput.current) return;
    if (touchStartY.current === null || touchStartX.current === null) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const currentX = touch.clientX;
    const deltaY = currentY - touchStartY.current;
    const deltaX = currentX - touchStartX.current;

    const now = Date.now();
    const dt = Math.max(1, now - lastTouchTime.current);
    velocityY.current = (currentY - lastTouchY.current) / dt;
    lastTouchY.current = currentY;
    lastTouchTime.current = now;

    if (!isDraggingUp.current) {
      if (deltaY < -6 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isDraggingUp.current = true;
      }
    }

    if (isDraggingUp.current) {
      const maxDistance = Math.min(420, window.innerHeight * 0.55);
      const progress = Math.min(1, Math.max(0, -deltaY / maxDistance));
      // Hermite smoothstep curve for natural progressive pull
      const eased = progress * progress * (3 - 2 * progress);

      // 1. Move player drawer up in 1:1 real-time direct connection to finger
      const drawer = document.querySelector('.app-shell__player-drawer') as HTMLElement | null;
      if (drawer) {
        drawer.style.transition = 'none';
        drawer.style.transform = `translateY(${Math.max(0, (1 - eased) * 100)}%)`;
        drawer.style.pointerEvents = 'auto';
      }

      // 2. Minimized island fades and slides down slightly
      const islandEl = document.querySelector('.minimized-player-island') as HTMLElement | null;
      if (islandEl) {
        islandEl.style.transition = 'none';
        islandEl.style.opacity = `${Math.max(0, 1 - progress * 1.8)}`;
        islandEl.style.transform = `translateY(${progress * 24}px)`;
      }

      // 3. Coordinate artwork scale and corner radius to smoothly emerge into full player
      const artworkEl = document.querySelector('.player-home__artwork-wrapper') as HTMLElement | null;
      if (artworkEl) {
        const scale = 0.48 + eased * 0.52; // 0.48 -> 1.0
        const radius = 12 + eased * 4; // 12px -> 16px
        artworkEl.style.transition = 'none';
        artworkEl.style.transform = `scale(${scale.toFixed(3)})`;
        artworkEl.style.borderRadius = `${radius.toFixed(1)}px`;
      }

      // 4. Synchronize collapse progress CSS variables for transport controls
      const collapseProgress = 1 - eased;
      document.documentElement.style.setProperty('--player-collapse-progress', collapseProgress.toFixed(3));
      document.documentElement.style.setProperty('--player-collapse-y', `${(collapseProgress * 150).toFixed(1)}px`);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDraggingUp.current || touchStartY.current === null) {
      touchStartY.current = null;
      touchStartX.current = null;
      isDraggingUp.current = false;
      return;
    }

    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - touchStartY.current;
    const velocity = velocityY.current; // negative = upward flick
    const maxDistance = Math.min(420, window.innerHeight * 0.55);
    const progress = Math.min(1, Math.max(0, -deltaY / maxDistance));

    touchStartY.current = null;
    touchStartX.current = null;
    isDraggingUp.current = false;

    const drawer = document.querySelector('.app-shell__player-drawer') as HTMLElement | null;
    const islandEl = document.querySelector('.minimized-player-island') as HTMLElement | null;
    const artworkEl = document.querySelector('.player-home__artwork-wrapper') as HTMLElement | null;

    // Intentional expand: dragged up > 45px or upward flick (velocity < -0.28) and not reversed down
    const shouldExpand = (deltaY < -45 || (deltaY < -20 && velocity < -0.28) || progress > 0.35) && deltaY < -25 && velocity <= 0.15;

    if (shouldExpand) {
      if (drawer) {
        drawer.style.transition = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
        drawer.style.transform = 'translateY(0)';
      }
      if (islandEl) {
        islandEl.style.transition = 'opacity 220ms ease, transform 260ms ease';
        islandEl.style.opacity = '0';
        islandEl.style.transform = 'translateY(24px)';
      }
      if (artworkEl) {
        artworkEl.style.transition = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 300ms ease';
        artworkEl.style.transform = 'scale(1)';
        artworkEl.style.borderRadius = '16px';
      }
      document.documentElement.style.setProperty('--player-collapse-progress', '0');
      document.documentElement.style.setProperty('--player-collapse-y', '0px');

      setTimeout(() => {
        if (drawer) {
          drawer.style.transform = '';
          drawer.style.transition = '';
        }
        if (islandEl) {
          islandEl.style.opacity = '';
          islandEl.style.transform = '';
          islandEl.style.transition = '';
        }
        if (artworkEl) {
          artworkEl.style.transform = '';
          artworkEl.style.borderRadius = '';
          artworkEl.style.transition = '';
        }
        onExpand();
      }, 300);
    } else {
      // Rebound smoothly back to island
      if (drawer) {
        drawer.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
        drawer.style.transform = 'translateY(100%)';
      }
      if (islandEl) {
        islandEl.style.transition = 'opacity 260ms ease, transform 260ms ease';
        islandEl.style.opacity = '1';
        islandEl.style.transform = 'translateY(0)';
      }
      if (artworkEl) {
        artworkEl.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
        artworkEl.style.transform = 'scale(0.48)';
      }
      document.documentElement.style.setProperty('--player-collapse-progress', '1');
      setTimeout(() => {
        if (drawer) {
          drawer.style.transform = '';
          drawer.style.transition = '';
          drawer.style.pointerEvents = '';
        }
        if (islandEl) {
          islandEl.style.opacity = '';
          islandEl.style.transform = '';
          islandEl.style.transition = '';
        }
        if (artworkEl) {
          artworkEl.style.transform = '';
          artworkEl.style.transition = '';
        }
        document.documentElement.style.setProperty('--player-collapse-progress', '0');
        document.documentElement.style.setProperty('--player-collapse-y', '0px');
      }, 260);
    }
  };

  const handleTouchCancel = () => {
    touchStartY.current = null;
    touchStartX.current = null;
    isDraggingUp.current = false;
    const drawer = document.querySelector('.app-shell__player-drawer') as HTMLElement | null;
    const islandEl = document.querySelector('.minimized-player-island') as HTMLElement | null;
    if (drawer) {
      drawer.style.transition = 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)';
      drawer.style.transform = 'translateY(100%)';
      setTimeout(() => {
        drawer.style.transform = '';
        drawer.style.transition = '';
        drawer.style.pointerEvents = '';
      }, 240);
    }
    if (islandEl) {
      islandEl.style.transition = 'opacity 220ms ease, transform 220ms ease';
      islandEl.style.opacity = '1';
      islandEl.style.transform = 'translateY(0)';
      setTimeout(() => {
        islandEl.style.opacity = '';
        islandEl.style.transform = '';
        islandEl.style.transition = '';
      }, 220);
    }
    document.documentElement.style.setProperty('--player-collapse-progress', '0');
    document.documentElement.style.setProperty('--player-collapse-y', '0px');
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScrubValue(val);
  };

  const handleSeekMouseDown = () => setIsScrubbing(true);

  const handleSeekMouseUp = () => {
    setIsScrubbing(false);
    seek(scrubValue);
  };

  const handleSeekTouchStart = () => setIsScrubbing(true);

  const handleSeekTouchEnd = () => {
    setIsScrubbing(false);
    seek(scrubValue);
  };

  return (
    <section
      className="minimized-player-island"
      aria-label="Minimized Player Island"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div className="minimized-player-island__container">
        {/* ── Upper Section: Mirrors queue-sheet__min-upper ── */}
        <div
          className="queue-sheet__min-upper minimized-player-island__upper"
          onClick={onExpand}
          role="button"
          tabIndex={0}
          aria-label="Expand Full Player"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onExpand();
            }
          }}
        >
          <ArtworkVisualizer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            presentation="compact"
          />

          <div className="queue-sheet__min-track-info minimized-player-island__info">
            <div className="queue-sheet__min-badge">
              <span className="queue-sheet__min-badge-dot" aria-hidden="true" />
              <span>{isPlaying ? 'NOW PLAYING' : 'PAUSED'}</span>
              {currentTrack.album && (
                <span className="queue-sheet__min-playlist-tag">
                  · {currentTrack.album}
                </span>
              )}
            </div>
            <h2 className="queue-sheet__min-title">{currentTrack.title}</h2>
            <p className="queue-sheet__min-artist">{currentTrack.artist}</p>
          </div>

          <button
            type="button"
            className="minimized-player-island__expand-btn"
            aria-label="Expand player"
            title="Expand player"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
          >
            <span aria-hidden="true">▲</span>
          </button>
        </div>

        {/* ── Lower Section: Mirrors queue-sheet__min-lower ── */}
        <div className="queue-sheet__min-lower minimized-player-island__lower">
          {/* Seek bar with timestamps */}
          <div className="minimized-player-island__scrub-wrap">
            <span className="minimized-player-island__time tabular-nums">
              {formatTime(displayTime)}
            </span>
            <input
              type="range"
              className="minimized-player-island__slider"
              min="0"
              max={effectiveDuration > 0 ? effectiveDuration : 100}
              step="0.1"
              value={displayTime}
              onChange={handleSeekChange}
              onMouseDown={handleSeekMouseDown}
              onMouseUp={handleSeekMouseUp}
              onTouchStart={handleSeekTouchStart}
              onTouchEnd={handleSeekTouchEnd}
              style={{
                background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${progressPct}%, var(--slider-track-color, rgba(255,255,255,0.15)) ${progressPct}%, var(--slider-track-color, rgba(255,255,255,0.15)) 100%)`,
              }}
              aria-label="Seek track position"
              aria-valuetext={`${formatTime(displayTime)} of ${formatTime(effectiveDuration)}`}
            />
            <span className="minimized-player-island__time tabular-nums">
              {effectiveDuration > 0 ? formatTime(effectiveDuration) : '0:00'}
            </span>
          </div>

          {/* Full controls playback group */}
          <div className="queue-sheet__playback-group minimized-player-island__controls">
            {/* Shuffle */}
            <button
              type="button"
              className={`queue-sheet__icon-button queue-sheet__icon-button--shuffle${isShuffled ? ' queue-sheet__icon-button--active' : ''}`}
              onClick={toggleShuffle}
              aria-label="Toggle shuffle"
              title="Shuffle"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>

            {/* Prev */}
            <button
              type="button"
              className="queue-sheet__icon-button queue-sheet__icon-button--prev"
              onClick={prev}
              aria-label="Previous track"
              title="Previous"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 5h2v14H6V5zm3.5 7 9.5 7V5l-9.5 7z" />
              </svg>
            </button>

            {/* Play/Pause Disc */}
            <button
              type="button"
              className="queue-sheet__play-btn minimized-player-island__play-disc"
              onClick={toggle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7-11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              type="button"
              className="queue-sheet__icon-button queue-sheet__icon-button--next"
              onClick={next}
              aria-label="Next track"
              title="Next"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16 5h2v14h-2V5zM5 19l9.5-7L5 5v14z" />
              </svg>
            </button>

            {/* Repeat */}
            <div className="queue-sheet__repeat-wrap">
              <button
                type="button"
                className={`queue-sheet__icon-button queue-sheet__icon-button--repeat${repeatMode !== 'off' ? ' queue-sheet__icon-button--active' : ''}`}
                onClick={cycleRepeat}
                aria-label={`Repeat mode: ${repeatMode}`}
                title={`Repeat: ${repeatMode}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
                {repeatMode === 'one' && (
                  <span className="queue-sheet__repeat-badge">1</span>
                )}
              </button>
            </div>

            {/* Queue Toggle */}
            {onQueueOpen && (
              <button
                type="button"
                className="queue-sheet__icon-button minimized-player-island__queue-btn"
                onClick={onQueueOpen}
                aria-label="Open queue"
                title="Queue"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MinimizedPlayerIsland;
