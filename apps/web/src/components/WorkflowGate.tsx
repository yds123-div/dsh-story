import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getWorkflow } from '../lib/api';
import { workflowRedirect, type WorkflowPage } from '../lib/workflow';
import { useWorkflowStore } from '../stores/workflowStore';
import type { WorkflowStep } from '../types/api';

export function WorkflowGate({ page, children }: { page: WorkflowPage; children: ReactNode }) {
  const { id } = useParams();
  const setUnlocked = useWorkflowStore((s) => s.setUnlocked);
  const [unlockedStep, setUnlockedStep] = useState<WorkflowStep | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void getWorkflow(id)
      .then((wf) => {
        if (cancelled) return;
        setUnlocked(id, wf.unlockedStep);
        setUnlockedStep(wf.unlockedStep);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, page, setUnlocked]);

  if (!id || missing) return <Navigate to="/" replace />;
  if (unlockedStep == null) return null;
  const to = workflowRedirect(id, unlockedStep, page);
  if (to) return <Navigate to={to} replace />;
  return children;
}
