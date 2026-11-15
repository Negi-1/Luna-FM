import { useEffect, useRef, useCallback } from 'react';
import type { Track } from '../types';
import ArtworkVisualizer from './ArtworkVisualizer';
import './QueueSheet.css';

interface QueueSheetProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  currentIndex: number;
  onPlayAt: (index: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  currentTrack?: Track | null;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  isShuffled?: boolean;
  onToggleShuffle?: () => void;
  repeatMode?: 'off' | 'all' | 'one';
  onCycleRepeat?: () => void;
  currentTime?: number;
  duration?: number;
}

export default function QueueSheet({
  isOpen,
  onClose,
  queue,
  currentIndex,
  onPlayAt,
  onRemove,
  onClear,
  currentTrack,
  isPlaying = false,
  onTogglePlay,
  onPrev,
  onNext,
  isShuffled = false,
  onToggleShuffle,
  repeatMode = 'off',
  onCycleRepeat,
  currentTime = 0,
  duration = 0,
}: QueueSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isClosingRef = useRef(false);
  const wasOpenRef = useRef(false);

  // Keep a stable ref to onClose
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Smooth slide-down closing animation for mobile sheet
  const smoothClose = useCallback(() => {
    if (isClosingRef.current) return;
    const dialog = dialogRef.current;

    // Concurrently restore background player stage to full brightness
    const stageEl = document.querySelector('.player-home__stage') as HTMLElement | null;
    if (stageEl && window.innerWidth < 900) {
      stageEl.style.transition = 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms ease, filter 280ms ease';
      stageEl.style.transform = 'scale(1)';
      stageEl.style.opacity = '1';
      stageEl.style.filter = 'none';
      setTimeout(() => {
        if (stageEl) {
          stageEl.style.transform = '';
          stageEl.style.opacity = '';
          stageEl.style.filter = '';
          stageEl.style.transition = '';
        }
      }, 280);
    }

    if (dialog && dialog.open && window.innerWidth < 900) {
      isClosingRef.current = true;
      wasOpenRef.current = false;
      dialog.style.transition = 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease';
      dialog.style.transform = 'translateY(100%)';
      dialog.style.opacity = '0';
      setTimeout(() => {
        isClosingRef.current = false;
        try {
          if (dialog.open) dialog.close();
        } catch {
          // ignore
        }
        dialog.style.transform = '';
        dialog.style.transition = '';
        dialog.style.opacity = '';
        onCloseRef.current();
      }, 280);
    } else {
      wasOpenRef.current = false;
      onCloseRef.current();
    }
  }, []);

  // Open/close dialog with smooth slide-up on mobile
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      isClosingRef.current = false;
      if (!dialog.open) {
        dialog.showModal();
      }
      if (window.innerWidth < 900) {
        dialog.style.transition = 'none';
        dialog.style.transform = 'translateY(100%)';
        dialog.style.opacity = '0';

        void dialog.offsetHeight;

        dialog.style.transition = 'transform 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease';
        dialog.style.transform = 'translateY(0)';
        dialog.style.opacity = '1';
        closeRef.current?.focus();
      } else {
        requestAnimationFrame(() => closeRef.current?.focus());
      }
    } else if (!isOpen && wasOpenRef.current && !isClosingRef.current) {
      wasOpenRef.current = false;
      smoothClose();
    }
  }, [isOpen, smoothClose]);

  // Native dialog close event (Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  // Backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        smoothClose();
      }
    },
    [smoothClose],
  );

  // Touch gesture tracking for mobile swipe-down on minimized player, header, or top of list
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const isInteractingButton = useRef<boolean>(false);
  const isListTouch = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, a, input, select, textarea')) {
      isInteractingButton.current = true;
      return;
    }
    isInteractingButton.current = false;

    // Check if touch originates within the scrollable queue list
    const listEl = listRef.current;
    if (listEl && target && listEl.contains(target)) {
      isListTouch.current = true;
      // If list is scrolled down, allow normal vertical scrolling without intercepting
      if (listEl.scrollTop > 2) {
        return;
      }
    } else {
      isListTouch.current = false;
    }

    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isInteractingButton.current || touchStartY.current === null || touchStartX.current === null) return;

    // Preserve normal vertical scrolling inside the queue list
    if (isListTouch.current && listRef.current && listRef.current.scrollTop > 2) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - touchStartY.current;
    const deltaX = currentX - touchStartX.current;

    // Only respond to downward drag on mobile
    if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 0) {
      const dialog = dialogRef.current;
      if (dialog && window.innerWidth < 900) {
        dialog.style.transform = `translateY(${deltaY}px)`;
        dialog.style.transition = 'none';

        // Continuous gradient restoration: as queue slides down, crossfade image regains full brightness
        const maxDist = Math.min(450, window.innerHeight * 0.55);
        const progress = Math.min(1, Math.max(0, deltaY / maxDist));
        const eased = progress * progress * (3 - 2 * progress);

        dialog.style.opacity = `${Math.max(0.15, 1 - eased * 0.75)}`;

        const stageEl = document.querySelector('.player-home__stage') as HTMLElement | null;
        if (stageEl) {
          const currentScale = 0.94 + eased * 0.06; // 0.94 -> 1.0
          const currentOpacity = 0.45 + eased * 0.55; // 0.45 -> 1.0
          const currentBlur = Math.max(0, 2 * (1 - eased)); // 2px -> 0px
          stageEl.style.transition = 'none';
          stageEl.style.transform = `scale(${currentScale.toFixed(3)})`;
          stageEl.style.opacity = `${currentOpacity.toFixed(3)}`;
          stageEl.style.filter = currentBlur > 0.05 ? `blur(${currentBlur.toFixed(1)}px)` : 'none';
        }
      }
    }
  };

  const resetDialogPosition = () => {
    const dialog = dialogRef.current;
    if (dialog && window.innerWidth < 900) {
      dialog.style.transform = '';
      dialog.style.opacity = '';
      dialog.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease';
    }
    const stageEl = document.querySelector('.player-home__stage') as HTMLElement | null;
    if (stageEl && window.innerWidth < 900) {
      stageEl.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease, filter 240ms ease';
      stageEl.style.transform = 'scale(0.94)';
      stageEl.style.opacity = '0.45';
      stageEl.style.filter = 'blur(2px)';
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isInteractingButton.current || touchStartY.current === null || touchStartX.current === null) {
      touchStartY.current = null;
      touchStartX.current = null;
      resetDialogPosition();
      return;
    }

    if (isListTouch.current && listRef.current && listRef.current.scrollTop > 2) {
      touchStartY.current = null;
      touchStartX.current = null;
      resetDialogPosition();
      return;
    }

    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const deltaY = endY - touchStartY.current;
    const deltaX = endX - touchStartX.current;
    const deltaTime = Math.max(1, Date.now() - touchStartTime.current);
    const velocity = deltaY / deltaTime;

    touchStartY.current = null;
    touchStartX.current = null;

    // Dismiss threshold: dragged down > 45px or quick downward flick (velocity > 0.28)
    if (Math.abs(deltaY) > Math.abs(deltaX) && (deltaY > 45 || (deltaY > 20 && velocity > 0.28))) {
      smoothClose();
    } else {
      resetDialogPosition();
    }
  };

  const handleTouchCancel = () => {
    touchStartY.current = null;
    touchStartX.current = null;
    isInteractingButton.current = false;
    resetDialogPosition();
  };

  const progressPct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <dialog
      ref={dialogRef}
      className="queue-sheet"
      aria-label="Play queue"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div className="queue-sheet__inner">
        {/* ── Minimized Currently-Playing Section (Fixed at Top of Mobile Queue) ── */}
        {currentTrack && (
          <section className="queue-sheet__minimized-player" aria-label="Currently playing track">
            {/* Mobile Drag Header Bar */}
            <div className="queue-sheet__min-header-bar" onClick={smoothClose}>
              <span className="queue-sheet__drag-pill" aria-hidden="true" />
              <button
                type="button"
                className="queue-sheet__min-close-btn"
                onClick={smoothClose}
                aria-label="Close queue"
                title="Close queue"
              >
                ✕
              </button>
            </div>

            {/* Upper Section: Large Crossfade Artwork on Left, Song Title & Artist on Right */}
            <div className="queue-sheet__min-upper">
              <ArtworkVisualizer
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                presentation="compact"
              />

              <div className="queue-sheet__min-track-info">
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
            </div>

            {/* Lower Section: Transport Playback Group Directly Beneath Artwork & Info */}
            <div className="queue-sheet__min-lower">
              <div className="queue-sheet__playback-group">
                {/* Shuffle Button */}
                {onToggleShuffle && (
                  <button
                    type="button"
                    className={`queue-sheet__icon-button queue-sheet__icon-button--shuffle${isShuffled ? ' queue-sheet__icon-button--active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleShuffle();
                    }}
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
                )}

                {/* Previous Button (Clean free-floating icon) */}
                {onPrev && (
                  <button
                    type="button"
                    className="queue-sheet__icon-button queue-sheet__icon-button--prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrev();
                    }}
                    aria-label="Previous track"
                    title="Previous"
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M6 5h2v14H6V5zm3.5 7 9.5 7V5l-9.5 7z" />
                    </svg>
                  </button>
                )}

                {/* Central Play/Pause Button (Enlarged Glowing Pink Disc) */}
                {onTogglePlay && (
                  <button
                    type="button"
                    className="queue-sheet__play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlay();
                    }}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7-11-7z" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Next Button (Clean free-floating icon) */}
                {onNext && (
                  <button
                    type="button"
                    className="queue-sheet__icon-button queue-sheet__icon-button--next"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNext();
                    }}
                    aria-label="Next track"
                    title="Next"
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M16 5h2v14h-2V5zM5 19l9.5-7L5 5v14z" />
                    </svg>
                  </button>
                )}

                {/* Repeat Button */}
                {onCycleRepeat && (
                  <div className="queue-sheet__repeat-wrap">
                    <button
                      type="button"
                      className={`queue-sheet__icon-button queue-sheet__icon-button--repeat${repeatMode !== 'off' ? ' queue-sheet__icon-button--active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCycleRepeat();
                      }}
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
                )}
              </div>
            </div>

            {/* Ambient Progress Bar Line along Bottom of Minimized Player */}
            <div className="queue-sheet__min-progress-track" aria-hidden="true">
              <div
                className="queue-sheet__min-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </section>
        )}

        {/* ── Queue Subheader ── */}
        <div className="queue-sheet__header">
          <span className="queue-sheet__label">UP NEXT // QUEUE</span>
          <span className="queue-sheet__count">({queue.length})</span>
          <span className="queue-sheet__spacer" />
          {queue.length > 0 && (
            <button
              className="queue-sheet__clear"
              onClick={onClear}
              aria-label="Clear queue"
            >
              clear
            </button>
          )}
          <button
            ref={closeRef}
            className="queue-sheet__close-btn queue-sheet__close-btn--desktop"
            onClick={onClose}
            aria-label="Close queue"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable Media Queue Rows (Independently scrollable) ── */}
        {queue.length === 0 ? (
          <p className="queue-sheet__empty">
            queue is empty — add tracks from the archive.
          </p>
        ) : (
          <ul ref={listRef} className="queue-sheet__list" role="list">
            {queue.map((track, i) => {
              const isCurrent = i === currentIndex;
              return (
                <li
                  key={`${track.id}-${i}`}
                  className={`queue-sheet__row${isCurrent ? ' queue-sheet__row--current' : ''}`}
                  onClick={() => onPlayAt(i)}
                  role="button"
                  tabIndex={0}
                  aria-current={isCurrent ? 'true' : undefined}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPlayAt(i);
                    }
                  }}
                >
                  {/* Left: Thumbnail cover artwork */}
                  <div className="queue-sheet__thumb-wrap">
                    {track.artworkUrl ? (
                      <img
                        className="queue-sheet__thumb"
                        src={track.artworkUrl}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <div className="queue-sheet__thumb-fallback" aria-hidden="true">
                        ☾
                      </div>
                    )}
                    {isCurrent && (
                      <div className="queue-sheet__thumb-active-overlay" aria-hidden="true">
                        <span className="queue-sheet__equalizer-bar" />
                        <span className="queue-sheet__equalizer-bar" />
                        <span className="queue-sheet__equalizer-bar" />
                      </div>
                    )}
                  </div>

                  {/* Right: Title, Artist, and Playlist name (if song belongs to playlist) */}
                  <div className="queue-sheet__info">
                    <span className="queue-sheet__title">{track.title}</span>
                    <span className="queue-sheet__artist">{track.artist}</span>
                    {track.album && (
                      <span className="queue-sheet__playlist">
                        Playlist: {track.album}
                      </span>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    className="queue-sheet__remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(i);
                    }}
                    aria-label={`Remove ${track.title} from queue`}
                    title="Remove from queue"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer hints (Desktop only) */}
        <div className="queue-sheet__footer">
          <p className="queue-sheet__hints">
            space play · ← → seek · M mute
          </p>
        </div>
      </div>
    </dialog>
  );
}
