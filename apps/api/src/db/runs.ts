import type { RunKind, RunMeta, RunStatus } from '@dsh-story/contracts';
import type { SqliteDatabase } from './connection.js';

export interface RunRow {
  id: string;
  project_id: string;
  kind: RunKind;
  status: RunStatus;
  /** 本次运行消费的原始输入文件（files.id）；旧数据可能为 null */
  source_file_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  current_step: string | null;
  failure_reason: string | null;
}

export function toRunMeta(row: RunRow): RunMeta {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    status: row.status,
    sourceFileId: row.source_file_id,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    currentStep: row.current_step,
    failureReason: row.failure_reason,
  };
}

export function insertRun(db: SqliteDatabase, row: RunRow): void {
  db.prepare(
    'INSERT INTO runs (id, project_id, kind, status, source_file_id, created_at, started_at, finished_at, current_step, failure_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(row.id, row.project_id, row.kind, row.status, row.source_file_id, row.created_at, row.started_at, row.finished_at, row.current_step, row.failure_reason);
}

export function listRunRowsByProject(db: SqliteDatabase, projectId: string): RunRow[] {
  return db
    .prepare(
      'SELECT id, project_id, kind, status, source_file_id, created_at, started_at, finished_at, current_step, failure_reason FROM runs WHERE project_id = ? ORDER BY created_at DESC',
    )
    .all(projectId) as RunRow[];
}
