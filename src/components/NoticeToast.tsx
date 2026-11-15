import { useEffect } from 'react';
import './NoticeToast.css';

interface NoticeToastProps {
  message: string | null;
  onDismiss: () => void;
}

export default function NoticeToast({ message, onDismiss }: NoticeToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="notice-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
