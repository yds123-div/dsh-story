import type { HealthResponse } from '@dsh-story/contracts';
import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../app.js';

export function registerHealthRoutes(app: FastifyInstance, deps: AppDeps): void {
  app.get('/health', async (_request, reply) => {
    let dbOk = false;
    try {
      deps.db.prepare('SELECT 1').get();
      dbOk = true;
    } catch {
      dbOk = false;
    }
    const storageOk = deps.storage.checkWritable();

    const body: HealthResponse = {
      status: dbOk && storageOk ? 'ok' : 'degraded',
      service: 'dsh-story-api',
      version: deps.version,
      components: {
        db: dbOk ? 'ok' : 'error',
        storage: storageOk ? 'ok' : 'error',
      },
      time: new Date().toISOString(),
    };
    return reply.code(body.status === 'ok' ? 200 : 503).send(body);
  });
}
