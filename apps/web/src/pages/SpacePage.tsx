import { useState } from 'react';
import { Modal, Button, Input, Select, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const EXPORT_RECORDS = [
  {
    id: 1,
    task: '逆命木叶 第1集 v2',
    scope: '整集 00:37',
    spec: '720P · MP4',
    status: 'completed',
    time: '09-17 18:02',
  },
  {
    id: 2,
    task: '逆命木叶 第1集 v1',
    scope: '片段1-2 · 00:27',
    spec: '480P · MP4',
    status: 'completed',
    time: '09-17 16:40',
  },
  {
    id: 3,
    task: '火影乱斗 整集',
    scope: '整集 00:46',
    spec: '720P · MP4',
    status: 'expired',
    time: '09-10 11:12',
  },
];

const PROJECTS = [
  {
    id: 1,
    name: '逆命木叶',
    image: 'corridor.jpg',
    update: '2026-09-17 18:20',
    status: '进行中',
    assets: 5,
    scenes: 3,
    duration: '00:37',
    credits: 132,
    ratio: '9:16',
    style: '赛博朋克电影',
  },
  {
    id: 2,
    name: '火影乱斗',
    update: '2026-09-16 21:04',
    status: '已归档',
    assets: 2,
    scenes: 4,
    duration: '00:46',
    credits: 0,
    ratio: '16:9',
    style: null,
  },
];

export default function SpacePage() {
  const navigate = useNavigate();
  const [newProjModal, setNewProjModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projRatio, setProjRatio] = useState('9:16');
  const [projStyle, setProjStyle] = useState('赛博朋克电影');
  const storageUsed = 3.4;

  const handleCreateProject = () => {
    const name = projName.trim() || '未命名项目';
    setNewProjModal(false);
    setProjName('');
    message.success(`项目「${name}」已创建（演示）· 可在创作中选择归属`);
  };

  const handleRenameProject = (id: number) => {
    const project = PROJECTS.find((p) => p.id === id);
    if (!project) return;
    const newName = prompt('重命名项目（演示）', project.name);
    if (newName && newName.trim()) {
      message.success(`项目已重命名为「${newName.trim()}」`);
    }
  };

  const handleArchiveProject = (id: number) => {
    const project = PROJECTS.find((p) => p.id === id);
    if (!project) return;
    message.info(`演示：已归档「${project.name}」`);
  };

  const handleRestoreProject = (id: number) => {
    const project = PROJECTS.find((p) => p.id === id);
    if (!project) return;
    message.info(`演示：已恢复「${project.name}」`);
  };

  const handleDownload = (filename: string) => {
    message.info(`演示：下载 ${filename}`);
  };

  const handleRecompose = (id: number) => {
    const record = EXPORT_RECORDS.find((r) => r.id === id);
    if (!record) return;
    message.info('成片保留 30 天，已过期 · 可重新合成');
  };

  const storagePercent = (storageUsed / 10) * 100;

  return (
    <div className="ds-viewInner">
      <h2 className="ds-h2">
        空间 <em>· 个人</em>
      </h2>
      <div className="ds-sub2">
        参考 tiaoyue /space/personal ｜ 个人项目卡 · 重命名 / 归档 · 项目积分余额 · 成片下载 ·
        存储用量
      </div>

      <div className="ds-docPanel" style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '20px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}
        >
          🧊
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <b style={{ fontSize: '15px' }}>个人空间</b>
            <span className="ds-miniTag">免费版</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ant-color-text-tertiary)', marginTop: '5px' }}>
            存储用量{' '}
            <b style={{ color: 'var(--ant-color-text)' }}>{storageUsed.toFixed(1)} GB</b> / 10 GB · 成片保留
            30 天 · 合成完成后可在此下载
          </div>
          <div className="ds-storeBar">
            <i style={{ width: `${Math.min(96, storagePercent)}%` }}></i>
          </div>
        </div>
        <Button className="ds-ghost" onClick={() => message.info('演示：团队空间（成员 / 邀请 / 权限）在「团队」模块')}>
          👥 切换团队空间
        </Button>
      </div>

      <div className="ds-secHead">
        <h3>📁 我的项目</h3>
        <Button type="primary" className="ds-grad" onClick={() => setNewProjModal(true)}>
          ＋ 新建项目
        </Button>
      </div>

      <div className="ds-spGrid">
        {PROJECTS.map((project) => (
          <div
            key={project.id}
            className="ds-spCard"
            onClick={() => project.status === '进行中' && navigate('/canvas')}
          >
            <div className="ds-cv">
              {project.image ? (
                <img src={project.image} alt={project.name} />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {project.name}
                </div>
              )}
              <span className="ds-aigc">✦ AI生成</span>
              <div className="ds-ops">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameProject(project.id);
                  }}
                >
                  ✎ 重命名
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (project.status === '进行中') {
                      handleArchiveProject(project.id);
                    } else {
                      handleRestoreProject(project.id);
                    }
                  }}
                >
                  {project.status === '进行中' ? '📦 归档' : '↺ 恢复'}
                </button>
              </div>
            </div>
            <div className="ds-bd">
              <b>{project.name}</b>
              <div className="ds-row">
                <span>更新于 {project.update}</span>
                <span className={`ds-status ${project.status === '进行中' ? 'ok' : 'no'}`}>
                  <span className="ds-dot"></span>
                  {project.status}
                </span>
              </div>
              <div className="ds-row">
                <span>资产 {project.assets}（角色4+场景1）</span>
                <span>片段 {project.scenes} · {project.duration}</span>
              </div>
              <div className="ds-row">
                <span>项目积分余额 ◆{project.credits}</span>
                <span>
                  {project.ratio} · {project.style}
                </span>
              </div>
            </div>
          </div>
        ))}

        <div
          className="ds-spCard"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px dashed var(--ant-color-border)',
            color: 'var(--ant-color-text-secondary)',
          }}
          onClick={() => setNewProjModal(true)}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>＋</div>
            <div style={{ fontSize: '12px' }}>新建项目</div>
          </div>
        </div>
      </div>

      <div className="ds-secHead">
        <h3>🎬 成片 · 导出记录</h3>
      </div>

      <div className="ds-epTable">
        <div className="ds-epRow hd">
          <span>任务</span>
          <span>范围</span>
          <span>规格</span>
          <span>状态</span>
          <span>时间</span>
          <span>操作</span>
        </div>
        {EXPORT_RECORDS.map((record) => (
          <div key={record.id} className="ds-epRow">
            <span>{record.task}</span>
            <span>{record.scope}</span>
            <span>{record.spec}</span>
            <span>
              <span className={`ds-status ${record.status === 'completed' ? 'ok' : 'no'}`}>
                <span className="ds-dot"></span>
                {record.status === 'completed' ? '已完成' : '已过期'}
              </span>
            </span>
            <span>{record.time}</span>
            <span>
              {record.status === 'completed' ? (
                <Button
                  size="small"
                  className="ds-ghost"
                  onClick={() => handleDownload(`${record.task}_${record.spec.replace(' · ', '_')}.mp4`)}
                >
                  ⬇ 下载
                </Button>
              ) : (
                <Button size="small" className="ds-ghost" onClick={() => handleRecompose(record.id)}>
                  ↻ 重新合成
                </Button>
              )}
            </span>
          </div>
        ))}
      </div>

      <Modal
        open={newProjModal}
        onCancel={() => setNewProjModal(false)}
        title="新建项目"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button className="ds-ghost" onClick={() => setNewProjModal(false)}>
              取消
            </Button>
            <Button type="primary" className="ds-grad" onClick={handleCreateProject}>
              创建
            </Button>
          </div>
        }
        className="ds-modal"
      >
        <div className="ds-fRow">
          <label>项目名称</label>
          <Input
            placeholder="输入项目名称"
            value={projName}
            onChange={(e) => setProjName(e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="ds-fRow">
            <label>默认比例</label>
            <Select value={projRatio} onChange={setProjRatio} style={{ width: '100%' }}>
              <Select.Option value="9:16">9:16</Select.Option>
              <Select.Option value="16:9">16:9</Select.Option>
            </Select>
          </div>
          <div className="ds-fRow">
            <label>默认风格</label>
            <Select value={projStyle} onChange={setProjStyle} style={{ width: '100%' }}>
              <Select.Option value="赛博朋克电影">赛博朋克电影</Select.Option>
              <Select.Option value="国漫写实">国漫写实</Select.Option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
