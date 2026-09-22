import { useCallback, useEffect, useRef, useState } from 'react';
import { getTask } from '../lib/api';
import type { TaskStatus } from '../types/api';

const TERMINAL = new Set(['succeeded', 'failed']);

export type UseTaskOptions = {
  intervalMs?: number;
  onSucceeded?: (task: TaskStatus) => void;
  onFailed?: (task: TaskStatus) => void;
};

export function useTask(taskId: string | null, options: UseTaskOptions = {}) {
  const [task, setTask] = useState<TaskStatus | null>(null);
  const stoppedRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stop = useCallback(() => {
    stoppedRef.current = true;
  }, []);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }

    stoppedRef.current = false;
    const intervalMs = optionsRef.current.intervalMs ?? 2500;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const next = await getTask(taskId);
        if (stoppedRef.current) return;
        setTask(next);
        if (TERMINAL.has(next.status)) {
          stoppedRef.current = true;
          if (next.status === 'succeeded') optionsRef.current.onSucceeded?.(next);
          if (next.status === 'failed') optionsRef.current.onFailed?.(next);
          return;
        }
      } catch {
        if (stoppedRef.current) return;
      }
      if (!stoppedRef.current) {
        timer = setTimeout(() => void poll(), intervalMs);
      }
    };

    void poll();

    return () => {
      stoppedRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [taskId]);

  return { task, stop };
}
