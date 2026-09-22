import type { CreateProjectRequest, HealthResponse, ProjectSummary } from '@dsh-story/contracts';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError, api } from '../lib/productApi';
import '../styles.css';
import { modeLabel } from '../lib/labels';

/** 产品入口页：健康状态 + 创建项目 + 项目列表（骨架，不含旧页面内容） */
export function EntryPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<CreateProjectRequest['mode']>('script');
  const [sourceText, setSourceText] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setHealth(await api.health());
      setHealthError(null);
    } catch (err) {
      setHealth(null);
      setHealthError(err instanceof ApiClientError ? err.message : String(err));
    }
    try {
      const list = await api.listProjects();
      // 双轨过渡：msw 开启时 /api/projects 被旧 mock 拦截（返回旧结构），此处归一为空列表。
      // 旧 mock handler 删除后此分支自然失效。
      setProjects(Array.isArray(list) ? list : []);
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError('标题不能为空');
      return;
    }
    setCreating(true);
    try {
      const input: CreateProjectRequest = {
        title: title.trim(),
        mode,
        ...(sourceText.trim() ? { sourceText: sourceText } : {}),
      };
      await api.createProject(input);
      setTitle('');
      setSourceText('');
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="entry">
      <section className="health" aria-label="后端健康状态">
        {health ? (
          <span className={`badge badge-${health.status === 'ok' ? 'ok' : 'warn'}`}>
            API 运行正常（{health.service} v{health.version}）
          </span>
        ) : healthError ? (
          <span className="badge badge-error">API 不可用：{healthError}</span>
        ) : (
          <span className="badge">检查中…</span>
        )}
      </section>

      <section className="card">
        <h2>创建项目</h2>
        <form onSubmit={handleSubmit} className="create-form">
          <label>
            标题
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="项目标题" />
          </label>
          <label>
            模式
            <select value={mode} onChange={(e) => setMode(e.target.value as CreateProjectRequest['mode'])}>
              <option value="script">剧本模式</option>
              <option value="novel">小说模式</option>
            </select>
          </label>
          <label>
            原始输入（剧本正文 / 小说文本，可选）
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={6}
              placeholder="粘贴剧本或小说文本"
            />
          </label>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <button type="submit" disabled={creating}>
            {creating ? '创建中…' : '创建项目'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>项目列表</h2>
        {projects.length === 0 ? (
          <p className="empty">还没有项目</p>
        ) : (
          <ul className="project-list">
            {projects.map((project) => (
              <li key={project.id}>
                <Link to={`/projects/${project.id}`}>{project.title}</Link>
                <span className="project-mode">{modeLabel(project.mode)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
