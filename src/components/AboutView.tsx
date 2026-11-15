import StarField from './StarField';
import './AboutView.css';

interface AboutViewProps {
  onNavigateHome: () => void;
}

export function AboutView({ onNavigateHome }: AboutViewProps) {
  return (
    <div className="about-view">
      <StarField className="about-view__starfield" />

      <article className="about-view__content">
        <div className="about-view__badge">
          <span lang="ja">夜の周波数</span> // 88.7 MHZ
        </div>

        <h1 className="about-view__title">about luna.fm</h1>

        <div className="about-view__prose">
          <p>
            luna.fm is a personal music archive — a quiet corner of the internet
            where playlists live between late nights and early mornings. no
            algorithms, no recommendations, no social features. just music,
            curated by hand, played from the heart.
          </p>
          <p>
            built as a love letter to physical media, to the warmth of FM
            static, and to the feeling of discovering a song at 3am that
            changes everything.
          </p>
        </div>

        <button className="about-view__back-btn" onClick={onNavigateHome}>
          ← back to player
        </button>

        <div className="about-view__footer">
          <p className="about-view__telemetry">
            BROADCAST TELEMETRY // SIDE A · 33⅓ RPM
          </p>
          <p className="about-view__signature">
            independently curated with ♡ by ☾⋆⁺₊ SUSS¥_PΛJI 𖤐.
          </p>
        </div>
      </article>
    </div>
  );
}

