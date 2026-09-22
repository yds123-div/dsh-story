import type { FileKind, FileMeta } from '@dsh-story/contracts';
import type { SqliteDatabase } from './connection.js';

export interface FileRow {
  id: string;
  project_id: string;
  run_id: string | null;
  kind: FileKind;
  role: string;
  path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export function toFileMeta(row: FileRow): FileMeta {
  return {
    id: row.id,
    projectId: row.project_id,
    runId: row.run_id,
    kind: row.kind,
    role: row.role,
    path: row.path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}

export function insertFile(db: SqliteDatabase, row: FileRow): void {
  db.prepare(
    `INSERT INTO files (id, project_id, run_id, kind, role, path, mime_type, size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.project_id,
    row.run_id,
    row.kind,
    row.role,
    row.path,
    row.mime_type,
    row.size_bytes,
    row.created_at,
  );
}

export function listFileRowsByProject(db: SqliteDatabase, projectId: string): FileRow[] {
  return db
    .prepare(
      `SELECT id, project_id, run_id, kind, role, path, mime_type, size_bytes, created_at
       FROM files WHERE project_id = ? ORDER BY created_at DESC`,
    )
    .all(projectId) as FileRow[];
}
