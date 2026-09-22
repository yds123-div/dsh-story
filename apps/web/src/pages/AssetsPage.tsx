import { useEffect, useMemo, useState } from 'react';
import { App, Button, Image, Modal, Progress, Switch, Tag } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkflowHeader } from '../components/WorkflowHeader';
import { useTask } from '../hooks/useTask';
import { completeAssets, getOutline, getWorkflow, listAssets, patchAsset, submitAssetImageTask } from '../lib/api';
import { countAssetsByType, filterAssetsByType } from '../lib/assets';
import { useWorkflowStore } from '../stores/workflowStore';
import type { Asset, AssetType } from '../types/api';

function roleTagClass(role: string): string {
  if (role === '反派') return 'red';
  if (role === '男二' || role === '场景') return 'gray';
  return '';
}

function AssetCard({
  asset,
  onUpdated,
}: {
  asset: Asset;
  onUpdated: (next: Asset) => void;
}) {
  const { message } = App.useApp();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  const { task } = useTask(taskId, {
    intervalMs: 2500,
    onSucceeded: async () => {
      const { assets } = await listAssets(asset.projectId);
      const next = assets.find((item) => item.id === asset.id);
      if (next) onUpdated(next);
      setTaskId(null);
    },
    onFailed: (t) => message.error(t.error ?? '生图失败'),
  });

  const generating = task != null && task.status !== 'failed' && task.status !== 'succeeded';

  const onGenerate = async () => {
    try {
      const { taskId: id } = await submitAssetImageTask(asset.id);
      setTaskId(id);
    } catch {
      message.error('提交生图任务失败');
    }
  };

  const onLock = async (checked: boolean) => {
    setLocking(true);
    try {
      const next = await patchAsset(asset.id, { consistencyLocked: checked });
      onUpdated(next);
    } catch {
      message.error('更新锁定状态失败');
    } finally {
      setLocking(false);
    }
  };

  const onSwitchAlt = async (altIndex: number) => {
    try {
      const next = await patchAsset(asset.id, { currentAlt: altIndex });
      onUpdated(next);
      message.success(`已切换形象：${asset.alts?.[altIndex]?.name}`);
    } catch {
      message.error('切换形象失败');
    }
  };

  const currentAltIndex = asset.currentAlt ?? 0;
  const currentAlt = asset.alts?.[currentAltIndex];
  const displayImageUrl = currentAlt?.imageUrl ?? asset.imageUrl;
  const displayFilter = currentAlt?.filter;

  return (
    <>
      <div
        className={`ds-charCard${asset.type === 'scene' ? ' wide' : ''}`}
        onClick={() => asset.status === 'ready' && setDetailVisible(true)}
        style={{ cursor: asset.status === 'ready' ? 'pointer' : 'default' }}
      >
        <div className="img">
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={asset.name}
              style={displayFilter ? { filter: displayFilter } : undefined}
            />
          ) : generating ? (
            <div className="ds-loadingPh">
              <div className="sp" />
              <div className="t">形象生成中 {task?.progress ?? 0}%</div>
              <Progress percent={task?.progress ?? 0} showInfo={false} size={['70%', 6]} strokeColor="#8b5cf6" />
            </div>
          ) : (
            <div className="ds-phEmoji">{asset.emoji ?? '⬚'}</div>
          )}
        </div>
        <div className="info">
          <div className="nm">
            {asset.name} <span className={`ds-miniTag ${roleTagClass(asset.role)}`}>{asset.role}</span>
          </div>
          <div className="ds">{asset.description}</div>
          <div className="ft">
            <span>{asset.status === 'ready' ? '✓ 可用' : '待生成'}</span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              🔒
              <Switch size="small" checked={asset.consistencyLocked} loading={locking} onChange={(v) => void onLock(v)} />
            </label>
          </div>
          {asset.status === 'ready' && asset.alts && asset.alts.length > 1 ? (
            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
              {asset.alts.map((alt, i) => (
                <button
                  key={i}
                  type="button"
                  className={`ds-miniTag${i === currentAltIndex ? '' : ' gray'}`}
                  style={{ border: 'none', cursor: 'pointer', padding: '2px 8px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onSwitchAlt(i);
                  }}
                >
                  {alt.name}
                </button>
              ))}
            </div>
          ) : null}
          {asset.status !== 'ready' ? (
            <Button
              type="primary"
              className="ds-grad ds-pill"
              size="small"
              style={{ marginTop: 10 }}
              loading={generating}
              onClick={() => void onGenerate()}
            >
              生成形象
            </Button>
          ) : null}
        </div>
      </div>

      <Modal
        title={`资产详情 · ${asset.name}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="regen" onClick={() => message.info('演示：重新生成形象（新版本 v+1 · 旧版保留可回滚）')}>
            ↻ 生成新形象
          </Button>,
          <Button key="unlock" onClick={() => message.info('演示：已解除一致性锁定（谨慎：可能引起跨镜头形象漂移）')}>
            🔓 解锁一致性
          </Button>,
          <Button key="close" type="primary" onClick={() => setDetailVisible(false)}>
            完成
          </Button>,
        ]}
        width={470}
      >
        <div style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--panel2)', maxHeight: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {displayImageUrl ? (
            <Image
              src={displayImageUrl}
              alt={asset.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', ...(displayFilter ? { filter: displayFilter } : {}) }}
              preview={{
                mask: '🔍 点击放大',
              }}
            />
          ) : (
            <div style={{ fontSize: 84, padding: 34 }}>{asset.emoji ?? '⬚'}</div>
          )}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--sub)', lineHeight: 1.8 }}>
          <b style={{ color: 'var(--txt)' }}>{asset.name}</b> <span className={`ds-miniTag ${roleTagClass(asset.role)}`}>{asset.role}</span>
          {asset.alts ? <span className="ds-miniTag">当前形象：{currentAlt?.name}</span> : null}
          <br />
          {asset.description}
          <br />
          <span style={{ color: 'var(--dim)', fontSize: 10.5 }}>
            {asset.alts ? `共${asset.alts.length}个形象 · 4K` : '共1个形象'} ｜ 🔒 一致性锁定：注入全部引用分镜，防止变脸 / 变装
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--dim)', margin: '12px 0 4px' }}>被引用分镜（一致性注入点）</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(asset.refs ?? ['暂无引用']).map((ref, i) => (
            <Tag key={i} style={{ fontSize: 11, color: 'var(--dim)' }}>
              {ref}
            </Tag>
          ))}
        </div>
      </Modal>
    </>
  );
}

const FILTERS: { key: AssetType; label: string; icon: string }[] = [
  { key: 'character', label: '全部角色', icon: '👥' },
  { key: 'scene', label: '全部场景', icon: '🏛' },
  { key: 'prop', label: '全部道具', icon: '🗝' },
  { key: 'material', label: '全部素材', icon: '🖼' },
];

type LibItem = {
  id: string;
  name: string;
  emoji?: string;
  imageUrl?: string;
  filter?: string;
  type: 'prop' | 'material';
};

export default function AssetsPage() {
  const { message } = App.useApp();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const setUnlocked = useWorkflowStore((s) => s.setUnlocked);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<AssetType>('character');
  const [completing, setCompleting] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [libVisible, setLibVisible] = useState(false);
  const [libType, setLibType] = useState<'prop' | 'material'>('prop');
  const [libItems, setLibItems] = useState<LibItem[]>([]);
  const [regeneratingAll, setRegeneratingAll] = useState(false);

  const load = async () => {
    const [{ assets: list }, wf, outline] = await Promise.all([listAssets(id), getWorkflow(id), getOutline(id)]);
    setAssets(list);
    setUnlocked(id, wf.unlockedStep);
    setProjectName(outline.projectName);
  };

  useEffect(() => {
    void load().catch(() => message.error('加载资产失败'));
  }, [id, message]);

  const counts = useMemo(() => countAssetsByType(assets), [assets]);
  const readyCounts = useMemo(
    () => ({
      character: assets.filter((a) => a.type === 'character' && a.status === 'ready').length,
      scene: assets.filter((a) => a.type === 'scene' && a.status === 'ready').length,
      prop: assets.filter((a) => a.type === 'prop' && a.status === 'ready').length,
      material: assets.filter((a) => a.type === 'material' && a.status === 'ready').length,
    }),
    [assets],
  );
  const visible = filterAssetsByType(assets, filter);

  const onNext = async () => {
    setCompleting(true);
    try {
      const wf = await completeAssets(id);
      setUnlocked(id, wf.unlockedStep);
      navigate(`/project/${id}/episodes`);
    } catch {
      message.error('请先完成剧本定稿');
    } finally {
      setCompleting(false);
    }
  };

  const onOpenLib = (type: 'prop' | 'material') => {
    setLibType(type);
    setLibVisible(true);
  };

  const onAddLibItem = () => {
    if (libType === 'prop') {
      const newItem: LibItem = {
        id: `prop-${Date.now()}`,
        name: `道具 ${libItems.filter((i) => i.type === 'prop').length + 1}（占位）`,
        emoji: '🗝',
        type: 'prop',
      };
      setLibItems([...libItems, newItem]);
      message.success('道具占位卡已创建 · 关键物件可在剧本标注后自动提取');
    } else {
      const newItem: LibItem = {
        id: `material-${Date.now()}`,
        name: `素材 ${libItems.filter((i) => i.type === 'material').length + 1} · 参考图`,
        imageUrl: `${import.meta.env.BASE_URL}demo-assets/corridor.jpg`,
        filter: 'saturate(1.3) hue-rotate(25deg)',
        type: 'material',
      };
      setLibItems([...libItems, newItem]);
      message.success('素材参考图已上传（演示）');
    }
  };

  const onRegenerateAll = () => {
    setRegeneratingAll(true);
    message.info('演示：已消耗 ◆28 积分，全部资产重新生成中...');
    setTimeout(() => {
      setRegeneratingAll(false);
      message.success('全部资产重新生成完成');
    }, 2600);
  };

  return (
    <div className="ds-flowPage">
      <WorkflowHeader projectName={projectName || '项目'} tag="资产库" current="assets" />
      <div className="ds-viewInner">
        <div className="ds-statRow">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`ds-statCard${filter === item.key ? ' on' : ''}`}
              onClick={() => {
                if (item.key === 'prop' || item.key === 'material') {
                  onOpenLib(item.key);
                } else {
                  setFilter(item.key);
                }
              }}
            >
              <div className="nm">
                {item.icon} {item.label}
              </div>
              <div className="ct">
                {readyCounts[item.key]}
                <small> / {counts[item.key]}</small>
              </div>
            </button>
          ))}
        </div>
        <div className="ds-assetGrid">
          {visible.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onUpdated={(next) => setAssets((list) => list.map((item) => (item.id === next.id ? next : item)))}
            />
          ))}
          {visible.length === 0 ? (
            <div className="ds-emptyHint">暂无{FILTERS.find((f) => f.key === filter)?.label.replace('全部', '')} — 本集无关键物件流转</div>
          ) : null}
        </div>
        <div className="ds-noteBar">
          <span className="ic">⚡</span>
          <span>
            点「生成形象」提交生图任务；林晚 / 鼬完成后将出现 linwan.png / itachi.png。一致性锁定经 PATCH 持久化。
          </span>
        </div>
      </div>
      <div className="ds-flowBar">
        <span className="msg">角色形象生成完成后可进入分集拆分</span>
        <Button className="ds-ghost ds-pill" size="small" onClick={() => navigate(`/project/${id}/outline`)}>
          上一步
        </Button>
        <Button className="ds-ghost ds-pill" size="small" onClick={onRegenerateAll} loading={regeneratingAll}>
          ↻ 全部重新生成
        </Button>
        <Button type="primary" className="ds-grad ds-pill" size="small" loading={completing} onClick={() => void onNext()}>
          下一步：分集拆分 ◆28
        </Button>
      </div>

      <Modal
        title={`${libType === 'prop' ? '道具' : '素材'}管理 · 项目资产库`}
        open={libVisible}
        onCancel={() => setLibVisible(false)}
        footer={[
          <Button key="add" onClick={onAddLibItem}>
            {libType === 'prop' ? '＋ 新增道具（占位卡）' : '＋ 上传素材'}
          </Button>,
          <Button key="close" type="primary" onClick={() => setLibVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <div style={{ minHeight: 80 }}>
          {libItems.filter((i) => i.type === libType).length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--dim)', fontSize: 12, padding: '22px 0' }}>
              暂无{libType === 'prop' ? '道具' : '素材'} — 本集无关键物件流转，可手动新增占位
            </div>
          ) : (
            libItems
              .filter((i) => i.type === libType)
              .map((item) => (
                <div key={item.id} style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: 'var(--panel2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', ...(item.filter ? { filter: item.filter } : {}) }} />
                    ) : (
                      <span style={{ fontSize: 24 }}>{item.emoji}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)' }}>
                      项目内 {libType === 'prop' ? '道具' : '素材'} · 可在片段提示词中 @ 引用
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </Modal>
    </div>
  );
}
