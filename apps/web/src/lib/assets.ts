import type { Asset, AssetType } from '../types/api';

export type AssetFilter = AssetType | 'all';

export function filterAssetsByType(assets: Asset[], filter: AssetFilter): Asset[] {
  if (filter === 'all') return assets;
  return assets.filter((asset) => asset.type === filter);
}

export function assetPreviewUrl(asset: Asset): string | null {
  if (asset.imageUrl) return asset.imageUrl;
  const base = `${import.meta.env.BASE_URL}demo-assets`;
  if (asset.id.endsWith('-char-linwan')) return `${base}/linwan.png`;
  if (asset.id.endsWith('-char-itachi')) return `${base}/itachi.png`;
  if (asset.id.endsWith('-scene-corridor')) return `${base}/corridor.jpg`;
  return null;
}

export function countAssetsByType(assets: Asset[]): Record<AssetType, number> {
  return {
    character: assets.filter((a) => a.type === 'character').length,
    scene: assets.filter((a) => a.type === 'scene').length,
    prop: assets.filter((a) => a.type === 'prop').length,
    material: assets.filter((a) => a.type === 'material').length,
  };
}
