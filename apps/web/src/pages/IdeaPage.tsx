import { useState } from 'react';
import { Modal, Button, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const DECOMPOSE_DATA = {
  '逃跑男友': {
    bars: [
      [92, '集1 · 开场钩子（男友假死谜团）'],
      [78, '集2 · 反转铺垫'],
      [95, '集3 · 身份揭穿'],
      [70, '集4-6 · 追妻火葬场'],
      [88, '集7 · 真相反转'],
      [60, '集8+ · 甜宠收束'],
    ],
    steps: [
      '开场 0-3s：葬礼现场女主微笑 —「他终于死了」反差钩子',
      '第1集末：棺材空了 · 悬念钩',
      '每集一个微型反转 + 一次肢体/台词暧昧',
      '中段：误会 → 分离 → 第三方揭露三连',
      '收束：真相大白 + 高甜复合 · 留续集钩',
    ],
  },
  '谋断大秦·朝堂局': {
    bars: [
      [85, '集1 · 质子归秦'],
      [90, '集2 · 朝堂对峙'],
      [65, '集3-5 · 布局'],
      [96, '集6 · 政变夜'],
      [75, '集7+ · 清算'],
    ],
    steps: [
      '开场：质子当殿受辱 → 隐忍人设立住',
      '权谋信息差：观众知道 · 角色不知道',
      '三集一小胜 · 六集一大胜的碾压节奏',
      '对手降智但不弱智：每次失败有合理代价',
      '收束：登位 + 开疆预告',
    ],
  },
  '末日血源·觉醒篇': {
    bars: [
      [88, '集1 · 觉醒夜'],
      [72, '集2-3 · 求生'],
      [94, '集4 · 背叛'],
      [80, '集5 · 血脉觉醒'],
      [93, '集6 · 反杀'],
    ],
    steps: [
      '开场 0-3s：丧尸破门 + 姐妹分离',
      '女主从被保护者 → 保护者的能力曲线',
      '背叛者提前 1.5 集埋线索（可回看验证）',
      '觉醒不无敌：每次使用血脉有代价',
      '收束：建立安全区 · 引出更大威胁',
    ],
  },
};

const OFFICIAL_EXAMPLES = [
  {
    id: 1,
    title: '短片《星环之外》',
    subtitle: '自由画布 · 9:16',
    tags: '科幻 · 废土',
    cat: '科幻 废土',
    image: 'corridor.jpg',
    filter: 'hue-rotate(200deg) saturate(1.5) brightness(.9)',
  },
  {
    id: 2,
    title: '末日血源',
    subtitle: '原创短剧 · 12集',
    tags: '大女主 · 末世',
    cat: '大女主 废土',
    image: 'corridor.jpg',
    filter: 'hue-rotate(-30deg) saturate(1.8) contrast(1.2)',
  },
  {
    id: 3,
    title: '真千金觉醒',
    subtitle: '原创短剧 · 8集',
    tags: '复仇 · 爽文',
    cat: '复仇 爽文',
    image: 'linwan.png',
    filter: 'saturate(1.5) brightness(1.05)',
  },
  {
    id: 4,
    title: '致命记忆',
    subtitle: '原创短剧 · 10集',
    tags: '大女主 · 悬疑烧脑',
    cat: '大女主 悬疑烧脑',
    image: 'itachi.png',
    filter: 'hue-rotate(220deg) contrast(1.25)',
  },
  {
    id: 5,
    title: '谋断大秦',
    subtitle: '原创短剧 · 15集',
    tags: '权谋 · 爽文',
    cat: '权谋 爽文',
    image: 'itachi.png',
    filter: 'sepia(.55) contrast(1.15)',
  },
  {
    id: 6,
    title: '归途无声',
    subtitle: '原创短剧 · 6集',
    tags: '治愈 · 大女主',
    cat: '治愈 大女主',
    image: 'linwan.png',
    filter: 'brightness(1.15) saturate(.85)',
  },
  {
    id: 7,
    title: '龙脉觉醒',
    subtitle: '原创短剧 · 9集',
    tags: '大女主 · 逆袭',
    cat: '大女主 逆袭',
    image: 'corridor.jpg',
    filter: 'saturate(1.6) hue-rotate(30deg)',
  },
];

const VIRAL_TEMPLATES = [
  {
    id: 1,
    title: '逃跑男友',
    subtitle: '都市 · 甜宠反转 · 24集',
    playCount: '214w',
    image: 'linwan.png',
    filter: 'contrast(1.2) hue-rotate(300deg) saturate(1.3)',
  },
  {
    id: 2,
    title: '谋断大秦·朝堂局',
    subtitle: '古装 · 权谋碾压 · 15集',
    playCount: '168w',
    image: 'itachi.png',
    filter: 'sepia(.6) contrast(1.3) brightness(.9)',
  },
  {
    id: 3,
    title: '末日血源·觉醒篇',
    subtitle: '末世 · 大女主 · 12集',
    playCount: '97w',
    image: 'corridor.jpg',
    filter: 'hue-rotate(-40deg) saturate(1.7) contrast(1.25)',
  },
];

const TEMPLATE_MARKET = [
  {
    id: 1,
    title: '穿越者的\n宿命对峙',
    subtitle: '女频-轻小说 · 9:16 · 1集46s',
    cat: '穿越宿命 女频虐恋',
    playCount: '23.4w',
    image: 'itachi.png',
  },
  {
    id: 2,
    title: '开局知晓\n所有人结局',
    subtitle: '穿越 · 全知流 · 9:16',
    cat: '穿越宿命 女频虐恋',
    playCount: '18.9w',
    image: 'linwan.png',
  },
  {
    id: 3,
    title: '反派他哥\n今天也不想营业',
    subtitle: '男频 · 热血战斗 · 16:9',
    cat: '热血战斗',
    playCount: '15.2w',
    image: 'itachi.png',
    filter: 'hue-rotate(140deg) saturate(1.6) brightness(1.08)',
  },
  {
    id: 4,
    title: '我的店主\n是位剑仙',
    subtitle: '古风 · 轻喜 · 9:16',
    cat: '教育生活',
    playCount: '11.7w',
    image: 'corridor.jpg',
    filter: 'sepia(.5) saturate(1.3)',
  },
  {
    id: 5,
    title: '末日机甲\n修理铺',
    subtitle: '科幻 · 废土 · 16:9',
    cat: '热血战斗',
    playCount: '9.8w',
    image: 'corridor.jpg',
    filter: 'hue-rotate(190deg) saturate(1.7) contrast(1.15)',
  },
  {
    id: 6,
    title: '声音剧场：\n午夜电台',
    subtitle: '声音 · 悬疑 · 9:16',
    cat: '悬疑反转',
    playCount: '7.4w',
    image: 'linwan.png',
    filter: 'grayscale(.85) brightness(.8) contrast(1.2)',
  },
];

const STYLE_LIBRARY = [
  {
    id: 1,
    name: '赛博朋克电影',
    desc: '冷调霓虹 · 高对比光影 · 电影质感',
    gradient: 'linear-gradient(120deg,#0b1e3a,#3a2f6b 50%,#b537f2)',
    active: true,
  },
  {
    id: 2,
    name: '国漫写实',
    desc: '厚涂质感 · 东方面部特征 · 柔光',
    gradient: 'linear-gradient(120deg,#2b2320,#7a5c3a 55%,#c9a06a)',
    active: false,
  },
  {
    id: 3,
    name: '赛璐璐动画',
    desc: '日式动画 · 硬色块阴影 · 高饱和',
    gradient: 'linear-gradient(120deg,#f2e9dc,#f4a988 55%,#7ab8f2)',
    active: false,
  },
  {
    id: 4,
    name: '影视质感',
    desc: '自然光影 · 浅景深 · 纪实镜头感',
    gradient: 'linear-gradient(120deg,#1a1a1e,#4a4a52 55%,#8a8a94)',
    active: false,
  },
  {
    id: 5,
    name: '水墨国风',
    desc: '留白构图 · 墨色晕染 · 宣纸底',
    gradient: 'linear-gradient(120deg,#f4f1ea,#9aa3a8 50%,#3a4248)',
    active: false,
  },
  {
    id: 6,
    name: '像素复古',
    desc: '8-bit 像素 · 抖动渐变 · 电子感',
    gradient: 'repeating-linear-gradient(45deg,#1a1030 0 12px,#3a2f6b 12px 24px)',
    active: false,
  },
];

export default function IdeaPage() {
  const navigate = useNavigate();
  const [offChip, setOffChip] = useState('all');
  const [tplChip, setTplChip] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [decomposeModal, setDecomposeModal] = useState(false);
  const [currentDecompose, setCurrentDecompose] = useState<string | null>(null);

  const handleUseTemplate = (name: string) => {
    message.success(`已套用模板「${name}」· 进入创作`);
    setTimeout(() => navigate('/create'), 500);
  };

  const handleUseStyle = (name: string) => {
    message.success(`风格「${name}」已写入整体设定，将全局注入所有镜头`);
  };

  const handleDecompose = (name: string) => {
    const data = DECOMPOSE_DATA[name as keyof typeof DECOMPOSE_DATA];
    if (!data) {
      message.info('演示：拆解报告生成中…');
      return;
    }
    setCurrentDecompose(name);
    setDecomposeModal(true);
  };

  const handleUseDecompose = () => {
    setDecomposeModal(false);
    message.success('已套用该爆款结构 · 进入创作（节奏卡点已注入提示词模板）');
    setTimeout(() => navigate('/create'), 600);
  };

  const filteredOfficial = OFFICIAL_EXAMPLES.filter(
    (item) => offChip === 'all' || item.cat.includes(offChip)
  );

  const filteredTemplates = TEMPLATE_MARKET.filter(
    (item) =>
      (tplChip === 'all' || item.cat.includes(tplChip)) &&
      (searchText === '' ||
        item.title.includes(searchText) ||
        item.cat.includes(searchText))
  );

  const decomposeData = currentDecompose
    ? DECOMPOSE_DATA[currentDecompose as keyof typeof DECOMPOSE_DATA]
    : null;

  return (
    <div className="ds-viewInner">
      <h2 className="ds-h2">
        创意 <em>· 灵感市场</em>
      </h2>
      <div className="ds-sub2">
        爆款模板 · 风格库 · 创意对话 —— 套用即开拍，跳过冷启动
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Button type="primary" className="ds-grad" onClick={() => navigate('/creative/chat')}>
          💬 新建创意对话（图像 / 视频）
        </Button>
        <span style={{ fontSize: '11px', color: 'var(--ant-color-text-tertiary)' }}>
          对话式生成：提示词 → 参数确认（模型/画质/比例/数量/积分）→ 出图，支持抠图 / 擦除 / 改图 /
          扩图 / 变清晰
        </span>
      </div>

      <div className="ds-secHead">
        <h3>🏆 官方示例</h3>
        <span style={{ fontSize: '11px', color: 'var(--ant-color-text-tertiary)' }}>
          官方出品 · 点击标签筛选 · 「用此示例」自动填充创作参数
        </span>
      </div>

      <div className="ds-chips">
        {['全部', '科幻', '废土', '大女主', '爽文', '复仇', '悬疑烧脑', '权谋', '治愈', '逆袭'].map(
          (cat) => (
            <button
              key={cat}
              className={`ds-chip ${offChip === cat ? 'on' : ''}`}
              onClick={() => setOffChip(cat)}
            >
              {cat}
            </button>
          )
        )}
      </div>

      <div className="ds-canvasGrid">
        {filteredOfficial.map((item) => (
          <div key={item.id} className="ds-workCard" data-cat={item.cat}>
            <div className="ds-tplCover">
              <img
                className="bg"
                src={item.image}
                style={{ filter: item.filter }}
                alt={item.title}
              />
              <div className="cap">
                {item.title}
                <span className="sub">{item.subtitle}</span>
              </div>
              <span className="covTags">{item.tags}</span>
            </div>
            <div className="ds-tplOps">
              <span className="cnt">官方</span>
              <Button size="small" className="ds-ghost" onClick={() => handleUseTemplate(item.title)}>
                用此示例
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="ds-secHead" style={{ marginTop: '30px' }}>
        <h3>🔥 爆款拆解</h3>
        <span style={{ fontSize: '11px', color: 'var(--ant-color-text-tertiary)' }}>
          拆解爆款结构 → 套用到你的题材 · 一键复刻节奏与钩子
        </span>
      </div>

      <div className="ds-canvasGrid">
        {VIRAL_TEMPLATES.map((item) => (
          <div key={item.id} className="ds-workCard" onClick={() => handleDecompose(item.title)}>
            <div className="ds-tplCover">
              <img
                className="bg"
                src={item.image}
                style={{ filter: item.filter }}
                alt={item.title}
              />
              <div className="cap">
                {item.title}
                <span className="sub">{item.subtitle}</span>
              </div>
              <span className="tag" style={{ background: '#fb923c' }}>
                爆款拆解
              </span>
            </div>
            <div className="ds-tplOps">
              <span className="cnt">🔥 {item.playCount} 播放</span>
              <Button
                size="small"
                className="ds-ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDecompose(item.title);
                }}
              >
                查看拆解
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="ds-secHead" style={{ marginTop: '30px' }}>
        <h3>📦 模板市场</h3>
      </div>

      <div className="ds-chips">
        {['全部', '穿越宿命', '女频虐恋', '热血战斗', '悬疑反转', '教育生活'].map((cat) => (
          <button
            key={cat}
            className={`ds-chip ${tplChip === cat ? 'on' : ''}`}
            onClick={() => setTplChip(cat)}
          >
            {cat}
          </button>
        ))}
        <Input
          placeholder="🔍 搜索题材 / 标签 / 剧情要素"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 180, fontSize: '12px' }}
        />
      </div>

      <div className="ds-canvasGrid">
        {filteredTemplates.map((item) => (
          <div key={item.id} className="ds-workCard" data-cat={item.cat}>
            <div className="ds-tplCover">
              <img className="bg" src={item.image} style={{ filter: item.filter }} alt={item.title} />
              <div className="cap">
                {item.title}
                <span className="sub">{item.subtitle}</span>
              </div>
            </div>
            <div className="ds-tplOps">
              <span className="cnt">🔥 {item.playCount}</span>
              <Button size="small" className="ds-ghost" onClick={() => handleUseTemplate(item.title)}>
                用此创作
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="ds-secHead" style={{ marginTop: '30px' }}>
        <h3>🎨 风格库</h3>
        <span style={{ fontSize: '11px', color: 'var(--ant-color-text-tertiary)' }}>
          应用于「整体设定 · 视频风格」，全局注入所有镜头
        </span>
      </div>

      <div className="ds-styleGrid">
        {STYLE_LIBRARY.map((item) => (
          <div key={item.id} className="ds-styleCard" onClick={() => handleUseStyle(item.name)}>
            <div className="sw" style={{ background: item.gradient }}></div>
            <div className="nb">
              <b>{item.name}</b>
              <div className="d">{item.desc}</div>
              <div className="a">{item.active ? '当前项目使用中 →' : '点击应用'}</div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={decomposeModal}
        onCancel={() => setDecomposeModal(false)}
        title={`🔥 爆款拆解 · ${currentDecompose}`}
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button className="ds-ghost" onClick={() => setDecomposeModal(false)}>
              关闭
            </Button>
            <Button type="primary" className="ds-grad" onClick={handleUseDecompose}>
              用此结构创作
            </Button>
          </div>
        }
        width={520}
        className="ds-modal"
      >
        {decomposeData && (
          <>
            <div style={{ fontSize: '11px', color: 'var(--ant-color-text-tertiary)', marginBottom: '10px' }}>
              爆点密度（每 3s 一个情绪刺激 · 前 3 集完播率决定性指标）
            </div>
            <div style={{ marginBottom: '14px' }}>
              {decomposeData.bars.map((bar, idx) => (
                <div key={idx} className="ds-dcBar">
                  <span className="k">{bar[1]}</span>
                  <span className="tr">
                    <i style={{ width: `${bar[0]}%` }}></i>
                  </span>
                  <span className="v">{bar[0]} 爆度</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ant-color-text-tertiary)', margin: '14px 0 4px' }}>
              结构拆解（可直接套用到你的题材）
            </div>
            <div>
              {decomposeData.steps.map((step, idx) => (
                <div key={idx} className="ds-dcStep">
                  <span className="n">{idx + 1}</span>
                  <span className="d">{step}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
