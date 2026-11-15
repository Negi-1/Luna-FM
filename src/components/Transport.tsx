import { useState, useRef, useEffect } from 'react';
import type { AudioEngine } from '../types';
import { formatTime, clamp } from '../utils/helpers';
import './Transport.css';

interface TransportProps {
  engine: AudioEngine;
  onQueueOpen: () => void;
  onMinimize?: () => void;
}

export function Transport({ engine, onQueueOpen, onMinimize }: TransportProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    queue,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  } = engine;

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      if (window.innerWidth < 769) {
        setIsOverflowing(false);
        return;
      }
      // Measure single-line scroll width against available container client width with safety margin
      const hasOverflow = content.scrollWidth > container.clientWidth + 8;
      setIsOverflowing(hasOverflow);
    };

    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measure();
      });
      // Observe only container dimension changes, never the animating content
      ro.observe(container);
    }

    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, [currentTrack?.title, currentTrack?.artist, currentTrack?.album]);

  const effectiveDuration = duration > 0 ? duration : (currentTrack?.duration ?? 0);
  const displayTime = isScrubbing ? scrubValue : currentTime;
  const progressPct = effectiveDuration > 0
    ? clamp((displayTime / effectiveDuration) * 100, 0, 100)
    : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScrubValue(val);
    if (!isScrubbing) {
      seek(val);
    }
  };

  const handleSeekStart = () => {
    setIsScrubbing(true);
    setScrubValue(currentTime);
  };

  const handleSeekEnd = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setIsScrubbing(false);
    const val = parseFloat((e.target as HTMLInputElement).value);
    seek(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  const volumePct = isMuted ? 0 : clamp(volume * 100, 0, 100);

  return (
    <aside className="transport" aria-label="Music player">
      <div className="transport__inner">
        {/* ── Player Home Info: Sits directly on top of transport progress wrap ── */}
        <div
          ref={containerRef}
          className={`player-home__info transport__track-info ${
            isOverflowing ? 'transport__track-info--marquee' : ''
          }`}
        >
          <div className="transport__marquee-track">
            <div ref={contentRef} className="transport__track-content">
              <div className="player-home__badge">
                <span>NOW PLAYING</span>
                <span className="player-home__badge-ja" lang="ja">
                  再生中
                </span>
              </div>

              <h1 className="player-home__title">
                {currentTrack ? currentTrack.title : 'luna.fm archive'}
              </h1>

              <span className="transport__track-separator" aria-hidden="true">
                —
              </span>

              <p className="player-home__artist">
                {currentTrack ? currentTrack.artist : 'a personal music room'}
                {currentTrack?.album && (
                  <span className="player-home__album"> · {currentTrack.album}</span>
                )}
              </p>
            </div>

            {/* Seamless duplicate for continuous looping marquee when overflowing on desktop */}
            {isOverflowing && (
              <div className="transport__track-content" aria-hidden="true">
                <div className="player-home__badge">
                  <span>NOW PLAYING</span>
                  <span className="player-home__badge-ja" lang="ja">
                    再生中
                  </span>
                </div>

                <h1 className="player-home__title">
                  {currentTrack ? currentTrack.title : 'luna.fm archive'}
                </h1>

                <span className="transport__track-separator" aria-hidden="true">
                  —
                </span>

                <p className="player-home__artist">
                  {currentTrack ? currentTrack.artist : 'a personal music room'}
                  {currentTrack?.album && (
                    <span className="player-home__album"> · {currentTrack.album}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Seek Bar: Full Width, Long & Sleek ─────────────── */}
        <div className="transport__progress-wrap">
          <span className="transport__time-label tabular-nums">
            {formatTime(displayTime)}
          </span>
          <input
            id="seek-slider"
            className="transport__range-input transport__range-input--seek"
            min={0}
            max={effectiveDuration > 0 ? effectiveDuration : 100}
            step={0.1}
            value={displayTime}
            disabled={effectiveDuration === 0}
            onChange={handleSeekChange}
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            onKeyUp={handleSeekEnd}
            style={{
              background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${progressPct}%, var(--slider-track-color) ${progressPct}%, var(--slider-track-color) 100%)`
            }}
            aria-label="Seek track position"
            aria-valuetext={`${formatTime(displayTime)} of ${formatTime(effectiveDuration)}`}
            type="range"
          />
          <span className="transport__time-label transport__time-label--end tabular-nums">
            {effectiveDuration > 0 ? formatTime(effectiveDuration) : '0:00'}
          </span>
        </div>

        {/* ── Controls Row: Centered Playback Group with Queue & Volume ───── */}
        <div className="transport__controls-row">
          <div className="transport__playback-group">
            {/* Left Controls (flex-end): Minimize, Shuffle, Prev */}
            <div className="transport__playback-left">
              {/* Minimize button (desktop): positioned immediately preceding Shuffle */}
              <button
                type="button"
                className="transport__icon-button transport__minimize-button"
                onClick={onMinimize}
                aria-label="Minimize player"
                title="Minimize player"
              >
                <span aria-hidden="true">▼</span>
              </button>

              {/* Toggle shuffle */}
              <button
                type="button"
                className={`transport__icon-button transport__icon-button--shuffle${isShuffled ? ' transport__icon-button--active' : ''}`}
                onClick={toggleShuffle}
                aria-label="Toggle shuffle (S)"
                aria-pressed={isShuffled}
                title="Toggle shuffle (S)"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
              </button>

              {/* Previous */}
              <button
                type="button"
                className="transport__icon-button transport__icon-button--prev"
                onClick={prev}
                aria-label="Previous track (P)"
                title="Previous (P)"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6 5h2v14H6V5zm3.5 7 9.5 7V5l-9.5 7z" />
                </svg>
              </button>
            </div>

            {/* Center Play/Pause button - Exactly centered in the viewport */}
            <button
              type="button"
              className="transport__play-button"
              onClick={toggle}
              aria-label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              title="Play/Pause (Space)"
            >
              {isPlaying ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7-11-7z" />
                </svg>
              )}
            </button>

            {/* Right Controls (flex-start): Next, Repeat, Queue, Volume */}
            <div className="transport__playback-right">
              {/* Next */}
              <button
                type="button"
                className="transport__icon-button transport__icon-button--next"
                onClick={next}
                aria-label="Next track (N)"
                title="Next (N)"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16 5h2v14h-2V5zM5 19l9.5-7L5 5v14z" />
                </svg>
              </button>

              {/* Repeat mode */}
              <div className="transport__repeat-wrapper">
                <button
                  type="button"
                  className={`transport__icon-button transport__icon-button--repeat${repeatMode !== 'off' ? ' transport__icon-button--active' : ''}`}
                  onClick={cycleRepeat}
                  aria-label={`Repeat mode: ${repeatMode} (R)`}
                  aria-pressed={repeatMode !== 'off'}
                  title={`Repeat mode: ${repeatMode} (R)`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  {repeatMode === 'one' && (
                    <span className="transport__repeat-badge">1</span>
                  )}
                </button>
              </div>

              {/* Queue toggle button (grouped with controls, hidden on phone view) */}
              <button
                type="button"
                className="transport__queue-button"
                onClick={onQueueOpen}
                aria-label="Toggle queue"
                aria-expanded="false"
                title="Queue"
              >
                <span aria-hidden="true">☰</span>
              </button>

              {/* Volume wrap: perfectly spaced after triple lines, stays inside seek slider boundary */}
              <div className="transport__volume-wrap">
                <button
                  type="button"
                  className={`transport__icon-button${isMuted || volume === 0 ? ' transport__icon-button--active' : ''}`}
                  onClick={toggleMute}
                  aria-label="Mute audio (M)"
                  aria-pressed={isMuted}
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    {!isMuted && volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
                    {!isMuted && volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
                    {(isMuted || volume === 0) && <line x1="23" y1="9" x2="17" y2="15" />}
                    {(isMuted || volume === 0) && <line x1="17" y1="9" x2="23" y2="15" />}
                  </svg>
                </button>
                <input
                  id="volume-slider"
                  className="transport__range-input transport__range-input--volume"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{
                    background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${volumePct}%, var(--slider-track-color) ${volumePct}%, var(--slider-track-color) 100%)`
                  }}
                  aria-label="Volume"
                  aria-valuetext={`${Math.round(volumePct)}%`}
                  type="range"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
