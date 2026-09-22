import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkflowStep } from '../types/api';

type WorkflowStore = {
  unlockedByProject: Record<string, WorkflowStep>;
  setUnlocked: (projectId: string, step: WorkflowStep) => void;
};

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set) => ({
      unlockedByProject: {},
      setUnlocked: (projectId, step) =>
        set((state) => ({
          unlockedByProject: {
            ...state.unlockedByProject,
            [projectId]: step,
          },
        })),
    }),
    { name: 'deepsfv-workflow' },
  ),
);
