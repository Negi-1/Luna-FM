import { useState, useEffect, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import type { Track, ViewName } from '../types';

import { GlowSurface } from './GlowSurface';
import GrainOverlay from './GrainOverlay';
import { ThemeEffects } from '../themes/ThemeEffects';
import NoticeToast from './NoticeToast';
import { TopBar } from './TopBar';
import { Transport } from './Transport';
import { PlayerHome } from './PlayerHome';
import { CollectionView } from './CollectionView';
import { AboutView } from './AboutView';
import { AdminPanel } from './AdminPanel';
import { PlaylistsView } from './PlaylistsView';
import { SettingsView } from './SettingsView';
import { DiscoverView } from './DiscoverView';
import { MinimizedPlayerIsland } from './MinimizedPlayerIsland';
import SearchOverlay from './SearchOverlay';
import PlaylistDrawer from './PlaylistDrawer';
import QueueSheet from './QueueSheet';
import Welcome from './Welcome';

import './AppShell.css';

export function AppShell() {
  const {
    engine,
    albums,
    allTracks,
    status,
    catalogError,
    notice,
    notify,
    clearNotice,
    view,
    setView,
    isPlayerExpanded,
    setIsPlayerExpanded,
    lastPlayed,
    clearLastPlayed,
    retryCatalog,
  } = usePlayer();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  const handleSearchClose = useCallback(() => setIsSearchOpen(false), []);
  const handleDrawerClose = useCallback(() => setIsDrawerOpen(false), []);
  const handleQueueClose = useCallback(() => setIsQueueOpen(false), []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check once on initial mount if welcome should be shown (never re-evaluated mid-session)
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.location.search.includes('admin')) return false;
    if (window.location.search.includes('welcome')) return true;
    return sessionStorage.getItem('luna-fm-welcomed-v3') !== '1';
  });

  // Handle track playback from anywhere (expands full player stage)
  const handlePlayTrack = useCallback(
    (track: Track, queue: Track[]) => {
      engine.playTrack(track, queue);
      setIsPlayerExpanded(true);
    },
    [engine, setIsPlayerExpanded],
  );

  // Navigate view and scroll to top with smooth transition
  const handleNavigate = useCallback(
    (nextView: string) => {
      const performSwitch = () => {
        setView(nextView as ViewName);
        if (nextView === 'home') {
          setIsPlayerExpanded(true);
        } else {
          setIsPlayerExpanded(false);
        }
        window.scrollTo(0, 0);
      };

      if (typeof document !== 'undefined' && 'startViewTransition' in document) {
        (document as any).startViewTransition(performSwitch);
      } else {
        performSwitch();
      }
    },
    [setView, setIsPlayerExpanded],
  );

  // Lock scrolling on home page along both X and Y axes (Requirement 3)
  useEffect(() => {
    if (view === 'home' || isPlayerExpanded) {
      document.body.classList.add('home-scroll-locked');
      return () => {
        document.body.classList.remove('home-scroll-locked');
      };
    } else {
      document.body.classList.remove('home-scroll-locked');
    }
  }, [view, isPlayerExpanded]);

  // Track queue-open state on body to compact and hide mobile transport dock
  useEffect(() => {
    if (isQueueOpen) {
      document.body.classList.add('queue-open');
    } else {
      document.body.classList.remove('queue-open');
    }
    return () => {
      document.body.classList.remove('queue-open');
    };
  }, [isQueueOpen]);

  // Mobile left-edge swipe (touchStartX <= 40px, deltaX > 40px) to open PlaylistDrawer on any page
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let isEdgeSwipe = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      // Comfortable phone edge target zone (includes <= 40px boundary check)
      const edgeThreshold = window.innerWidth <= 768 ? 54 : 40;
      if (touch.clientX <= 40 || touch.clientX <= edgeThreshold) {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isEdgeSwipe = true;
      } else {
        isEdgeSwipe = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isEdgeSwipe || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      // Real-time trigger as soon as deliberate horizontal pull to the right is reached
      if (deltaX > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
        setIsDrawerOpen(true);
        isEdgeSwipe = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe || e.changedTouches.length === 0) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (deltaX > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
        setIsDrawerOpen(true);
      }
      isEdgeSwipe = false;
    };

    const handleTouchCancel = () => {
      isEdgeSwipe = false;
    };

    // Pointer events for touch / stylus / mobile emulation drag from left edge
    let pointerStartX = 0;
    let pointerStartY = 0;
    let isPointerEdge = false;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const edgeThreshold = window.innerWidth <= 768 ? 54 : 40;
      if (e.clientX <= 40 || e.clientX <= edgeThreshold) {
        pointerStartX = e.clientX;
        pointerStartY = e.clientY;
        isPointerEdge = true;
      } else {
        isPointerEdge = false;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerEdge) return;
      const deltaX = e.clientX - pointerStartX;
      const deltaY = e.clientY - pointerStartY;
      if (deltaX > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
        setIsDrawerOpen(true);
        isPointerEdge = false;
      }
    };

    const handlePointerUp = () => {
      isPointerEdge = false;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);

      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  // ── Keyboard Shortcuts (DESIGN.md §8.8) ───────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K or / to open search
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey)) {
        const target = e.target as HTMLElement | null;
        const isEditable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (!isEditable) {
          e.preventDefault();
          setIsSearchOpen(true);
          return;
        }
      }

      // Escape precedence: queue sheet -> search overlay -> playlist drawer
      if (e.key === 'Escape') {
        if (isQueueOpen) {
          e.preventDefault();
          setIsQueueOpen(false);
          return;
        }
        if (isSearchOpen) {
          e.preventDefault();
          setIsSearchOpen(false);
          return;
        }
        if (isDrawerOpen) {
          e.preventDefault();
          setIsDrawerOpen(false);
          return;
        }
      }

      // Ignore other shortcuts when modifier keys are held
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Ignore when focused in input/textarea/button for Space
      const target = e.target as HTMLElement | null;
      const isEditable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isEditable) return;

      switch (e.code) {
        case 'Space': {
          if (target && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'button')) {
            return;
          }
          e.preventDefault();
          engine.toggle();
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          engine.seek(engine.currentTime - 5);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          engine.seek(engine.currentTime + 5);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          engine.setVolume(engine.volume + 0.1);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          engine.setVolume(engine.volume - 0.1);
          break;
        }
        case 'KeyM': {
          e.preventDefault();
          engine.toggleMute();
          break;
        }
        case 'KeyN': {
          e.preventDefault();
          engine.next();
          break;
        }
        case 'KeyP': {
          e.preventDefault();
          engine.prev();
          break;
        }
        case 'KeyS': {
          e.preventDefault();
          engine.toggleShuffle();
          break;
        }
        case 'KeyR': {
          e.preventDefault();
          engine.cycleRepeat();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, isQueueOpen, isSearchOpen, isDrawerOpen]);

  return (
    <div className="app-shell">
      {/* ── Persistent background layers ─────────────────────── */}
      <GlowSurface />
      <GrainOverlay />
      <ThemeEffects />

      {/* ── Persistent Chrome ─────────────────────────────────── */}
      <TopBar
        onSearchOpen={() => setIsSearchOpen(true)}
        onDrawerOpen={() => setIsDrawerOpen(true)}
        view={view}
        onViewChange={handleNavigate}
        isPlaying={engine.isPlaying}
        onWelcomeOpen={() => setShowWelcome(true)}
      />

      {/* ── Main View Switcher ───────────────────────────────── */}
      <main id="main-content" className="app-shell__main" tabIndex={-1}>
        {status === 'loading' && albums.length === 0 && !showWelcome && (
          <div className="app-shell__loading" role="status">
            <span className="app-shell__loading-glyph" aria-hidden="true">☾</span>
            <span>tuning frequencies…</span>
          </div>
        )}

        {status === 'error' && albums.length === 0 && (
          <div className="app-shell__error-panel" role="alert">
            <p className="app-shell__error-badge">SIGNAL LOST // 500</p>
            <h1 className="app-shell__error-title">could not tune catalog</h1>
            <p className="app-shell__error-message">{catalogError}</p>
            <button className="app-shell__retry-btn" onClick={retryCatalog}>
              re-scan catalog ↵
            </button>
          </div>
        )}

        {/* Discover view (default view) */}
        {view === 'discover' && (!isPlayerExpanded || isMobile) && (
          <div className="app-shell__view-fade" key="discover">
            <DiscoverView
              albums={albums}
              allTracks={allTracks}
              engine={engine}
              lastPlayedTracks={lastPlayed}
              onClearHistory={clearLastPlayed}
              onNavigate={handleNavigate}
              onPlayTrack={handlePlayTrack}
              onSelectAlbum={(albumId) => setSelectedAlbumId(albumId)}
            />
          </div>
        )}

        {/* Full Player Stage & Mobile Player Drawer */}
        {(view === 'home' || isPlayerExpanded || (isMobile && engine.currentTrack)) && (
          <div
            className={`app-shell__player-drawer${isPlayerExpanded || view === 'home' ? ' app-shell__player-drawer--expanded' : ''}${view === 'home' || isPlayerExpanded ? ' app-shell__player-drawer--desktop-visible' : ''}`}
            key="home"
          >
            <PlayerHome
              engine={engine}
              onOpenDrawer={() => setIsDrawerOpen(true)}
              onOpenQueue={() => setIsQueueOpen(true)}
              onCloseQueue={() => setIsQueueOpen(false)}
              isQueueOpen={isQueueOpen}
              onMinimize={() => setIsPlayerExpanded(false)}
            />
            {isMobile && (
              <Transport
                engine={engine}
                onQueueOpen={() => setIsQueueOpen((prev) => !prev)}
                onMinimize={() => setIsPlayerExpanded(false)}
              />
            )}
          </div>
        )}

        {/* Collection view */}
        {view === 'collection' && (!isPlayerExpanded || isMobile) && (
          <div className="app-shell__view-fade" key="collection">
            <CollectionView
              albums={albums}
              allTracks={allTracks}
              engine={engine}
              selectedAlbumId={selectedAlbumId}
            />
          </div>
        )}

        {/* Playlists view (04 PLAYLISTS on menu) */}
        {view === 'playlists' && (!isPlayerExpanded || isMobile) && (
          <div className="app-shell__view-fade" key="playlists">
            <PlaylistsView
              albums={albums}
              engine={engine}
              onNavigateToCollection={(albumId) => {
                setSelectedAlbumId(albumId ?? null);
                handleNavigate('collection');
              }}
            />
          </div>
        )}

        {/* About view */}
        {view === 'about' && (!isPlayerExpanded || isMobile) && (
          <div className="app-shell__view-fade" key="about">
            <AboutView onNavigateHome={() => handleNavigate('home')} />
          </div>
        )}

        {/* Settings view (05 SETTINGS on menu) */}
        {view === 'settings' && (!isPlayerExpanded || isMobile) && (
          <div className="app-shell__view-fade" key="settings">
            <SettingsView
              onNotify={notify}
              onNavigateHome={() => handleNavigate('home')}
            />
          </div>
        )}

        {/* Admin view (?admin) */}
        {view === 'admin' && (!isPlayerExpanded || isMobile) && (
          <div className="app-shell__view-fade" key="admin">
            <AdminPanel albums={albums} onNotify={notify} />
          </div>
        )}
      </main>

      {/* ── Fixed Transport Dock / Minimized Player Island ────── */}
      {!isMobile && isPlayerExpanded ? (
        <Transport
          engine={engine}
          onQueueOpen={() => setIsQueueOpen((prev) => !prev)}
          onMinimize={() => setIsPlayerExpanded(false)}
        />
      ) : (
        !isPlayerExpanded && engine.currentTrack && (
          <MinimizedPlayerIsland
            engine={engine}
            onExpand={() => setIsPlayerExpanded(true)}
            onQueueOpen={() => setIsQueueOpen((prev) => !prev)}
          />
        )
      )}

      {/* ── Overlays ─────────────────────────────────────────── */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={handleSearchClose}
        tracks={allTracks}
        currentTrackId={engine.currentTrack?.id ?? null}
        onPlayTrack={handlePlayTrack}
      />

      <PlaylistDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        albums={albums}
        onPlayTrack={handlePlayTrack}
        onNavigate={handleNavigate}
        currentTrackId={engine.currentTrack?.id ?? null}
        currentView={view}
      />

      <QueueSheet
        isOpen={isQueueOpen}
        onClose={handleQueueClose}
        queue={engine.queue}
        currentIndex={engine.currentIndex}
        onPlayAt={(idx) => engine.playAt(idx)}
        onRemove={(idx) => engine.removeFromQueue(idx)}
        onClear={() => engine.clearQueue()}
        currentTrack={engine.currentTrack}
        isPlaying={engine.isPlaying}
        onTogglePlay={() => engine.toggle()}
        onPrev={() => engine.prev()}
        onNext={() => engine.next()}
        isShuffled={engine.isShuffled}
        onToggleShuffle={() => engine.toggleShuffle()}
        repeatMode={engine.repeatMode}
        onCycleRepeat={() => engine.cycleRepeat()}
        currentTime={engine.currentTime}
        duration={engine.duration}
      />

      {/* ── Toast notification ───────────────────────────────── */}
      <NoticeToast message={notice} onDismiss={clearNotice} />

      {/* ── Welcome intro (renders above everything, z-index 200, smooth fade out) */}
      {showWelcome && (
        <Welcome onDone={() => setShowWelcome(false)} />
      )}
    </div>
  );
}
