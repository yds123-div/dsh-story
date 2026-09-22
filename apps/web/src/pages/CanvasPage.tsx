import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CanvasPage.css';
import { Toast, useToast, showToast } from '../components/Toast';
import { demoAssetUrl } from '../lib/demoAssets';

interface Canvas {
  id: string;
  name: string;
  ratio: string;
  cover?: string;
  coverGradient?: string;
  subtitle?: string;
  nameLines?: string[];
  tags?: string[];
  categories?: string[];
  status: 'in-progress' | 'archived';
  segments?: number;
  duration?: string;
  isTemplate?: boolean;
  usageCount?: string;
}

const DEFAULT_MY_CANVASES: Canvas[] = [
  {
    id: '1',
    name: '逆命木叶',
    ratio: '9:16',
    cover: 'corridor.jpg',
    coverGradient: 'linear-gradient(150deg,#1c2440,#3a2f6b 55%,#141a33)',
    subtitle: '第1集 · 异世囚笼',
    tags: ['进行中'],
    status: 'in-progress',
    segments: 3,
    duration: '00:37',
  },
  {
    id: '2',
    name: '火影乱斗',
    ratio: '16:9',
    coverGradient: 'linear-gradient(150deg,#2b1b3d,#43307a 55%,#1c2a52)',
    status: 'archived',
    segments: 4,
    duration: '00:46',
  },
];

const SHARED_CANVASES: Canvas[] = [
  {
    id: 't1',
    name: 'ONE MOVE GOD MODE',
    nameLines: ['ONE MOVE', 'GOD MODE'],
    ratio: '9:16',
    coverGradient: 'linear-gradient(150deg,#0f2b4d,#1d4a7a 60%,#0c1f3a)',
    tags: ['EXCLUSIVE'],
    categories: ['精选画布', '专业影视'],
    status: 'in-progress',
    isTemplate: true,
    usageCount: '12.8w 使用',
  },
  {
    id: 't2',
    name: '机甲废土 SCRAP KING',
    nameLines: ['机甲废土', 'SCRAP KING'],
    ratio: '16:9',
    coverGradient: 'linear-gradient(150deg,#3a2a12,#6b4a1a 60%,#241a0c)',
    categories: ['专业影视'],
    status: 'in-progress',
    isTemplate: true,
    usageCount: '8.3w 使用',
  },
  {
    id: 't3',
    name: 'BEASTLY LORD',
    nameLines: ['BEASTLY', 'LORD'],
    ratio: '9:16',
    coverGradient: 'linear-gradient(150deg,#4d1b24,#7a3040 60%,#2b0c14)',
    categories: ['精选画布'],
    status: 'in-progress',
    isTemplate: true,
    usageCount: '6.1w 使用',
  },
  {
    id: 't4',
    name: '披萨外送员的诸神黄昏',
    nameLines: ['披萨外送员的', '诸神黄昏'],
    ratio: '16:9',
    coverGradient: 'linear-gradient(150deg,#12303a,#1a4a55 60%,#0a1e24)',
    categories: ['教育生活', '声音剧场'],
    status: 'in-progress',
    isTemplate: true,
    usageCount: '5.7w 使用',
  },
];

const CATEGORIES = ['全部', '精选画布', '教育生活', '专业影视', '声音剧场'];
const DEFAULT_COVER_GRADIENT = 'linear-gradient(150deg,#241a3d,#3a2a5c)';

export default function CanvasPage() {
  const navigate = useNavigate();
  const { toast, closeToast } = useToast();
  const [showNewCanvasModal, setShowNewCanvasModal] = useState(false);
  const [canvasName, setCanvasName] = useState('');
  const [selectedRatio, setSelectedRatio] = useState('9:16');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');

  const [myCanvases, setMyCanvases] = useState<Canvas[]>(DEFAULT_MY_CANVASES);

  const handleCreateCanvas = () => {
    if (!canvasName.trim()) {
      showToast('请输入画布名称');
      return;
    }

    const newCanvas: Canvas = {
      id: Date.now().toString(),
      name: canvasName.trim(),
      ratio: selectedRatio,
      coverGradient: DEFAULT_COVER_GRADIENT,
      status: 'in-progress',
      segments: 0,
      duration: '00:00',
    };

    setMyCanvases((prev) => [newCanvas, ...prev]);
    setCanvasName('');
    setShowNewCanvasModal(false);
    showToast(`画布「${newCanvas.name}」已创建（${selectedRatio}）`);
  };

  const handleOpenCanvas = (canvas: Canvas) => {
    if (canvas.status === 'archived') {
      showToast(`演示：打开归档画布「${canvas.name}」`);
      return;
    }
    navigate(`/canvas/${canvas.id}`);
  };

  const handleUseTemplate = () => {
    navigate('/create');
  };

  const handleCopyTemplateToast = () => {
    showToast('演示：复制他人画布到我的项目');
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredSharedCanvases = SHARED_CANVASES.filter((canvas) => {
    const matchesCategory = selectedCategory === '全部' || canvas.categories?.includes(selectedCategory);
    const matchesSearch = !query || canvas.name.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="canvas-page">
      <div className="viewInner">
        <div className="page-header">
          <h2>
            画布 <em>· Canvas</em>
          </h2>
          <p className="sub2">
            参考 tiaoyue /aigc/canvas/canvasList ｜ 节点式创作画布的管理中枢：新建画布、选择生成比例、打开画布进入节点编辑器
          </p>
        </div>

        <div className="secHead"><h3>📁 项目 · 逆命木叶企划</h3><span style={{fontSize:'12px',color:'#a78bfa',cursor:'pointer'}}>全部 ›</span></div>

        <div className="canvasGrid">
          <div className="newCanvasCard" onClick={() => setShowNewCanvasModal(true)}>
            <span className="star">✦</span>
            创建画布
          </div>

          {myCanvases.map((canvas) => (
            <div key={canvas.id} className="workCard">
              <div
                className="workCover"
                style={{
                  background: canvas.coverGradient ?? DEFAULT_COVER_GRADIENT,
                }}
              >
                {canvas.cover && (
                  <img
                    src={demoAssetUrl(canvas.cover)}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: 0.55,
                    }}
                    alt=""
                  />
                )}
                <span className="workCoverText">
                  <span className="workCoverName">{canvas.name}</span>
                  <span className="sub">
                    {canvas.subtitle && (
                      <>
                        {canvas.subtitle}
                        <br />
                      </>
                    )}
                    {canvas.segments} 片段 · {canvas.duration} · {canvas.ratio}
                  </span>
                </span>
                {canvas.tags?.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="workOps">
                <button
                  className={canvas.status === 'archived' ? undefined : 'pri'}
                  onClick={() => handleOpenCanvas(canvas)}
                >
                  打开画布
                </button>
                {canvas.status === 'archived' ? (
                  <button onClick={() => showToast('演示：该画布已归档')}>已归档</button>
                ) : (
                  <button onClick={() => navigate('/outline')}>三步工作流</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="secHead" style={{marginTop:'30px'}}><h3>🎨 创作工坊 · 他人分享的画布</h3></div>

        <div className="chips">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              className={`chip ${selectedCategory === category ? 'on' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
          <div className="searchBox">
            <span>🔍</span>
            <input
              type="search"
              placeholder="描述你想要找的画布 / 资产"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="canvasGrid">
          {filteredSharedCanvases.length === 0 ? (
            <div className="workshopEmpty">没有符合条件的画布</div>
          ) : (
            filteredSharedCanvases.map((canvas) => (
              <div key={canvas.id} className="workCard" onClick={handleCopyTemplateToast}>
                <div
                  className="workCover"
                  style={{
                    background: canvas.coverGradient ?? DEFAULT_COVER_GRADIENT,
                  }}
                >
                  {canvas.tags?.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                  <span className="workCoverName">
                    {canvas.nameLines
                      ? canvas.nameLines.map((line, i) => (
                          <span key={line}>
                            {i > 0 && <br />}
                            {line}
                          </span>
                        ))
                      : canvas.name}
                  </span>
                  <div className="tplOps">
                    <span className="cnt">🔥 {canvas.usageCount}</span>
                    <button
                      className="use"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseTemplate();
                      }}
                    >
                      用此创作
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showNewCanvasModal && (
        <div className="modalMask" onClick={() => setShowNewCanvasModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h3>新建画布</h3>
              <button className="x" onClick={() => setShowNewCanvasModal(false)}>
                ×
              </button>
            </div>
            <div className="fRow">
              <label>选择项目</label>
              <select>
                <option>逆命木叶企划</option>
                <option>默认项目</option>
              </select>
            </div>
            <div className="fRow">
              <label>画布名称</label>
              <input
                type="text"
                placeholder="输入画布名称"
                value={canvasName}
                onChange={(e) => setCanvasName(e.target.value)}
              />
            </div>
            <div className="fRow">
              <label>默认生成比例</label>
              <div className="ratioOpts">
                <div
                  className={`ratioOpt ${selectedRatio === '9:16' ? 'on' : ''}`}
                  onClick={() => setSelectedRatio('9:16')}
                >
                  <div className="box v"></div>
                  <div>
                    <b style={{ fontSize: '13.5px' }}>9:16</b>
                    <div style={{ fontSize: '10px', color: 'var(--ant-color-text-tertiary)' }}>竖屏 · 短剧</div>
                  </div>
                </div>
                <div
                  className={`ratioOpt ${selectedRatio === '16:9' ? 'on' : ''}`}
                  onClick={() => setSelectedRatio('16:9')}
                >
                  <div className="box h"></div>
                  <div>
                    <b style={{ fontSize: '13.5px' }}>16:9</b>
                    <div style={{ fontSize: '10px', color: 'var(--ant-color-text-tertiary)' }}>横屏 · 影视</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modalFoot">
              <button className="btn ghost sm" onClick={() => setShowNewCanvasModal(false)}>
                取 消
              </button>
              <button className="btn white sm" onClick={handleCreateCanvas}>
                创 建
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={closeToast} />}
    </div>
  );
}
