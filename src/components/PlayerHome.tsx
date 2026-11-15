import { useEffect, useRef } from 'react';
import type { AudioEngine } from '../types';
import ArtworkVisualizer from './ArtworkVisualizer';
import StarField from './StarField';
import './PlayerHome.css';

interface PlayerHomeProps {
  engine: AudioEngine;
  onOpenDrawer?: () => void;
  onOpenQueue?: () => void;
  onCloseQueue?: () => void;
  isQueueOpen?: boolean;
  onMinimize?: () => void;
}

export function PlayerHome({
  engine,
  onOpenDrawer,
  onOpenQueue,
  onCloseQueue,
  isQueueOpen = false,
  onMinimize,
}: PlayerHomeProps) {
  const { currentTrack, isPlaying } = engine;
  const artworkFrameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Gesture tracking: continuous, real-time, interruptible, and reversible
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const lastTouchY = useRef<number>(0);
  const lastTouchTime = useRef<number>(0);
  const velocityY = useRef<number>(0);
  const isInteractingButton = useRef<boolean>(false);
  const isGestureActive = useRef<boolean>(false);
  const isHorizontalGesture = useRef<boolean>(false);

  // Guarantee 100% restoration of crossfade image brightness, scale and clarity when queue closes
  useEffect(() => {
    if (!isQueueOpen) {
      if (stageRef.current) {
        stageRef.current.style.transition =
          'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms ease, filter 280ms ease';
        stageRef.current.style.transform = '';
        stageRef.current.style.opacity = '';
        stageRef.current.style.filter = '';
        setTimeout(() => {
          if (stageRef.current) {
            stageRef.current.style.transition = '';
          }
        }, 280);
      }
      if (artworkFrameRef.current) {
        artworkFrameRef.current.style.transform = '';
        artworkFrameRef.current.style.opacity = '';
        artworkFrameRef.current.style.filter = '';
        artworkFrameRef.current.style.transition = '';
      }
    }
  }, [isQueueOpen]);

  const resetStageStyles = () => {
    if (artworkFrameRef.current) {
      artworkFrameRef.current.style.transform = '';
      artworkFrameRef.current.style.transition = '';
      artworkFrameRef.current.style.opacity = '';
      artworkFrameRef.current.style.borderRadius = '';
      artworkFrameRef.current.style.filter = '';
    }
    if (stageRef.current) {
      stageRef.current.style.transform = '';
      stageRef.current.style.transition = '';
      stageRef.current.style.opacity = '';
      stageRef.current.style.filter = '';
      const canvasEl = stageRef.current.querySelector('.artwork-visualizer__canvas') as HTMLElement | null;
      const cdEl = stageRef.current.querySelector('.player-home__cd') as HTMLElement | null;
      if (canvasEl) canvasEl.style.opacity = '';
      if (cdEl) cdEl.style.opacity = '';
    }
    document.documentElement.style.setProperty('--player-collapse-progress', '0');
    document.documentElement.style.setProperty('--player-collapse-y', '0px');
  };

  const reboundToFullPlayer = () => {
    const drawer = document.querySelector('.app-shell__player-drawer') as HTMLElement | null;
    if (drawer) {
      drawer.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
      drawer.style.transform = 'translateY(0)';
    }
    if (artworkFrameRef.current) {
      artworkFrameRef.current.style.transition =
        'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease, border-radius 280ms ease, filter 240ms ease';
      artworkFrameRef.current.style.transform = '';
      artworkFrameRef.current.style.opacity = '';
      artworkFrameRef.current.style.borderRadius = '';
      artworkFrameRef.current.style.filter = '';
    }
    if (stageRef.current) {
      stageRef.current.style.transition =
        'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease, filter 240ms ease';
      stageRef.current.style.transform = '';
      stageRef.current.style.opacity = '';
      stageRef.current.style.filter = '';
      const canvasEl = stageRef.current.querySelector('.artwork-visualizer__canvas') as HTMLElement | null;
      const cdEl = stageRef.current.querySelector('.player-home__cd') as HTMLElement | null;
      if (canvasEl) canvasEl.style.opacity = '';
      if (cdEl) cdEl.style.opacity = '';
    }
    document.documentElement.style.setProperty('--player-collapse-progress', '0');
    document.documentElement.style.setProperty('--player-collapse-y', '0px');

    setTimeout(() => {
      resetStageStyles();
    }, 280);
  };

  const resetGestureState = () => {
    touchStartY.current = null;
    touchStartX.current = null;
    isGestureActive.current = false;
    isHorizontalGesture.current = false;
    isInteractingButton.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only apply on phone / mobile viewports (<= 768px)
    if (window.innerWidth > 768) return;

    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, a, input, select, textarea, [role="button"]')) {
      isInteractingButton.current = true;
      return;
    }
    isInteractingButton.current = false;

    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    touchStartTime.current = Date.now();
    lastTouchY.current = touch.clientY;
    lastTouchTime.current = Date.now();
    velocityY.current = 0;
    isGestureActive.current = true;
    isHorizontalGesture.current = false;

    // Reset transitions for immediate finger tracking
    if (artworkFrameRef.current) {
      artworkFrameRef.current.style.transition = 'none';
    }
    if (stageRef.current) {
      stageRef.current.style.transition = 'none';
    }
    const queueDialog = document.querySelector('.queue-sheet') as HTMLDialogElement | null;
    if (queueDialog) {
      queueDialog.style.transition = 'none';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isGestureActive.current || isInteractingButton.current) return;
    if (touchStartY.current === null || touchStartX.current === null) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const currentX = touch.clientX;
    const deltaY = currentY - touchStartY.current;
    const deltaX = currentX - touchStartX.current;

    // Calculate instantaneous velocity
    const now = Date.now();
    const dt = Math.max(1, now - lastTouchTime.current);
    velocityY.current = (currentY - lastTouchY.current) / dt;
    lastTouchY.current = currentY;
    lastTouchTime.current = now;

    // Detect horizontal menu drawer gesture
    if (!isHorizontalGesture.current && Math.abs(deltaX) > Math.abs(deltaY) * 1.15 && deltaX > 8) {
      isHorizontalGesture.current = true;
    }

    if (isHorizontalGesture.current) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0 && onOpenDrawer && artworkFrameRef.current) {
          const pull = Math.min(48, deltaX * 0.25);
          artworkFrameRef.current.style.transform = `translateX(${pull}px)`;
          artworkFrameRef.current.style.transition = 'none';
        }
      }
      return;
    }

    // VERTICAL GESTURES (Continuous, Real-Time, Reversible)
    const maxDistance = Math.min(420, window.innerHeight * 0.55);

    if (deltaY > 0) {
      // ── Direction: DOWN (Player to Minimized Island) ──
      const queueDialog = document.querySelector('.queue-sheet') as HTMLDialogElement | null;
      if (queueDialog && !isQueueOpen && queueDialog.open) {
        queueDialog.style.transform = 'translateY(100%)';
        queueDialog.style.opacity = '0';
      }

      if (isQueueOpen && onCloseQueue) {
        if (stageRef.current) {
          const pull = Math.min(36, deltaY * 0.25);
          stageRef.current.style.transform = `translateY(${pull}px)`;
          stageRef.current.style.transition = 'none';
        }
      } else if (!isQueueOpen && onMinimize) {
        const progress = Math.min(1, Math.max(0, deltaY / maxDistance));
        // Hermite smoothstep curve for fluid, gradient-based deceleration
        const eased = progress * progress * (3 - 2 * progress);

        // 1. Move the mobile drawer down in 1:1 direct sync with finger
        const drawer = document.querySelector('.app-shell__player-drawer') as HTMLElement | null;
        if (drawer) {
          drawer.style.transition = 'none';
          drawer.style.transform = `translateY(${deltaY}px)`;
        }

        // 2. Minimized island emerges underneath smoothly
        const islandEl = document.querySelector('.minimized-player-island') as HTMLElement | null;
        if (islandEl) {
          islandEl.style.transition = 'none';
          islandEl.style.opacity = `${eased}`;
          islandEl.style.transform = `translateY(${(1 - eased) * 20}px)`;
        }

        // 3. Artwork frame: translate down + scale down towards compact island + round corners
        if (artworkFrameRef.current) {
          const targetScale = 1 - eased * 0.52; // 1.0 -> 0.48
          const targetRadius = 16 - eased * 4; // 16px -> 12px
          artworkFrameRef.current.style.transform = `scale(${targetScale.toFixed(3)})`;
          artworkFrameRef.current.style.borderRadius = `${targetRadius.toFixed(1)}px`;
          artworkFrameRef.current.style.transition = 'none';
        }

        // 4. CD disc and Visualizer canvas: smoothly fade out
        if (stageRef.current) {
          const auraOpacity = Math.max(0, 1 - progress * 2.2);
          const canvasEl = stageRef.current.querySelector('.artwork-visualizer__canvas') as HTMLElement | null;
          const cdEl = stageRef.current.querySelector('.player-home__cd') as HTMLElement | null;
          if (canvasEl) canvasEl.style.opacity = `${auraOpacity}`;
          if (cdEl) cdEl.style.opacity = `${auraOpacity * 0.35}`;

          const stageOpacity = Math.max(0.12, 1 - progress * 0.85);
          stageRef.current.style.opacity = `${stageOpacity}`;
          stageRef.current.style.filter = 'none';
          stageRef.current.style.transition = 'none';
        }

        // 5. Dock transport controls morph via CSS variable
        document.documentElement.style.setProperty('--player-collapse-progress', eased.toFixed(3));
        document.documentElement.style.setProperty('--player-collapse-y', `${deltaY.toFixed(1)}px`);
      }
    } else if (deltaY < 0) {
      // ── Direction: UP (Player to Queue) ──
      document.documentElement.style.setProperty('--player-collapse-progress', '0');
      document.documentElement.style.setProperty('--player-collapse-y', '0px');

      if (!isQueueOpen && onOpenQueue) {
        const queueDistance = Math.min(360, window.innerHeight * 0.48);
        const progress = Math.min(1, Math.max(0, -deltaY / queueDistance));
        const eased = progress * progress * (3 - 2 * progress);

        // 1. Artwork & stage: continuous dimming, slight scaling and subtle blur
        if (stageRef.current) {
          const currentScale = 1 - eased * 0.06; // 1.0 -> 0.94
          const currentOpacity = 1 - eased * 0.55; // 1.0 -> 0.45
          const currentBlur = eased * 2; // 0px -> 2px
          stageRef.current.style.transition = 'none';
          stageRef.current.style.transform = `scale(${currentScale.toFixed(3)})`;
          stageRef.current.style.opacity = `${currentOpacity.toFixed(3)}`;
          stageRef.current.style.filter = currentBlur > 0.05 ? `blur(${currentBlur.toFixed(1)}px)` : 'none';
        }

        if (artworkFrameRef.current) {
          artworkFrameRef.current.style.transition = 'none';
          artworkFrameRef.current.style.transform = `translateY(${deltaY * 0.15}px)`;
        }

        // 2. Queue Sheet: slides smoothly into view from below tracking the finger!
        const queueDialog = document.querySelector('.queue-sheet') as HTMLDialogElement | null;
        if (queueDialog && !isQueueOpen) {
          if (!queueDialog.open) {
            try {
              queueDialog.showModal();
            } catch {
              // ignore
            }
          }
          const sheetHeight = queueDialog.clientHeight || window.innerHeight;
          const currentTranslateY = Math.max(0, sheetHeight * (1 - eased));
          queueDialog.style.transition = 'none';
          queueDialog.style.transform = `translateY(${currentTranslateY.toFixed(1)}px)`;
          queueDialog.style.opacity = `${Math.min(1, eased * 1.25)}`;
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isGestureActive.current || isInteractingButton.current) {
      resetGestureState();
      return;
    }

    if (touchStartY.current === null || touchStartX.current === null) {
      resetGestureState();
      return;
    }

    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const deltaY = endY - touchStartY.current;
    const deltaX = endX - touchStartX.current;
    const deltaTime = Math.max(1, Date.now() - touchStartTime.current);
    const velocityX = deltaX / deltaTime;
    const velocityYVal = velocityY.current;

    isGestureActive.current = false;

    // ── Horizontal Menu Drawer ──
    if (isHorizontalGesture.current || Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 45 || velocityX > 0.3) {
        if (artworkFrameRef.current) {
          artworkFrameRef.current.style.transition = 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)';
          artworkFrameRef.current.style.transform = '';
        }
        if (onOpenDrawer) onOpenDrawer();
      } else {
        if (artworkFrameRef.current) {
          artworkFrameRef.current.style.transition = 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)';
          artworkFrameRef.current.style.transform = '';
        }
      }
      resetGestureState();
      return;
    }

    // ── Vertical: Downward (Collapse to Minimized Island or Close Queue) ──
    if (deltaY > 0) {
      if (isQueueOpen && onCloseQueue) {
        if (deltaY > 45 || (deltaY > 20 && velocityYVal > 0.28)) {
          onCloseQueue();
        }
        resetStageStyles();
        resetGestureState();
        return;
      }

      if (!isQueueOpen && onMinimize) {
        const maxDist = Math.min(420, window.innerHeight * 0.55);
        const progress = deltaY / maxDist;

        // Intentional collapse: dragged past threshold or downward flick AND not reversed back up
        const shouldCollapse = (deltaY > 45 || (deltaY > 20 && velocityYVal > 0.28) || progress > 0.35) && deltaY > 25 && velocityYVal >= -0.15;

        const drawer = document.querySelector('.app-shell__player-drawer') as HTMLElement | null;
        const islandEl = document.querySelector('.minimized-player-island') as HTMLElement | null;

        if (shouldCollapse) {
          if (drawer) {
            drawer.style.transition = 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)';
            drawer.style.transform = 'translateY(100%)';
          }
          if (islandEl) {
            islandEl.style.transition = 'opacity 240ms ease, transform 260ms ease';
            islandEl.style.opacity = '1';
            islandEl.style.transform = 'translateY(0)';
          }
          if (artworkFrameRef.current) {
            artworkFrameRef.current.style.transition =
              'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), opacity 240ms ease, border-radius 280ms ease';
            artworkFrameRef.current.style.transform = 'scale(0.48)';
            artworkFrameRef.current.style.borderRadius = '12px';
          }
          if (stageRef.current) {
            stageRef.current.style.transition = 'opacity 220ms ease';
            stageRef.current.style.opacity = '0';
          }
          document.documentElement.style.setProperty('--player-collapse-progress', '1');

          setTimeout(() => {
            resetStageStyles();
            if (drawer) {
              drawer.style.transform = '';
              drawer.style.transition = '';
            }
            if (islandEl) {
              islandEl.style.opacity = '';
              islandEl.style.transform = '';
              islandEl.style.transition = '';
            }
            onMinimize();
          }, 280);
        } else {
          if (drawer) {
            drawer.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
            drawer.style.transform = 'translateY(0)';
          }
          if (islandEl) {
            islandEl.style.transition = 'opacity 220ms ease, transform 240ms ease';
            islandEl.style.opacity = '0';
            islandEl.style.transform = 'translateY(24px)';
          }
          reboundToFullPlayer();
        }
        resetGestureState();
        return;
      }
    }

    // ── Vertical: Upward (Open Queue) ──
    if (deltaY < 0 && !isQueueOpen && onOpenQueue) {
      const queueDistance = Math.min(360, window.innerHeight * 0.48);
      const progress = -deltaY / queueDistance;

      // Intentional open: dragged up past threshold or upward flick AND not reversed back down
      const shouldOpenQueue = (deltaY < -45 || (deltaY < -20 && velocityYVal < -0.28) || progress > 0.35) && deltaY < -25 && velocityYVal <= 0.15;

      const queueDialog = document.querySelector('.queue-sheet') as HTMLDialogElement | null;

      if (shouldOpenQueue) {
        if (queueDialog) {
          queueDialog.style.transition =
            'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease';
          queueDialog.style.transform = 'translateY(0)';
          queueDialog.style.opacity = '1';
        }
        if (stageRef.current) {
          stageRef.current.style.transition =
            'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease, filter 260ms ease';
          stageRef.current.style.transform = 'scale(0.94)';
          stageRef.current.style.opacity = '0.45';
          stageRef.current.style.filter = 'blur(2px)';
        }
        if (artworkFrameRef.current) {
          artworkFrameRef.current.style.transform = '';
          artworkFrameRef.current.style.opacity = '';
          artworkFrameRef.current.style.filter = '';
        }

        setTimeout(() => {
          if (queueDialog) {
            queueDialog.style.transform = '';
            queueDialog.style.transition = '';
            queueDialog.style.opacity = '';
          }
          onOpenQueue();
        }, 300);
      } else {
        if (queueDialog && !isQueueOpen) {
          queueDialog.style.transition =
            'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease';
          queueDialog.style.transform = 'translateY(100%)';
          queueDialog.style.opacity = '0';
          setTimeout(() => {
            if (!isQueueOpen && queueDialog.open) {
              try {
                queueDialog.close();
              } catch {
                // ignore
              }
            }
            queueDialog.style.transform = '';
            queueDialog.style.opacity = '';
            queueDialog.style.transition = '';
          }, 260);
        }
        reboundToFullPlayer();
      }
      resetGestureState();
      return;
    }

    reboundToFullPlayer();
    resetGestureState();
  };

  const handleTouchCancel = () => {
    reboundToFullPlayer();
    resetGestureState();
  };

  // CrossfadeImage hovering function (launchFloatCycle translateY(-10px)) completely removed per user request.
  // The artwork remains rock-solid and stationary in the center of the rotating circular spectrum visualizer.

  return (
    <section
      className="player-home"
      aria-label="Now Playing Stage"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <StarField className="player-home__starfield" />

      <div ref={stageRef} className="player-home__stage">
        {/* Artwork with faint CD and audio-reactive visualizer behind it */}
        <ArtworkVisualizer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          presentation="main"
          artworkFrameRef={artworkFrameRef}
        />

        {!currentTrack && onOpenDrawer && (
          <button
            className="skip-link"
            style={{ position: 'static', marginTop: '16px', display: 'inline-block' }}
            onClick={onOpenDrawer}
          >
            open playlist drawer ↵
          </button>
        )}
      </div>
    </section>
  );
}

