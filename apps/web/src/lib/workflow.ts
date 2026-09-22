import type { WorkflowStep } from '../types/api';

export type WorkflowPage = 'outline' | 'assets' | 'episodes' | 'studio';

export function workflowRedirect(
  projectId: string,
  unlockedStep: WorkflowStep,
  requested: WorkflowPage,
): string | null {
  if (requested === 'assets' && unlockedStep < 2) {
    return `/project/${projectId}/outline`;
  }
  if (requested === 'episodes' && unlockedStep < 2) {
    return `/project/${projectId}/outline`;
  }
  if (requested === 'episodes' && unlockedStep < 3) {
    return `/project/${projectId}/assets`;
  }
  if (requested === 'studio' && unlockedStep < 3) {
    return `/project/${projectId}/episodes`;
  }
  return null;
}
