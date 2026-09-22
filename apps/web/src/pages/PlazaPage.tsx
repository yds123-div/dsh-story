import { useState } from 'react';
import { App, Button, Card, Flex, Input, Modal, Select, Typography } from 'antd';
import type { PlazaAsset, PlazaCategory, Project } from '../types/api';

const { Text } = Typography;

// 示例资源挂在 Vite base 下（服务器为 /deepsfv-dev/demo-assets/）
const DA = `${import.meta.env.BASE_URL}demo-assets`;

// 模拟资产数据
const MOCK_ASSETS: PlazaAsset[] = [
  {
    id: '1',
    category: 'character',
    name: '林晚-默认形象',
    imageUrl: `${DA}/linwan.png`,
    videoUrl: null,
    height: 300,
    meta: '角色立绘 · 9:16 · 4K',
    tag: 'ai',
  },
  {
    id: '2',
    category: 'scene',
    name: '木叶长廊-月夜',
    imageUrl: `${DA}/corridor.jpg`,
    videoUrl: null,
    height: 200,
    meta: '场景 · 16:9 · 2K',
    tag: 'ai',
  },
  {
    id: '3',
    category: 'character',
    name: '宇智波鼬-默认形象',
    imageUrl: `${DA}/itachi.png`,
    videoUrl: null,
    height: 300,
    meta: '角色立绘 · 9:16 · 4K',
    tag: 'ai',
  },
  {
    id: '4',
    category: 'video',
    name: '片段1 · 扶柱独白',
    imageUrl: null,
    videoUrl: `${DA}/clip1.mp4`,
    height: 200,
    meta: '视频 · 13s · 480P',
    tag: 'ai',
  },
  {
    id: '5',
    category: 'video',
    name: '片段2 · 质问与否认',
    imageUrl: null,
    videoUrl: `${DA}/clip2.mp4`,
    height: 200,
    meta: '视频 · 14s · 480P',
    tag: 'ai',
  },
  {
    id: '6',
    category: 'video',
    name: '片段3 · 预言警告',
    imageUrl: null,
    videoUrl: `${DA}/clip3.mp4`,
    height: 200,
    meta: '视频 · 13s · 480P',
    tag: 'ai',
  },
  {
    id: '7',
    category: 'material',
    name: '月夜参考-构图A',
    imageUrl: `${DA}/corridor.jpg`,
    videoUrl: null,
    height: 160,
    meta: '素材参考 · 上传',
    tag: 'upload',
    filter: 'sepia(.4) saturate(1.2)',
  },
  {
    id: '8',
    category: 'material',
    name: '和服姿态参考',
    imageUrl: `${DA}/linwan.png`,
    videoUrl: null,
    height: 240,
    meta: '素材参考 · 上传',
    tag: 'upload',
    filter: 'grayscale(.8)',
  },
  {
    id: '9',
    category: 'material',
    name: '忍者服盔甲参考',
    imageUrl: `${DA}/itachi.png`,
    videoUrl: null,
    height: 240,
    meta: '素材参考 · 上传',
    tag: 'upload',
    filter: 'hue-rotate(160deg) saturate(1.4)',
  },
];

// 模拟项目数据
const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: '逆命木叶企划',
    coverUrl: null,
    updatedAt: '2026-09-19T10:00:00Z',
    status: 'in_progress',
    statusText: '进行中',
    assetCount: 5,
    characterCount: 4,
    sceneCount: 1,
    segmentCount: 3,
    durationSec: 40,
    creditBalance: 500,
    aspectRatio: '9:16',
    style: '赛博朋克电影',
  },
  {
    id: 'p2',
    name: '默认项目',
    coverUrl: null,
    updatedAt: '2026-09-19T10:00:00Z',
    status: 'in_progress',
    statusText: '进行中',
    assetCount: 0,
    characterCount: 0,
    sceneCount: 0,
    segmentCount: 0,
    durationSec: 0,
    creditBalance: 1000,
    aspectRatio: '9:16',
    style: '赛博朋克电影',
  },
];

const CATEGORY_LABELS: Record<PlazaCategory, string> = {
  all: '全部',
  character: '角色立绘',
  scene: '场景',
  video: '视频片段',
  material: '素材参考',
  upload: '我的上传',
};

export default function PlazaPage() {
  const { message } = App.useApp();
  const [assets, setAssets] = useState<PlazaAsset[]>(MOCK_ASSETS);
  const [category, setCategory] = useState<PlazaCategory>('all');
  const [searchText, setSearchText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<PlazaAsset | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProject, setUploadProject] = useState('默认项目');
  const [uploadCategory, setUploadCategory] = useState('素材参考');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [addProjectAsset, setAddProjectAsset] = useState<PlazaAsset | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');

  const filteredAssets = assets.filter((asset) => {
    const matchCategory =
      category === 'all' || (category === 'upload' ? asset.tag === 'upload' : asset.category === category);
    const matchSearch = searchText === '' || asset.name.toLowerCase().includes(searchText.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handlePreview = (asset: PlazaAsset) => {
    setPreviewAsset(asset);
    setPreviewOpen(true);
  };

  const handleEditTool = (toolName: string) => {
    message.success(`演示：${toolName}`);
  };

  const handleUploadFile = (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      message.error('文件超过 50MB 上限');
      return false;
    }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      message.error('仅支持图片和视频文件');
      return false;
    }
    setUploadFile(file);
    const url = URL.createObjectURL(file);
    setUploadPreview(url);
    return false; // 阻止自动上传
  };

  const handleUpload = () => {
    if (!uploadFile) {
      message.warning('请先选择文件');
      return;
    }
    const isVideo = uploadFile.type.startsWith('video');
    const newAsset: PlazaAsset = {
      id: Date.now().toString(),
      category: uploadCategory === '角色立绘' ? 'character' : uploadCategory === '场景' ? 'scene' : 'material',
      name: uploadFile.name.replace(/\.[^.]+$/, ''),
      imageUrl: isVideo ? null : uploadPreview,
      videoUrl: isVideo ? uploadPreview : null,
      height: isVideo ? 200 : 210,
      meta: `${uploadCategory} · 刚上传 · ${(uploadFile.size / 1024).toFixed(0)}KB`,
      tag: 'upload',
    };
    setAssets([newAsset, ...assets]);
    setUploadOpen(false);
    setUploadFile(null);
    setUploadPreview(null);
    setCategory('upload');
    message.success(`上传成功：已归入「${uploadCategory}」（真实文件已入瀑布流）`);
  };

  const handleAddProject = (asset: PlazaAsset) => {
    setAddProjectAsset(asset);
    setAddProjectOpen(true);
  };

  const handleConfirmAddProject = () => {
    if (!selectedProject) {
      message.warning('请选择项目');
      return;
    }
    const project = MOCK_PROJECTS.find((p) => p.id === selectedProject);
    if (project) {
      message.success(`「${addProjectAsset?.name}」已加入项目「${project.name}」（片段提示词可 @ 引用）`);
    }
    setAddProjectOpen(false);
    setAddProjectAsset(null);
    setSelectedProject('');
  };

  return (
    <div className="ds-viewInner">
      <h2 className="ds-h2">
        资产 <em>· 广场</em>
      </h2>
      <Text type="secondary" className="ds-sub2">
        参考 tiaoyue /asset ｜ 分类筛选 + 资产瀑布流 · 上传资产 · 加入项目 · 文件预览 · AI 生成标识 · 豆包式编辑工具（抠图/擦除/改图/扩图/变清晰）
      </Text>

      <div className="ds-chips">
        {(Object.keys(CATEGORY_LABELS) as PlazaCategory[]).map((cat) => (
          <button
            key={cat}
            type="button"
            className={`ds-chip ${category === cat ? 'on' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Input
            placeholder="🔍 搜索资产名称 / 标签"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 240, fontSize: 12 }}
          />
          <Button type="primary" className="ds-grad ds-pill" size="small" onClick={() => setUploadOpen(true)}>
            ⬆ 上传资产
          </Button>
        </div>
      </div>

      <div className="ds-wallGrid">
        {filteredAssets.map((asset) => (
          <Card
            key={asset.id}
            className="ds-wallCard"
            styles={{ body: { padding: 0 } }}
            onClick={() => handlePreview(asset)}
          >
            <div className="ds-wallCard-im" style={{ height: `${asset.height}px` }}>
              {asset.videoUrl ? (
                <>
                  <video src={asset.videoUrl} preload="metadata" muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span className="ds-wallCard-play">▶</span>
                </>
              ) : (
                <img
                  src={asset.imageUrl || ''}
                  alt={asset.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', filter: asset.filter || undefined }}
                />
              )}
              <span className="ds-aigcTag">{asset.tag === 'ai' ? '✦ AI生成' : '⬆ 上传'}</span>
            </div>
            <div className="ds-wallCard-ft">
              <div className="ds-wallCard-nm">{asset.name}</div>
              <div className="ds-wallCard-mt">
                <span>{asset.meta}</span>
                <Button
                  type="text"
                  size="small"
                  className="ds-addBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddProject(asset);
                  }}
                >
                  ＋加入项目
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="ds-noteBar">
        <span className="ds-noteBar-ic">ℹ</span>
        <span>
          点击卡片预览文件 · AI 生成资产均带「AI生成」标识；项目内资产请前往 <a href="/assets" style={{ color: '#a78bfa' }}>STEP2 项目资产库</a>
        </span>
      </div>

      {/* 预览弹窗 */}
      <Modal
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={480}
        className="ds-modal"
        styles={{ mask: { backdropFilter: 'blur(4px)', background: 'rgba(5,5,10,.62)' } }}
      >
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>文件预览 · {previewAsset?.name}</h3>
        </div>
        <div className="ds-previewBody">
          {previewAsset?.videoUrl ? (
            <video src={previewAsset.videoUrl} controls autoPlay muted loop playsInline style={{ width: '100%', display: 'block', background: '#000' }} />
          ) : (
            <img src={previewAsset?.imageUrl || ''} alt="" style={{ width: '100%', display: 'block', filter: previewAsset?.filter || undefined }} />
          )}
        </div>
        <div className="ds-previewTools" style={{ display: previewAsset?.category === 'video' ? 'none' : 'flex' }}>
          <Button className="ds-ghost ds-pill" size="small" onClick={() => handleEditTool('AI 抠图 → 透明底')}>
            ✂ AI 抠图
          </Button>
          <Button className="ds-ghost ds-pill" size="small" onClick={() => handleEditTool('擦除多余元素')}>
            🧽 擦除
          </Button>
          <Button className="ds-ghost ds-pill" size="small" onClick={() => handleEditTool('标记区域局部重绘')}>
            🖌 标记改图
          </Button>
          <Button className="ds-ghost ds-pill" size="small" onClick={() => handleEditTool('外扩构图（9:16 → 16:9）')}>
            🔲 扩图
          </Button>
          <Button className="ds-ghost ds-pill" size="small" onClick={() => handleEditTool('超分至 4K')}>
            ✨ 变清晰
          </Button>
          <Button
            type="primary"
            className="ds-grad ds-pill"
            size="small"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              setPreviewOpen(false);
              if (previewAsset) handleAddProject(previewAsset);
            }}
          >
            ＋ 加入项目
          </Button>
        </div>
      </Modal>

      {/* 上传弹窗 */}
      <Modal
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        title="⬆ 上传资产"
        footer={[
          <Button key="cancel" className="ds-ghost ds-pill" size="small" onClick={() => setUploadOpen(false)}>
            取消
          </Button>,
          <Button key="ok" type="primary" className="ds-grad ds-pill" size="small" onClick={handleUpload}>
            确认上传
          </Button>,
        ]}
        className="ds-modal"
        styles={{ mask: { backdropFilter: 'blur(4px)', background: 'rgba(5,5,10,.62)' } }}
      >
        <Flex vertical gap={13}>
          <div className="ds-fRow">
            <label>归属项目</label>
            <Select value={uploadProject} onChange={setUploadProject} style={{ width: '100%' }}>
              <Select.Option value="默认项目">默认项目</Select.Option>
              <Select.Option value="逆命木叶企划">逆命木叶企划</Select.Option>
            </Select>
          </div>
          <div className="ds-fRow">
            <label>资产分类</label>
            <Select value={uploadCategory} onChange={setUploadCategory} style={{ width: '100%' }}>
              <Select.Option value="素材参考">素材参考</Select.Option>
              <Select.Option value="角色立绘">角色立绘</Select.Option>
              <Select.Option value="场景">场景</Select.Option>
            </Select>
          </div>
          <div className="ds-fRow">
            <label>文件</label>
            <input
              type="file"
              id="upFile"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file);
              }}
            />
            <div
              id="upDrop"
              style={{
                border: '1.5px dashed var(--ant-color-border-secondary)',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center',
                color: 'var(--ant-color-text-tertiary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('upFile')?.click()}
            >
              📁 点击或拖拽文件到此处<br />
              支持 png / jpg / webp / mp4 · 单文件 ≤ 50MB
            </div>
            {uploadPreview && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--ant-color-bg-elevated)', border: '1px solid var(--ant-color-border-secondary)', borderRadius: 11, padding: 10 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 9, background: 'var(--ant-color-bg-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {uploadFile?.type.startsWith('video') ? '🎥' : <img src={uploadPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {uploadFile?.name} <span className="ds-miniTag ok">校验通过</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--ant-color-text-tertiary)', marginTop: 3, lineHeight: 1.6 }}>
                      {uploadFile?.type.startsWith('video') ? '视频' : '图片'} · {(uploadFile?.size ? (uploadFile.size / 1024).toFixed(0) : '0')} KB · 将归入「{uploadCategory}」
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Flex>
      </Modal>

      {/* 加入项目弹窗 */}
      <Modal
        open={addProjectOpen}
        onCancel={() => setAddProjectOpen(false)}
        title="加入项目"
        footer={[
          <Button key="cancel" className="ds-ghost ds-pill" size="small" onClick={() => setAddProjectOpen(false)}>
            取消
          </Button>,
          <Button key="ok" type="primary" className="ds-grad ds-pill" size="small" onClick={handleConfirmAddProject}>
            确认
          </Button>,
        ]}
        className="ds-modal"
        styles={{ mask: { backdropFilter: 'blur(4px)', background: 'rgba(5,5,10,.62)' } }}
      >
        <Flex vertical gap={10}>
          {MOCK_PROJECTS.map((project) => (
            <Card
              key={project.id}
              className={`ds-projectSelectCard ${selectedProject === project.id ? 'selected' : ''}`}
              styles={{ body: { padding: 12 } }}
              onClick={() => setSelectedProject(project.id)}
              style={{ cursor: 'pointer', border: selectedProject === project.id ? '2px solid #8b5cf6' : undefined }}
            >
              <b style={{ fontSize: 13 }}>{project.name}</b>
              <div style={{ fontSize: 11, color: 'var(--ant-color-text-tertiary)', marginTop: 4 }}>
                角色 {project.characterCount} · 场景 {project.sceneCount} · {project.statusText}
              </div>
            </Card>
          ))}
          <Card
            className="ds-projectSelectCard"
            styles={{ body: { padding: 12 } }}
            style={{ cursor: 'pointer', textAlign: 'center', border: '1px dashed var(--ant-color-border-secondary)' }}
          >
            <span style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>＋ 新建项目</span>
          </Card>
        </Flex>
      </Modal>
    </div>
  );
}
