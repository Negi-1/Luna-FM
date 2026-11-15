import React from 'react';
import type { Track } from '../types';
import { CrossfadeImage } from './CrossfadeImage';
import CDDisc from './CDDisc';
import { AudioReactiveVisualizer } from './AudioReactiveVisualizer';
import './ArtworkVisualizer.css';

export interface ArtworkVisualizerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  presentation?: 'main' | 'compact';
  artworkFrameRef?: React.Ref<HTMLDivElement>;
  className?: string;
  alt?: string;
}

export function ArtworkVisualizer({
  currentTrack,
  isPlaying,
  presentation = 'main',
  artworkFrameRef,
  className = '',
  alt,
}: ArtworkVisualizerProps) {
  const isMain = presentation === 'main';

  const defaultAlt = currentTrack
    ? `${currentTrack.title} by ${currentTrack.artist}`
    : 'LUNA.FM artwork';

  const altText = alt || defaultAlt;

  return (
    <div
      className={`artwork-visualizer artwork-visualizer--${presentation} ${
        isMain ? 'player-home__artwork-wrapper' : ''
      } ${className}`.trim()}
    >
      {/* Layer 0: AudioReactiveVisualizer Canvas (z-index: 0, pointer-events: none) */}
      <AudioReactiveVisualizer
        isPlaying={isPlaying}
        presentation={presentation}
        className="artwork-visualizer__canvas"
      />

      {/* Layer 1: Optional CDDisc behind artwork (main presentation only, z-index: 1) */}
      {isMain && (
        <div className="artwork-visualizer__cd player-home__cd">
          <CDDisc isPlaying={isPlaying} size={320} />
        </div>
      )}

      {/* Layer 2: Artwork Frame with CrossfadeImage (z-index: 2) */}
      <div
        ref={artworkFrameRef}
        className={`artwork-visualizer__frame ${
          isMain ? 'player-home__artwork-frame' : 'queue-sheet__min-artwork-frame'
        }`}
      >
        <CrossfadeImage
          src={currentTrack?.artworkUrl ?? null}
          alt={altText}
        />
      </div>
    </div>
  );
}

export default ArtworkVisualizer;
