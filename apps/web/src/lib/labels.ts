import type { ProjectMode } from '@dsh-story/contracts';

export function modeLabel(mode: ProjectMode): string {
  return mode === 'script' ? '剧本模式' : '小说模式';
}
