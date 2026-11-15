import { useEffect, useRef, useState, useCallback } from 'react';
import type { Album, Track } from '../types';
import { formatTime } from '../utils/helpers';
import './PlaylistDrawer.css';

interface PlaylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  albums: Album[];
  onPlayTrack: (track: Track, queue: Track[]) => void;
  onNavigate: (view: string) => void;
  currentTrackId: string | null;
  currentView?: string;
}

const NAV_LINKS = [
  { index: '01', label: 'DISCOVER', view: 'discover' },
  { index: '02', label: 'COLLECTIONS', view: 'collection' },
  { index: '03', label: 'ABOUT', view: 'about' },
  { index: '04', label: 'PLAYLISTS', view: 'playlists' },
  { index: '05', label: 'SETTINGS', view: 'settings' },
] as const;

export default function PlaylistDrawer({
  isOpen,
  onClose,
  albums,
  onPlayTrack,
  onNavigate,
  currentTrackId,
  currentView,
}: PlaylistDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [contentKey, setContentKey] = useState(0);
  const isClosingRef = useRef(false);
  const wasOpenRef = useRef(false);

  // Keep a stable ref to onClose so callbacks never re-trigger animations on parent re-renders
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Smooth slide-out closing animation to the left
  const smoothClose = useCallback(() => {
    if (isClosingRef.current) return;
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open) {
      wasOpenRef.current = false;
      onCloseRef.current();
      return;
    }
    isClosingRef.current = true;
    wasOpenRef.current = false;
    dialog.classList.remove('playlist-drawer--open');
    dialog.classList.add('playlist-drawer--closing');
    dialog.style.transition = 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms ease';
    dialog.style.transform = 'translateX(-100%)';

    setTimeout(() => {
      isClosingRef.current = false;
      try {
        if (dialog.open) {
          dialog.close();
        }
      } catch {
        // ignore
      }
      dialog.classList.remove('playlist-drawer--closing');
      dialog.style.transform = '';
      dialog.style.transition = '';
      setSelectedAlbum(null);
      onCloseRef.current();
    }, 280);
  }, []);

  // Open/close dialog with smooth slide-in transition from left (runs ONLY on actual open state changes)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      isClosingRef.current = false;
      if (!dialog.open) {
        dialog.showModal();
      }
      dialog.classList.remove('playlist-drawer--closing');
      dialog.style.transition = 'none';
      dialog.style.transform = 'translateX(-100%)';

      // Force a reflow so browser commits initial translateX(-100%) cleanly
      void dialog.offsetHeight;

      dialog.classList.add('playlist-drawer--open');
      dialog.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
      dialog.style.transform = 'translateX(0)';
      closeRef.current?.focus();
    } else if (!isOpen && wasOpenRef.current && !isClosingRef.current) {
      wasOpenRef.current = false;
      smoothClose();
    }
  }, [isOpen, smoothClose]);

  // Handle native dialog close (e.g. Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      wasOpenRef.current = false;
      isClosingRef.current = false;
      onCloseRef.current();
      setSelectedAlbum(null);
    };

    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  // Backdrop click to close with smooth slide-out
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        smoothClose();
      }
    },
    [smoothClose],
  );

  // Swipe-to-close gesture tracking for phone view
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const isDraggingLeft = useRef<boolean>(false);
  const isScrollLocked = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('input, textarea, select')) return;

    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    isDraggingLeft.current = false;
    isScrollLocked.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    // If vertically scrolling, do not intercept
    if (isScrollLocked.current) return;

    if (!isDraggingLeft.current) {
      if (Math.abs(deltaY) > 6 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isScrollLocked.current = true;
        return;
      }
      if (deltaX < -14 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        isDraggingLeft.current = true;
      }
    }

    if (isDraggingLeft.current) {
      const dialog = dialogRef.current;
      if (dialog) {
        // Drag menu leftward
        const currentTranslate = Math.min(0, deltaX);
        dialog.style.transform = `translateX(${currentTranslate}px)`;
        dialog.style.transition = 'none';
      }
    }
  };

  const resetDrawerPosition = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open && !isClosingRef.current) {
      dialog.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
      dialog.style.transform = 'translateX(0)';
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) {
      touchStartX.current = null;
      touchStartY.current = null;
      isDraggingLeft.current = false;
      return;
    }

    if (!isDraggingLeft.current) {
      touchStartX.current = null;
      touchStartY.current = null;
      isDraggingLeft.current = false;
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - touchStartX.current;
    const deltaTime = Math.max(1, Date.now() - touchStartTime.current);
    const velocityX = Math.abs(deltaX) / deltaTime;

    touchStartX.current = null;
    touchStartY.current = null;
    isDraggingLeft.current = false;

    // Dismiss threshold: dragged left > 40px or quick leftward flick
    if (deltaX < -40 || (deltaX < -18 && velocityX > 0.3)) {
      smoothClose();
    } else {
      resetDrawerPosition();
    }
  };

  const handleTouchCancel = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    isDraggingLeft.current = false;
    resetDrawerPosition();
  };

  const selectAlbum = useCallback((album: Album) => {
    setSelectedAlbum(album);
    setContentKey((k) => k + 1);
  }, []);

  const goBack = useCallback(() => {
    setSelectedAlbum(null);
    setContentKey((k) => k + 1);
  }, []);

  const handleTrackClick = useCallback(
    (track: Track, albumTracks: Track[]) => {
      onPlayTrack(track, albumTracks);
      smoothClose();
    },
    [onPlayTrack, smoothClose],
  );

  const handleNav = useCallback(
    (view: string) => {
      onNavigate(view);
      smoothClose();
    },
    [onNavigate, smoothClose],
  );

  return (
    <dialog
      ref={dialogRef}
      className="playlist-drawer"
      aria-label="Playlist menu"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div className="playlist-drawer__inner">
        {/* Header */}
        <div className="playlist-drawer__header">
          <span className="playlist-drawer__title">
            {selectedAlbum ? selectedAlbum.title : 'MENU / 深夜放送'}
          </span>
          <button
            ref={closeRef}
            className="playlist-drawer__close"
            onClick={smoothClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          className="playlist-drawer__content playlist-drawer__content--enter"
          key={contentKey}
        >
          {selectedAlbum === null ? (
            /* ═══ Level 1: Playlist index ═══ */
            <>
              {/* Navigation Section */}
              <p className="playlist-drawer__section-label">NAVIGATION</p>
              <ul className="playlist-drawer__nav">
                {NAV_LINKS.map((link) => (
                  <li key={link.view}>
                    <button
                      className={`playlist-drawer__nav-link${currentView === link.view ? ' playlist-drawer__nav-link--active' : ''}`}
                      onClick={() => handleNav(link.view)}
                    >
                      <span className="playlist-drawer__nav-index">{link.index}</span>
                      <span className="playlist-drawer__nav-label">{link.label}</span>
                      {currentView === link.view && (
                        <span className="playlist-drawer__nav-current" aria-hidden="true">●</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              <hr className="playlist-drawer__divider" />

              <p className="playlist-drawer__section-label">YOUR PLAYLISTS</p>
              <ul className="playlist-drawer__albums">
                {albums.map((album) => (
                  <li
                    key={album.id}
                    className="playlist-drawer__album-row"
                    onClick={() => selectAlbum(album)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectAlbum(album);
                      }
                    }}
                  >
                    <div className="playlist-drawer__album-left">
                      <div className="playlist-drawer__album-thumb">
                        {album.coverUrl ? (
                          <img
                            src={album.coverUrl}
                            alt=""
                            className="playlist-drawer__album-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span className="playlist-drawer__album-thumb-fallback" aria-hidden="true">☾</span>
                      </div>
                      <div className="playlist-drawer__album-info">
                        <span className="playlist-drawer__album-title">{album.title}</span>
                        <span className="playlist-drawer__album-count">
                          {album.tracks.length} TRACKS
                        </span>
                      </div>
                    </div>
                    <span className="playlist-drawer__album-arrow" aria-hidden="true">
                      →
                    </span>
                  </li>
                ))}
              </ul>

              <hr className="playlist-drawer__divider" />

              <div className="playlist-drawer__footer">
                <p className="playlist-drawer__freq">
                  freq // 88.7 mhz · late night archive
                </p>
                <p className="playlist-drawer__signature">
                  independently curated with ♡ by ☾⋆⁺₊ SUSS¥_PΛJI 𖤐.
                </p>
              </div>
            </>
          ) : (
            /* ═══ Level 2: Selected playlist ═══ */
            <>
              <button className="playlist-drawer__back" onClick={goBack}>
                ← ALL PLAYLISTS
              </button>
              <div className="playlist-drawer__detail-header">
                <div className="playlist-drawer__detail-thumb">
                  {selectedAlbum.coverUrl ? (
                    <img
                      src={selectedAlbum.coverUrl}
                      alt=""
                      className="playlist-drawer__detail-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className="playlist-drawer__detail-thumb-fallback" aria-hidden="true">☾</span>
                </div>
                <div className="playlist-drawer__detail-meta">
                  <h2 className="playlist-drawer__detail-title">{selectedAlbum.title}</h2>
                  <p className="playlist-drawer__detail-desc">{selectedAlbum.description}</p>
                </div>
              </div>

              <ul className="playlist-drawer__tracks">
                {selectedAlbum.tracks.map((track, i) => (
                  <li
                    key={track.id}
                    className={`playlist-drawer__track-row${
                      track.id === currentTrackId ? ' playlist-drawer__track-row--playing' : ''
                    }`}
                    onClick={() => handleTrackClick(track, selectedAlbum.tracks)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTrackClick(track, selectedAlbum.tracks);
                      }
                    }}
                  >
                    <span className="playlist-drawer__track-index">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="playlist-drawer__track-title">{track.title}</span>
                    <span className="playlist-drawer__track-duration tabular-nums">
                      {track.duration ? formatTime(track.duration) : '--:--'}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
