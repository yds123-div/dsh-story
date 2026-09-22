import { useEffect, useState } from 'react';
import { App, Button, Progress } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkflowHeader } from '../components/WorkflowHeader';
import { useTask } from '../hooks/useTask';
import { getOutline, getWorkflow, listEpisodes, submitEpisodeSplitTask } from '../lib/api';
import { useWorkflowStore } from '../stores/workflowStore';
import type { Episode } from '../types/api';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function EpisodesPage() {
  const { message } = App.useApp();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const setUnlocked = useWorkflowStore((s) => s.setUnlocked);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  const { task } = useTask(taskId, {
    intervalMs: 2500,
    onSucceeded: async () => {
      const data = await listEpisodes(id);
      setEpisodes(data.episodes);
      setTaskId(null);
    },
    onFailed: (t) => message.error(t.error ?? '分集拆分失败'),
  });

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const wf = await getWorkflow(id);
      if (cancelled) return;
      setUnlocked(id, wf.unlockedStep);
      const [data, outline] = await Promise.all([listEpisodes(id), getOutline(id)]);
      if (cancelled) return;
      setProjectName(outline.projectName);
      if (data.episodes.length > 0) {
        setEpisodes(data.episodes);
        return;
      }
      const { taskId: nextId } = await submitEpisodeSplitTask(id);
      if (!cancelled) setTaskId(nextId);
    };
    void boot().catch(() => {
      if (!cancelled) message.error('加载分集失败');
    });
    return () => {
      cancelled = true;
    };
  }, [id, message, setUnlocked]);

  const splitting = episodes.length === 0;
  const firstReady = episodes.find((e) => e.status === 'split');

  return (
    <div className="ds-flowPage">
      <WorkflowHeader projectName={projectName || '项目'} tag="分集视频管理" current="episodes" />
      <div className="ds-viewInner">
        <div className="ds-h2" style={{ fontSize: 20 }}>
          分集视频
        </div>
        <div style={{ fontSize: 13, color: 'var(--ant-color-text-tertiary)', marginTop: 6 }}>
          {splitting ? '导演智能体正在拆分决策…' : '导演智能体已完成分集拆分决策 · 共 1 集'}
        </div>

        <div style={{ marginTop: 22 }}>
          {splitting ? (
            <div className="ds-epLoad">
              <div className="ph" />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div className="ds-statusSpin" />
                  <b style={{ fontSize: 14 }}>分集拆分中… {task?.progress ?? 0}%</b>
                </div>
                <Progress percent={task?.progress ?? 0} strokeColor={{ from: '#8b5cf6', to: '#6366f1' }} />
                <div style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)', lineHeight: 1.8, marginTop: 8 }}>
                  导演 James：原剧本已明确标注第1集，总字数两百余字，低于单集300字常规下限，但叙事闭环完整——严格保持原始 1
                  集结构，不做强行拆解。
                </div>
              </div>
            </div>
          ) : (
            episodes.map((ep) => (
              <button
                key={ep.id}
                type="button"
                className="ds-epCard"
                style={{ opacity: ep.status === 'draft' ? 0.75 : 1, marginBottom: 14 }}
                onClick={() => {
                  if (ep.status !== 'split') {
                    message.info('第2集为草稿，待导演智能体拆分决策');
                    return;
                  }
                  navigate(`/project/${id}/episode/${ep.id}`);
                }}
              >
                <div className="cv">
                  {ep.coverUrl ? <img src={ep.coverUrl} alt={ep.title} /> : <span className="draft">第{ep.number}集 · 草稿</span>}
                  <span className={`ds-status ${ep.status === 'split' ? 'ok' : 'no'}`} style={{ position: 'absolute', top: 10, left: 10 }}>
                    <i className="ds-dot" />
                    {ep.status === 'split' ? '已拆分' : '未拆分'}
                  </span>
                </div>
                <div className="bd">
                  <h4>
                    第{ep.number}集：{ep.title}
                  </h4>
                  <div className="mt">
                    {ep.status === 'split'
                      ? `共 ${ep.segmentCount} 个片段 · 总时长 ${formatDuration(ep.durationSec)} · 9:16`
                      : '草稿 · 待拆分'}
                    <br />
                    {ep.summary}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      <div className="ds-flowBar">
        <span className="msg">分集就绪后，进入片段编辑器生成视频</span>
        <Button className="ds-ghost ds-pill" size="small" onClick={() => navigate(`/project/${id}/assets`)}>
          上一步
        </Button>
        <Button
          type="primary"
          className="ds-grad ds-pill"
          size="small"
          disabled={!firstReady}
          onClick={() => firstReady && navigate(`/project/${id}/episode/${firstReady.id}`)}
        >
          进入片段编辑 ◆60
        </Button>
      </div>
    </div>
  );
}
