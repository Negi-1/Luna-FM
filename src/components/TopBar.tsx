import type { ViewName } from '../types';
import { SearchIcon, MenuIcon } from './Icons';
import './TopBar.css';

interface TopBarProps {
  onSearchOpen: () => void;
  onDrawerOpen: () => void;
  view?: ViewName;
  onViewChange?: (v: ViewName) => void;
  isPlaying: boolean;
  onWelcomeOpen?: () => void;
}

export function TopBar({
  onSearchOpen,
  onDrawerOpen,
  view,
  onViewChange,
  isPlaying,
  onWelcomeOpen,
}: TopBarProps) {
  const handleBrandClick = () => {
    if (onViewChange) {
      onViewChange('discover');
    }
  };

  return (
    <header className="topbar" role="banner">
      <div className="topbar__left">
        <button
          className="topbar__brand"
          onClick={handleBrandClick}
          aria-label="LUNA.FM Home"
        >
          ☾⋆⁺₊ LUNA.FM ⁺₊
        </button>
      </div>

      <div className="topbar__right">
        {/* div.topbar__on-air is always present and visible; illuminated when playing, dimmed when idle */}
        <div
          className={`topbar__on-air ${isPlaying ? 'topbar__on-air--active' : 'topbar__on-air--idle'}`}
          aria-label={isPlaying ? 'Currently broadcasting on air' : 'Broadcasting idle'}
        >
          <span className="topbar__on-air-dot" aria-hidden="true" />
          <span>ON AIR</span>
        </div>

        <button
          className="topbar__icon-btn"
          onClick={onSearchOpen}
          aria-label="Search archive (/)"
          title="Search (/)"
        >
          <SearchIcon size={18} />
        </button>

        <button
          className="topbar__icon-btn"
          onClick={onDrawerOpen}
          aria-label="Menu"
          title="Menu"
        >
          <MenuIcon size={20} />
        </button>
      </div>
    </header>
  );
}

