import type { ProjectMode, ProjectSummary } from '@dsh-story/contracts';
import type { SqliteDatabase } from './connection.js';

export interface ProjectRow {
  id: string;
  title: string;
  mode: ProjectMode;
  created_at: string;
  updated_at: string;
}

export function toProjectSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function insertProject(db: SqliteDatabase, row: ProjectRow): void {
  db.prepare('INSERT INTO projects (id, title, mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
    row.id,
    row.title,
    row.mode,
    row.created_at,
    row.updated_at,
  );
}

export function findProjectRow(db: SqliteDatabase, id: string): ProjectRow | undefined {
  return db
    .prepare('SELECT id, title, mode, created_at, updated_at FROM projects WHERE id = ?')
    .get(id) as ProjectRow | undefined;
}

export function listProjectRows(db: SqliteDatabase): ProjectRow[] {
  return db
    .prepare('SELECT id, title, mode, created_at, updated_at FROM projects ORDER BY created_at DESC')
    .all() as ProjectRow[];
}

export function touchProject(db: SqliteDatabase, id: string, at = new Date().toISOString()): void {
  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(at, id);
}
