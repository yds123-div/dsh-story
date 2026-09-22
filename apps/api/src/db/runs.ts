import type { RunKind, RunMeta, RunStatus } from '@dsh-story/contracts';
import type { SqliteDatabase } from './connection.js';

export interface RunRow {
  id: string;
  project_id: string;
  kind: RunKind;
  status: RunStatus;
  created_at: string;
  finished_at: string | null;
}

export function toRunMeta(row: RunRow): RunMeta {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    status: row.status,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

export function insertRun(db: SqliteDatabase, row: RunRow): void {
  db.prepare(
    'INSERT INTO runs (id, project_id, kind, status, created_at, finished_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(row.id, row.project_id, row.kind, row.status, row.created_at, row.finished_at);
}

export function listRunRowsByProject(db: SqliteDatabase, projectId: string): RunRow[] {
  return db
    .prepare('SELECT id, project_id, kind, status, created_at, finished_at FROM runs WHERE project_id = ? ORDER BY created_at DESC')
    .all(projectId) as RunRow[];
}
