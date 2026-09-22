import type {
  ApiError,
  CreateProjectRequest,
  CreateRunRequest,
  FileMeta,
  ProjectDetail,
  ProjectMode,
  ProjectStatus,
  RunKind,
  RunMeta,
  SaveSourceInputRequest,
  UpdateProjectRequest,
} from '@dsh-story/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { AppDeps } from '../app.js';
import type { SqliteDatabase } from '../db/connection.js';
import { insertFile, listFileRowsByProject, toFileMeta } from '../db/files.js';
import { findProjectRow, insertProject, listProjectRows, toProjectSummary, updateProjectRow } from '../db/projects.js';
import { insertRun, listRunRowsByProject, toRunMeta, type RunRow } from '../db/runs.js';

// satisfies 绑定契约联合类型：契约加值时这里会在编译期报错，而不是运行时 400
const PROJECT_MODES = ['script', 'novel'] as const satisfies readonly ProjectMode[];
const PROJECT_STATUSES = ['active', 'archived'] as const satisfies readonly ProjectStatus[];
const RUN_KINDS = ['script', 'asset-extraction'] as const satisfies readonly RunKind[];

export function registerProjectRoutes(app: FastifyInstance, deps: AppDeps): void {
  app.post('/api/product/projects', async (request, reply) => {
    const body = request.body as Partial<CreateProjectRequest> | undefined;
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return reply.code(400).send(badRequest('title 不能为空'));
    }
    const mode = body?.mode ?? 'script';
    if (!PROJECT_MODES.includes(mode)) {
      return reply.code(400).send(badRequest('mode 必须是 script 或 novel'));
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    insertProject(deps.db, { id, title, mode, status: 'active', created_at: now, updated_at: now });

    if (typeof body?.sourceText === 'string' && body.sourceText.length > 0) {
      saveSourceInput(deps, id, 'script-source.txt', body.sourceText, now);
    }

    return reply.code(201).send(getProjectDetail(deps.db, id));
  });

  app.get('/api/product/projects', async () => ({
    projects: listProjectRows(deps.db).map(toProjectSummary),
  }));

  app.get('/api/product/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const detail = getProjectDetail(deps.db, id);
    if (!detail) return notFound(reply);
    return detail;
  });

  app.patch('/api/product/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!findProjectRow(deps.db, id)) return notFound(reply);
    const body = request.body as Partial<UpdateProjectRequest> | undefined;

    if (body?.title !== undefined) {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title) return reply.code(400).send(badRequest('title 不能为空'));
    }
    if (body?.status !== undefined && !PROJECT_STATUSES.includes(body.status as ProjectStatus)) {
      return reply.code(400).send(badRequest('status 必须是 active 或 archived'));
    }

    updateProjectRow(deps.db, id, { title: body?.title, status: body?.status }, new Date().toISOString());
    return getProjectDetail(deps.db, id);
  });

  app.post('/api/product/projects/:id/inputs', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!findProjectRow(deps.db, id)) return notFound(reply);
    const body = request.body as Partial<SaveSourceInputRequest> | undefined;
    const text = typeof body?.text === 'string' ? body.text : '';
    if (!text) return reply.code(400).send(badRequest('text 不能为空'));
    const rawFilename = typeof body?.filename === 'string' ? body.filename : '';
    const meta = saveSourceInput(deps, id, sanitizeFilename(rawFilename), text, new Date().toISOString());
    return reply.code(201).send(meta);
  });

  app.post('/api/product/projects/:id/runs', async (request, reply) => {
    const { id: projectId } = request.params as { id: string };
    if (!findProjectRow(deps.db, projectId)) return notFound(reply);
    const body = request.body as Partial<CreateRunRequest> | undefined;
    const kind = body?.kind;
    if (!kind || !RUN_KINDS.includes(kind)) {
      return reply.code(400).send(badRequest('kind 必须是 script 或 asset-extraction'));
    }
    // 工单 01：只登记运行元数据，不执行生成业务（工单 04 负责真实运行）
    const row: RunRow = {
      id: randomUUID(),
      project_id: projectId,
      kind,
      status: 'created',
      created_at: new Date().toISOString(),
      finished_at: null,
    };
    insertRun(deps.db, row);
    return reply.code(201).send(toRunMeta(row));
  });

  app.get('/api/product/projects/:id/runs', async (request, reply) => {
    const { id: projectId } = request.params as { id: string };
    if (!findProjectRow(deps.db, projectId)) return notFound(reply);
    const runs: RunMeta[] = listRunRowsByProject(deps.db, projectId).map(toRunMeta);
    return { runs };
  });
}

function saveSourceInput(deps: AppDeps, projectId: string, fileName: string, text: string, at: string): FileMeta {
  const saved = deps.storage.saveSourceInput(projectId, fileName, text);
  const meta: FileMeta = {
    id: randomUUID(),
    projectId,
    runId: null,
    kind: 'source-input',
    role: 'script-source',
    path: saved.relPath,
    mimeType: 'text/plain',
    sizeBytes: saved.sizeBytes,
    createdAt: at,
  };
  insertFile(deps.db, {
    id: meta.id,
    project_id: meta.projectId,
    run_id: meta.runId,
    kind: meta.kind,
    role: meta.role,
    path: meta.path,
    mime_type: meta.mimeType,
    size_bytes: meta.sizeBytes,
    created_at: meta.createdAt,
  });
  return meta;
}

function getProjectDetail(db: SqliteDatabase, id: string): ProjectDetail | undefined {
  const row = findProjectRow(db, id);
  if (!row) return undefined;
  return {
    project: toProjectSummary(row),
    runs: listRunRowsByProject(db, id).map(toRunMeta),
    files: listFileRowsByProject(db, id).map(toFileMeta),
  };
}

/** 兜底命名与非法名（点号、路径片段）都收敛到随机文件名，避免写到项目目录之外 */
function sanitizeFilename(name: string): string {
  const fallback = `input-${randomUUID()}.txt`;
  const cleaned = name.trim().replace(/[\\/]/g, '');
  if (!cleaned || /^\.+$/.test(cleaned)) return fallback;
  return cleaned;
}

function badRequest(message: string): ApiError {
  return { message };
}

function notFound(reply: FastifyReply): FastifyReply {
  return reply.code(404).send({ message: '项目不存在' } satisfies ApiError);
}
