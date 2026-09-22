/**
 * 数据库迁移：按 version 顺序执行，已在 schema_migrations 中登记的跳过。
 * 迁移一旦发布不可修改，只能追加新版本。
 */
export interface Migration {
  version: number;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        mode TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE runs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        kind TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        finished_at TEXT
      );
      CREATE INDEX idx_runs_project ON runs(project_id);

      CREATE TABLE files (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        run_id TEXT REFERENCES runs(id),
        kind TEXT NOT NULL,
        role TEXT NOT NULL,
        path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_files_project ON files(project_id);
    `,
  },
  {
    version: 2,
    sql: `
      ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    `,
  },
];
