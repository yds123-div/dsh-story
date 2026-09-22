import { useEffect, useMemo, useState } from 'react';
import { App, Button, Flex, Input, Select, Typography, Tag } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listTemplates } from '../lib/api';
import { ApiClientError, api } from '../lib/productApi';
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

/**
 * 剧本创作入口（工单 03：创建项目并保存原始剧本输入）。
 * 走真产品 API：创建项目 → 粘贴/上传原始输入 → 本地保存 + 元数据登记。
 * 原始输入保存后不可在线编辑；生成运行是工单 04 的范围。
 */
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
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState(templateIdFromUrl ?? '');

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

  const reportError = (error: unknown) => {
    message.error(error instanceof ApiClientError ? error.message : '保存失败，请稍后重试');
  };

  const startCreate = async () => {
    if (!source) {
      message.warning('请先上传剧本，或粘贴文本');
      return;
    }
    setSubmitting(true);
    try {
      if (projectIdFromUrl) {
        // 已有项目：只补存原始输入（原始输入不可在线编辑，重存产生新文件记录）
        if (source.kind === 'paste') {
          await api.saveSourceInput(projectIdFromUrl, { text: source.text });
        } else {
          await api.uploadSourceInputFile(projectIdFromUrl, source.file);
        }
        message.success('原始剧本已保存，可在首页打开项目');
        return;
      }
      const title = fileName.trim() || '未命名项目';
      if (source.kind === 'paste') {
        await api.createProject({ title, mode, sourceText: source.text });
      } else {
        // 创建项目与上传文件是两个请求；上传失败时项目已存在，提示用户进入项目重存，避免重复建项
        const created = await api.createProject({ title, mode });
        try {
          await api.uploadSourceInputFile(created.project.id, source.file);
        } catch (error) {
          const detail = error instanceof ApiClientError ? `：${error.message}` : '';
          message.warning(`项目已创建，但原始输入上传失败${detail}。请在首页打开该项目重新上传`);
          navigate('/');
          return;
        }
      }
      message.success('项目已创建，原始剧本已保存');
      navigate('/');
    } catch (error) {
      reportError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '30px 32px 70px', maxWidth: 1200, margin: '0 auto' }}>
      <h2 className="ds-h2">剧集创作</h2>
      <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 6 }}>
        {projectIdFromUrl
          ? '向当前项目保存原始剧本输入（保存后不可在线编辑，重新保存会产生新的输入记录）'
          : '创建项目，粘贴或上传原始剧本；生成运行在保存后发起'}
      </Typography.Text>

      <Flex gap={8} wrap style={{ margin: '16px 0 0' }} align="center">
        <button type="button" className={`ds-modeChip${mode === 'script' ? ' on' : ''}`} onClick={() => setMode('script')}>
          📄 剧本模式（≤30万字）
        </button>
        <button type="button" className={`ds-modeChip${mode === 'novel' ? ' on' : ''}`} onClick={() => setMode('novel')}>
          📖 小说模式（≤10万字）
        </button>
        <span style={{ fontSize: 11, color: 'var(--ant-color-text-tertiary)', marginLeft: 10 }}>
          {mode === 'script' ? '上传成品剧本，后续进入剧本审阅工作流' : '上传小说原文，后续进入改编工作流'}
        </span>
      </Flex>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginTop: 14 }}>
        <div className="ds-upload">
          {panel === 'empty' ? (
            <Flex vertical align="center" gap={12} style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 28 }}>📄</div>
              <h4 style={{ margin: 0 }}>
                {mode === 'novel' ? '上传小说原文' : '拖拽剧本到这里，或选择上传方式'}
              </h4>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {mode === 'novel'
                  ? '支持 txt / md 文本文件 · 单文件 ≤ 10MB · 小说不超过 10 万字'
                  : '支持 txt / md 文本文件 · 单文件 ≤ 10MB · 剧本不超过 30 万字'}
              </Typography.Text>
              <Flex gap={8}>
                <Button
                  className="ds-ghost ds-pill"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt,.md';
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
                  {paste.length} 字（≤{mode === 'novel' ? '100,000' : '300,000'}）
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
              <div>原始输入就绪</div>
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
            项目名称
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
          <Typography.Text type="secondary" style={{ fontSize: 11.5, display: 'block' }}>
            原始剧本保存后不可在线编辑；后续每次生成运行都会引用这份输入。
          </Typography.Text>
          <Flex justify="flex-end" style={{ marginTop: 18 }}>
            <Button
              type="primary"
              className="ds-grad ds-pill"
              loading={submitting}
              onClick={() => void startCreate()}
            >
              {projectIdFromUrl ? '保存原始剧本' : '✦ 创建项目并保存剧本'}
            </Button>
          </Flex>
        </div>
      </div>
    </div>
  );
}
