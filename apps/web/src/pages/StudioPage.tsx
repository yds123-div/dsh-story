import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { App, Button, Modal, Progress, Select } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useTask } from '../hooks/useTask';
import {
  createSegment,
  getEpisode,
  listAssets,
  listEpisodes,
  listModels,
  listSegments,
  patchSegment,
  submitEpisodeExportTask,
  submitSegmentVideoTask,
} from '../lib/api';
import { assetPreviewUrl } from '../lib/assets';
import { generationCost } from '../lib/generationCost';
import { insertAssetMention, parsePromptParts } from '../lib/promptMentions';
import type { Asset, Episode, Model, ModelId, Segment, Shot } from '../types/api';

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function chipClass(asset: Asset | undefined): string {
  if (asset?.type === 'scene') return 'scene';
  return 'role';
}

function MentionChip({ asset, assetId }: { asset: Asset | undefined; assetId: string }) {
  const thumb = asset ? assetPreviewUrl(asset) : null;
  return (
    <span className={`ds-refChip ${chipClass(asset)}`}>
      <span className="th">
        {thumb ? <img src={thumb} alt="" /> : (asset?.emoji ?? assetId.slice(-1))}
      </span>
      {asset?.name ?? assetId}
    </span>
  );
}

function PromptView({ prompt, assets }: { prompt: string; assets: Asset[] }) {
  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  return (
    <div className="ds-promptText">
      {parsePromptParts(prompt).map((part, i) =>
        part.kind === 'mention' ? (
          <MentionChip key={`${part.assetId}-${i}`} asset={byId.get(part.assetId)} assetId={part.assetId} />
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </div>
  );
}

export default function StudioPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id = '', episodeId = '' } = useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [cur, setCur] = useState(0);
  const [model, setModel] = useState<ModelId>('seedance-2.5');
  const [style, setStyle] = useState('赛博朋克电影');
  const [ratio, setRatio] = useState('9:16');
  const [resolution, setResolution] = useState('720P');
  const [editing, setEditing] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [openShot, setOpenShot] = useState<string | null>(null);
  const [draftShots, setDraftShots] = useState<Shot[]>([]);
  const [saving, setSaving] = useState(false);
  const [genTaskId, setGenTaskId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTaskId, setExportTaskId] = useState<string | null>(null);
  const [exportResolution, setExportResolution] = useState('720P');
  const [exportFormat, setExportFormat] = useState('MP4');
  const [exportWatermark, setExportWatermark] = useState('带平台角标');
  const [exportRange, setExportRange] = useState('整集');
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  const [globalSettingOpen, setGlobalSettingOpen] = useState(false);
  const [globalSetting, setGlobalSetting] = useState('【全局设定】画面风格：赛博朋克电影。全程人物边界独立，自然表演，人物无穿插、无穿透；全程禁止出现字幕（黑屏字幕分镜除外）、禁止角色变脸、变装、形象突变；杜绝肢体畸形、扭曲、残缺等人体结构错误；禁止画面闪烁、跳变、卡顿、帧异常；全程无背景音乐、无 BGM，只保留对白与现场环境声。\n\n（此设定注入第1集全部 3 个片段的每一次生成）');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [audioTracks, setAudioTracks] = useState<Array<{ name: string; duration: number; voice: string; status: string }>>([
    { name: 'c01 林晚 · 独白', duration: 4, voice: '细腻柔软 · 气息带颤', status: '已合成' },
    { name: 'c04 鼬 · 质问', duration: 4, voice: '冷硬偏沉 · 字正腔圆', status: '已合成' },
    { name: 'c05 林晚 · 否认', duration: 7, voice: '急促带颤 · 快速语速', status: '待生成' },
    { name: '环境声 · 夜风/衣料', duration: 37, voice: '现场底声 · 无 BGM', status: '已合成' },
  ]);
  const [multiMode, setMultiMode] = useState(false);
  const [selectedSegments, setSelectedSegments] = useState<Set<number>>(new Set());
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const segment = segments[cur];
  const totalDur = segments.reduce((a, s) => a + s.durationSec, 0);
  const cost = generationCost(segment?.generated ?? false);

  const { task: genTask } = useTask(genTaskId, {
    intervalMs: 2500,
    onSucceeded: async () => {
      const data = await listSegments(episodeId);
      setSegments(data.segments);
      setGenTaskId(null);
      message.success('片段视频已生成');
    },
    onFailed: (t) => message.error(t.error ?? '生成失败'),
  });

  const { task: exportTask } = useTask(exportTaskId, {
    intervalMs: 2500,
    onSucceeded: (t) => {
      const result = t.result as { downloadUrl?: string; fileName?: string } | undefined;
      if (result?.downloadUrl && result.fileName) {
        setDownload({ url: result.downloadUrl, name: result.fileName });
      }
      setExportTaskId(null);
    },
    onFailed: (t) => message.error(t.error ?? '合成失败'),
  });

  const generating = genTask != null && genTask.status !== 'failed' && genTask.status !== 'succeeded';
  const exporting = exportTask != null && exportTask.status !== 'failed' && exportTask.status !== 'succeeded';

  const genProgressSteps = [
    '排队中…',
    '注入全局负面设定…',
    '资产一致性对齐…',
    `生成关键帧（${style} · ${ratio}）…`,
    `视频合成 ${models.find((m) => m.id === model)?.name ?? model}…`,
    '音轨：对白 + 现场环境声…',
  ];
  const getGenProgressText = (progress: number, status: string): string => {
    if (status === 'pending') return genProgressSteps[0];
    if (status === 'failed') return '生成失败';
    if (status === 'succeeded') return '✓ 生成完成';
    const stepIndex = Math.min(genProgressSteps.length - 1, Math.floor(progress / 100 * genProgressSteps.length));
    return genProgressSteps[stepIndex];
  };

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const [ep, segs, assetData, modelData, episodeData] = await Promise.all([
        getEpisode(episodeId),
        listSegments(episodeId),
        listAssets(id),
        listModels(),
        listEpisodes(id),
      ]);
      if (cancelled) return;
      setEpisode(ep);
      setSegments(segs.segments);
      setAssets(assetData.assets);
      setModels(modelData.models);
      setEpisodes(episodeData.episodes);
      if (modelData.models[0]) setModel(modelData.models[0].id);
    };
    void boot().catch(() => {
      if (!cancelled) message.error('加载片段编辑器失败');
    });
    return () => {
      cancelled = true;
    };
  }, [episodeId, id, message]);

  useEffect(() => {
    if (!segment) return;
    setDraftPrompt(segment.prompt);
    setDraftShots(segment.shots.map((s) => ({ ...s })));
    setEditing(false);
    setOpenShot(null);
    setPlaying(false);
    setCurrentTime(0);
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
      vid.currentTime = 0;
    }
  }, [segment?.id]);

  const mentionOpen = editing && draftPrompt.slice(0, cursor).endsWith('@');

  const grouped = useMemo(
    () => ({
      character: assets.filter((a) => a.type === 'character'),
      scene: assets.filter((a) => a.type === 'scene'),
      prop: assets.filter((a) => a.type === 'prop'),
      material: assets.filter((a) => a.type === 'material'),
    }),
    [assets],
  );

  const toggleSegmentSelect = (index: number) => {
    setSelectedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const exitMultiMode = () => {
    setMultiMode(false);
    setSelectedSegments(new Set());
  };

  const handleBatchAction = (action: string) => {
    const selected = Array.from(selectedSegments);
    if (selected.length === 0) {
      message.warning('请先勾选要批量操作的片段');
      return;
    }
    if (action === 'batch_regen') {
      message.success(`已提交 ${selected.length} 个片段重新生成（演示：即时完成）`);
      exitMultiMode();
    } else if (action === 'batch_delete') {
      if (selected.length >= segments.length) {
        message.warning('至少保留 1 个片段');
        return;
      }
      const newSegments = segments.filter((_, i) => !selected.includes(i));
      setSegments(newSegments);
      setCur(0);
      message.success(`已删除 ${selected.length} 个片段`);
      exitMultiMode();
    } else if (action === 'batch_export') {
      message.success(`已加入导出队列：选中 ${selected.length} 个片段将拼接导出`);
      exitMultiMode();
    } else if (action === 'exit_multi') {
      exitMultiMode();
    }
  };

  const handleDragStart = (index: number) => {
    setDragFrom(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (dragFrom === null || dragFrom === targetIndex) return;
    const newSegments = [...segments];
    const [moved] = newSegments.splice(dragFrom, 1);
    newSegments.splice(targetIndex, 0, moved);
    setSegments(newSegments);
    setCur(targetIndex);
    setDragFrom(null);
    message.success(`片段顺序已调整：移至第 ${targetIndex + 1} 位`);
  };

  const addNewSegment = async () => {
    if (segments.length >= 8) {
      message.warning('演示上限：单集最多 8 个片段');
      return;
    }
    try {
      const newSegment = await createSegment(episodeId, {
        prompt: '（新片段 · 点击编辑提示词，@ 引用角色 / 场景 / 素材）',
        durationSec: 4,
        title: '新片段 · 待编排',
      });
      const newSegments = [...segments, newSegment];
      setSegments(newSegments);
      setCur(newSegments.length - 1);
      message.success(`片段 ${newSegment.no} 已创建（默认 4s · 4-15s 限制）`);
    } catch {
      message.error('创建片段失败');
    }
  };

  const insertAsset = (asset: Asset) => {
    const at = promptRef.current?.selectionStart ?? cursor;
    const next = insertAssetMention(editing ? draftPrompt : (segment?.prompt ?? ''), at, asset.id);
    setDraftPrompt(next.prompt);
    setCursor(next.cursor);
    setEditing(true);
    requestAnimationFrame(() => {
      const el = promptRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.cursor, next.cursor);
    });
    message.success(`已引用：${asset.name}`);
  };

  const saveSegment = async () => {
    if (!segment) return;
    setSaving(true);
    try {
      const updated = await patchSegment(segment.id, { prompt: draftPrompt, shots: draftShots });
      setSegments((list) => list.map((s) => (s.id === updated.id ? updated : s)));
      setEditing(false);
      message.success('分镜已保存');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const onGenerate = async () => {
    if (!segment) return;
    if (editing) await saveSegment();
    try {
      const { taskId } = await submitSegmentVideoTask(segment.id, { model });
      setGenTaskId(taskId);
    } catch {
      message.error('提交生成任务失败');
    }
  };

  const onExport = async () => {
    setDownload(null);
    try {
      const { taskId } = await submitEpisodeExportTask(episodeId, { resolution: exportResolution, format: exportFormat, watermark: exportWatermark });
      setExportTaskId(taskId);
    } catch {
      message.error('提交合成任务失败');
    }
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!segment?.generated || !vid) {
      message.info('当前片段尚未生成，请先点击「生成」');
      return;
    }
    if (playing) {
      vid.pause();
      setPlaying(false);
    } else {
      void vid.play();
      setPlaying(true);
    }
  };

  const seek = (event: MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    if (!segment?.generated || !vid) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    vid.currentTime = p * (vid.duration || segment.durationSec);
    setCurrentTime(vid.currentTime);
  };

  if (!episode || !segment) {
    return <div style={{ padding: 32, color: 'var(--ant-color-text-tertiary)' }}>加载片段…</div>;
  }

  if (episode.status !== 'split') {
    return (
      <div style={{ padding: 32 }}>
        <p>第{episode.number}集为草稿，待导演智能体拆分后进入编辑。</p>
        <Button className="ds-ghost ds-pill" onClick={() => navigate(`/project/${id}/episodes`)}>
          返回分集
        </Button>
      </div>
    );
  }

  const elapsed = segments.slice(0, cur).reduce((a, s) => a + s.durationSec, 0) + Math.min(currentTime, segment.durationSec);

  return (
    <div className="ds-studioPage">
      <div className="ds-studioHead">
        <button type="button" className="ds-back" onClick={() => navigate(`/project/${id}/episodes`)}>
          ‹
        </button>
        <div className="ds-selBox">
          <Select
            size="small"
            value={episodeId}
            onChange={(value) => navigate(`/project/${id}/episode/${value}`)}
            options={episodes.map((ep) => ({
              value: ep.id,
              label: `第${ep.number}集 · ${ep.title}`,
            }))}
            style={{ minWidth: 160 }}
          />
        </div>
        <span className="st">
          总片段数：<b>{segments.length}</b> ｜ 总时长：<b>{formatClock(totalDur)}</b>
        </span>
        <div className="right">
          <Button className="ds-ghost ds-pill" size="small" onClick={() => setGlobalSettingOpen(true)}>
            ⚙ 全局设定
          </Button>
          <Select
            size="small"
            value={model}
            onChange={setModel}
            options={models.map((m) => ({ value: m.id, label: m.name }))}
            style={{ minWidth: 140 }}
          />
          <Select
            size="small"
            value={style}
            onChange={setStyle}
            options={[
              { value: '赛博朋克电影', label: '🎨 赛博朋克电影' },
              { value: '国漫写实', label: '🎨 国漫写实' },
              { value: '赛璐璐动画', label: '🎨 赛璐璐动画' },
              { value: '水墨国风', label: '🎨 水墨国风' },
            ]}
            style={{ minWidth: 140 }}
          />
          <Select
            size="small"
            value={ratio}
            onChange={setRatio}
            options={[
              { value: '9:16', label: '9:16' },
              { value: '16:9', label: '16:9' },
              { value: '1:1', label: '1:1' },
            ]}
            style={{ minWidth: 90 }}
          />
          <Select
            size="small"
            value={resolution}
            onChange={setResolution}
            options={[
              { value: '480P', label: '480P' },
              { value: '720P', label: '720P' },
              { value: '1080P', label: '1080P (会员)' },
              { value: '4K', label: '4K (会员)' },
            ]}
            style={{ minWidth: 90 }}
          />
          <Button className="ds-ghost ds-pill" size="small" onClick={() => setExportOpen(true)}>
            ⬇ 合成
          </Button>
        </div>
      </div>

      <div className="ds-studioBody">
        <aside className="ds-libCol">
          <div className="h">资产库 <span className="add" onClick={() => message.info('演示：添加资产功能待实现')}>＋</span></div>
          {(['character', 'scene', 'prop', 'material'] as const).map((type) => (
            <div key={type}>
              <div className="ds-libSec">
                {type === 'character' ? '角色' : type === 'scene' ? '场景' : type === 'prop' ? '道具' : '素材'}
                <span>{grouped[type].length}</span>
              </div>
              {grouped[type].length === 0 ? (
                <div className="ds-libEmpty">暂无{type === 'prop' ? '道具' : '素材'}</div>
              ) : (
                grouped[type].map((asset) => {
                  const thumb = assetPreviewUrl(asset);
                  return (
                  <button key={asset.id} type="button" className="ds-libCard" onClick={() => insertAsset(asset)}>
                    <div className={`im${asset.type === 'scene' ? ' wide' : ''}`}>
                      {thumb ? <img src={thumb} alt={asset.name} /> : <span className="em">{asset.emoji ?? '⬚'}</span>}
                    </div>
                    <div className="nm">{asset.name}</div>
                  </button>
                  );
                })
              )}
            </div>
          ))}
        </aside>

        <div className="ds-editCol">
          <div className="ds-segTabs">
            {segments.map((s, i) => (
              <button key={s.id} type="button" className={`ds-segTab${i === cur ? ' on' : ''}`} onClick={() => setCur(i)}>
                片段 {s.no} · {s.durationSec}s
              </button>
            ))}
          </div>
          <div className="ds-editTip">
            片段时长请限制在 <b>4-15s</b>，输入 <b>@</b> 可引用角色、场景、素材
          </div>
          <div className="ds-promptBox">
            <div className="pbh">
              <h4>
                片段 {segment.no} · {segment.title}
              </h4>
              <span className={`ds-status ${segment.generated ? 'ok' : 'no'}`}>
                <i className="ds-dot" />
                {segment.generated ? '已生成' : '未生成'}
              </span>
              <span className="cnt">
                {editing ? draftPrompt.length : segment.charCount} / 9000
              </span>
              <Button size="small" className="ds-ghost ds-pill" onClick={() => (editing ? void saveSegment() : setEditing(true))} loading={saving}>
                {editing ? '保存分镜' : '编辑提示词'}
              </Button>
              <button type="button" className="ds-genBtn" disabled={generating} onClick={() => void onGenerate()}>
                {segment.generated ? '再次生成' : '生成'} <span className="fee">◆{cost}</span>
              </button>
            </div>
            {editing ? (
              <div className="ds-promptEditWrap">
                <textarea
                  ref={promptRef}
                  className="ds-promptEdit"
                  value={draftPrompt}
                  onChange={(e) => {
                    setDraftPrompt(e.target.value);
                    setCursor(e.target.selectionStart);
                  }}
                  onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
                  spellCheck={false}
                />
                {mentionOpen ? (
                  <div className="ds-mentionMenu">
                    {assets.map((asset) => (
                      <button key={asset.id} type="button" onClick={() => insertAsset(asset)}>
                        <MentionChip asset={asset} assetId={asset.id} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <PromptView prompt={segment.prompt} assets={assets} />
            )}
            {generating ? (
              <div className="ds-progWrap">
                <Progress percent={genTask?.progress ?? 0} strokeColor={{ from: '#8b5cf6', to: '#6366f1' }} />
                <div className="progTxt">
                  {getGenProgressText(genTask?.progress ?? 0, genTask?.status ?? 'pending')}
                </div>
              </div>
            ) : null}
            <div className="ds-shotList">
              <div className="ds-editTip" style={{ margin: '0 0 8px' }}>
                分镜详情（时长 / 景别 / 运镜 / 表演 / 台词 / 语音标注）
              </div>
              {draftShots.map((shot, idx) => {
                const open = openShot === shot.id;
                return (
                  <div key={shot.id} className={`ds-shotItem${open ? ' open' : ''}`}>
                    <button type="button" className="shotTop" onClick={() => setOpenShot(open ? null : shot.id)}>
                      <span className="shotId">{shot.id}</span>
                      <span className="shotDur">{shot.durationSec.toFixed(1)}s</span>
                      <span className="shotKind">{shot.camera ? `${shot.shotType} · ${shot.camera}` : shot.shotType}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ant-color-text-tertiary)' }}>
                        {open ? '收起' : '点击展开'}
                      </span>
                    </button>
                    {open ? (
                      <div className="shotBody">
                        <label>
                          时长（秒）
                          <input
                            type="number"
                            min={1}
                            max={15}
                            step={0.5}
                            value={shot.durationSec}
                            onChange={(e) => {
                              const next = [...draftShots];
                              next[idx] = { ...shot, durationSec: Number(e.target.value) };
                              setDraftShots(next);
                            }}
                          />
                        </label>
                        <label>
                          景别
                          <input
                            value={shot.shotType}
                            onChange={(e) => {
                              const next = [...draftShots];
                              next[idx] = { ...shot, shotType: e.target.value };
                              setDraftShots(next);
                            }}
                          />
                        </label>
                        <label>
                          运镜
                          <input
                            value={shot.camera}
                            onChange={(e) => {
                              const next = [...draftShots];
                              next[idx] = { ...shot, camera: e.target.value };
                              setDraftShots(next);
                            }}
                          />
                        </label>
                        <label>
                          表演
                          <textarea
                            value={shot.action}
                            onChange={(e) => {
                              const next = [...draftShots];
                              next[idx] = { ...shot, action: e.target.value };
                              setDraftShots(next);
                            }}
                          />
                        </label>
                        <label>
                          台词
                          <textarea
                            value={shot.line}
                            onChange={(e) => {
                              const next = [...draftShots];
                              next[idx] = { ...shot, line: e.target.value };
                              setDraftShots(next);
                            }}
                          />
                        </label>
                        <label>
                          语音标注
                          <input
                            value={shot.voice}
                            onChange={(e) => {
                              const next = [...draftShots];
                              next[idx] = { ...shot, voice: e.target.value };
                              setDraftShots(next);
                            }}
                          />
                        </label>
                        {shot.speaker ? <div className="shotLine"><span className="who">{shot.speaker}：</span>{shot.line}</div> : null}
                      </div>
                    ) : (
                      <div className="shotActPreview">{shot.action}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="ds-prevCol">
          <div className="ds-prevPanel">
            <div className="ds-prevBox">
              {segment.generated && segment.videoUrl ? (
                <video
                  ref={videoRef}
                  src={segment.videoUrl}
                  poster={`${import.meta.env.BASE_URL}demo-assets/corridor.jpg`}
                  playsInline
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onEnded={() => setPlaying(false)}
                />
              ) : (
                <div className="empty">
                  <div className="hex">▶</div>
                  当前片段视频尚未生成
                  <br />
                  <span style={{ fontSize: 10.5, opacity: 0.7 }}>点击左上「生成」开始创建</span>
                </div>
              )}
            </div>
            <div className="ds-prevBar">
              <button type="button" className="playBtn" onClick={togglePlay}>
                {playing ? '⏸' : '▶'}
              </button>
              <div className="pBar" onClick={seek}>
                <i style={{ width: `${Math.min(100, (currentTime / (segment.durationSec || 1)) * 100)}%` }} />
              </div>
              <span>
                {formatClock(currentTime)} / {formatClock(segment.durationSec)}
              </span>
            </div>
            <div className="ds-prevMeta">
              <span>{ratio} · {segment.generated ? '480P' : resolution}</span>
              <span>
                片段 {segment.no} · {segment.generated ? '真实生成结果' : '尚未生成'}
              </span>
            </div>
          </div>
          <div className="ds-audPanel">
            <div className="h">
              🎙 音画同出 · 音轨
              <span className="go" onClick={() => { message.loading('音画同出：按台词语音标注生成配音并与画面对齐…'); setTimeout(() => { setAudioTracks(audioTracks.map(t => ({ ...t, status: '已合成' }))); message.success('配音生成完成：对白 + 环境声已对齐画面时轴'); }, 1600); }}>
                生成配音
              </span>
            </div>
            <div className="ds-audList">
              {audioTracks.map((track, idx) => (
                <div key={idx} className="ds-audRow">
                  <span className="nm" title={track.name}>{track.name}</span>
                  <span className="wave">
                    {Array.from({ length: 26 }, (_, i) => (
                      <i key={i} style={{ height: `${3 + Math.round(Math.random() * 13)}px` }} />
                    ))}
                  </span>
                  <button className="pl" onClick={() => message.info(`试听：${track.voice}（演示无声）`)}>▶</button>
                  <span className="st2">{track.status}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className={`ds-tlBar${multiMode ? ' multi' : ''}`}>
        <button type="button" className="tlPlay" onClick={togglePlay}>
          {playing ? '⏸' : '▶'}
        </button>
        <span className="tlTime">
          {formatClock(elapsed)} / {formatClock(totalDur)}
        </span>
        <div className="tlClips">
          {segments.map((s, i) => (
            <button
              key={s.id}
              type="button"
              draggable={!multiMode}
              onDragStart={() => handleDragStart(i)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(i)}
              className={`tlClip${i === cur ? ' sel' : ''}${s.generated ? '' : ' emptyC'}${selectedSegments.has(i) ? ' checked' : ''}`}
              onClick={() => (multiMode ? toggleSegmentSelect(i) : setCur(i))}
            >
              {multiMode && <span className="chk2" onClick={(e) => { e.stopPropagation(); toggleSegmentSelect(i); }}>✓</span>}
              <div className="im">
                {s.generated && s.videoUrl ? (
                  <>
                    <video src={`${s.videoUrl}#t=1`} muted playsInline preload="metadata" />
                    <span className="resTag">{resolution}</span>
                  </>
                ) : (
                  <span className="no">{s.no}</span>
                )}
              </div>
              <div className="ft">
                <span className="st">
                  <i />
                  {s.generated ? '已生成' : '未生成'}
                </span>
                <span className="du">{formatClock(s.durationSec)}</span>
              </div>
            </button>
          ))}
        </div>
        <button type="button" className="tlNew" onClick={addNewSegment}>
          ＋<span>新建片段</span>
        </button>
        <button type="button" className="tlMulti" onClick={() => setMultiMode(!multiMode)}>
          {multiMode ? `批量操作（已选 ${selectedSegments.size}）` : '批量操作'}
        </button>
        {multiMode && (
          <Select
            size="small"
            style={{ minWidth: 140 }}
            placeholder="选择操作"
            onChange={(value) => handleBatchAction(value)}
            options={[
              { value: 'batch_regen', label: '批量重新生成' },
              { value: 'batch_delete', label: '批量删除片段' },
              { value: 'batch_export', label: '批量导出选中' },
              { value: 'exit_multi', label: '退出多选' },
            ]}
          />
        )}
      </div>

      <Modal
        open={exportOpen}
        className="ds-modal"
        title="⬇ 合成 / 导出"
        onCancel={() => {
          if (!exporting) setExportOpen(false);
        }}
        footer={
          download
            ? [
                <Button key="close" className="ds-ghost ds-pill" onClick={() => setExportOpen(false)}>
                  关闭
                </Button>,
                <Button
                  key="dl"
                  type="primary"
                  className="ds-grad ds-pill"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = download.url;
                    a.download = download.name;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                >
                  下载成片
                </Button>,
              ]
            : [
                <Button key="cancel" className="ds-ghost ds-pill" disabled={exporting} onClick={() => setExportOpen(false)}>
                  取消
                </Button>,
                <Button key="go" type="primary" className="ds-grad ds-pill" loading={exporting} onClick={() => void onExport()}>
                  开始合成
                </Button>,
              ]
        }
      >
        <div className="ds-fRow">
          <label>导出范围</label>
          <Select
            size="small"
            value={exportRange}
            onChange={setExportRange}
            options={[
              { value: '整集', label: `整集（片段 1-${segments.length} · ${formatClock(totalDur)}）` },
              { value: '当前片段', label: `仅当前片段（片段 ${segment.no} · ${formatClock(segment.durationSec)}）` },
            ]}
            style={{ minWidth: 200 }}
          />
        </div>
        <div className="ds-fRow ds-f2">
          <div>
            <label>分辨率</label>
            <Select
              size="small"
              value={exportResolution}
              onChange={setExportResolution}
              options={[
                { value: '720P', label: '720P' },
                { value: '1080P', label: '1080P (会员)' },
                { value: '4K', label: '4K (会员)' },
              ]}
              style={{ minWidth: 120 }}
            />
          </div>
          <div>
            <label>格式</label>
            <Select
              size="small"
              value={exportFormat}
              onChange={setExportFormat}
              options={[
                { value: 'MP4', label: 'MP4' },
                { value: 'MOV', label: 'MOV' },
              ]}
              style={{ minWidth: 120 }}
            />
          </div>
        </div>
        <div className="ds-fRow">
          <label>水印</label>
          <Select
            size="small"
            value={exportWatermark}
            onChange={setExportWatermark}
            options={[
              { value: '无水印（会员）', label: '无水印（会员）' },
              { value: '带平台角标', label: '带平台角标' },
            ]}
            style={{ minWidth: 120 }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--ant-color-text-tertiary)', marginBottom: 12 }}>
          合成消耗按片段时长计费；未生成片段将自动跳过
        </div>
        {exporting || exportTask ? (
          <div>
            <Progress percent={exportTask?.progress ?? 0} strokeColor={{ from: '#8b5cf6', to: '#6366f1' }} />
            <div style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)', textAlign: 'center' }}>
              {exportTask?.status === 'pending' && '已加入合成队列…'}
              {exportTask?.status === 'running' && '正在拼接成片…'}
              {exportTask?.status === 'succeeded' && '✓ 合成完成'}
            </div>
          </div>
        ) : null}
        {download ? (
          <div style={{ fontSize: 12, color: '#4ecf8d', marginTop: 8 }}>✓ 成片已就绪：{download.name}</div>
        ) : null}
      </Modal>

      <Modal
        open={globalSettingOpen}
        className="ds-modal"
        title="⚙ 全局设定（负面约束）"
        onCancel={() => setGlobalSettingOpen(false)}
        footer={[
          <Button key="cancel" className="ds-ghost ds-pill" onClick={() => setGlobalSettingOpen(false)}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            className="ds-grad ds-pill"
            onClick={() => {
              message.success('全局设定已保存，将注入后续所有生成');
              setGlobalSettingOpen(false);
            }}
          >
            保存
          </Button>,
        ]}
      >
        <textarea
          className="ds-gpText"
          value={globalSetting}
          onChange={(e) => setGlobalSetting(e.target.value)}
          rows={6}
        />
      </Modal>
    </div>
  );
}
