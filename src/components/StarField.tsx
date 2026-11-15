import './StarField.css';

const GLYPHS = ['✦', '·', '☽', '✧', '⋆', '⁺'] as const;
const COLOR_CLASSES = ['star-field__star--pink', 'star-field__star--off-white', 'star-field__star--lavender'] as const;
const STAR_COUNT = 26;

interface StarFieldProps {
  className?: string;
}

export default function StarField({ className }: StarFieldProps) {
  const stars = Array.from({ length: STAR_COUNT }, (_, i) => {
    const top = ((i * 37 + 11) % 92) + 4 + '%';
    const left = ((i * 53 + 7) % 94) + 3 + '%';
    const glyph = GLYPHS[i % GLYPHS.length];
    const colorClass = COLOR_CLASSES[i % COLOR_CLASSES.length];
    const delay = 3 + (i % 5) * 1 + 's';

    return (
      <span
        key={i}
        className={`star-field__star ${colorClass}`}
        style={{ top, left, animationDelay: delay }}
        aria-hidden="true"
      >
        {glyph}
      </span>
    );
  });

  return (
    <div className={`star-field${className ? ` ${className}` : ''}`} aria-hidden="true">
      {stars}
    </div>
  );
}
