import type { ApiError, CreateProjectRequest, CreateRunRequest, ProjectDetail, Run } from '@dsh-story/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { findProjectRow, insertProject, listProjectRows, toProjectSummary, touchProject } from '../db/projects.js';
import { listFileRowsByProject, insertFile, toFileMeta } from '../db/files.js';
import { insertRun, listRunRowsByProject, toRun, type RunRow } from '../db/runs.js';
import type { AppDeps } from '../app.js';
import type { SqliteDatabase } from '../db/connection.js';

const PROJECT_MODES = ['script', 'novel'] as const;
const RUN_KINDS = ['script', 'asset-extraction'] as const;

export function registerProjectRoutes(app: FastifyInstance, deps: AppDeps): void {
  app.post('/api/projects', async (request, reply) => {
    const body = request.body as Partial<CreateProjectRequest> | undefined;
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return reply.code(400).send(badRequest(400, 'title 不能为空'));
    }
    const mode = body?.mode ?? 'script';
    if (!PROJECT_MODES.includes(mode)) {
      return reply.code(400).send(badRequest(400, 'mode 必须是 script 或 novel'));
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    insertProject(deps.db, { id, title, mode, created_at: now, updated_at: now });

    const sourceText = typeof body?.sourceText === 'string' ? body.sourceText : '';
    if (sourceText.length > 0) {
      const saved = deps.storage.saveSourceInput(id, 'script-source.txt', sourceText);
      insertFile(deps.db, {
        id: randomUUID(),
        project_id: id,
        run_id: null,
        kind: 'source-input',
        role: 'script-source',
        path: saved.relPath,
        mime_type: 'text/plain',
        size_bytes: saved.sizeBytes,
        created_at: now,
      });
    }

    return reply.code(201).send(getProjectDetail(deps.db, id));
  });

  app.get('/api/projects', async () => listProjectRows(deps.db).map(toProjectSummary));

  app.get('/api/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const detail = getProjectDetail(deps.db, id);
    if (!detail) return notFound(reply);
    return detail;
  });

  app.post('/api/projects/:id/runs', async (request, reply) => {
    const { id: projectId } = request.params as { id: string };
    if (!findProjectRow(deps.db, projectId)) return notFound(reply);
    const body = request.body as Partial<CreateRunRequest> | undefined;
    const kind = body?.kind;
    if (!kind || !RUN_KINDS.includes(kind)) {
      return reply.code(400).send(badRequest(400, 'kind 必须是 script 或 asset-extraction'));
    }
    // 工单 01：只登记运行元数据，不执行生成业务
    const row: RunRow = {
      id: randomUUID(),
      project_id: projectId,
      kind,
      status: 'pending',
      created_at: new Date().toISOString(),
      finished_at: null,
    };
    insertRun(deps.db, row);
    touchProject(deps.db, projectId);
    return reply.code(201).send(toRun(row));
  });

  app.get('/api/projects/:id/runs', async (request, reply) => {
    const { id: projectId } = request.params as { id: string };
    if (!findProjectRow(deps.db, projectId)) return notFound(reply);
    const runs: Run[] = listRunRowsByProject(deps.db, projectId).map(toRun);
    return runs;
  });

  app.get('/api/projects/:id/files', async (request, reply) => {
    const { id: projectId } = request.params as { id: string };
    if (!findProjectRow(deps.db, projectId)) return notFound(reply);
    return listFileRowsByProject(deps.db, projectId).map(toFileMeta);
  });
}

function getProjectDetail(db: SqliteDatabase, id: string): ProjectDetail | undefined {
  const row = findProjectRow(db, id);
  if (!row) return undefined;
  return {
    ...toProjectSummary(row),
    runs: listRunRowsByProject(db, id).map(toRun),
    files: listFileRowsByProject(db, id).map(toFileMeta),
  };
}

function badRequest(statusCode: number, message: string): ApiError {
  return { statusCode, error: 'Bad Request', message };
}

function notFound(reply: FastifyReply): FastifyReply {
  return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: '项目不存在' } satisfies ApiError);
}
