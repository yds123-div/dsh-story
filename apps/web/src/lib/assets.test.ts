import type { Asset } from '../types/api';
import { countAssetsByType, filterAssetsByType, assetPreviewUrl } from './assets';

const SAMPLE: Asset[] = [
  {
    id: 'proj-nming-muye-char-linwan',
    projectId: 'proj-nming-muye',
    type: 'character',
    name: '林晚',
    role: '主角',
    description: '',
    imageUrl: '/demo-assets/linwan.png',
    emoji: null,
    consistencyLocked: true,
    status: 'ready',
  },
  {
    id: 'proj-nming-muye-char-itachi',
    projectId: 'proj-nming-muye',
    type: 'character',
    name: '宇智波鼬',
    role: '主角',
    description: '',
    imageUrl: '/demo-assets/itachi.png',
    emoji: null,
    consistencyLocked: true,
    status: 'ready',
  },
  {
    id: 'proj-nming-muye-scene-corridor',
    projectId: 'proj-nming-muye',
    type: 'scene',
    name: '木叶长廊',
    role: '场景',
    description: '',
    imageUrl: '/demo-assets/corridor.jpg',
    emoji: null,
    consistencyLocked: true,
    status: 'ready',
  },
];

describe('filterAssetsByType', () => {
  it('keeps only characters when filtering by character', () => {
    const names = filterAssetsByType(SAMPLE, 'character').map((a) => a.name);
    expect(names).toEqual(['林晚', '宇智波鼬']);
  });

  it('keeps the corridor scene when filtering by scene', () => {
    const names = filterAssetsByType(SAMPLE, 'scene').map((a) => a.name);
    expect(names).toEqual(['木叶长廊']);
  });

  it('returns no props for the 逆命木叶 seed set', () => {
    expect(filterAssetsByType(SAMPLE, 'prop')).toEqual([]);
  });
});

describe('countAssetsByType', () => {
  it('counts 2 characters, 1 scene, 0 props', () => {
    expect(countAssetsByType(SAMPLE)).toEqual({
      character: 2,
      scene: 1,
      prop: 0,
      material: 0,
    });
  });
});

describe('assetPreviewUrl', () => {
  it('returns the generated imageUrl when present', () => {
    expect(assetPreviewUrl(SAMPLE[0]!)).toBe('/demo-assets/linwan.png');
  });

  it('falls back to demo thumbs for 林晚 / 鼬 / 长廊 before generation', () => {
    const pending = { ...SAMPLE[0]!, imageUrl: null };
    expect(assetPreviewUrl(pending)).toBe('/demo-assets/linwan.png');
    expect(assetPreviewUrl({ ...SAMPLE[2]!, imageUrl: null })).toBe('/demo-assets/corridor.jpg');
  });
});
