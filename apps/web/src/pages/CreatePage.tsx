import { useEffect, useMemo, useState } from 'react';
import { App, Button, Flex, Input, Progress, Select, Typography, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTask } from '../hooks/useTask';
import { createProject, listTemplates, submitOutlineTask, submitNovelTask } from '../lib/api';
import { validateScriptFileContent, validateScriptText, validateNovelFileContent, validateNovelText } from '../lib/scriptValidation';
import type { Template } from '../types/api';

const SAMPLE = `【木叶长廊 内 夜】
木叶，夜晚长廊，月光冷白。
△ 林晚扶着廊柱，指尖颤抖，眼神茫然又痛苦，身着木叶制式素色和服。
林晚（低声独白）：明明只是在家看火影……一睁眼，就来到了这里。
△ 鼬缓步从阴影走出，红瞳微光，神色淡漠。
鼬：深夜在此，有何目的。长老安排你，来监视我？`;

const NOVEL_SAMPLE = `第一章 异世囚笼

林晚扶着廊柱，指尖颤抖，眼神茫然又痛苦，身着木叶制式素色和服。
明明只是在家看火影……一睁眼，就来到了这里。我知道所有人的结局，唯独不知道，自己该怎么活下去。

鼬缓步从阴影走出，红瞳微光，神色淡漠。
「深夜在此，有何目的。长老安排你，来监视我？」

林晚猛地抬头，眼眶泛红，声音发颤：「我不是来监视你的！鼬，我知道你将要背负什么，我不想看你走向那条绝路！」

鼬淡淡勾起唇角，带着悲凉：「预言？外来之人，不要妄言命运。」

鼬转身，衣摆扫过地面，不留一丝温情。
「离我远一点，否则，你会被拖入深渊。」

黑屏字幕：我知晓你的悲剧，却无法改写。`;

type ReadySource =
  | { kind: 'paste'; text: string }
  | { kind: 'file'; file: File; charCount?: number };

export default function CreatePage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectIdFromUrl = params.get('projectId');
  const templateIdFromUrl = params.get('templateId');

  const [mode, setMode] = useState<'script' | 'novel'>('script');
  const [panel, setPanel] = useState<'empty' | 'paste' | 'ready'>('empty');
  const [paste, setPaste] = useState(SAMPLE);
  const [source, setSource] = useState<ReadySource | null>(null);
  const [fileName, setFileName] = useState('逆命木叶');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState(templateIdFromUrl ?? '');
  const [category, setCategory] = useState('女频-轻小说');
  const [style, setStyle] = useState('赛博朋克电影');
  const [videoRatio, setVideoRatio] = useState('9:16');
  const [sceneRatio, setSceneRatio] = useState('16:9');
  const [imageQuality, setImageQuality] = useState('2K');

  const { task } = useTask(taskId, {
    intervalMs: 2500,
    onSucceeded: (t) => {
      const result = t.result as { projectId?: string } | undefined;
      const nextId = result?.projectId ?? projectIdFromUrl;
      if (nextId) navigate(`/project/${nextId}/outline`);
    },
    onFailed: (t) => message.error(t.error ?? '创作任务失败'),
  });

  useEffect(() => {
    void listTemplates()
      .then((data) => {
        setTemplates(data.templates);
        const tpl = data.templates.find((item) => item.id === templateIdFromUrl);
        if (!tpl) return;
        setTemplateId(tpl.id);
        setFileName(tpl.name);
        setPaste(tpl.scriptText);
        setSource({ kind: 'paste', text: tpl.scriptText });
        setPanel('ready');
      })
      .catch(() => undefined);
  }, [templateIdFromUrl]);

  useEffect(() => {
    if (mode === 'novel') {
      setPaste(NOVEL_SAMPLE);
    } else {
      setPaste(SAMPLE);
    }
  }, [mode]);

  const readyHint = useMemo(() => {
    if (!source) return '';
    if (source.kind === 'paste') return `粘贴文本 · ${source.text.length} 字 · 删除后可重新粘贴`;
    const extra = source.charCount != null ? ` · ${source.charCount} 字` : '';
    return `《${source.file.name}》${extra} · 删除当前文件后可重新上传`;
  }, [source]);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    const result = mode === 'novel' ? await validateNovelFileContent(file) : await validateScriptFileContent(file);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setSource({ kind: 'file', file, charCount: result.charCount });
    setPanel('ready');
    setFileName(file.name.replace(/\.[^.]+$/, '') || fileName);
    message.success(mode === 'novel' ? '小说上传成功 · 格式校验通过' : '剧本上传成功 · 格式校验通过');
  };

  const onUsePaste = () => {
    const result = mode === 'novel' ? validateNovelText(paste) : validateScriptText(paste);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    setSource({ kind: 'paste', text: paste.trim() });
    setPanel('ready');
    message.success(`文本已载入（${paste.trim().length} 字）`);
  };

  const startCreate = async () => {
    if (!source) {
      message.warning('请先上传剧本，或粘贴文本');
      return;
    }
    setSubmitting(true);
    try {
      let projectId = projectIdFromUrl;
      if (!projectId) {
        const created = await createProject({
          name: fileName.trim() || '未命名项目',
          templateId: templateId || undefined,
          aspectRatio: videoRatio,
          style,
        });
        projectId = created.id;
      }
      if (mode === 'novel') {
        const body =
          source.kind === 'paste'
            ? { sourceType: 'paste' as const, text: source.text }
            : { sourceType: 'file' as const, fileName: source.file.name };
        const { taskId: id } = await submitNovelTask(projectId, body);
        setTaskId(id);
      } else {
        const body =
          source.kind === 'paste'
            ? { sourceType: 'paste' as const, text: source.text }
            : { sourceType: 'file' as const, fileName: source.file.name };
        const { taskId: id } = await submitOutlineTask(projectId, body);
        setTaskId(id);
      }
    } catch {
      message.error('提交创作任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '30px 32px 70px', maxWidth: 1200, margin: '0 auto' }}>
      <h2 className="ds-h2">剧集创作</h2>
      <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 6 }}>
        短剧 AGENT，一键直出整部剧
      </Typography.Text>

      <Flex gap={8} wrap style={{ margin: '16px 0 0' }} align="center">
        <button type="button" className={`ds-modeChip${mode === 'script' ? ' on' : ''}`} onClick={() => setMode('script')}>
          📄 剧本模式（≤30万字）
        </button>
        <button type="button" className={`ds-modeChip${mode === 'novel' ? ' on' : ''}`} onClick={() => setMode('novel')}>
          📖 小说模式（≤10万字 · 一键转视频）
        </button>
        <span style={{ fontSize: 11, color: 'var(--ant-color-text-tertiary)', marginLeft: 10 }}>
          {mode === 'script' ? '上传成品剧本，AI 精编后进入三步工作流' : '小说模式：先解析章节，再由编剧智能体改编为可拍摄剧本'}
        </span>
      </Flex>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginTop: 14 }}>
        <div className="ds-upload">
          {panel === 'empty' ? (
            <Flex vertical align="center" gap={12} style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 28 }}>📄</div>
              <h4 style={{ margin: 0 }}>
                {mode === 'novel' ? '上传小说，一键转视频' : '拖拽剧本到这里，或选择上传方式'}
              </h4>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {mode === 'novel'
                  ? '支持 txt / docx / pdf / md · 单文件 ≤ 10MB · 小说不超过 10 万字（自动章节切分 → 编剧 Agent 改编 → 三步工作流）'
                  : '支持 txt / pdf / doc / docx / md 格式 · 单文件 ≤ 10MB · 剧本字数不超过 30 万字'}
              </Typography.Text>
              <Flex gap={8}>
                <Button
                  className="ds-ghost ds-pill"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt,.pdf,.doc,.docx,.md';
                    input.onchange = () => void onPickFile(input.files?.[0]);
                    input.click();
                  }}
                >
                  ⬆ {mode === 'novel' ? '上传小说' : '上传剧本'}
                </Button>
                <Button className="ds-ghost ds-pill" onClick={() => setPanel('paste')}>
                  📋 粘贴文本
                </Button>
              </Flex>
            </Flex>
          ) : null}

          {panel === 'paste' ? (
            <div>
              <Input.TextArea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                style={{ minHeight: 170, fontSize: 12, lineHeight: 1.9 }}
                placeholder="粘贴剧本文本…"
              />
              <Flex justify="space-between" align="center" style={{ marginTop: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--ant-color-text-tertiary)' }}>
                  {paste.length} 字（≤300,000）
                </span>
                <Flex gap={8}>
                  <Button className="ds-ghost ds-pill" size="small" onClick={() => setPanel('empty')}>
                    返回上传
                  </Button>
                  <Button type="primary" className="ds-grad ds-pill" size="small" onClick={onUsePaste}>
                    使用此文本
                  </Button>
                </Flex>
              </Flex>
            </div>
          ) : null}

          {panel === 'ready' && source ? (
            <Flex vertical align="center" gap={8} style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{ fontSize: 28 }}>✓</div>
              <div>上传成功</div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {readyHint}
              </Typography.Text>
              <Flex gap={6} wrap justify="center" style={{ marginTop: 12 }}>
                {source.kind === 'file' ? (
                  <>
                    <Tag color="success" style={{ fontSize: 10, padding: '2px 8px' }}>
                      格式 ✓ {source.file.name.split('.').pop()?.toUpperCase()}
                    </Tag>
                    <Tag color="success" style={{ fontSize: 10, padding: '2px 8px' }}>
                      大小 ✓ {(source.file.size / 1024).toFixed(0)} KB
                    </Tag>
                  </>
                ) : (
                  <Tag color="success" style={{ fontSize: 10, padding: '2px 8px' }}>
                    来源 ✓ 粘贴板
                  </Tag>
                )}
                <Tag color="success" style={{ fontSize: 10, padding: '2px 8px' }}>
                  字数 ✓ {(source.kind === 'paste' ? source.text.length : source.charCount)?.toLocaleString()}
                </Tag>
                <Tag color="success" style={{ fontSize: 10, padding: '2px 8px' }}>
                  校验通过
                </Tag>
              </Flex>
              <Button
                className="ds-ghost ds-pill"
                size="small"
                onClick={() => {
                  setSource(null);
                  setPanel('empty');
                  setTaskId(null);
                }}
              >
                删除并重选
              </Button>
            </Flex>
          ) : null}
        </div>

        <div className="ds-upload">
          <h4 style={{ margin: '0 0 14px' }}>创作参数</h4>
          <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
            文件名称
          </Typography.Text>
          <Input value={fileName} onChange={(e) => setFileName(e.target.value)} style={{ marginBottom: 12 }} />
          <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
            从官方示例开始（可选）
          </Typography.Text>
          <Select
            style={{ width: '100%', marginBottom: 12 }}
            value={templateId}
            onChange={(value) => {
              setTemplateId(value);
              const tpl = templates.find((item) => item.id === value);
              if (!tpl) return;
              setFileName(tpl.name);
              setPaste(tpl.scriptText);
              setSource({ kind: 'paste', text: tpl.scriptText });
              setPanel('ready');
            }}
            options={[
              { value: '', label: '— 不使用示例 —' },
              ...templates.map((tpl) => ({ value: tpl.id, label: tpl.name })),
            ]}
          />
          <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
            选择项目
          </Typography.Text>
          <Select style={{ width: '100%', marginBottom: 12 }} defaultValue="默认项目">
            <Select.Option value="default">默认项目</Select.Option>
            <Select.Option value="nming">逆命木叶企划</Select.Option>
          </Select>
          <Flex gap={8} style={{ marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
                分类
              </Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={category}
                onChange={setCategory}
                options={[
                  { value: '女频-轻小说', label: '女频-轻小说' },
                  { value: '穿越宿命', label: '穿越宿命' },
                  { value: '热血战斗', label: '热血战斗' },
                ]}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
                风格库
              </Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={style}
                onChange={setStyle}
                options={[
                  { value: '赛博朋克电影', label: '赛博朋克电影' },
                  { value: '国漫写实', label: '国漫写实' },
                  { value: '赛璐璐动画', label: '赛璐璐动画' },
                ]}
              />
            </div>
          </Flex>
          <Flex gap={8} style={{ marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
                视频比例
              </Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={videoRatio}
                onChange={setVideoRatio}
                options={[
                  { value: '9:16', label: '📱 9:16' },
                  { value: '16:9', label: '16:9' },
                ]}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
                场景比例
              </Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={sceneRatio}
                onChange={setSceneRatio}
                options={[
                  { value: '16:9', label: '🖥 16:9' },
                  { value: '9:16', label: '9:16' },
                ]}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block', marginBottom: 6 }}>
                生图质量 <span style={{ color: '#a78bfa', fontSize: 10 }}>9积分/张</span>
              </Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={imageQuality}
                onChange={setImageQuality}
                options={[
                  { value: '4K', label: '4K' },
                  { value: '2K', label: '2K' },
                  { value: '1080P', label: '1080P' },
                ]}
              />
            </div>
          </Flex>
          {task ? (
            <div style={{ margin: '16px 0' }}>
              <Progress percent={task.progress} strokeColor={{ from: '#8b5cf6', to: '#6366f1' }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {task.status === 'pending' && '排队中…'}
                {task.status === 'running' && '小说转剧本中…'}
                {task.status === 'succeeded' && '✓ 大纲任务完成'}
                {task.status === 'failed' && (task.error ?? '失败')}
              </Typography.Text>
            </div>
          ) : null}
          <Flex justify="flex-end" style={{ marginTop: 18 }}>
            <Button
              type="primary"
              className="ds-grad ds-pill"
              loading={submitting || (task != null && task.status !== 'failed')}
              onClick={() => void startCreate()}
            >
              {mode === 'novel' ? '📖 一键转视频 ◆32' : '✦ 立即创作 ◆32'}
            </Button>
          </Flex>
        </div>
      </div>
    </div>
  );
}
