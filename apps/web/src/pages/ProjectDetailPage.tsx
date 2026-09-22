import type { ProjectDetail } from '@dsh-story/contracts';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiClientError, api } from '../lib/productApi';
import '../styles.css';
import { modeLabel } from '../lib/labels';

/** 项目详情：运行元数据 + 文件元数据（只读骨架，无生成业务） */
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setProject(await api.getProject(id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : String(err));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!project) {
    return (
      <div className="entry">
        <p>{error ?? '加载中…'}</p>
        <Link to="/">← 返回项目列表</Link>
      </div>
    );
  }

  async function handleRegisterRun() {
    await api.createRun(project!.id, { kind: 'script' });
    await load();
  }

  return (
    <div className="entry">
      <p>
        <Link to="/">← 返回项目列表</Link>
      </p>
      <section className="card">
        <h2>{project.title}</h2>
        <p className="project-mode">{modeLabel(project.mode)}</p>
        <button type="button" onClick={() => void handleRegisterRun()}>
          登记一次剧本运行（仅元数据）
        </button>
      </section>

      <section className="card">
        <h2>运行记录</h2>
        {project.runs.length === 0 ? (
          <p className="empty">暂无运行</p>
        ) : (
          <table className="meta-table">
            <thead>
              <tr>
                <th>运行</th>
                <th>类型</th>
                <th>状态</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {project.runs.map((run) => (
                <tr key={run.id}>
                  <td>{run.id.slice(0, 8)}</td>
                  <td>{run.kind}</td>
                  <td>{run.status}</td>
                  <td>{run.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>文件</h2>
        {project.files.length === 0 ? (
          <p className="empty">暂无文件</p>
        ) : (
          <table className="meta-table">
            <thead>
              <tr>
                <th>路径</th>
                <th>类型</th>
                <th>角色</th>
                <th>大小</th>
              </tr>
            </thead>
            <tbody>
              {project.files.map((file) => (
                <tr key={file.id}>
                  <td>{file.path}</td>
                  <td>{file.kind}</td>
                  <td>{file.role}</td>
                  <td>{file.sizeBytes} B</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
