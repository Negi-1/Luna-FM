import './GlowSurface.css';

interface GlowSurfaceProps {
  breathe?: boolean;
}

export function GlowSurface({ breathe = true }: GlowSurfaceProps) {
  return (
    <div
      className={`glow-surface${breathe ? ' glow-surface--breathe' : ''}`}
      aria-hidden="true"
    />
  );
}

