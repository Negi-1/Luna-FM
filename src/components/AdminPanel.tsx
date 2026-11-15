import { useState, useCallback } from 'react';
import type { Album } from '../types';
import './AdminPanel.css';

interface AdminPanelProps {
  albums: Album[];
  onNotify: (msg: string) => void;
}

const TEMPLATE_JSON = `{
  "title": "Your Album Title",
  "description": "one sentence about the vibe.",
  "artist": "various",
  "subtitle": "日本語ラベル",
  "mood": ["chill", "3am"],
  "order": 50,
  "tracks": [
    {
      "file": "01-first-track.mp3",
      "title": "First Track",
      "artist": "Artist Name",
      "duration": 184,
      "cover": "01-first-track.jpg"
    },
    {
      "file": "02-second-track.mp3",
      "title": "Second Track",
      "artist": "Artist Name",
      "duration": 210
    }
  ]
}`;

const FOLDER_TREE = `public/songs/your-album-slug/
├── info.json                           (album metadata)
├── cover.jpg                           (album-level artwork)
├── 01-first-track.mp3                  (audio file)
├── 01-first-track.jpg (or .png/.svg)   (optional track-level artwork)
└── 02-second-track.mp3                 (inherits album cover if no track cover)`;

export function AdminPanel({ albums, onNotify }: AdminPanelProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedSection(label);
        onNotify(`copied ${label} to clipboard`);
        setTimeout(() => setCopiedSection(null), 2000);
      });
    },
    [onNotify],
  );

  return (
    <div className="admin-panel" role="region" aria-label="Catalog authoring helper">
      <p className="admin-panel__badge">SYSTEM // ?ADMIN</p>
      <h1 className="admin-panel__title">catalog authoring helper</h1>
      <p className="admin-panel__subtitle">
        read-only viewer for the local library. this panel never writes to disk.
      </p>

      {/* ── Section 1: Current Catalog ──────────────────────── */}
      <section className="admin-panel__section">
        <div className="admin-panel__section-header">
          <h2 className="admin-panel__section-title">01 // YOUR CATALOG TODAY</h2>
          <span>{albums.length} ALBUMS</span>
        </div>

        {albums.length === 0 ? (
          <p style={{ padding: '16px 0', color: 'var(--text-muted)' }}>
            no albums discovered yet. check public/songs/ and run npm run catalog.
          </p>
        ) : (
          <table className="admin-panel__table">
            <thead>
              <tr>
                <th>SLUG</th>
                <th>TITLE</th>
                <th>TRACKS</th>
                <th>MOODS</th>
              </tr>
            </thead>
            <tbody>
              {albums.map((album) => (
                <tr key={album.id}>
                  <td>{album.id}</td>
                  <td>{album.title}</td>
                  <td>{album.tracks.length}</td>
                  <td>{album.mood.length > 0 ? album.mood.join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Section 2: info.json Template ───────────────────── */}
      <section className="admin-panel__section">
        <div className="admin-panel__section-header">
          <h2 className="admin-panel__section-title">02 // INFO.JSON TEMPLATE</h2>
          <button
            className="admin-panel__copy-btn"
            onClick={() => copyToClipboard(TEMPLATE_JSON, 'info.json')}
          >
            {copiedSection === 'info.json' ? 'COPIED ✓' : 'COPY JSON'}
          </button>
        </div>
        <pre className="admin-panel__code-block">{TEMPLATE_JSON}</pre>
      </section>

      {/* ── Section 3: Folder Structure ─────────────────────── */}
      <section className="admin-panel__section">
        <div className="admin-panel__section-header">
          <h2 className="admin-panel__section-title">03 // FOLDER LAYOUT</h2>
          <button
            className="admin-panel__copy-btn"
            onClick={() => copyToClipboard(FOLDER_TREE, 'folder layout')}
          >
            {copiedSection === 'folder layout' ? 'COPIED ✓' : 'COPY TREE'}
          </button>
        </div>
        <pre className="admin-panel__code-block">{FOLDER_TREE}</pre>
      </section>

      {/* ── Section 4: Deploy Checklist ─────────────────────── */}
      <section className="admin-panel__section">
        <div className="admin-panel__section-header">
          <h2 className="admin-panel__section-title">04 // DEPLOY CHECKLIST</h2>
        </div>
        <ol className="admin-panel__list">
          <li>Drop your album folder into <code>public/songs/&lt;album-slug&gt;/</code>.</li>
          <li>Add <code>info.json</code> + <code>cover.jpg</code> + audio files.</li>
          <li>Run <code>npm run catalog</code> to regenerate <code>public/music-catalog.json</code>.</li>
          <li>Run <code>npm run build</code> and <code>npm run preview</code> to test.</li>
          <li>Commit with <code>git add public/songs/&lt;album-slug&gt; &amp;&amp; git commit -m &quot;add: &lt;album-slug&gt;&quot;</code>.</li>
          <li>Push to your remote. Host rebuilds automatically.</li>
        </ol>
      </section>
    </div>
  );
}

