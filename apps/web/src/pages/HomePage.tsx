import { useEffect, useState } from 'react';
import { App, Button, Card, Flex, Input, Modal, Progress, Select, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { createProject, listProjects, listTemplates, patchProject } from '../lib/api';
import type { Project, StorageUsage, Template } from '../types/api';

function formatUpdated(iso: string): string {
  return `更新于 ${iso.slice(0, 16).replace('T', ' ')}`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatGb(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function HomePage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [style, setStyle] = useState('赛博朋克电影');
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [creating, setCreating] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const load = async () => {
    const data = await listProjects();
    setProjects(data.projects);
    setStorage(data.storage);
  };

  useEffect(() => {
    void load().catch(() => message.error('加载项目列表失败'));
    void listTemplates()
      .then((data) => setTemplates(data.templates))
      .catch(() => undefined);
  }, [message]);

  const onCreate = async () => {
    const name = newName.trim();
    if (!name) {
      message.warning('请输入项目名称');
      return;
    }
    setCreating(true);
    try {
      await createProject({ name, aspectRatio, style, templateId: templateId || undefined });
      setCreateOpen(false);
      setNewName('');
      setTemplateId('');
      await load();
    } catch {
      message.error('新建项目失败');
    } finally {
      setCreating(false);
    }
  };

  const onRename = async () => {
    if (!renameId) return;
    const name = renameValue.trim();
    if (!name) {
      message.warning('请输入项目名称');
      return;
    }
    setRenaming(true);
    try {
      await patchProject(renameId, { name });
      setRenameId(null);
      await load();
    } catch {
      message.error('重命名失败');
    } finally {
      setRenaming(false);
    }
  };

  const usedPct = storage ? Math.round((storage.usedBytes / storage.quotaBytes) * 100) : 0;

  return (
    <div style={{ padding: '30px 32px 70px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
      <h2 className="ds-h2">
        空间 <em>· 个人</em>
      </h2>
      <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 6 }}>
        个人项目卡 · 重命名 / 归档 · 项目积分余额 · 成片下载 · 存储用量
      </Typography.Text>

      <Card style={{ marginTop: 20 }} styles={{ body: { padding: '13px 24px' } }}>
        <Flex align="center" gap={18}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            🧊
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Flex align="center" gap={10}>
              <b style={{ fontSize: 15 }}>个人空间</b>
              <span className="ds-status no" style={{ padding: '2px 7px', fontSize: 9.5, background: 'rgba(139,92,246,.14)', color: '#a78bfa' }}>
                免费版
              </span>
            </Flex>
            <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', margin: '5px 0 8px' }}>
              存储用量 <b style={{ color: 'var(--ant-color-text)' }}>{storage ? formatGb(storage.usedBytes) : '—'}</b>
              {' / '}
              {storage ? formatGb(storage.quotaBytes) : '—'} · 成片保留 {storage?.retentionDays ?? 30} 天 · 合成完成后可在此下载
            </Typography.Text>
            <Progress percent={usedPct} showInfo={false} size={['100%', 8]} strokeColor={{ from: '#8b5cf6', to: '#6366f1' }} />
          </div>
          <Button className="ds-ghost ds-pill" size="small">
            👥 切换团队空间
          </Button>
        </Flex>
      </Card>

      <Flex align="center" justify="space-between" style={{ margin: '26px 0 13px' }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>📁 我的项目</h3>
        <Button type="primary" className="ds-grad ds-pill" size="small" onClick={() => setCreateOpen(true)}>
          ＋ 新建项目
        </Button>
      </Flex>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15 }}>
        {projects.map((p) => {
          const ok = p.status === 'in_progress';
          return (
            <Card
              key={p.id}
              className="ds-card"
              style={{ overflow: 'hidden', cursor: 'pointer' }}
              styles={{ body: { padding: '12px 14px' } }}
              onClick={() => navigate(`/create?projectId=${p.id}`)}
              cover={
                <div className="ds-cv">
                  {p.coverUrl ? (
                    <img src={p.coverUrl} alt={p.name} />
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        color: 'rgba(255,255,255,.85)',
                      }}
                    >
                      {p.name}
                    </div>
                  )}
                  {p.coverUrl ? <span className="ds-aigc">✦ AI生成</span> : null}
                  <div className="ds-ops">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameId(p.id);
                        setRenameValue(p.name);
                      }}
                    >
                      ✎ 重命名
                    </button>
                    <button type="button" onClick={(e) => e.stopPropagation()}>
                      📦 归档
                    </button>
                  </div>
                </div>
              }
            >
              <b style={{ fontSize: 13.5 }}>{p.name}</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7 }}>
                <Flex align="center" justify="space-between">
                  <span style={{ fontSize: 10.5, color: 'var(--ant-color-text-tertiary)' }}>{formatUpdated(p.updatedAt)}</span>
                  <span className={`ds-status ${ok ? 'ok' : 'no'}`}>
                    {ok ? <i className="ds-dot" /> : null}
                    {p.statusText}
                  </span>
                </Flex>
                <Flex align="center" justify="space-between">
                  <span style={{ fontSize: 10.5, color: 'var(--ant-color-text-tertiary)' }}>
                    资产 {p.assetCount}（角色{p.characterCount}+场景{p.sceneCount}）
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--ant-color-text-tertiary)' }}>
                    片段 {p.segmentCount} · {formatDuration(p.durationSec)}
                  </span>
                </Flex>
                <Flex align="center" justify="space-between">
                  <span style={{ fontSize: 10.5, color: 'var(--ant-color-text-tertiary)' }}>项目积分余额 ◆{p.creditBalance}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--ant-color-text-tertiary)' }}>
                    {p.aspectRatio} · {p.style}
                  </span>
                </Flex>
              </div>
            </Card>
          );
        })}
        <button type="button" className="ds-newCard" onClick={() => setCreateOpen(true)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>＋</div>
            <div style={{ fontSize: 12 }}>新建项目</div>
          </div>
        </button>
      </div>

      <Modal
        open={createOpen}
        className="ds-modal"
        title="新建项目"
        onCancel={() => setCreateOpen(false)}
        styles={{ mask: { backdropFilter: 'blur(4px)', background: 'rgba(5,5,10,.62)' } }}
        footer={[
          <Button key="cancel" className="ds-ghost ds-pill" size="small" onClick={() => setCreateOpen(false)}>
            取消
          </Button>,
          <Button key="ok" type="primary" className="ds-grad ds-pill" size="small" loading={creating} onClick={() => void onCreate()}>
            创 建
          </Button>,
        ]}
      >
        <Flex vertical gap={13}>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
              项目名称
            </Typography.Text>
            <Input placeholder="输入项目名称" value={newName} onChange={(e) => setNewName(e.target.value)} onPressEnter={() => void onCreate()} />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
              可选模板
            </Typography.Text>
            <Select
              style={{ width: '100%' }}
              value={templateId}
              onChange={(value) => {
                setTemplateId(value);
                const tpl = templates.find((item) => item.id === value);
                if (!tpl) return;
                if (!newName.trim()) setNewName(tpl.name);
                setStyle(tpl.style);
                setAspectRatio(tpl.aspectRatio);
              }}
              options={[
                { value: '', label: '— 不使用模板 —' },
                ...templates.map((tpl) => ({ value: tpl.id, label: tpl.name })),
              ]}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
                默认比例
              </Typography.Text>
              <Select style={{ width: '100%' }} value={aspectRatio} onChange={setAspectRatio} options={[{ value: '9:16' }, { value: '16:9' }]} />
            </div>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
                默认风格
              </Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={style}
                onChange={setStyle}
                options={[{ value: '赛博朋克电影' }, { value: '国漫写实' }]}
              />
            </div>
          </div>
        </Flex>
      </Modal>

      <Modal
        open={renameId !== null}
        className="ds-modal"
        title="重命名项目"
        onCancel={() => setRenameId(null)}
        styles={{ mask: { backdropFilter: 'blur(4px)', background: 'rgba(5,5,10,.62)' } }}
        footer={[
          <Button key="cancel" className="ds-ghost ds-pill" size="small" onClick={() => setRenameId(null)}>
            取消
          </Button>,
          <Button key="ok" type="primary" className="ds-grad ds-pill" size="small" loading={renaming} onClick={() => void onRename()}>
            保存
          </Button>,
        ]}
      >
        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onPressEnter={() => void onRename()} />
      </Modal>
    </div>
  );
}
