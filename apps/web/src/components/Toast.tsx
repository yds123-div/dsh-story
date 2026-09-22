import { useEffect, useState } from 'react';
import './Toast.css';

interface ToastProps {
  message: string;
  onClose?: () => void;
}

function withSparkle(message: string): string {
  return message.startsWith('✦') ? message : `✦ ${message}`;
}

export function Toast({ message, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, 2400);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="toast">
      {withSparkle(message)}
    </div>
  );
}

// Toast hook for easy usage
let toastListeners: Array<(message: string) => void> = [];

export function showToast(message: string) {
  toastListeners.forEach(listener => listener(message));
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    toastListeners.push(setMessage);
    return () => {
      toastListeners = toastListeners.filter(l => l !== setMessage);
    };
  }, []);

  const closeToast = () => setMessage(null);

  return {
    toast: message,
    closeToast,
  };
}
