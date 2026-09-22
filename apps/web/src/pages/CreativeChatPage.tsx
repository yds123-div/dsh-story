import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Input, message, Select, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTask } from '../hooks/useTask';
import { getCredits } from '../lib/api';
import { submitCreativeTask } from '../lib/api';
import {
  getChats,
  addChat,
  updateChatResult,
  deleteChat,
  type CreativeChat,
  type CreativeChatKind,
  type CreativeChatResult,
} from '../lib/creativeChat';

const IMAGE_MODEL = 'Seedream_4.5';
const VIDEO_MODEL = 'Seedance 2.0';
const IMAGE_FEE = 3;
const VIDEO_FEE = 5;

const EDIT_TOOLS = [
  { id: 'cut', label: '✂ AI 抠图', msg: 'AI 抠图完成：白底已抠除（透明底 · mix-blend 演示）' },
  { id: 'erase', label: '🧽 擦除', msg: '擦除完成：多余元素已移除' },
  { id: 'repaint', label: '🖌 标记改图', msg: '标记改图完成：标记区域已按提示词重绘' },
  { id: 'expand', label: '🔲 扩图', msg: '扩图完成：已外扩至 16:9 构图（AI 补全边缘）' },
  { id: 'hd', label: '✨ 变清晰', msg: '变清晰完成：2K → 4K 超分（细节增强）' },
];

export default function CreativeChatPage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<CreativeChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [kind, setKind] = useState<CreativeChatKind>('image');
  const [prompt, setPrompt] = useState('');
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState<{ prompt: string; fee: number } | null>(null);
  const [credits, setCredits] = useState(940);
  const [generating, setGenerating] = useState(false);
  const [selectedProject, setSelectedProject] = useState('default');
  const [editTools, setEditTools] = useState<Set<string>>(new Set());
  const [imageFilter, setImageFilter] = useState('');
  const [imageExpanded, setImageExpanded] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const flowRef = useRef<HTMLDivElement>(null);

  const { stop } = useTask(taskId, {
    intervalMs: 1000,
    onSucceeded: (task) => {
      if (currentChatId && task.result) {
        const result = task.result as { mediaUrl: string; kind: string };
        const chatResult: CreativeChatResult = {
          id: `res_${Date.now()}`,
          kind: result.kind as CreativeChatKind,
          prompt: confirmData?.prompt || '',
          model: kind === 'image' ? IMAGE_MODEL : VIDEO_MODEL,
          meta: kind === 'image' ? '9:16 · 2K' : '9:16 · 13s',
          fee: kind === 'image' ? IMAGE_FEE : VIDEO_FEE,
          mediaUrl: result.mediaUrl,
          timestamp: Date.now(),
        };
        updateChatResult(currentChatId, chatResult);
        setChats(getChats());
        setGenerating(false);
        setTaskId(null);
        message.success(`${kind === 'image' ? '图片' : '视频'}已生成完成！`);
      }
    },
    onFailed: () => {
      setGenerating(false);
      setTaskId(null);
      message.error('生成失败，请重试');
    },
  });

  useEffect(() => {
    return () => {
      if (taskId) stop();
    };
  }, [taskId, stop]);

  useEffect(() => {
    setChats(getChats());
    if (chats.length > 0 && !currentChatId) {
      setCurrentChatId(chats[0].id);
    }
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const res = await getCredits();
      setCredits(res.balance);
    } catch {
      setCredits(940);
    }
  };

  const handleLoadChat = (chatId: string) => {
    setCurrentChatId(chatId);
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setKind(chat.kind);
      setPrompt(chat.prompt);
      setEditTools(new Set());
      setImageFilter('');
      setImageExpanded(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setPrompt('');
    setEditTools(new Set());
    setImageFilter('');
    setImageExpanded(false);
    message.info('已新建对话：输入提示词开始生成');
  };

  const handleKindSwitch = () => {
    setKind((prev) => (prev === 'image' ? 'video' : 'image'));
    message.info(`已切换到${kind === 'image' ? '视频' : '图像'}生成（模型：${kind === 'image' ? VIDEO_MODEL : IMAGE_MODEL}）`);
  };

  const handleAskGen = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      message.warning('请输入提示词，例如：火影忍者 宇智波镜大战 宇智波斑');
      return;
    }
    const fee = kind === 'image' ? IMAGE_FEE : VIDEO_FEE;
    if (credits < fee) {
      message.error('积分不足，请充值');
      return;
    }
    setConfirmData({ prompt: trimmed, fee });
    setConfirmModal(true);
  };

  const handleStartGen = async () => {
    if (!confirmData) return;
    setConfirmModal(false);
    const fee = confirmData.fee;
    setCredits((prev) => prev - fee);
    try {
      const res = await submitCreativeTask({ kind, prompt: confirmData.prompt });
      const chat = addChat(kind, confirmData.prompt);
      setCurrentChatId(chat.id);
      setChats(getChats());
      setGenerating(true);
      setTaskId(res.taskId);
      setPrompt('');
    } catch {
      message.error('提交任务失败');
      setCredits((prev) => prev + fee);
    }
  };

  const handleRegen = () => {
    if (!currentChatId) return;
    const chat = chats.find((c) => c.id === currentChatId);
    if (!chat) return;
    setPrompt(chat.prompt);
    handleAskGen();
  };

  const handleDownload = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = url.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    message.success(`已开始下载：${a.download}`);
  };

  const handleAddToProject = () => {
    message.success('已加入项目「逆命木叶企划」资产库（可在片段提示词中 @ 引用）');
  };

  const handleApplyTool = (toolId: string) => {
    if (kind !== 'image') {
      message.warning('编辑工具仅支持图像');
      return;
    }
    const tool = EDIT_TOOLS.find((t) => t.id === toolId);
    if (!tool) return;
    setEditTools((prev) => new Set([...prev, toolId]));
    if (toolId === 'cut') {
      setImageFilter('brightness(1.04)');
    } else if (toolId === 'erase') {
      setImageFilter((prev) => prev + ' brightness(1.04)');
    } else if (toolId === 'repaint') {
      setImageFilter((prev) => prev + ' hue-rotate(6deg) saturate(1.08)');
    } else if (toolId === 'expand') {
      setImageExpanded(true);
    } else if (toolId === 'hd') {
      setImageFilter((prev) => prev + ' contrast(1.16) saturate(1.14) brightness(1.03)');
    }
    message.success(tool.msg);
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChat(chatId);
    setChats(getChats());
    if (currentChatId === chatId) {
      setCurrentChatId(chats.length > 1 ? chats[1].id : null);
    }
    message.success('对话已删除');
  };

  const currentChat = chats.find((c) => c.id === currentChatId);

  useEffect(() => {
    if (flowRef.current) {
      flowRef.current.scrollTop = flowRef.current.scrollHeight;
    }
  }, [currentChat, generating]);

  return (
    <div className="ds-viewInner" style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '16px' }}>
      {/* 侧栏 */}
      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Button onClick={() => navigate('/idea')} style={{ fontSize: '12px', padding: '6px 10px' }}>
          ‹ 返回创意首页
        </Button>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)' }}>归属项目</label>
          <Select
            value={selectedProject}
            onChange={setSelectedProject}
            style={{ flex: 1, fontSize: '12px' }}
            size="small"
          >
            <Select.Option value="default">默认项目</Select.Option>
            <Select.Option value="nming">逆命木叶企划</Select.Option>
          </Select>
        </div>
        <Button type="primary" onClick={handleNewChat} block>
          ＋ 新建对话
        </Button>
        <div style={{ fontSize: '12px', color: 'var(--ant-color-text-tertiary)', fontWeight: 500 }}>
          最近对话
        </div>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => handleLoadChat(chat.id)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                background: currentChatId === chat.id ? 'var(--ant-color-primary-bg)' : 'var(--ant-color-bg-container)',
                cursor: 'pointer',
                border: currentChatId === chat.id ? '1px solid var(--ant-color-primary-border)' : '1px solid var(--ant-color-border)',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>{chat.prompt}</div>
              <div style={{ fontSize: '11px', color: 'var(--ant-color-text-tertiary)' }}>
                {new Date(chat.timestamp).toLocaleDateString('zh-CN')} · {chat.kind === 'image' ? '图像' : '视频'} ×1
              </div>
              <Button
                danger
                size="small"
                type="text"
                onClick={(e) => handleDeleteChat(chat.id, e)}
                style={{ position: 'absolute', top: '4px', right: '4px', padding: '0 4px', fontSize: '10px' }}
              >
                ×
              </Button>
            </div>
          ))}
          {chats.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--ant-color-text-tertiary)', textAlign: 'center', padding: '20px' }}>
              暂无对话记录
            </div>
          )}
        </div>
      </div>

      {/* 主区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          ref={flowRef}
          style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {currentChat && (
            <>
              <div style={{ background: 'var(--ant-color-bg-layout)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--ant-color-text-tertiary)', marginBottom: '4px' }}>
                  🧑 oTtb0u（我）
                </div>
                <div style={{ fontSize: '14px' }}>{currentChat.prompt}</div>
              </div>

              {generating && (
                <div style={{ background: 'var(--ant-color-bg-layout)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Spin size="small" />
                    <div>
                      <div style={{ color: 'var(--ant-color-primary)', fontWeight: 500 }}>✦ AI 创作</div>
                      <div style={{ fontSize: '12px', color: 'var(--ant-color-text-tertiary)' }}>
                        生成中… · {kind === 'image' ? `${IMAGE_MODEL} · 2K · 9:16` : `${VIDEO_MODEL} · 9:16 · 13s`} · ◆
                        {kind === 'image' ? IMAGE_FEE : VIDEO_FEE}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentChat.result && (
                <div style={{ background: 'var(--ant-color-bg-layout)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: 'var(--ant-color-primary)', fontWeight: 500 }}>✦ AI 创作</span>
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--ant-color-text-tertiary)' }}>
                        生成完成 · 共 1 个结果
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      position: 'relative',
                      borderRadius: '11px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                      ...(imageExpanded ? { maxWidth: '100%' } : {}),
                    }}
                  >
                    {currentChat.result.kind === 'video' ? (
                      <video
                        src={currentChat.result.mediaUrl}
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{ width: '100%', display: 'block', borderRadius: '11px', background: '#000' }}
                      />
                    ) : (
                      <img
                        src={currentChat.result.mediaUrl}
                        alt="生成结果"
                        style={{
                          width: '100%',
                          display: 'block',
                          borderRadius: '11px',
                          filter: imageFilter,
                          ...(imageExpanded ? { maxWidth: 'none' } : {}),
                        }}
                      />
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      AI生成
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <Button size="small" onClick={handleRegen}>
                      ↻ 重新生成
                    </Button>
                    <Button size="small" onClick={() => currentChat.result && handleDownload(currentChat.result.mediaUrl)}>
                      ⬇ 下载
                    </Button>
                    <Button size="small" onClick={handleAddToProject}>
                      ＋ 加入项目
                    </Button>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        color: 'var(--ant-color-text-tertiary)',
                        alignSelf: 'center',
                      }}
                    >
                      {currentChat.result.model} ｜ {currentChat.result.meta} ｜ {currentChat.result.kind === 'image' ? '图片' : '视频'}生成 ◆
                      {currentChat.result.fee}
                    </span>
                  </div>

                  {currentChat.result.kind === 'image' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      <span style={{ fontSize: '10.5px', color: 'var(--ant-color-text-tertiary)', alignSelf: 'center' }}>
                        编辑工具：
                      </span>
                      {EDIT_TOOLS.map((tool) => (
                        <Button
                          key={tool.id}
                          size="small"
                          type={editTools.has(tool.id) ? 'primary' : 'default'}
                          onClick={() => handleApplyTool(tool.id)}
                        >
                          {tool.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  {editTools.size > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--ant-color-text-tertiary)' }}>
                      已应用：{[...editTools].map((id) => EDIT_TOOLS.find((t) => t.id === id)?.label).join(' · ')}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!currentChat && !generating && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ant-color-text-tertiary)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
              <div>开始新的创意对话</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>输入提示词，让 AI 为你生成图像或视频</div>
            </div>
          )}
        </div>

        {/* 输入栏 */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--ant-color-border)',
            background: 'var(--ant-color-bg-container)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <Button
              onClick={handleKindSwitch}
              style={{ cursor: 'pointer', fontWeight: 500, minWidth: '80px' }}
            >
              {kind === 'image' ? '🖼 图像' : '🎥 视频'}
            </Button>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskGen()}
              placeholder="让创作随灵感而生 —— 描述你想要的画面 / 角色对峙 / 场景概念…"
              style={{ flex: 1 }}
            />
            <Button type="primary" onClick={handleAskGen} disabled={generating}>
              ✦ 生成
            </Button>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              fontSize: '11px',
              color: 'var(--ant-color-text-tertiary)',
            }}
          >
            <span>
              模型 <b style={{ color: '#a78bfa' }}>{kind === 'image' ? IMAGE_MODEL : VIDEO_MODEL}</b>（{kind === 'image' ? '图像' : '视频'}）
            </span>
            <span>画质 2K</span>
            <span>比例 9:16</span>
            <span>数量 1</span>
            <span style={{ marginLeft: 'auto' }}>
              当前余额 ◆<span>{credits}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 参数确认弹窗 */}
      <Modal
        open={confirmModal}
        onCancel={() => setConfirmModal(false)}
        title="参数确认"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button onClick={() => setConfirmModal(false)}>取消</Button>
            <Button type="primary" onClick={handleStartGen}>
              开始生成
            </Button>
          </div>
        }
        width={480}
      >
        {confirmData && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                提示词
              </label>
              <Input value={confirmData.prompt} readOnly />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                模型
              </label>
              <Input value={kind === 'image' ? IMAGE_MODEL : VIDEO_MODEL} readOnly />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  画质
                </label>
                <Input value="2K" readOnly />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  比例
                </label>
                <Input value="9:16" readOnly />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  生成数量
                </label>
                <Input value="1" readOnly />
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--ant-color-text-tertiary)',
                padding: '4px 2px 2px',
              }}
            >
              <span>
                当前余额：<b>{credits}</b> 积分
              </span>
              <span>
                合计 <b style={{ color: '#a78bfa' }}>{confirmData.fee}</b> 积分
              </span>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
