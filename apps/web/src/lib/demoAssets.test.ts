import { describe, expect, it } from 'vitest';
import { demoAssetUrl } from './demoAssets';

describe('demoAssetUrl', () => {
  it('prefixes bare filenames with /demo-assets/', () => {
    expect(demoAssetUrl('linwan.png')).toBe('/demo-assets/linwan.png');
    expect(demoAssetUrl('corridor.jpg')).toBe('/demo-assets/corridor.jpg');
    expect(demoAssetUrl('clip1.mp4')).toBe('/demo-assets/clip1.mp4');
  });

  it('leaves rooted and remote URLs unchanged', () => {
    expect(demoAssetUrl('/demo-assets/itachi.png')).toBe('/demo-assets/itachi.png');
    expect(demoAssetUrl('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
  });

  it('passes through empty values', () => {
    expect(demoAssetUrl(undefined)).toBeUndefined();
    expect(demoAssetUrl('')).toBe('');
  });
});
