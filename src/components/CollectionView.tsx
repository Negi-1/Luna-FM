import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Album, Track, AudioEngine } from '../types';
import { formatTime, shuffle } from '../utils/helpers';
import { ShuffleIcon } from './Icons';
import { usePlayer } from '../context/PlayerContext';
import './CollectionView.css';

interface CollectionViewProps {
  albums: Album[];
  allTracks: Track[];
  engine: AudioEngine;
  selectedAlbumId?: string | null;
}

function slugify(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || 'custom-playlist';
}

export function CollectionView({
  albums,
  allTracks,
  engine,
  selectedAlbumId,
}: CollectionViewProps) {
  const { isAdmin, lockAdmin, notify, setIsPlayerExpanded } = usePlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMood, setActiveMood] = useState<string | null>(null);

  // Admin Curation Selection States
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isCurationModalOpen, setIsCurationModalOpen] = useState(false);
  const [curatedTracks, setCuratedTracks] = useState<Track[]>([]);

  // Playlist Form States
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistSubtitle, setPlaylistSubtitle] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');
  const [playlistMoods, setPlaylistMoods] = useState('chill, nocturnal');
  const [playlistOrder, setPlaylistOrder] = useState('50');
  const [playlistCover, setPlaylistCover] = useState('cover.jpg');

  // Collect all unique moods
  const moods = useMemo(() => {
    return Array.from(new Set(albums.flatMap((a) => a.mood))).sort();
  }, [albums]);

  const hasStandalone = useMemo(() => {
    return allTracks.some((t) => t.isStandalone || t.albumId === 'pool' || !t.album);
  }, [allTracks]);

  // Map albums by id for quick lookup
  const albumMap = useMemo(() => {
    const map = new Map<string, Album>();
    for (const a of albums) map.set(a.id, a);
    return map;
  }, [albums]);

  // Filter tracks: Album -> Mood/Pool -> Search
  const filteredTracks = useMemo(() => {
    return allTracks.filter((track) => {
      // 1. Album filter
      if (selectedAlbumId && track.albumId !== selectedAlbumId) {
        return false;
      }

      // 2. Mood / Pool filter
      if (activeMood) {
        if (activeMood === 'SINGLES / POOL') {
          if (!track.isStandalone && track.albumId !== 'pool' && track.album) {
            return false;
          }
        } else {
          const album = albumMap.get(track.albumId);
          if (!album?.mood?.includes(activeMood)) {
            return false;
          }
        }
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const hay = `${track.title} ${track.artist} ${track.album || ''}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) {
          return false;
        }
      }

      return true;
    });
  }, [allTracks, selectedAlbumId, activeMood, searchQuery, albumMap]);

  // Sync selected tracks to curatedTracks when modal opens
  useEffect(() => {
    if (isCurationModalOpen) {
      const tracksInOrder = allTracks.filter((t) => selectedTrackIds.has(t.id));
      setCuratedTracks(tracksInOrder);
      if (!playlistTitle) {
        setPlaylistTitle('New Curated Frequency');
      }
    }
  }, [isCurationModalOpen, selectedTrackIds, allTracks, playlistTitle]);

  const handleShuffleAll = useCallback(() => {
    if (filteredTracks.length === 0) return;
    const shuffled = shuffle(filteredTracks);
    engine.playTrack(shuffled[0], shuffled);
    if (setIsPlayerExpanded) setIsPlayerExpanded(true);
  }, [filteredTracks, engine, setIsPlayerExpanded]);

  const handleTrackClick = useCallback(
    (track: Track) => {
      engine.playTrack(track, filteredTracks);
      if (setIsPlayerExpanded) setIsPlayerExpanded(true);
    },
    [engine, filteredTracks, setIsPlayerExpanded],
  );

  const handleEnqueue = useCallback(
    (e: React.MouseEvent, track: Track) => {
      e.stopPropagation();
      engine.enqueue(track);
    },
    [engine],
  );

  // Toggle selection for admin curation
  const toggleTrackSelection = useCallback((trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }, []);

  // Reorder curated tracks
  const moveCuratedTrack = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= curatedTracks.length) return;
    setCuratedTracks((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, item);
      return copy;
    });
  };

  const removeCuratedTrack = (trackId: string) => {
    setCuratedTracks((prev) => prev.filter((t) => t.id !== trackId));
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });
  };

  // Generate referenced info.json (zero duplicate files!)
  const generatePlaylistJson = () => {
    const moodList = playlistMoods.split(',').map((m) => m.trim()).filter(Boolean);
    const orderNum = parseInt(playlistOrder, 10) || 50;

    const tracksData = curatedTracks.map((t) => {
      // Point file reference directly to songs-list/
      const fileName = t.src.split('/').pop() || t.id;
      const refFile = `songs-list/${decodeURIComponent(fileName)}`;
      return {
        file: refFile,
        title: t.title,
        artist: t.artist,
        ...(t.duration ? { duration: t.duration } : {}),
      };
    });

    return JSON.stringify(
      {
        title: playlistTitle.trim() || 'Curated Playlist',
        description: playlistDesc.trim() || 'Curated transmission.',
        ...(playlistSubtitle.trim() ? { subtitle: playlistSubtitle.trim() } : {}),
        artist: 'various',
        mood: moodList.length > 0 ? moodList : ['nocturnal'],
        order: orderNum,
        tracks: tracksData,
      },
      null,
      2,
    );
  };

  const handleCopyJson = async () => {
    const jsonStr = generatePlaylistJson();
    try {
      await navigator.clipboard.writeText(jsonStr);
      notify('✓ Copied info.json to clipboard!');
    } catch {
      notify('Failed to copy to clipboard');
    }
  };

  const handleDownloadJson = () => {
    const jsonStr = generatePlaylistJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'info.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('✓ Downloaded info.json');
  };

  const handleDirectSave = async () => {
    if (!('showDirectoryPicker' in window)) {
      notify('File System Access API not supported in this browser. Use Download info.json');
      return;
    }
    const jsonStr = generatePlaylistJson();
    const slug = slugify(playlistTitle);

    try {
      notify('Please select your public/songs folder to save...');
      const dirHandle = await (window as any).showDirectoryPicker();
      const playlistDirHandle = await dirHandle.getDirectoryHandle(slug, { create: true });
      const fileHandle = await playlistDirHandle.getFileHandle('info.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonStr);
      await writable.close();

      notify(`✓ Created public/songs/${slug}/info.json directly! Run npm run catalog`);
      setIsCurationModalOpen(false);
      setSelectedTrackIds(new Set());
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        notify('Save error: ' + (err.message || 'unknown'));
      }
    }
  };

  return (
    <div className="collection-view">
      {/* ── Admin Curation Banner (Visible only when unlocked via passcode) ── */}
      {isAdmin && (
        <div className="collection-view__admin-banner" role="region" aria-label="Admin curation active">
          <div className="collection-view__admin-badge-wrap">
            <span className="collection-view__admin-dot" aria-hidden="true" />
            <span className="collection-view__admin-tag">ADMIN CURATION MODE ACTIVE</span>
          </div>
          <p className="collection-view__admin-hint">
            Select tracks from the collection below to curate a new referenced playlist with zero duplicate files.
          </p>
          <div className="collection-view__admin-actions">
            <button
              type="button"
              className="collection-view__admin-btn"
              onClick={() => {
                if (selectedTrackIds.size === filteredTracks.length) {
                  setSelectedTrackIds(new Set());
                } else {
                  setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)));
                }
              }}
            >
              {selectedTrackIds.size === filteredTracks.length ? 'DESELECT ALL' : 'SELECT ALL'}
            </button>
            <button
              type="button"
              className="collection-view__admin-btn collection-view__admin-btn--danger"
              onClick={() => {
                lockAdmin();
                notify('Admin rights locked');
              }}
            >
              LOCK ADMIN
            </button>
          </div>
        </div>
      )}

      <div className="collection-view__header">
        <p className="collection-view__badge">ARCHIVE // 収録曲</p>
        <h1 className="collection-view__title">the frequency archive</h1>
        <p className="collection-view__desc">
          every song, tape, and late night transmission preserved in the library.
        </p>
      </div>

      <div className="collection-view__controls">
        <div className="collection-view__controls-row">
          <div className="collection-view__search-wrapper">
            <input
              type="text"
              className="collection-view__search-input"
              placeholder="filter frequencies by name, artist, album…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter library"
            />
          </div>

          <button
            className="collection-view__shuffle-btn"
            onClick={handleShuffleAll}
            aria-label="Shuffle all matching tracks"
          >
            <ShuffleIcon size={16} />
            <span>shuffle archive</span>
          </button>
        </div>

        {/* Mood & Pool filter pills */}
        <div className="collection-view__moods" role="toolbar" aria-label="Mood filters">
          <button
            className={`collection-view__mood-pill${activeMood === null ? ' collection-view__mood-pill--active' : ''
              }`}
            onClick={() => setActiveMood(null)}
          >
            ALL FREQUENCIES ({allTracks.length})
          </button>
          {hasStandalone && (
            <button
              className={`collection-view__mood-pill${activeMood === 'SINGLES / POOL' ? ' collection-view__mood-pill--active' : ''
                }`}
              onClick={() => setActiveMood((prev) => (prev === 'SINGLES / POOL' ? null : 'SINGLES / POOL'))}
            >
              SINGLES / POOL
            </button>
          )}
          {moods.map((mood) => (
            <button
              key={mood}
              className={`collection-view__mood-pill${activeMood === mood ? ' collection-view__mood-pill--active' : ''
                }`}
              onClick={() => setActiveMood((prev) => (prev === mood ? null : mood))}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      {/* Track List Table */}
      {filteredTracks.length === 0 ? (
        <p className="collection-view__empty">
          no frequencies match your search filters.
        </p>
      ) : (
        <div className="collection-view__table" role="table" aria-label="Tracks">
          <div className="collection-view__list-header" role="row">
            {isAdmin && <span role="columnheader" style={{ width: 36, textAlign: 'center' }}>SEL</span>}
            <span role="columnheader">#</span>
            <span role="columnheader">ART</span>
            <span role="columnheader">TITLE</span>
            <span role="columnheader">ARTIST</span>
            <span role="columnheader">ALBUM</span>
            <span role="columnheader" style={{ textAlign: 'right' }}>TIME</span>
            <span role="columnheader" style={{ textAlign: 'center' }}>ADD</span>
          </div>

          {filteredTracks.map((track, idx) => {
            const isPlayingThis = engine.currentTrack?.id === track.id;
            const isSelected = selectedTrackIds.has(track.id);

            return (
              <div
                key={track.id}
                className={`collection-view__track-row${isPlayingThis ? ' collection-view__track-row--playing' : ''
                  }${isSelected ? ' collection-view__track-row--selected' : ''}`}
                onClick={() => {
                  if (isAdmin) {
                    toggleTrackSelection(track.id);
                  } else {
                    handleTrackClick(track);
                  }
                }}
                role="row"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isAdmin) {
                      toggleTrackSelection(track.id);
                    } else {
                      handleTrackClick(track);
                    }
                  }
                }}
              >
                {/* Admin Multi-select Checkbox */}
                {isAdmin && (
                  <div
                    className="collection-view__cell-check"
                    onClick={(e) => toggleTrackSelection(track.id, e)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => { }}
                      className="collection-view__checkbox"
                      aria-label={`Select ${track.title} for playlist`}
                    />
                  </div>
                )}

                <span className="collection-view__cell-num tabular-nums">
                  {isPlayingThis && engine.isPlaying ? '▶' : String(idx + 1).padStart(2, '0')}
                </span>

                <div className="collection-view__cell-art">
                  {track.artworkUrl ? (
                    <img
                      src={track.artworkUrl}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--lavender)',
                        opacity: 0.65,
                      }}
                    >
                      ☾
                    </div>
                  )}
                </div>

                {/* Desktop: separate cells. Mobile: stacked */}
                <div className="collection-view__cell-title">
                  <div className="collection-view__compact-info">
                    <span>{track.title}</span>
                    <span className="collection-view__cell-artist" style={{ opacity: 0.75 }}>
                      {track.artist}
                    </span>
                  </div>
                </div>

                <span className="collection-view__cell-artist">{track.artist}</span>
                <span className="collection-view__cell-album">
                  {track.album ? (
                    track.album
                  ) : (
                    <span style={{ opacity: 0.45, fontStyle: 'italic' }}>—</span>
                  )}
                </span>
                <span className="collection-view__cell-duration tabular-nums">
                  {track.duration ? formatTime(track.duration) : '--:--'}
                </span>

                <div className="collection-view__cell-add">
                  <button
                    className="collection-view__add-btn"
                    onClick={(e) => handleEnqueue(e, track)}
                    aria-label={`Enqueue ${track.title}`}
                    title="Add to queue"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Floating Curation Action Bar (Appears when tracks are selected in Admin mode) ── */}
      {isAdmin && selectedTrackIds.size > 0 && (
        <aside className="collection-view__curate-bar" aria-label="Curate Playlist Action Bar">
          <div className="collection-view__curate-count">
            <span className="collection-view__curate-sparkle">✦</span>
            <span>{selectedTrackIds.size} tracks selected</span>
          </div>
          <button
            type="button"
            className="collection-view__curate-clear"
            onClick={() => setSelectedTrackIds(new Set())}
          >
            Clear
          </button>
          <button
            type="button"
            className="collection-view__curate-submit"
            onClick={() => setIsCurationModalOpen(true)}
          >
            Curate Playlist →
          </button>
        </aside>
      )}

      {/* ── Playlist Curation Modal Studio ── */}
      {isCurationModalOpen && (
        <div
          className="collection-view__modal-scrim"
          onClick={() => setIsCurationModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Playlist Curation Studio"
        >
          <div
            className="collection-view__modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="collection-view__modal-header">
              <div>
                <span className="collection-view__modal-badge">STUDIO // プレイリストキュレーション</span>
                <h2 className="collection-view__modal-title">Curate New Playlist</h2>
              </div>
              <button
                type="button"
                className="collection-view__modal-close"
                onClick={() => setIsCurationModalOpen(false)}
                aria-label="Close studio"
              >
                ✕
              </button>
            </div>

            <div className="collection-view__modal-body">
              {/* Metadata Inputs */}
              <div className="collection-view__form-grid">
                <div className="collection-view__field">
                  <label htmlFor="pl-title">PLAYLIST TITLE *</label>
                  <input
                    id="pl-title"
                    type="text"
                    value={playlistTitle}
                    onChange={(e) => setPlaylistTitle(e.target.value)}
                    placeholder="e.g. Midnight City Frequencies"
                  />
                </div>

                <div className="collection-view__field">
                  <label htmlFor="pl-subtitle">JAPANESE / SUBTITLE</label>
                  <input
                    id="pl-subtitle"
                    type="text"
                    value={playlistSubtitle}
                    onChange={(e) => setPlaylistSubtitle(e.target.value)}
                    placeholder="e.g. 深夜の周波数"
                  />
                </div>

                <div className="collection-view__field collection-view__field--full">
                  <label htmlFor="pl-desc">DESCRIPTION</label>
                  <input
                    id="pl-desc"
                    type="text"
                    value={playlistDesc}
                    onChange={(e) => setPlaylistDesc(e.target.value)}
                    placeholder="e.g. Curated selection of late night tracks."
                  />
                </div>

                <div className="collection-view__field">
                  <label htmlFor="pl-moods">MOODS (comma-separated)</label>
                  <input
                    id="pl-moods"
                    type="text"
                    value={playlistMoods}
                    onChange={(e) => setPlaylistMoods(e.target.value)}
                    placeholder="chill, nocturnal, 3am"
                  />
                </div>

                <div className="collection-view__field">
                  <label htmlFor="pl-order">ORDER #</label>
                  <input
                    id="pl-order"
                    type="number"
                    value={playlistOrder}
                    onChange={(e) => setPlaylistOrder(e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>

              {/* Reorderable Tracks List */}
              <div className="collection-view__reorder-section">
                <div className="collection-view__reorder-header">
                  <span className="collection-view__reorder-title">
                    TRACKS IN PLAYLIST ({curatedTracks.length})
                  </span>
                  <span className="collection-view__reorder-hint">
                    reorder using ▲ / ▼ or remove with ✕
                  </span>
                </div>

                <ul className="collection-view__reorder-list">
                  {curatedTracks.map((t, idx) => (
                    <li key={t.id} className="collection-view__reorder-item">
                      <span className="collection-view__reorder-idx">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="collection-view__reorder-thumb">
                        {t.artworkUrl ? (
                          <img src={t.artworkUrl} alt="" />
                        ) : (
                          <span style={{ color: 'var(--lavender)' }}>☾</span>
                        )}
                      </div>
                      <div className="collection-view__reorder-info">
                        <span className="collection-view__reorder-track-title">{t.title}</span>
                        <span className="collection-view__reorder-track-artist">{t.artist}</span>
                      </div>
                      <span className="collection-view__reorder-dur">
                        {t.duration ? formatTime(t.duration) : '--:--'}
                      </span>
                      <div className="collection-view__reorder-btns">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveCuratedTrack(idx, idx - 1)}
                          title="Move up"
                          aria-label="Move track up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === curatedTracks.length - 1}
                          onClick={() => moveCuratedTrack(idx, idx + 1)}
                          title="Move down"
                          aria-label="Move track down"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          className="collection-view__reorder-remove"
                          onClick={() => removeCuratedTrack(t.id)}
                          title="Remove track"
                          aria-label="Remove track from playlist"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Zero Duplication Notice */}
              <div className="collection-view__zero-dup-note">
                <span className="collection-view__zero-dup-icon">💡</span>
                <p>
                  <strong>Zero duplicate files:</strong> This playlist holds references to the audio files in{' '}
                  <code>public/songs/songs-list/</code>. No audio files are duplicated on disk.
                </p>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="collection-view__modal-footer">
              <button
                type="button"
                className="collection-view__modal-action collection-view__modal-action--save"
                onClick={handleDirectSave}
                title="Save directly to public/songs/<slug>/info.json via File System Access API"
              >
                💾 Direct Save to public/songs
              </button>
              <button
                type="button"
                className="collection-view__modal-action"
                onClick={handleDownloadJson}
              >
                ⬇ Download info.json
              </button>
              <button
                type="button"
                className="collection-view__modal-action"
                onClick={handleCopyJson}
              >
                📋 Copy info.json
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
