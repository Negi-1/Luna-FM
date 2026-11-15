import { useState, useMemo, useCallback } from 'react';
import type { Album, Track, AudioEngine } from '../types';
import { formatTime } from '../utils/helpers';
import {
  getNewlyAddedSongs,
  getListenToRecommendations,
  getFeaturedPlaylists,
  getFrequenciesCategories,
  resolveArtworkFallback,
} from '../services/discoverService';
import { usePlayer } from '../context/PlayerContext';
import './DiscoverView.css';

interface DiscoverViewProps {
  albums: Album[];
  allTracks: Track[];
  engine: AudioEngine;
  lastPlayedTracks?: Track[];
  onClearHistory?: () => void;
  onNavigate?: (view: string) => void;
  onPlayTrack?: (track: Track, queue: Track[]) => void;
  onSelectAlbum?: (albumId: string) => void;
}

interface TrackArtworkProps {
  track: Track;
  album?: Album | null;
  className?: string;
}

export function TrackArtwork({ track, album, className = '' }: TrackArtworkProps) {
  const initial = useMemo(() => resolveArtworkFallback(track, album), [track, album]);
  const [currentTier, setCurrentTier] = useState<1 | 2 | 3>(initial.tier);
  const [imgSrc, setImgSrc] = useState<string | null>(initial.src);

  const handleError = () => {
    if (currentTier === 1 && album?.coverUrl) {
      setCurrentTier(2);
      setImgSrc(album.coverUrl);
    } else {
      setCurrentTier(3);
      setImgSrc(null);
    }
  };

  return (
    <div
      className={`discover-artwork discover-artwork--tier-${currentTier} ${className}`}
      data-tier={currentTier}
    >
      {currentTier === 3 || !imgSrc ? (
        <div className="discover-artwork__glyph-fallback" data-tier="3" aria-hidden="true">
          <span className="discover-artwork__glyph">☾</span>
        </div>
      ) : (
        <img
          src={imgSrc}
          alt={track.title}
          className="discover-artwork__img"
          data-tier={currentTier}
          loading="lazy"
          onError={handleError}
        />
      )}
    </div>
  );
}

export function DiscoverView({
  albums,
  allTracks,
  engine,
  lastPlayedTracks,
  onClearHistory,
  onNavigate,
  onPlayTrack,
  onSelectAlbum,
}: DiscoverViewProps) {
  const { setIsPlayerExpanded, lastPlayed: contextLastPlayed, clearLastPlayed } = usePlayer();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Map albums by ID for quick parent lookups
  const albumMap = useMemo(() => {
    const map = new Map<string, Album>();
    for (const a of albums) map.set(a.id, a);
    return map;
  }, [albums]);

  // Section 0: Last Played Frequencies (present on TOP, newest first)
  const lastPlayed = useMemo(() => {
    if (lastPlayedTracks && lastPlayedTracks.length > 0) return lastPlayedTracks;
    if (contextLastPlayed && contextLastPlayed.length > 0) return contextLastPlayed;
    if (engine.currentTrack) return [engine.currentTrack];
    return [];
  }, [lastPlayedTracks, contextLastPlayed, engine.currentTrack]);

  // Section A: Newly Added Songs (10 items, descending addition order)
  const newlyAdded = useMemo(() => {
    return getNewlyAddedSongs(allTracks, 10);
  }, [allTracks]);

  // Section B: Listen To Recommendations (mood overlap with current track)
  const recommendations = useMemo(() => {
    return getListenToRecommendations(albums, engine.currentTrack, 4);
  }, [albums, engine.currentTrack]);

  // Section C: Featured Curated Playlists
  const featured = useMemo(() => {
    return getFeaturedPlaylists(albums);
  }, [albums]);

  // Section D: Categories without hallucinated genres
  const categories = useMemo(() => {
    return getFrequenciesCategories(allTracks, albums);
  }, [allTracks, albums]);

  const activeCategoryData = useMemo(() => {
    return categories.find((c) => c.id === activeCategory) || categories[0];
  }, [categories, activeCategory]);

  // Play track and expand full player
  const handleTrackClick = useCallback(
    (track: Track, queue: Track[]) => {
      if (onPlayTrack) {
        onPlayTrack(track, queue);
      } else {
        engine.playTrack(track, queue);
      }
      if (setIsPlayerExpanded) {
        setIsPlayerExpanded(true);
      }
    },
    [onPlayTrack, engine, setIsPlayerExpanded],
  );

  // Play album / playlist
  const handleAlbumPlay = useCallback(
    (album: Album) => {
      if (!album.tracks || album.tracks.length === 0) return;
      handleTrackClick(album.tracks[0], album.tracks);
    },
    [handleTrackClick],
  );

  // Explore album in Collections view
  const handleAlbumExplore = useCallback(
    (albumId: string) => {
      if (onSelectAlbum) {
        onSelectAlbum(albumId);
      }
      if (onNavigate) {
        onNavigate('collection');
      }
    },
    [onSelectAlbum, onNavigate],
  );

  return (
    <div className="discover-view" role="region" aria-label="Discover Frequencies">
      {/* ── Page Header ── */}
      <header className="discover-view__header">
        <div className="discover-view__badge">
          <span>FREQUENCY DISCOVERY // 発見</span>
        </div>
        <h1 className="discover-view__title">Discover Resonance</h1>
        <p className="discover-view__subtitle">
          Curated transmissions, newly archived frequencies, and ambient lo-fi soundscapes.
        </p>
      </header>

      {/* ── SECTION 0: LAST PLAYED (ON TOP) ── */}
      <section className="discover-section discover-section--last-played" aria-label="Last Played Tracks">
        <div className="discover-section__header">
          <div className="discover-section__meta">
            <span className="discover-section__badge">RECENT SESSIONS // 再生履歴</span>
            <h2 className="discover-section__title">Last Played</h2>
          </div>
          <div className="discover-section__actions">
            {lastPlayed.length > 0 && (
              <span className="discover-section__count">
                {lastPlayed.length} {lastPlayed.length === 1 ? 'track' : 'tracks'}
              </span>
            )}
            {lastPlayed.length > 0 && (
              <button
                type="button"
                className="discover-section__clear-btn"
                aria-label="Clear play history"
                onClick={() => {
                  if (onClearHistory) {
                    onClearHistory();
                  } else if (clearLastPlayed) {
                    clearLastPlayed();
                  }
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {lastPlayed.length > 0 ? (
          <div className="discover-carousel discover-carousel--tracks" role="list">
            {lastPlayed.map((track) => {
              const album = albumMap.get(track.albumId);
              const isPlayingCurrent = engine.currentTrack?.id === track.id && engine.isPlaying;

              return (
                <div
                  key={`last-played-${track.id}`}
                  className={`discover-track-card ${isPlayingCurrent ? 'discover-track-card--active' : ''}`}
                  role="listitem"
                  onClick={() => handleTrackClick(track, lastPlayed)}
                >
                  <div className="discover-track-card__art-wrap">
                    <TrackArtwork track={track} album={album} className="discover-track-card__art" />
                    <button
                      type="button"
                      className="discover-track-card__play-btn"
                      aria-label={`Play ${track.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackClick(track, lastPlayed);
                      }}
                    >
                      {isPlayingCurrent ? '❚❚' : '▶'}
                    </button>
                  </div>
                  <div className="discover-track-card__info">
                    <h3 className="discover-track-card__title" title={track.title}>
                      {track.title}
                    </h3>
                    <p className="discover-track-card__artist" title={track.artist}>
                      {track.artist}
                    </p>
                    <span className="discover-track-card__duration">
                      {track.duration ? formatTime(track.duration) : '--:--'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="discover-empty-history">
            <span className="discover-empty-history__icon" aria-hidden="true">⟲</span>
            <p className="discover-empty-history__text">
              No recent transmissions yet. Play any frequency to start your archive.
            </p>
          </div>
        )}
      </section>

      {/* ── SECTION A: NEWLY ADDED ── */}
      <section className="discover-section discover-section--newly-added" aria-label="Newly Added Tracks">
        <div className="discover-section__header">
          <div className="discover-section__meta">
            <span className="discover-section__badge">ARCHIVE UPDATE // 最新追加</span>
            <h2 className="discover-section__title">Newly Added Frequencies</h2>
          </div>
          <span className="discover-section__count">{newlyAdded.length} tracks</span>
        </div>

        <div className="discover-carousel discover-carousel--tracks" role="list">
          {newlyAdded.map((track) => {
            const album = albumMap.get(track.albumId);
            const isPlayingCurrent = engine.currentTrack?.id === track.id && engine.isPlaying;

            return (
              <div
                key={track.id}
                className={`discover-track-card ${isPlayingCurrent ? 'discover-track-card--active' : ''}`}
                role="listitem"
                onClick={() => handleTrackClick(track, newlyAdded)}
              >
                <div className="discover-track-card__art-wrap">
                  <TrackArtwork track={track} album={album} className="discover-track-card__art" />
                  <button
                    type="button"
                    className="discover-track-card__play-btn"
                    aria-label={`Play ${track.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrackClick(track, newlyAdded);
                    }}
                  >
                    {isPlayingCurrent ? '❚❚' : '▶'}
                  </button>
                </div>
                <div className="discover-track-card__info">
                  <h3 className="discover-track-card__title" title={track.title}>
                    {track.title}
                  </h3>
                  <p className="discover-track-card__artist" title={track.artist}>
                    {track.artist}
                  </p>
                  <span className="discover-track-card__duration">
                    {track.duration ? formatTime(track.duration) : '--:--'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION B: LISTEN TO ── */}
      <section className="discover-section discover-section--listen-to" aria-label="Listen To Recommendations">
        <div className="discover-section__header">
          <div className="discover-section__meta">
            <span className="discover-section__badge">RECOMMENDED // おすすめ</span>
            <h2 className="discover-section__title">Listen To</h2>
          </div>
          <p className="discover-section__hint">Frequencies matched to your current ambient mood.</p>
        </div>

        <div className="discover-carousel discover-carousel--playlists" role="list">
          {recommendations.map((album) => {
            const isPlayingAlbum = engine.currentTrack && album.tracks.some((t) => t.id === engine.currentTrack?.id);

            return (
              <div
                key={album.id}
                className={`discover-playlist-card ${isPlayingAlbum ? 'discover-playlist-card--active' : ''}`}
                role="listitem"
              >
                <div
                  className="discover-playlist-card__cover"
                  style={{ background: album.gradient || 'var(--theme-surface-elevated)' }}
                  onClick={() => handleAlbumPlay(album)}
                >
                  {album.coverUrl ? (
                    <img src={album.coverUrl} alt={album.title} className="discover-playlist-card__img" loading="lazy" />
                  ) : (
                    <div className="discover-playlist-card__cover-glyph">☾</div>
                  )}
                  <button
                    type="button"
                    className="discover-playlist-card__play-btn"
                    aria-label={`Play playlist ${album.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAlbumPlay(album);
                    }}
                  >
                    {isPlayingAlbum && engine.isPlaying ? '❚❚' : '▶'}
                  </button>
                </div>
                <div className="discover-playlist-card__body">
                  <div className="discover-playlist-card__tags">
                    {album.mood?.slice(0, 2).map((m) => (
                      <span key={m} className="discover-tag">
                        #{m}
                      </span>
                    ))}
                    <span className="discover-tag discover-tag--count">{album.tracks.length} tracks</span>
                  </div>
                  <h3 className="discover-playlist-card__title" title={album.title}>
                    {album.title}
                  </h3>
                  <p className="discover-playlist-card__desc" title={album.description}>
                    {album.description}
                  </p>
                  <div className="discover-playlist-card__actions">
                    <button
                      type="button"
                      className="discover-action-btn discover-action-btn--primary"
                      onClick={() => handleAlbumPlay(album)}
                    >
                      Play Transmission
                    </button>
                    <button
                      type="button"
                      className="discover-action-btn discover-action-btn--ghost"
                      onClick={() => handleAlbumExplore(album.id)}
                    >
                      Explore →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION C: FEATURED PLAYLISTS ── */}
      <section className="discover-section discover-section--featured" aria-label="Featured Playlists">
        <div className="discover-section__header">
          <div className="discover-section__meta">
            <span className="discover-section__badge">EDITORIAL // 特集</span>
            <h2 className="discover-section__title">Featured Playlists</h2>
          </div>
          <span className="discover-section__count">Official Selection</span>
        </div>

        <div className="discover-carousel discover-carousel--featured" role="list">
          {featured.map((album) => {
            const isPlayingAlbum = engine.currentTrack && album.tracks.some((t) => t.id === engine.currentTrack?.id);

            return (
              <div
                key={album.id}
                className={`discover-featured-card ${isPlayingAlbum ? 'discover-featured-card--active' : ''}`}
                role="listitem"
                onClick={() => handleAlbumPlay(album)}
              >
                <div
                  className="discover-featured-card__bg"
                  style={{
                    backgroundImage: album.coverUrl
                      ? `linear-gradient(180deg, rgba(16, 14, 23, 0.25) 0%, rgba(16, 14, 23, 0.9) 100%), url(${album.coverUrl})`
                      : album.gradient,
                  }}
                />
                <div className="discover-featured-card__content">
                  <span className="discover-featured-card__badge">FEATURED</span>
                  <h3 className="discover-featured-card__title">{album.title}</h3>
                  <p className="discover-featured-card__desc">{album.description}</p>
                  <div className="discover-featured-card__footer">
                    <span className="discover-featured-card__tracks">{album.tracks.length} frequencies</span>
                    <button
                      type="button"
                      className="discover-featured-card__play"
                      aria-label={`Play ${album.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAlbumPlay(album);
                      }}
                    >
                      {isPlayingAlbum && engine.isPlaying ? '❚❚ PLAYING' : '▶ PLAY'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION D: EXPLORE FREQUENCIES (Categorized) ── */}
      <section className="discover-section discover-section--frequencies" aria-label="Explore Frequencies">
        <div className="discover-section__header">
          <div className="discover-section__meta">
            <span className="discover-section__badge">CATEGORIES // 周波数</span>
            <h2 className="discover-section__title">Explore Frequencies</h2>
          </div>
          <p className="discover-section__hint">Filtered strictly by curated metadata with zero hallucinated genres.</p>
        </div>

        {/* Interactive filter pills */}
        <div className="discover-pills-bar" role="tablist" aria-label="Filter Categories">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat.id}
              className={`discover-pill ${activeCategory === cat.id ? 'discover-pill--active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="discover-pill__label">{cat.label}</span>
              <span className="discover-pill__count">{cat.count}</span>
            </button>
          ))}
        </div>

        {/* Filtered tracks grid */}
        <div className="discover-frequencies-grid" role="list">
          {activeCategoryData?.tracks?.map((track) => {
            const album = albumMap.get(track.albumId);
            const isPlayingCurrent = engine.currentTrack?.id === track.id && engine.isPlaying;

            return (
              <div
                key={`${activeCategory}-${track.id}`}
                className={`discover-freq-row ${isPlayingCurrent ? 'discover-freq-row--active' : ''}`}
                role="listitem"
                onClick={() => handleTrackClick(track, activeCategoryData.tracks)}
              >
                <div className="discover-freq-row__art-wrap">
                  <TrackArtwork track={track} album={album} className="discover-freq-row__art" />
                  <span className="discover-freq-row__play-icon" aria-hidden="true">
                    {isPlayingCurrent ? '❚❚' : '▶'}
                  </span>
                </div>
                <div className="discover-freq-row__meta">
                  <span className="discover-freq-row__title" title={track.title}>
                    {track.title}
                  </span>
                  <span className="discover-freq-row__artist" title={track.artist}>
                    {track.artist}
                  </span>
                </div>
                <span className="discover-freq-row__album" title={track.album || album?.title || 'Single'}>
                  {track.album || album?.title || 'Single'}
                </span>
                <span className="discover-freq-row__duration">
                  {track.duration ? formatTime(track.duration) : '--:--'}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
export default DiscoverView;
