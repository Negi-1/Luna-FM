import { useMemo, useCallback } from 'react';
import type { Album, Track, AudioEngine } from '../types';
import { formatTime } from '../utils/helpers';
import { usePlayer } from '../context/PlayerContext';
import './PlaylistsView.css';

interface PlaylistsViewProps {
  albums: Album[];
  engine: AudioEngine;
  onNavigateToCollection: (albumId?: string) => void;
}

export function PlaylistsView({
  albums,
  engine,
  onNavigateToCollection,
}: PlaylistsViewProps) {
  const { isAdmin, setIsPlayerExpanded } = usePlayer();

  const handlePlayAlbum = useCallback(
    (album: Album) => {
      if (album.tracks.length > 0) {
        engine.playTrack(album.tracks[0], album.tracks);
        if (setIsPlayerExpanded) setIsPlayerExpanded(true);
      }
    },
    [engine, setIsPlayerExpanded],
  );

  return (
    <div className="playlists-view" role="region" aria-label="Curated playlists archive">
      <div className="playlists-view__header">
        <p className="playlists-view__badge">CURATED // プレイリスト</p>
        <h1 className="playlists-view__title">the curated playlists</h1>
        <p className="playlists-view__desc">
          carefully tuned sonic transmissions, themes, and late night atmospheres.
        </p>

        {isAdmin && (
          <div className="playlists-view__admin-pill">
            <span>✦ ADMIN CURATION ENABLED</span>
            <button
              type="button"
              className="playlists-view__admin-cta"
              onClick={() => onNavigateToCollection()}
            >
              Curate Playlist in Collection →
            </button>
          </div>
        )}
      </div>

      <div className="playlists-view__grid">
        {albums.map((album) => {
          const totalDuration = album.tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
          const isCurrentlyPlayingAlbum = engine.currentTrack?.albumId === album.id;

          return (
            <article
              key={album.id}
              className={`playlist-card${isCurrentlyPlayingAlbum ? ' playlist-card--playing' : ''}`}
            >
              {/* Artwork Header */}
              <div
                className="playlist-card__art-wrap"
                style={{ background: album.gradient }}
                onClick={() => handlePlayAlbum(album)}
                role="button"
                tabIndex={0}
                aria-label={`Play ${album.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePlayAlbum(album);
                  }
                }}
              >
                {album.coverUrl ? (
                  <img
                    src={album.coverUrl}
                    alt={album.title}
                    className="playlist-card__cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="playlist-card__art-fallback" aria-hidden="true">
                    ☾⋆
                  </div>
                )}

                <div className="playlist-card__play-overlay">
                  <div className="playlist-card__play-btn" title="Play playlist">
                    {isCurrentlyPlayingAlbum && engine.isPlaying ? '❚❚' : '▶'}
                  </div>
                </div>

                {album.subtitle && (
                  <span className="playlist-card__subtitle-badge">{album.subtitle}</span>
                )}
              </div>

              {/* Card Content */}
              <div className="playlist-card__body">
                <div className="playlist-card__title-row">
                  <h2 className="playlist-card__title">{album.title}</h2>
                  <span className="playlist-card__count">{album.tracks.length} tracks</span>
                </div>

                <p className="playlist-card__desc">{album.description}</p>

                {album.mood.length > 0 && (
                  <div className="playlist-card__moods">
                    {album.mood.map((m) => (
                      <span key={m} className="playlist-card__mood-tag">
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                <div className="playlist-card__footer">
                  <span className="playlist-card__dur">
                    {totalDuration > 0 ? `${Math.round(totalDuration / 60)} mins` : '-- mins'}
                  </span>

                  <div className="playlist-card__actions">
                    <button
                      type="button"
                      className="playlist-card__btn playlist-card__btn--explore"
                      onClick={() => onNavigateToCollection(album.id)}
                      title="View all tracks in the collection"
                    >
                      Explore in Archive →
                    </button>
                    <button
                      type="button"
                      className="playlist-card__btn playlist-card__btn--play"
                      onClick={() => handlePlayAlbum(album)}
                      title="Play entire playlist"
                    >
                      Play
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

