import React, { useState, useCallback } from 'react';
import { useTheme } from '../themes/ThemeContext';
import { THEMES } from '../themes/definitions';
import type { ThemeId, ThemeDefinition } from '../themes/types';
import { usePlayer } from '../context/PlayerContext';
import './SettingsView.css';

export interface SettingsViewProps {
  onNavigateHome?: () => void;
  onNotify?: (message: string) => void;
}

export type SettingsCategory = 'appearance' | 'audio' | 'system';

interface CategoryTab {
  id: SettingsCategory;
  num: string;
  label: string;
  subtitle: string;
}

const CATEGORIES: CategoryTab[] = [
  { id: 'appearance', num: '01', label: 'Appearance', subtitle: 'Atmospheric Themes & Visual Identity' },
  { id: 'audio', num: '02', label: 'Audio', subtitle: 'Dual-Engine Crossfade & Telemetry' },
  { id: 'system', num: '03', label: 'System', subtitle: 'Archive Version & Storage Diagnostics' },
];

export function SettingsView({ onNavigateHome, onNotify }: SettingsViewProps) {
  const { theme, setTheme, availableThemes } = useTheme();
  const { engine } = usePlayer();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');

  // Theme selection handler: clean no-op if theme is already active
  const handleSelectTheme = useCallback(
    (themeId: ThemeId, themeName: string) => {
      if (theme === themeId) {
        return;
      }
      setTheme(themeId);
      if (onNotify) {
        onNotify(`☾⋆⁺₊ frequency tuned: ${themeName.toUpperCase()}`);
      }
    },
    [theme, setTheme, onNotify],
  );

  const handleResetTheme = useCallback(() => {
    if (theme === 'nocturne') {
      if (onNotify) {
        onNotify('☾ theme already set to Nocturne (Default)');
      }
      return;
    }
    setTheme('nocturne');
    if (onNotify) {
      onNotify('☾ theme reset to Nocturne (Default)');
    }
  }, [theme, setTheme, onNotify]);

  const handleResetWelcome = useCallback(() => {
    try {
      sessionStorage.removeItem('luna-fm-welcomed-v3');
      sessionStorage.removeItem('luna-fm-welcomed-v2');
      sessionStorage.removeItem('luna-fm-welcomed');
      if (onNotify) {
        onNotify('☾ intro overlay reset: click logo or reload to replay');
      }
    } catch {
      /* ignore */
    }
  }, [onNotify]);

  return (
    <div className="view-container settings-view" role="region" aria-label="LUNA.FM Settings">
      <div className="settings-view__container">
        {/* Header */}
        <header className="settings-view__header">
          <div className="settings-view__header-tag">
            <span lang="ja" className="settings-view__header-ja">設定</span>
            <span className="settings-view__header-sep">//</span>
            <span className="settings-view__header-sys">SETTINGS & CONFIGURATION · CH.05</span>
          </div>
          <div className="settings-view__title-row">
            <h1 className="settings-view__title">Atmospheric Frequency & Preferences</h1>
            {onNavigateHome && (
              <button
                type="button"
                className="settings-view__home-btn"
                onClick={onNavigateHome}
                aria-label="Return to player"
              >
                ← PLAYER HOME
              </button>
            )}
          </div>
          <p className="settings-view__subtitle">
            Configure visual atmosphere, audio crossfade diagnostics, and client-side system telemetry.
          </p>
        </header>

        {/* Sidebar Navigation + Content Grid Layout */}
        <div className="settings-view__layout">
          {/* Sidebar Category Tabs */}
          <nav className="settings-view__nav" aria-label="Settings Categories">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`settings-view__nav-btn ${isActive ? 'settings-view__nav-btn--active' : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="settings-view__nav-num">{cat.num}</span>
                  <span className="settings-view__nav-label">{cat.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Main Stage Content */}
          <main className="settings-view__stage">
            {/* ── Category 1: Appearance ───────────────────────────── */}
            {activeCategory === 'appearance' && (
              <section className="settings-section" aria-labelledby="heading-appearance">
                <div className="settings-section__intro">
                  <span className="settings-section__eyebrow">VISUAL FREQUENCY & ATMOSPHERIC THEMES</span>
                  <h2 id="heading-appearance" className="settings-section__heading">Appearance // Curated Theme Library</h2>
                  <p className="settings-section__desc">
                    Select from 6 curated visual themes. Each theme transforms design tokens, environmental
                    lighting, typography, and atmospheric visual effects without interrupting your active audio playback.
                  </p>
                </div>

                {/* 6-Card Interactive Theme Grid */}
                <div
                  className="settings-view__theme-grid theme-grid"
                  role="radiogroup"
                  aria-label="Visual Themes"
                >
                  {availableThemes.map((t: ThemeDefinition, index: number) => {
                    const isSelected = theme === t.id;
                    const indexStr = String(index + 1).padStart(2, '0');

                    return (
                      <div
                        key={t.id}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        className={`theme-card ${isSelected ? 'theme-card--selected theme-card--active' : ''}`}
                        onClick={() => handleSelectTheme(t.id, t.name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectTheme(t.id, t.name);
                          }
                        }}
                      >
                        {/* Header: Index + Name + Badges */}
                        <div className="theme-card__header">
                          <div className="theme-card__title-wrap">
                            <span className="theme-card__index">{indexStr}</span>
                            <span className="theme-card__name">{t.name.toUpperCase()}</span>
                          </div>
                          <div className="theme-card__badges">
                            {t.isDefault && (
                              <span className="theme-card__badge theme-card__badge--default">DEFAULT</span>
                            )}
                            {isSelected && (
                              <span className="theme-card__badge theme-card__badge--active">
                                <span className="theme-card__pulse-dot" aria-hidden="true" />
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Japanese Subtitle */}
                        <div className="theme-card__subtitle">{t.subtitle}</div>

                        {/* Miniature Visual Preview Box */}
                        <div
                          className="theme-card__preview"
                          style={{
                            backgroundColor: t.colors.surfaceBase,
                            borderColor: isSelected ? t.colors.accentPrimary : t.colors.borderSubtle,
                          }}
                        >
                          {/* Ambient Atmospheric Glow */}
                          <div
                            className="theme-card__preview-glow"
                            style={{
                              background: `radial-gradient(circle, ${t.colors.glowA} 0%, ${t.colors.glowB} 40%, transparent 70%)`,
                            }}
                            aria-hidden="true"
                          />

                          {/* Mini Header Bar */}
                          <div
                            className="theme-card__preview-header"
                            style={{
                              backgroundColor: t.colors.surfaceElevated,
                              borderColor: t.colors.borderSubtle,
                            }}
                          >
                            <span
                              className="theme-card__preview-dot"
                              style={{ backgroundColor: t.colors.accentPrimary }}
                            />
                            <span
                              className="theme-card__preview-title"
                              style={{ color: t.colors.textSecondary }}
                            >
                              CH.{indexStr} // {t.name.toUpperCase()}
                            </span>
                          </div>

                          {/* Mini Track Bar */}
                          <div
                            className="theme-card__preview-trackbar"
                            style={{
                              backgroundColor: t.colors.surfaceGlass,
                              borderColor: t.colors.borderSubtle,
                            }}
                          >
                            <span
                              className="theme-card__preview-trackname"
                              style={{ color: t.colors.textPrimary }}
                            >
                              {t.name} Atmosphere
                            </span>
                            <div className="theme-card__preview-waves" aria-hidden="true">
                              <span style={{ height: '35%', backgroundColor: t.colors.accentSecondary }} />
                              <span style={{ height: '75%', backgroundColor: t.colors.accentPrimary }} />
                              <span style={{ height: '95%', backgroundColor: t.colors.accentPrimary }} />
                              <span style={{ height: '50%', backgroundColor: t.colors.accentSecondary }} />
                            </div>
                          </div>

                          {/* Accent Progress Line */}
                          <div
                            className="theme-card__preview-progress"
                            style={{ backgroundColor: t.colors.borderSubtle }}
                          >
                            <div
                              className="theme-card__preview-progress-fill"
                              style={{
                                width: '68%',
                                backgroundColor: t.colors.accentPrimary,
                                boxShadow: `0 0 6px ${t.colors.accentPrimary}`,
                              }}
                            />
                          </div>
                        </div>

                        {/* 4 Circular Color Swatches */}
                        <div className="theme-card__swatches" aria-label={`${t.name} color swatches`}>
                          <span
                            className="theme-card__swatch"
                            style={{ backgroundColor: t.colors.surfaceBase }}
                            title={`Surface Base: ${t.colors.surfaceBase}`}
                          />
                          <span
                            className="theme-card__swatch"
                            style={{ backgroundColor: t.colors.surfaceElevated }}
                            title={`Elevated Surface: ${t.colors.surfaceElevated}`}
                          />
                          <span
                            className="theme-card__swatch"
                            style={{ backgroundColor: t.colors.accentSecondary }}
                            title={`Secondary Accent: ${t.colors.accentSecondary}`}
                          />
                          <span
                            className="theme-card__swatch"
                            style={{ backgroundColor: t.colors.accentPrimary }}
                            title={`Primary Accent: ${t.colors.accentPrimary}`}
                          />
                        </div>

                        {/* Atmospheric Narrative Description */}
                        <p className="theme-card__desc">{t.description}</p>
                        <div className="theme-card__atmosphere">
                          <span className="theme-card__atmosphere-label">ATMOSPHERE:</span>{' '}
                          {t.atmosphereDescription}
                        </div>

                        {/* Action Selection Button */}
                        <div className="theme-card__action">
                          <button
                            type="button"
                            className={`theme-card__select-btn ${isSelected ? 'theme-card__select-btn--active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTheme(t.id, t.name);
                            }}
                          >
                            {isSelected ? '✓ FREQUENCY TUNED' : 'TUNE FREQUENCY →'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Category 2: Audio ─────────────────────────────────── */}
            {activeCategory === 'audio' && (
              <section className="settings-section" aria-labelledby="heading-audio">
                <div className="settings-section__intro">
                  <span className="settings-section__eyebrow">TRANSMISSION ENGINE & TELEMETRY</span>
                  <h2 id="heading-audio" className="settings-section__heading">Audio</h2>
                  <p className="settings-section__desc">
                    Live telemetry and engine diagnostics for dual HTMLAudioElement continuous playback,
                    crossfade interpolation, and buffer stability.
                  </p>
                </div>

                <div className="settings-card">
                  {/* Dual HTMLAudioElement crossfade status */}
                  <div className="settings-card__row">
                    <div>
                      <div className="settings-card__label">Dual HTMLAudioElement Engine</div>
                      <div className="settings-card__hint">
                        Active pipeline: Dual HTMLAudioElement tokens with WeakMap cancellation.
                      </div>
                    </div>
                    <span className="settings-card__status-pill">ONLINE · WEAKMAP TOKEN ISOLATION</span>
                  </div>

                  <div className="settings-card__divider" />

                  {/* Buffer Status */}
                  <div className="settings-card__row">
                    <div>
                      <div className="settings-card__label">Buffer Status</div>
                      <div className="settings-card__hint">
                        Network pipeline and audio stream buffer health.
                      </div>
                    </div>
                    <span className="settings-card__status-pill">
                      {engine.isBuffering ? 'BUFFERING / FILLING CACHE' : 'BUFFER HEALTHY / READY'}
                    </span>
                  </div>

                  <div className="settings-card__divider" />

                  {/* Volume Diagnostics */}
                  <div className="settings-card__row">
                    <div>
                      <div className="settings-card__label">Master Volume</div>
                      <div className="settings-card__hint">
                        Securely clamped [0, 1] gain scale.
                      </div>
                    </div>
                    <span className="settings-card__status-pill">
                      {Math.round(engine.volume * 100)}% {engine.isMuted ? '(MUTED)' : '(ACTIVE)'}
                    </span>
                  </div>

                  <div className="settings-card__divider" />

                  {/* Active Track Telemetry */}
                  <div className="settings-card__row">
                    <div>
                      <div className="settings-card__label">Active Broadcast Stream</div>
                      <div className="settings-card__hint">
                        {engine.currentTrack
                          ? `${engine.currentTrack.title} — ${engine.currentTrack.artist}`
                          : 'No track actively broadcasting'}
                      </div>
                    </div>
                    <span className="settings-card__status-pill">
                      {engine.isPlaying ? 'STREAMING (PLAYING)' : 'STANDBY (PAUSED)'}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* ── Category 3: System ────────────────────────────────── */}
            {activeCategory === 'system' && (
              <section className="settings-section" aria-labelledby="heading-system">
                <div className="settings-section__intro">
                  <span className="settings-section__eyebrow">DIAGNOSTICS & CLIENT STORAGE</span>
                  <h2 id="heading-system" className="settings-section__heading">System</h2>
                  <p className="settings-section__desc">
                    Archive versioning, local storage telemetry, and theme recovery tools.
                  </p>
                </div>

                <div className="settings-card">
                  {/* Archive Version 2.0.0 */}
                  <div className="settings-card__row">
                    <div>
                      <div className="settings-card__label">Archive Version</div>
                      <div className="settings-card__hint">
                        LUNA.FM v2.0.0 (Atmospheric Theme Engine Edition)
                      </div>
                    </div>
                    <span className="settings-card__status-pill">VERSION 2.0.0 // STABLE</span>
                  </div>

                  <div className="settings-card__divider" />

                  {/* Storage Telemetry */}
                  <div className="settings-card__row">
                    <div>
                      <div className="settings-card__label">Storage Telemetry</div>
                      <div className="settings-card__hint">
                        Active theme key: <code>localStorage['luna-fm-theme']</code>
                      </div>
                    </div>
                    <span className="settings-card__status-pill">
                      CURRENT VALUE: {theme.toUpperCase()}
                    </span>
                  </div>

                  <div className="settings-card__divider" />

                  {/* Reset Theme Button */}
                  <div className="settings-card__row">
                    <div>
                      <div className="settings-card__label">Theme Reset</div>
                      <div className="settings-card__hint">
                        Restore default Nocturne celestial theme without affecting playlist data.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="settings-action-btn"
                      onClick={handleResetTheme}
                    >
                      RESET TO NOCTURNE (DEFAULT)
                    </button>
                  </div>

                  <div className="settings-card__divider" />

                  {/* Reset Welcome Intro */}
                  <div className="settings-card__row">
                    <div>
                      <div className="settings-card__label">Intro Experience</div>
                      <div className="settings-card__hint">
                        Reset celestial intro overlay to replay on next visit.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="settings-action-btn"
                      onClick={handleResetWelcome}
                    >
                      RESET INTRO OVERLAY
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>

        {/* Footer with Verbatim Curator Signature & Telemetry */}
        <div className="settings-view__footer">
          <p className="settings-view__telemetry">
            SYSTEM CONFIGURATION // FREQ 88.7 MHZ
          </p>
          <p className="settings-view__signature">
            independently curated with ♡ by ☾⋆⁺₊ SUSS¥_PΛJI 𖤐.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsView;
