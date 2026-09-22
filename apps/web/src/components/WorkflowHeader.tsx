import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkflowStore } from '../stores/workflowStore';
import type { WorkflowPage } from '../lib/workflow';

const STEPS: { page: WorkflowPage; n: 1 | 2 | 3; label: string; path: (id: string) => string }[] = [
  { page: 'outline', n: 1, label: '剧本大纲', path: (id) => `/project/${id}/outline` },
  { page: 'assets', n: 2, label: '角色、场景和道具', path: (id) => `/project/${id}/assets` },
  { page: 'episodes', n: 3, label: '分集视频', path: (id) => `/project/${id}/episodes` },
];

export function WorkflowHeader({
  projectName,
  tag,
  current,
  extra,
}: {
  projectName: string;
  tag: string;
  current: WorkflowPage;
  extra?: ReactNode;
}) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const unlocked = useWorkflowStore((s) => s.unlockedByProject[id] ?? 1);

  return (
    <div className="ds-flowHead">
      <button type="button" className="ds-back" onClick={() => navigate('/')}>
        ‹
      </button>
      <span className="ds-flowTitle">
        {projectName} <span className="tag">{tag}</span>
      </span>
      <div className="ds-steps3">
        {STEPS.map((step, i) => (
          <span key={step.page} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {i > 0 ? <span className="ds-stepArr">›</span> : null}
            <button
              type="button"
              className={`ds-step3${current === step.page ? ' on' : unlocked > step.n ? ' done' : ''}`}
              onClick={() => navigate(step.path(id))}
            >
              <span className="n">{step.n}</span>
              {step.label}
            </button>
          </span>
        ))}
      </div>
      {extra ? <div style={{ marginLeft: 'auto' }}>{extra}</div> : null}
    </div>
  );
}
