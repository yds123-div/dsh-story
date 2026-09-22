import type { ProjectMode, ProjectStatus, ProjectSummary } from '@dsh-story/contracts';
import type { SqliteDatabase } from './connection.js';

export interface ProjectRow {
  id: string;
  title: string;
  mode: ProjectMode;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export function toProjectSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = 'id, title, mode, status, created_at, updated_at';

export function insertProject(db: SqliteDatabase, row: ProjectRow): void {
  db.prepare('INSERT INTO projects (id, title, mode, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    row.id,
    row.title,
    row.mode,
    row.status,
    row.created_at,
    row.updated_at,
  );
}

export function findProjectRow(db: SqliteDatabase, id: string): ProjectRow | undefined {
  return db.prepare(`SELECT ${COLUMNS} FROM projects WHERE id = ?`).get(id) as ProjectRow | undefined;
}

export function listProjectRows(db: SqliteDatabase): ProjectRow[] {
  return db.prepare(`SELECT ${COLUMNS} FROM projects ORDER BY created_at DESC, rowid DESC`).all() as ProjectRow[];
}

export function updateProjectRow(
  db: SqliteDatabase,
  id: string,
  patch: { title?: string; status?: ProjectStatus },
  at: string,
): void {
  if (patch.title !== undefined && patch.status !== undefined) {
    db.prepare('UPDATE projects SET title = ?, status = ?, updated_at = ? WHERE id = ?').run(
      patch.title,
      patch.status,
      at,
      id,
    );
  } else if (patch.title !== undefined) {
    db.prepare('UPDATE projects SET title = ?, updated_at = ? WHERE id = ?').run(patch.title, at, id);
  } else if (patch.status !== undefined) {
    db.prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?').run(patch.status, at, id);
  }
}
