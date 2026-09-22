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
  });

  registerHealthRoutes(app, deps);
  registerProjectRoutes(app, deps);

  return app;
}
