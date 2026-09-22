import type { Template } from '../types/api';
import { filterTemplatesByTag } from './templates';

const SAMPLE: Template[] = [
  {
    id: 'tpl-star-beyond',
    name: '星环之外',
    subtitle: '自由画布 · 9:16',
    tags: ['科幻', '废土'],
    coverUrl: '/demo-assets/corridor.jpg',
    coverFilter: 'hue-rotate(200deg) saturate(1.5) brightness(.9)',
    scriptText: '星环之外剧本',
    style: '赛博朋克电影',
    aspectRatio: '9:16',
  },
  {
    id: 'tpl-awakening',
    name: '真千金觉醒',
    subtitle: '原创短剧 · 8集',
    tags: ['复仇', '爽文'],
    coverUrl: '/demo-assets/linwan.png',
    coverFilter: 'saturate(1.5) brightness(1.05)',
    scriptText: '真千金觉醒剧本',
    style: '国漫写实',
    aspectRatio: '9:16',
  },
];

describe('filterTemplatesByTag', () => {
  it('keeps 科幻 official examples when filtering by 科幻', () => {
    expect(filterTemplatesByTag(SAMPLE, '科幻').map((t) => t.name)).toEqual(['星环之外']);
  });

  it('returns the full official list for all', () => {
    expect(filterTemplatesByTag(SAMPLE, 'all').map((t) => t.name)).toEqual(['星环之外', '真千金觉醒']);
  });
});
