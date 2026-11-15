import './CDDisc.css';

interface CDDiscProps {
  isPlaying?: boolean;
  size?: number;
  className?: string;
}

export default function CDDisc({ isPlaying = false, size = 120, className }: CDDiscProps) {
  const stateClass = isPlaying ? 'cd-disc--spinning' : 'cd-disc--paused';

  return (
    <div
      className={`cd-disc ${stateClass}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
