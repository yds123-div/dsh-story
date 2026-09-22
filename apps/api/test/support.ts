import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildApp, type TestApp } from '../src/app.js';
import { openDatabase, type SqliteDatabase } from '../src/db/connection.js';
import { createLocalStorage, type LocalStorage } from '../src/storage/local-files.js';

export interface TestContext {
  app: TestApp;
  db: SqliteDatabase;
  storage: LocalStorage;
  dataDir: string;
  close(): Promise<void>;
}

/** 每个测试用独立的临时数据目录（数据库 + 本地文件），互不污染 */
export async function createTestApp(): Promise<TestContext> {
  process.env.DSH_API_LOG_LEVEL = 'silent';
  const dataDir = mkdtempSync(path.join(os.tmpdir(), 'dsh-api-test-'));
  const db = openDatabase(dataDir);
  const storage = createLocalStorage(dataDir);
  const app = await buildApp({ db, storage, version: 'test' });
  return {
    app,
    db,
    storage,
    dataDir,
    async close() {
      await app.close();
      db.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}
