import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Track } from '../types';
import { formatTime } from '../utils/helpers';
import { usePlayer } from '../context/PlayerContext';
import './SearchOverlay.css';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  currentTrackId: string | null;
  onPlayTrack: (track: Track, queue: Track[]) => void;
}

export default function SearchOverlay({
  isOpen,
  onClose,
  tracks,
  currentTrackId,
  onPlayTrack,
}: SearchOverlayProps) {
  const { unlockAdmin, notify, setView } = usePlayer();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Secret passcode check to unlock admin rights from search bar
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q === 'luna:admin' || q === 'admin') {
      unlockAdmin();
      notify('☾⋆⁺₊ admin rights unlocked: playlist curation enabled');
      setQuery('');
      setDebouncedQuery('');
      onClose();
      setView('collection');
    }
  }, [query, unlockAdmin, notify, onClose, setView]);

  // Debounce query 150ms
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  // Focus input on open, reset query on close
  useEffect(() => {
    if (isOpen) {
      // Small delay to let transition start
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isOpen, onClose]);

  // Search logic: every term must match title + artist + album
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return null;
    const terms = debouncedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return tracks.filter((t) => {
      const hay = `${t.title} ${t.artist} ${t.album}`.toLowerCase();
      return terms.every((term) => hay.includes(term));
    });
  }, [debouncedQuery, tracks]);

  const handleSelect = useCallback(
    (track: Track) => {
      onPlayTrack(track, results ?? tracks);
      onClose();
    },
    [onPlayTrack, onClose, results, tracks],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && results && results.length > 0) {
        e.preventDefault();
        handleSelect(results[0]);
      }
    },
    [results, handleSelect],
  );

  return (
    <>
      {/* Scrim */}
      <div
        className={`search-overlay__scrim${isOpen ? ' search-overlay__scrim--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Search panel */}
      <div
        className={`search-overlay${isOpen ? ' search-overlay--open' : ''}`}
        role="search"
        aria-label="Search tracks"
      >
        <input
          ref={inputRef}
          className="search-overlay__input"
          type="text"
          placeholder="search your frequencies…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search tracks"
        />

        {isOpen && (
          <div className="search-overlay__results" role="listbox">
            {results === null ? (
              <p className="search-overlay__empty">type to search your archive</p>
            ) : results.length === 0 ? (
              <p className="search-overlay__empty">
                no frequencies match &ldquo;{debouncedQuery}&rdquo;.
              </p>
            ) : (
              results.map((track) => (
                <div
                  key={track.id}
                  className={`search-overlay__row${track.id === currentTrackId ? ' search-overlay__row--playing' : ''}`}
                  role="option"
                  aria-selected={track.id === currentTrackId}
                  onClick={() => handleSelect(track)}
                >
                  {track.artworkUrl ? (
                    <img
                      className="search-overlay__thumb"
                      src={track.artworkUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="search-overlay__thumb-fallback" aria-hidden="true">
                      ☾
                    </div>
                  )}
                  <div className="search-overlay__info">
                    <span className="search-overlay__title">{track.title}</span>
                    <span className="search-overlay__artist">{track.artist}</span>
                  </div>
                  <span className="search-overlay__duration tabular-nums">
                    {track.duration ? formatTime(track.duration) : '--:--'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
