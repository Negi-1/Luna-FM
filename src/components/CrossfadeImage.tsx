import { useState, useEffect, useRef } from 'react';
import './CrossfadeImage.css';

interface CrossfadeImageProps {
  src: string | null;
  alt: string;
  className?: string;
  size?: number;
}

export function CrossfadeImage({ src, alt, className, size }: CrossfadeImageProps) {
  const [current, setCurrent] = useState<string | null>(src);
  const [previous, setPrevious] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (src === current) return;

    setFailed(false);
    setPrevious(current);
    setCurrent(src);

    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      setPrevious(null);
    }, 420);

    return () => clearTimeout(exitTimer.current);
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  const sizeStyle = size ? { width: size, height: size } : undefined;

  return (
    <div
      className={`crossfade-image${className ? ` ${className}` : ''}`}
      style={sizeStyle}
    >
      {/* Exiting layer */}
      {previous && (
        <img
          className="crossfade-image__layer crossfade-image__layer--exiting"
          src={previous}
          alt=""
          aria-hidden="true"
        />
      )}

      {/* Entering / current layer */}
      {current && !failed ? (
        <img
          className={`crossfade-image__layer${previous ? ' crossfade-image__layer--entering' : ''}`}
          src={current}
          alt={alt}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="crossfade-image__fallback" aria-label={alt}>
          ☾
        </div>
      )}
    </div>
  );
}

export default CrossfadeImage;
