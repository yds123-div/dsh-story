import { useEffect, useState } from 'react';
import { App, Button, Card, Flex, Input, Modal, Select, Typography } from 'antd';
import type { ProjectMode, ProjectSummary } from '@dsh-story/contracts';
import { api } from '../lib/productApi';
import { listTemplates } from '../lib/api';
import type { Template } from '../types/api';

function formatUpdated(iso: string): string {
  return `更新于 ${iso.slice(0, 16).replace('T', ' ')}`;
}

const STATUS_TEXT: Record<ProjectSummary['status'], string> = {
  active: '进行中',
  archived: '已归档',
};

const MODE_TEXT: Record<ProjectMode, string> = {
  script: '剧本模式',
  novel: '小说模式',
};

export default function HomePage() {
  const { message } = App.useApp();
  // 项目列表走真产品 API（apps/api + SQLite）；模板选择仍是旧 mock 面
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [mode, setMode] = useState<ProjectMode>('script');
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [creating, setCreating] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const load = async () => {
    const data = await api.listProjects();
    setProjects(data.projects);
  };

  useEffect(() => {
    void load().catch(() => message.error('加载项目列表失败'));
    void listTemplates()
      .then((data) => setTemplates(data.templates))
      .catch(() => undefined);
  }, [message]);

  const onCreate = async () => {
    const title = newName.trim();
    if (!title) {
      message.warning('请输入项目名称');
      return;
    }
    setCreating(true);
    try {
      await api.createProject({ title, mode });
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
    const title = renameValue.trim();
    if (!title) {
      message.warning('请输入项目名称');
      return;
    }
    setRenaming(true);
    try {
      await api.updateProject(renameId, { title });
      setRenameId(null);
      await load();
    } catch {
      message.error('重命名失败');
    } finally {
      setRenaming(false);
    }
  };

  const onArchive = async (project: ProjectSummary) => {
    const next = project.status === 'active' ? 'archived' : 'active';
    try {
      await api.updateProject(project.id, { status: next });
      await load();
    } catch {
      message.error(next === 'archived' ? '归档失败' : '恢复失败');
    }
  };

  return (
    <div style={{ padding: '30px 32px 70px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
      <h2 className="ds-h2">
        空间 <em>· 个人</em>
      </h2>
      <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 6 }}>
        个人项目卡 · 重命名 / 归档
      </Typography.Text>

      <Flex align="center" justify="space-between" style={{ margin: '26px 0 13px' }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>📁 我的项目</h3>
        <Button type="primary" className="ds-grad ds-pill" size="small" onClick={() => setCreateOpen(true)}>
          ＋ 新建项目
        </Button>
      </Flex>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15 }}>
        {projects.map((p) => {
          const ok = p.status === 'active';
          // 真项目尚无可用下游页（CreatePage 仍是 mock，工单 03/04 接管），暂时禁用点击
          return (
            <Card
              key={p.id}
              className="ds-card"
              style={{ overflow: 'hidden' }}
              styles={{ body: { padding: '12px 14px' } }}
              cover={
                <div className="ds-cv">
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
                    {p.title}
                  </div>
                  <div className="ds-ops">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameId(p.id);
                        setRenameValue(p.title);
                      }}
                    >
                      ✎ 重命名
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onArchive(p);
                      }}
                    >
                      {ok ? '📦 归档' : '📦 恢复'}
                    </button>
                  </div>
                </div>
              }
            >
              <b style={{ fontSize: 13.5 }}>{p.title}</b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 7 }}>
                <Flex align="center" justify="space-between">
                  <span style={{ fontSize: 10.5, color: 'var(--ant-color-text-tertiary)' }}>{formatUpdated(p.updatedAt)}</span>
                  <span className={`ds-status ${ok ? 'ok' : 'no'}`}>
                    {ok ? <i className="ds-dot" /> : null}
                    {STATUS_TEXT[p.status]}
                  </span>
                </Flex>
                <Flex align="center" justify="space-between">
                  <span style={{ fontSize: 10.5, color: 'var(--ant-color-text-tertiary)' }}>{MODE_TEXT[p.mode]}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--ant-color-text-tertiary)' }}>创建于 {p.createdAt.slice(0, 10)}</span>
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
              创作模式
            </Typography.Text>
            <Select
              style={{ width: '100%' }}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'script', label: '剧本模式 · 处理已有剧本' },
                { value: 'novel', label: '小说模式 · 完整改编链路' },
              ]}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
              可选模板（仅用于预填名称）
            </Typography.Text>
            <Select
              style={{ width: '100%' }}
              value={templateId}
              onChange={(value) => {
                setTemplateId(value);
                const tpl = templates.find((item) => item.id === value);
                if (tpl && !newName.trim()) setNewName(tpl.name);
              }}
              options={[
                { value: '', label: '— 不使用模板 —' },
                ...templates.map((tpl) => ({ value: tpl.id, label: tpl.name })),
              ]}
            />
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
