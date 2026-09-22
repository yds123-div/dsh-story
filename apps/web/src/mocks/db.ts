import type {
  AppNotification,
  Asset,
  Episode,
  Model,
  ModelId,
  Outline,
  Project,
  Segment,
  Shot,
  StorageUsage,
  TaskStatus,
  Template,
  WorkflowState,
  WorkflowStep,
} from '../types/api';

const GB = 1024 * 1024 * 1024;
const DEMO_PROJECT_ID = 'proj-nming-muye';

// 示例资源挂在 Vite base 下（本地 /demo-assets，服务器 /deepsfv-dev/demo-assets）
const DA = `${import.meta.env.BASE_URL}demo-assets`;

// crypto.randomUUID 仅在安全上下文可用；HTTP + IP 访问的生产环境里会 undefined
function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type TaskKind = 'outline' | 'novel' | 'image' | 'episode-split' | 'video' | 'export' | 'creative-image' | 'creative-video';

type InternalTask = TaskStatus & {
  kind: TaskKind;
  projectId?: string;
  assetId?: string;
  segmentId?: string;
  episodeId?: string;
  model?: ModelId;
};

function nowIso(): string {
  return new Date().toISOString();
}

function seedProjects(): Project[] {
  return [
    {
      id: DEMO_PROJECT_ID,
      name: '逆命木叶',
      coverUrl: `${DA}/corridor.jpg`,
      updatedAt: '2026-09-17T18:20:00.000Z',
      status: 'in_progress',
      statusText: '进行中',
      assetCount: 5,
      characterCount: 4,
      sceneCount: 1,
      segmentCount: 3,
      durationSec: 37,
      creditBalance: 132,
      aspectRatio: '9:16',
      style: '赛博朋克电影',
    },
    {
      id: 'proj-naruto-brawl',
      name: '火影乱斗',
      coverUrl: null,
      updatedAt: '2026-09-16T21:04:00.000Z',
      status: 'archived',
      statusText: '已归档',
      assetCount: 2,
      characterCount: 2,
      sceneCount: 0,
      segmentCount: 4,
      durationSec: 46,
      creditBalance: 0,
      aspectRatio: '16:9',
      style: '国漫写实',
    },
  ];
}

const SCREENPLAY = `第一集：异世囚笼

【木叶长廊 内 夜】

木叶，夜晚长廊，月光冷白。
△ 林晚扶着廊柱，指尖颤抖，眼神茫然又痛苦，身着木叶制式素色和服。
林晚（低声独白）：明明只是在家看火影……一睁眼，就来到了这里。我知道所有人的结局，唯独不知道，自己该怎么活下去。
△ 鼬缓步从阴影走出，红瞳微光，神色淡漠。
鼬：深夜在此，有何目的。长老安排你，来监视我？
林晚（猛地抬头，眼眶泛红，声音发颤）：我不是来监视你的！鼬，我知道你将要背负什么，我不想看你走向那条绝路！
鼬（淡淡勾起唇角，带着悲凉）：预言？外来之人，不要妄言命运。
△ 鼬转身，衣摆扫过地面，不留一丝温情。
鼬：离我远一点，否则，你会被拖入深渊。
△ 黑屏字幕：我知晓你的悲剧，却无法改写。`;

function cloneAsset(asset: Asset): Asset {
  return { ...asset };
}

function nmingAssets(projectId: string): Asset[] {
  return [
    {
      id: `${projectId}-char-linwan`,
      projectId,
      type: 'character',
      name: '林晚',
      role: '主角',
      description: '现代穿越者，成为木叶孤女，知晓结局试图拯救鼬，却陷入权力漩涡。',
      imageUrl: null,
      emoji: null,
      consistencyLocked: true,
      status: 'pending',
      alts: [
        { name: '默认形象', imageUrl: `${DA}/linwan.png`, filter: '' },
        { name: '和服·雨夜湿发', imageUrl: `${DA}/linwan.png`, filter: 'brightness(.82) saturate(1.25) hue-rotate(14deg) contrast(1.08)' },
      ],
      currentAlt: 0,
      refs: ['c01 独白', 'c03 走位', 'c05 过肩近景', 'c06 泛红特写'],
    },
    {
      id: `${projectId}-char-itachi`,
      projectId,
      type: 'character',
      name: '宇智波鼬',
      role: '主角',
      description: '背负灭族悲剧的忍者，心思深沉，因任务与宿命被迫推开林晚。',
      imageUrl: null,
      emoji: null,
      consistencyLocked: true,
      status: 'pending',
      alts: [
        { name: '默认形象', imageUrl: `${DA}/itachi.png`, filter: '' },
        { name: '任务夜行装', imageUrl: `${DA}/itachi.png`, filter: 'brightness(.8) contrast(1.25) saturate(.85)' },
      ],
      currentAlt: 0,
      refs: ['c02 衣摆显露', 'c03 阴影走位', 'c04 质问中景', 'c06 悲凉特写'],
    },
    {
      id: `${projectId}-char-shisui`,
      projectId,
      type: 'character',
      name: '宇智波止水',
      role: '男二',
      description: '温柔守护型，暗中相救林晚，看穿她的心事并默默付出。',
      imageUrl: null,
      emoji: '🦋',
      consistencyLocked: false,
      status: 'pending',
      refs: ['第2集 草稿 预留'],
    },
    {
      id: `${projectId}-char-elder`,
      projectId,
      type: 'character',
      name: '木叶长老',
      role: '反派',
      description: '猜忌宇智波一族，利用林晚作为监视棋子挑起矛盾。',
      imageUrl: null,
      emoji: '🧙',
      consistencyLocked: false,
      status: 'pending',
      refs: ['第2集 草稿 预留'],
    },
    {
      id: `${projectId}-scene-corridor`,
      projectId,
      type: 'scene',
      name: '木叶长廊',
      role: '场景',
      description: '传统日式木质长廊，林晚与鼬深夜对峙的场所（月夜冷调）。',
      imageUrl: null,
      emoji: null,
      consistencyLocked: true,
      status: 'pending',
      refs: ['片段1 全景', '片段2 中景/过肩', '片段3 收暗'],
    },
  ];
}

function nmingOutline(projectId: string, projectName: string, finalized: boolean): Outline {
  return {
    projectId,
    projectName,
    finalized,
    setting: {
      videoStyle: '赛博朋克电影（冷调月夜 · 高对比光影）',
      aspectRatio: '9:16',
      resolution: '720P（会员可 1080P / 4K）',
      model: 'S 2.0-fast',
    },
    summary: {
      protagonists: '林晚、鼬',
      genre: '女频 - 轻小说',
      synopsis:
        '现代女孩林晚意外穿越到木叶村，成为一名普通的村落成员。由于知晓宇智波鼬即将背负罪名走向毁灭的悲惨宿命，她试图用自己的预知能力去拯救对方。然而，她的突然出现和反常举动引起了村落高层的怀疑，鼬也用冷漠将她推开。林晚在危机四伏的忍者世界里，不仅要艰难求生，还要寻找打破死局、逆转悲剧的方法。',
      background:
        '架空的二次元忍者世界，时间线处于木叶村宇智波一族惨案发生前夕。村内暗流涌动，高层与大家族之间充满政治博弈，忍者受制于严苛的村规与宿命。',
      setting:
        '视觉环境以传统日式木质长廊与建筑为主，常伴清冷月光与沉重阴影，角色身着制式素色和服或忍者服；世界观具有强烈宿命论特征，外来穿越者的先知视角与原住民的既定命运相互排斥，泄露未来会被视为危险的情报刺探；核心角色拥有被称为「写轮眼」的血继限界，发动时瞳孔呈红色微光，是力量与家族悲剧的核心视觉象征。',
    },
    extractedAssets: nmingAssets(projectId),
    screenplayTitle: '第1集 · 异世囚笼',
    screenplay: SCREENPLAY,
  };
}

function splitKind(kind: string): { shotType: string; camera: string } {
  const [shotType = '', camera = ''] = kind.split(' · ');
  return { shotType, camera };
}

function shot(
  id: string,
  durationSec: number,
  kind: string,
  action: string,
  extra: Partial<Pick<Shot, 'speaker' | 'voice' | 'line'>> = {},
): Shot {
  return {
    id,
    durationSec,
    ...splitKind(kind),
    action,
    speaker: extra.speaker ?? '',
    voice: extra.voice ?? '',
    line: extra.line ?? '',
  };
}

function nmingSegments(projectId: string): Segment[] {
  const episodeId = `${projectId}-ep-1`;
  const linwan = `${projectId}-char-linwan`;
  const itachi = `${projectId}-char-itachi`;
  const corridor = `${projectId}-scene-corridor`;
  const seg1Prompt = `@[${corridor}] 冷白月光洒在深色木地板上，两盏行灯未点亮，长廊空寂无声，只有不稳定的呼吸与轻微衣料声，由 2 个分镜组成。
分镜 1 ⏱ 4s @[${linwan}] 身着木叶制式素色和服，站在左侧近景原木廊柱旁一手扶柱，肩背未完全挺直，指尖贴柱细颤；视线游离长廊空处，低声独白：「明明只是在家看火影……一睁眼，就来到了这里。我知道所有人的结局，唯独不知道，自己该怎么活下去。」
分镜 2 ⏱ 9s 切面部特写：阴影边缘压出 @[${itachi}] 墨黑长袍衣摆一角，红色瞳孔先于面容显出微光；林晚听见缓慢脚步，胸口起伏骤停，眼睑微抬，视线转向右侧深处阴影，仍扶柱未动。`;
  const seg2Prompt = `整体背景：场景设定在 @[${corridor}]，由 3 个分镜组成。
分镜 1 ⏱ 3s 中景，镜头缓慢向左平移，冷白月光斜射粗糙木质地板形成明暗对比；@[${linwan}] 与 @[${itachi}] 相对而站，鼬在画面左侧深处廊柱阴影中缓步走向镜头前的林晚，停步对视，眉头微压、表情平静。
分镜 2 ⏱ 4s 中景固定镜头，石质地灯光晕照亮两人之间的木地板；两人视线交互，鼬眼睑微收、目光锐利、眉头向内皱起，开口质问：「深夜在此，有何目的。长老安排你，来监视我？」
分镜 3 ⏱ 7s 近景，越过鼬的右肩拍向画面右侧深处的林晚，冷月光打在林晚半边脸上；她起初略微低头，随后头部迅速抬起，眉头痛苦地蹙在一起，双眼微微睁大且眼眶泛红，急切否认：「我不是来监视你的！鼬，我知道你将要背负什么，我不想看你走向那条绝路！」`;
  const seg3Prompt = `@[${corridor}] 月光稳定，行灯未亮，现场空寂只余两人呼吸，由 2 个分镜组成。
分镜 1 ⏱ 6s @[${linwan}] 视线死死定在 @[${itachi}] 脸上，眼眶泛红：「我不想看你走向那条绝路！」鼬眼睑轻收窄，唇角极浅勾起便被红瞳深处的悲凉拖冷：「预言？外来之人，不要妄言命运。」随即肩线转开，原地转向月洞门方向。
分镜 2 ⏱ 4s 鼬背向林晚，肩背稳定没有回头，低沉警告：「离我远一点，否则，你会被拖入深渊。」警告落下，林晚双手扶柱、身体无力下滑，指尖细颤传到袖口；画面收暗，居中白色字幕：「我知晓你的悲剧，却无法改写。」`;
  return [
    {
      id: `${episodeId}-seg-1`,
      episodeId,
      projectId,
      no: 1,
      title: '穿越惊惶 · 扶柱独白',
      durationSec: 13,
      generated: true,
      videoUrl: `${DA}/clip1.mp4`,
      prompt: seg1Prompt,
      charCount: 420,
      model: 'seedance-2.5',
      shots: [
        shot(
          'c01',
          4,
          '全景',
          '林晚穿端正完整的木叶制式素色和服，站在廊柱旁以一手撑住柱身，肩背未完全挺直；视线游离长廊空处，喉间压下一口发颤的气，指尖贴着木面细细抖动。',
          {
            speaker: '林晚（惊惶痛苦，低声断续）',
            line: '明明只是在家看火影……一睁眼，就来到了这里。我知道所有人的结局，唯独不知道，自己该怎么活下去。',
          },
        ),
        shot(
          'c02',
          9,
          '特写→近景',
          '阴影边缘先压出鼬墨黑色长袍的一角，厚实衣摆随稳定步伐掠过幽暗木地板；红色瞳孔先于完整面容显出微光。林晚听见缓慢脚步，胸口起伏短促停住，眼睑微抬，视线从空长廊转向右侧深处阴影中的鼬，仍扶柱未动。',
        ),
      ],
    },
    {
      id: `${episodeId}-seg-2`,
      episodeId,
      projectId,
      no: 2,
      title: '质问与否认',
      durationSec: 14,
      generated: true,
      videoUrl: `${DA}/clip2.mp4`,
      prompt: seg2Prompt,
      charCount: 742,
      model: 'seedance-2.5',
      shots: [
        shot(
          'c03',
          3,
          '中景 · 缓慢左移',
          '冷白月光斜射粗糙木质地板形成明暗对比；林晚与鼬相对而站，鼬在画面左侧深处廊柱阴影中缓步走向镜头前的林晚，停步对视，眉头微压、表情平静。',
        ),
        shot(
          'c04',
          4,
          '中景 · 固定',
          '石质地灯光晕照亮两人之间的木地板；两人视线交互，鼬眼睑微收、目光锐利、眉头向内皱起。',
          {
            speaker: '鼬',
            voice: '[音调偏低，音色质感冷硬偏沉，声音厚重扎实，发音方式字正腔圆，气息平稳绵长，正常语速]',
            line: '深夜在此，有何目的。长老安排你，来监视我？',
          },
        ),
        shot(
          'c05',
          7,
          '近景 · 过肩（越鼬右肩）',
          '冷月光打在林晚半边脸上；她起初略微低头，随后头部迅速抬起，眉头痛苦地蹙在一起，双眼微微睁大且眼眶泛红，急切否认。',
          {
            speaker: '林晚',
            voice: '[音调偏低，音色质感细腻柔软，声音适中，气息起伏带颤抖，快速语速]',
            line: '我不是来监视你的！鼬，我知道你将要背负什么，我不想看你走向那条绝路！',
          },
        ),
      ],
    },
    {
      id: `${episodeId}-seg-3`,
      episodeId,
      projectId,
      no: 3,
      title: '预言 · 警告 · 无力挽留',
      durationSec: 10,
      generated: false,
      videoUrl: null,
      prompt: seg3Prompt,
      charCount: 386,
      model: null,
      shots: [
        shot(
          'c06',
          6,
          '特写',
          '林晚视线死死定在鼬脸上，喉咙在「绝路」处明显收紧；鼬眼睑轻轻收窄，唇角极浅地勾起一点弧度，笑意刚形成便被红瞳深处的悲凉拖冷，随即肩线转开，原地转向背景月洞门。',
          {
            speaker: '林晚 → 鼬',
            line: '「我不想看你走向那条绝路！」 / 「预言？外来之人，不要妄言命运。」',
          },
        ),
        shot(
          'c07',
          4,
          '中景 → 黑屏',
          '鼬背向林晚朝向长廊深处，肩背稳定没有回头；警告落下后林晚双手扶柱、身体无力下滑，泛红的眼睛停在鼬背影上。画面收暗切黑，居中出现白色字幕。',
          {
            speaker: '鼬（冷淡警告，低沉缓慢）',
            line: '离我远一点，否则，你会被拖入深渊。 △ 黑屏字幕：我知晓你的悲剧，却无法改写。',
          },
        ),
      ],
    },
  ];
}

const MODELS: Model[] = [
  { id: 'seedance-2.5', name: 'Seedance 2.5' },
  { id: 'minimax-h3-max', name: 'Minimax H3 Max' },
  { id: 'wan-3.0', name: 'Wan 3.0' },
];

const MODEL_IDS = new Set<string>(MODELS.map((m) => m.id));

function officialTemplates(): Template[] {
  return [
    {
      id: 'tpl-star-beyond',
      name: '星环之外',
      subtitle: '自由画布 · 9:16',
      tags: ['科幻', '废土'],
      coverUrl: `${DA}/corridor.jpg`,
      coverFilter: 'hue-rotate(200deg) saturate(1.5) brightness(.9)',
      style: '赛博朋克电影',
      aspectRatio: '9:16',
      scriptText:
        '【星港外环 外 夜】\n废土星港的霓虹在沙尘里碎成光斑。\n△ 女驾驶员扶着舷窗，呼吸器起雾。\n独白：星环之外没有航图，只有被放逐的人。',
    },
    {
      id: 'tpl-blood-origin',
      name: '末日血源',
      subtitle: '原创短剧 · 12集',
      tags: ['大女主', '废土'],
      coverUrl: `${DA}/corridor.jpg`,
      coverFilter: 'hue-rotate(-30deg) saturate(1.8) contrast(1.2)',
      style: '赛博朋克电影',
      aspectRatio: '9:16',
      scriptText:
        '【避难所 内 夜】\n铁门被砸响。\n△ 女主把幼妹推进暗道，自己转身面对裂开的门缝。\n女主：今晚之后，血脉只为活人燃烧。',
    },
    {
      id: 'tpl-true-heiress',
      name: '真千金觉醒',
      subtitle: '原创短剧 · 8集',
      tags: ['复仇', '爽文'],
      coverUrl: `${DA}/linwan.png`,
      coverFilter: 'saturate(1.5) brightness(1.05)',
      style: '国漫写实',
      aspectRatio: '9:16',
      scriptText:
        '【宴会厅 内 夜】\n假千金当众揭穿她的身世。\n△ 女主抬眼，笑意冷下来。\n女主：DNA 报告在律师手里。从今晚起，请叫我真千金。',
    },
    {
      id: 'tpl-fatal-memory',
      name: '致命记忆',
      subtitle: '原创短剧 · 10集',
      tags: ['大女主', '悬疑烧脑'],
      coverUrl: `${DA}/itachi.png`,
      coverFilter: 'hue-rotate(220deg) contrast(1.25)',
      style: '赛博朋克电影',
      aspectRatio: '9:16',
      scriptText:
        '【审讯室 内 日】\n她不记得昨夜。\n△ 监控回放里，她自己推开了那扇门。\n女主：如果记忆是伪造的，那凶手会不会就是我。',
    },
    {
      id: 'tpl-qin-scheme',
      name: '谋断大秦',
      subtitle: '原创短剧 · 15集',
      tags: ['权谋', '爽文'],
      coverUrl: `${DA}/itachi.png`,
      coverFilter: 'sepia(.55) contrast(1.15)',
      style: '国漫写实',
      aspectRatio: '9:16',
      scriptText:
        '【咸阳宫 内 日】\n质子当殿受辱，群臣窃笑。\n△ 他低头，袖中玉玦被捏出一道白痕。\n男主：今日之辱，我会一笔一笔讨回。',
    },
    {
      id: 'tpl-silent-return',
      name: '归途无声',
      subtitle: '原创短剧 · 6集',
      tags: ['治愈', '大女主'],
      coverUrl: `${DA}/linwan.png`,
      coverFilter: 'brightness(1.15) saturate(.85)',
      style: '国漫写实',
      aspectRatio: '9:16',
      scriptText:
        '【小镇车站 外 晨】\n她提着旧行李箱下车，没有人来接。\n△ 风把站台的银杏吹成金色。\n女主：先把灯打开，再把日子过回去。',
    },
    {
      id: 'tpl-dragon-vein',
      name: '龙脉觉醒',
      subtitle: '原创短剧 · 9集',
      tags: ['大女主', '逆袭'],
      coverUrl: `${DA}/corridor.jpg`,
      coverFilter: 'saturate(1.6) hue-rotate(30deg)',
      style: '国漫写实',
      aspectRatio: '9:16',
      scriptText:
        '【宗门大殿 内 夜】\n废灵根被当众剥夺名籍。\n△ 她掌心忽然亮起金纹。\n女主：龙脉醒了。从今天起，谁都别再替我决定命运。',
    },
  ];
}

function seedNotifications(): AppNotification[] {
  return [
    { id: 'ntf-1', icon: '✅', title: '片段 1 视频已生成（480P · 13s）', time: '2 分钟前', read: false },
    { id: 'ntf-2', icon: '🎭', title: '形象资产已生成：4 角色 + 1 场景，一致性已锁定', time: '1 小时前', read: false },
    { id: 'ntf-3', icon: '◆', title: '积分消耗 ◆60 · 进入片段编辑器', time: '1 小时前', read: false },
    { id: 'ntf-4', icon: '🎬', title: '分集拆分完成：第1集 · 异世囚笼（3 片段 / 37s）', time: '昨天', read: true },
    { id: 'ntf-5', icon: '📢', title: '系统公告：Seedance 2.5 视频模型已全量开放', time: '昨天', read: true },
    { id: 'ntf-6', icon: '💡', title: '新模板上架：官方示例《星环之外》可一键套用', time: '2 天前', read: true },
  ];
}

function nmingEpisodes(projectId: string): Episode[] {
  return [
    {
      id: `${projectId}-ep-1`,
      projectId,
      number: 1,
      title: '异世囚笼',
      status: 'split',
      segmentCount: 3,
      durationSec: 37,
      coverUrl: `${DA}/corridor.jpg`,
      summary: '片段1 穿越惊惶(13s) ｜ 片段2 质问与否认(14s) ｜ 片段3 预言·警告·无力挽留(10s)',
      segments: [
        { no: 1, title: '穿越惊惶', durationSec: 13 },
        { no: 2, title: '质问与否认', durationSec: 14 },
        { no: 3, title: '预言·警告·无力挽留', durationSec: 10 },
      ],
    },
    {
      id: `${projectId}-ep-2`,
      projectId,
      number: 2,
      title: '未命名',
      status: 'draft',
      segmentCount: 0,
      durationSec: 0,
      coverUrl: null,
      summary: '草稿 · 由第1集结尾钩子自动延展：林晚被高层约谈 · 止水暗中现身提醒',
      segments: [],
    },
  ];
}

function defaultWorkflow(projectId: string): WorkflowState {
  return {
    projectId,
    unlockedStep: 1,
    outlineFinalized: false,
    assetsCompleted: false,
  };
}

function imageUrlFor(asset: Asset): string | null {
  if (asset.id.endsWith('-char-linwan')) return `${DA}/linwan.png`;
  if (asset.id.endsWith('-char-itachi')) return `${DA}/itachi.png`;
  if (asset.id.endsWith('-scene-corridor')) return `${DA}/corridor.jpg`;
  return null;
}

let projects = seedProjects();
let creditsBalance = 940;
const storage: StorageUsage = {
  usedBytes: Math.round(3.4 * GB),
  quotaBytes: 10 * GB,
  retentionDays: 30,
};

let outlines = new Map<string, Outline>();
let assets = new Map<string, Asset>();
let episodes = new Map<string, Episode[]>();
let segments = new Map<string, Segment>();
let workflows = new Map<string, WorkflowState>();
let notifications = seedNotifications();

const tasks = new Map<string, InternalTask>();
const taskTimers = new Map<string, ReturnType<typeof setTimeout>>();

function putAssets(list: Asset[]): void {
  for (const asset of list) assets.set(asset.id, cloneAsset(asset));
}

function assetsForProject(projectId: string): Asset[] {
  return [...assets.values()].filter((a) => a.projectId === projectId).map(cloneAsset);
}

function ensureOutlineAndAssets(projectId: string): Outline | undefined {
  const existing = outlines.get(projectId);
  if (existing) return cloneOutline(existing);
  const project = projects.find((p) => p.id === projectId);
  if (!project) return undefined;
  const outline = nmingOutline(projectId, project.name, false);
  outlines.set(projectId, outline);
  putAssets(nmingAssets(projectId));
  if (!workflows.has(projectId)) workflows.set(projectId, defaultWorkflow(projectId));
  return cloneOutline(outline);
}

function cloneOutline(outline: Outline): Outline {
  return {
    ...outline,
    setting: { ...outline.setting },
    summary: { ...outline.summary },
    extractedAssets: assetsForProject(outline.projectId).filter((a) => a.type !== 'material'),
  };
}

function cloneWorkflow(state: WorkflowState): WorkflowState {
  return { ...state };
}

function seedDemoContent(): void {
  const outline = nmingOutline(DEMO_PROJECT_ID, '逆命木叶', false);
  outlines.set(DEMO_PROJECT_ID, outline);
  putAssets(nmingAssets(DEMO_PROJECT_ID));
  workflows.set(DEMO_PROJECT_ID, { ...defaultWorkflow(DEMO_PROJECT_ID), unlockedStep: 3, outlineFinalized: true, assetsCompleted: true });
  episodes.set(DEMO_PROJECT_ID, nmingEpisodes(DEMO_PROJECT_ID));
  putSegments(nmingSegments(DEMO_PROJECT_ID));
}

export function resetDb(): void {
  for (const t of taskTimers.values()) clearTimeout(t);
  taskTimers.clear();
  tasks.clear();
  projects = seedProjects();
  creditsBalance = 940;
  outlines = new Map();
  assets = new Map();
  episodes = new Map();
  segments = new Map();
  workflows = new Map();
  notifications = seedNotifications();
  seedDemoContent();
}

seedDemoContent();

export function getProjects(): Project[] {
  return projects.map((p) => ({ ...p }));
}

export function getStorage(): StorageUsage {
  return { ...storage };
}

export function getCreditsBalance(): number {
  return creditsBalance;
}

export function addProject(input: {
  name: string;
  aspectRatio?: string;
  style?: string;
}): Project {
  const project: Project = {
    id: `proj-${randomId()}`,
    name: input.name,
    coverUrl: null,
    updatedAt: nowIso(),
    status: 'in_progress',
    statusText: '进行中',
    assetCount: 0,
    characterCount: 0,
    sceneCount: 0,
    segmentCount: 0,
    durationSec: 0,
    creditBalance: 0,
    aspectRatio: input.aspectRatio ?? '9:16',
    style: input.style ?? '赛博朋克电影',
  };
  projects = [project, ...projects];
  workflows.set(project.id, defaultWorkflow(project.id));
  return { ...project };
}

export function renameProject(id: string, name: string): Project | null {
  const found = projects.find((p) => p.id === id);
  if (!found) return null;
  found.name = name;
  found.updatedAt = nowIso();
  const outline = outlines.get(id);
  if (outline) outline.projectName = name;
  return { ...found };
}

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function getTaskRecord(id: string): TaskStatus | undefined {
  const t = tasks.get(id);
  return t ? { taskId: t.taskId, status: t.status, progress: t.progress, result: t.result, error: t.error } : undefined;
}

export function getOutlineRecord(projectId: string): Outline | undefined {
  const outline = outlines.get(projectId);
  return outline ? cloneOutline(outline) : undefined;
}

export function getWorkflowRecord(projectId: string): WorkflowState | undefined {
  if (!getProject(projectId)) return undefined;
  const existing = workflows.get(projectId);
  if (existing) return cloneWorkflow(existing);
  const created = defaultWorkflow(projectId);
  workflows.set(projectId, created);
  return cloneWorkflow(created);
}

function setWorkflow(projectId: string, patch: Partial<WorkflowState>): WorkflowState {
  const current = getWorkflowRecord(projectId) ?? defaultWorkflow(projectId);
  const next: WorkflowState = {
    ...current,
    ...patch,
    projectId,
    unlockedStep: Math.max(current.unlockedStep, patch.unlockedStep ?? current.unlockedStep) as WorkflowStep,
  };
  workflows.set(projectId, next);
  return cloneWorkflow(next);
}

export function finalizeOutlineRecord(projectId: string): WorkflowState | undefined {
  const outline = outlines.get(projectId);
  if (!outline) return undefined;
  outline.finalized = true;
  return setWorkflow(projectId, { outlineFinalized: true, unlockedStep: 2 });
}

export function listAssetRecords(projectId: string): Asset[] | undefined {
  if (!getProject(projectId)) return undefined;
  ensureOutlineAndAssets(projectId);
  return assetsForProject(projectId);
}

export function patchAssetRecord(assetId: string, body: { consistencyLocked?: boolean; currentAlt?: number }): Asset | undefined {
  const found = assets.get(assetId);
  if (!found) return undefined;
  if (body.consistencyLocked !== undefined) found.consistencyLocked = body.consistencyLocked;
  if (body.currentAlt !== undefined) found.currentAlt = body.currentAlt;
  return cloneAsset(found);
}

export function completeAssetsRecord(projectId: string): WorkflowState | undefined {
  const workflow = getWorkflowRecord(projectId);
  if (!workflow || !workflow.outlineFinalized) return undefined;
  return setWorkflow(projectId, { assetsCompleted: true, unlockedStep: 3 });
}

export function listEpisodeRecords(projectId: string): Episode[] | undefined {
  if (!getProject(projectId)) return undefined;
  return (episodes.get(projectId) ?? []).map((e) => ({ ...e, segments: e.segments.map((s) => ({ ...s })) }));
}

function cloneSegment(segment: Segment): Segment {
  return { ...segment, shots: segment.shots.map((s) => ({ ...s })) };
}

function cloneEpisode(episode: Episode): Episode {
  return { ...episode, segments: episode.segments.map((s) => ({ ...s })) };
}

function putSegments(list: Segment[]): void {
  for (const segment of list) segments.set(segment.id, cloneSegment(segment));
}

function findEpisode(episodeId: string): Episode | undefined {
  for (const list of episodes.values()) {
    const found = list.find((e) => e.id === episodeId);
    if (found) return found;
  }
  return undefined;
}

export function getEpisodeRecord(episodeId: string): Episode | undefined {
  const found = findEpisode(episodeId);
  return found ? cloneEpisode(found) : undefined;
}

export function listSegmentRecords(episodeId: string): Segment[] | undefined {
  if (!findEpisode(episodeId)) return undefined;
  return [...segments.values()]
    .filter((s) => s.episodeId === episodeId)
    .sort((a, b) => a.no - b.no)
    .map(cloneSegment);
}

export function patchSegmentRecord(
  segmentId: string,
  body: { prompt?: string; shots?: Shot[]; title?: string },
): Segment | undefined {
  const found = segments.get(segmentId);
  if (!found) return undefined;
  if (body.prompt !== undefined) {
    found.prompt = body.prompt;
    found.charCount = body.prompt.length;
  }
  if (body.shots !== undefined) found.shots = body.shots.map((s) => ({ ...s }));
  if (body.title !== undefined) found.title = body.title;
  return cloneSegment(found);
}

export function createSegmentRecord(
  episodeId: string,
  body: { prompt: string; durationSec: number; title: string },
): Segment | undefined {
  const episode = findEpisode(episodeId);
  if (!episode) return undefined;
  const existing = listSegmentRecords(episodeId) ?? [];
  const nextNo = existing.length + 1;
  const newSegment: Segment = {
    id: `${episodeId}-seg-${nextNo}`,
    episodeId,
    projectId: episode.projectId,
    no: nextNo,
    title: body.title,
    durationSec: body.durationSec,
    generated: false,
    videoUrl: null,
    prompt: body.prompt,
    shots: [],
    model: null,
    charCount: body.prompt.length,
  };
  segments.set(newSegment.id, newSegment);
  return cloneSegment(newSegment);
}

export function listModelRecords(): Model[] {
  return MODELS.map((m) => ({ ...m }));
}

export function listTemplateRecords(): Template[] {
  return officialTemplates();
}

export function listNotificationRecords(): AppNotification[] {
  return notifications.map((n) => ({ ...n }));
}

export function isModelId(value: string): value is ModelId {
  return MODEL_IDS.has(value);
}

function jitter(minMs: number, maxMs: number): number {
  if (import.meta.env.MODE === 'test') return 5;
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

function schedule(taskId: string, fn: () => void, ms: number): void {
  const prev = taskTimers.get(taskId);
  if (prev) clearTimeout(prev);
  taskTimers.set(taskId, setTimeout(fn, ms));
}

function finishTask(task: InternalTask): void {
  task.status = 'succeeded';
  task.progress = 100;
  if (task.kind === 'outline' && task.projectId) {
    ensureOutlineAndAssets(task.projectId);
    task.result = { projectId: task.projectId };
    return;
  }
  if (task.kind === 'novel' && task.projectId) {
    ensureOutlineAndAssets(task.projectId);
    task.result = { projectId: task.projectId };
    return;
  }
  if (task.kind === 'image' && task.assetId) {
    const asset = assets.get(task.assetId);
    if (asset) {
      asset.imageUrl = imageUrlFor(asset);
      asset.status = 'ready';
      task.result = { assetId: asset.id, imageUrl: asset.imageUrl };
    }
    return;
  }
  if (task.kind === 'episode-split' && task.projectId) {
    if (!episodes.has(task.projectId)) {
      episodes.set(task.projectId, nmingEpisodes(task.projectId));
      putSegments(nmingSegments(task.projectId));
    }
    task.result = { projectId: task.projectId, episodeCount: 1 };
    return;
  }
  if (task.kind === 'video' && task.segmentId) {
    const segment = segments.get(task.segmentId);
    if (segment) {
      segment.generated = true;
      segment.videoUrl = `${import.meta.env.BASE_URL}demo-assets/clip${segment.no}.mp4`;
      segment.model = task.model ?? segment.model;
      task.result = { segmentId: segment.id, videoUrl: segment.videoUrl, model: segment.model };
    }
    return;
  }
  if (task.kind === 'export' && task.episodeId) {
    const episode = findEpisode(task.episodeId);
    const project = episode ? getProject(episode.projectId) : undefined;
    const name = project?.name ?? 'DeepSFV';
    const epNo = episode?.number ?? 1;
    task.result = {
      downloadUrl: `${DA}/clip1.mp4`,
      fileName: `${name}_第${epNo}集_720P.mp4`,
    };
  }
  if (task.kind === 'creative-image') {
    const mediaUrl = Math.random() < 0.5 ? `${DA}/linwan.png` : `${DA}/itachi.png`;
    task.result = { mediaUrl, kind: 'image' };
    return;
  }
  if (task.kind === 'creative-video') {
    task.result = { mediaUrl: `${DA}/clip1.mp4`, kind: 'video' };
    return;
  }
}

function advanceTask(taskId: string): void {
  const task = tasks.get(taskId);
  if (!task) return;
  if (task.status === 'pending') {
    task.status = 'running';
    task.progress = 8;
    schedule(taskId, () => advanceTask(taskId), jitter(700, 1600));
    return;
  }
  if (task.status === 'running') {
    const next = Math.min(100, task.progress + 12 + Math.floor(Math.random() * 18));
    task.progress = next;
    if (next >= 100) {
      finishTask(task);
      return;
    }
    schedule(taskId, () => advanceTask(taskId), jitter(700, 1600));
  }
}

function createTask(
  kind: TaskKind,
  extra: { projectId?: string; assetId?: string; segmentId?: string; episodeId?: string; model?: ModelId },
): TaskStatus {
  const taskId = `task-${randomId()}`;
  const task: InternalTask = {
    taskId,
    status: 'pending',
    progress: 0,
    kind,
    ...extra,
  };
  tasks.set(taskId, task);
  schedule(taskId, () => advanceTask(taskId), jitter(800, 1800));
  return { taskId, status: 'pending', progress: 0 };
}

export function createOutlineTask(projectId: string): TaskStatus {
  return createTask('outline', { projectId });
}

export function createNovelTask(projectId: string): TaskStatus {
  return createTask('novel', { projectId });
}

export function createAssetImageTask(assetId: string): TaskStatus | undefined {
  const asset = assets.get(assetId);
  if (!asset) return undefined;
  return createTask('image', { assetId, projectId: asset.projectId });
}

export function createEpisodeSplitTask(projectId: string): TaskStatus | undefined {
  const workflow = getWorkflowRecord(projectId);
  if (!workflow?.assetsCompleted) return undefined;
  return createTask('episode-split', { projectId });
}

export function createSegmentVideoTask(segmentId: string, model: ModelId): TaskStatus | undefined {
  const segment = segments.get(segmentId);
  if (!segment) return undefined;
  return createTask('video', { segmentId, projectId: segment.projectId, model });
}

export function createEpisodeExportTask(episodeId: string): TaskStatus | undefined {
  const episode = findEpisode(episodeId);
  if (!episode || episode.status !== 'split') return undefined;
  return createTask('export', { episodeId, projectId: episode.projectId });
}

export function createCreativeTask(kind: 'creative-image' | 'creative-video'): TaskStatus {
  return createTask(kind, {});
}
