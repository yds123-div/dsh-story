import multipart from '@fastify/multipart';
import { SOURCE_INPUT_LIMITS } from '@dsh-story/contracts';
import Fastify, { type FastifyInstance } from 'fastify';
import type { SqliteDatabase } from './db/connection.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerProjectRoutes } from './routes/projects.js';
import type { LocalStorage } from './storage/local-files.js';

export interface AppDeps {
  db: SqliteDatabase;
  storage: LocalStorage;
  version: string;
}

export type TestApp = FastifyInstance;

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env.DSH_API_LOG_LEVEL ?? 'info' },
    // JSON 文本体要容得下 30 万字剧本（UTF-8 约 1MB），留出转义与文件上传的余量
    bodyLimit: SOURCE_INPUT_LIMITS.maxFileBytes + 2 * 1024 * 1024,
  });

  // 原始输入文件上传：单文件、服务端大小限制；类型与 UTF-8 校验在路由层做
  await app.register(multipart, {
    limits: { fileSize: SOURCE_INPUT_LIMITS.maxFileBytes, files: 1 },
  });

  registerHealthRoutes(app, deps);
  registerProjectRoutes(app, deps);

  return app;
}
