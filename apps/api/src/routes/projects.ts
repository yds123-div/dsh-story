import {
  SOURCE_INPUT_LIMITS,
  type ApiError,
  type CreateProjectRequest,
  type CreateRunRequest,
  type FileMeta,
  type ProjectDetail,
  type ProjectMode,
  type ProjectStatus,
  type RunKind,
  type RunMeta,
  type SaveSourceInputRequest,
  type UpdateProjectRequest,
} from '@dsh-story/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { AppDeps } from '../app.js';
import type { SqliteDatabase } from '../db/connection.js';
import { findFileRow, insertFile, listFileRowsByProject, toFileMeta } from '../db/files.js';
import {
  findProjectRow,
  insertProject,
  listProjectRows,
  toProjectSummary,
  updateProjectRow,
  type ProjectRow,
} from '../db/projects.js';
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
    if (typeof body?.sourceText === 'string' && body.sourceText.length > 0) {
      const invalid = checkSourceText(reply, mode, body.sourceText);
      if (invalid) return invalid;
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    insertProject(deps.db, { id, title, mode, status: 'active', created_at: now, updated_at: now });

    if (typeof body?.sourceText === 'string' && body.sourceText.length > 0) {
      saveSourceInput(deps, id, mode, mode === 'novel' ? 'novel-source.txt' : 'script-source.txt', body.sourceText, now);
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
    const project = findProjectRow(deps.db, id);
    if (!project) return notFound(reply);
    const body = request.body as Partial<SaveSourceInputRequest> | undefined;
    const text = typeof body?.text === 'string' ? body.text : '';
    if (!text) return reply.code(400).send(badRequest('text 不能为空'));
    const invalid = checkSourceText(reply, project.mode, text);
    if (invalid) return invalid;
    const rawFilename = typeof body?.filename === 'string' ? body.filename : '';
    const meta = saveSourceInput(deps, id, project.mode, sanitizeFilename(rawFilename), text, new Date().toISOString());
    return reply.code(201).send(meta);
  });

  // 原始输入文件上传（multipart）：首期只收 txt / md 纯文本，内容按 UTF-8 文本落盘
  app.post('/api/product/projects/:id/inputs/file', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = findProjectRow(deps.db, id);
    if (!project) return notFound(reply);

    const part = await request.file();
    if (!part) return reply.code(400).send(badRequest('缺少上传文件'));

    const dot = part.filename.lastIndexOf('.');
    const ext = dot >= 0 ? part.filename.slice(dot).toLowerCase() : '';
    if (!(SOURCE_INPUT_LIMITS.allowedFileExtensions as readonly string[]).includes(ext)) {
      return reply.code(415).send(badRequest('不支持的文件类型：首期仅支持 txt / md 文本文件'));
    }

    const chunks: Buffer[] = [];
    for await (const chunk of part.file) chunks.push(chunk as Buffer);
    if (part.file.truncated) {
      return reply.code(413).send(badRequest(`文件过大：单文件不超过 ${SOURCE_INPUT_LIMITS.maxFileBytes / 1024 / 1024}MB`));
    }
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    } catch {
      return reply.code(400).send(badRequest('文件不是有效的 UTF-8 文本'));
    }
    const invalid = checkSourceText(reply, project.mode, text);
    if (invalid) return invalid;

    const meta = saveSourceInput(deps, id, project.mode, sanitizeFilename(part.filename), text, new Date().toISOString());
    return reply.code(201).send(meta);
  });

  // 原始输入只读内容（首期无在线编辑；读取用于展示与核对）
  app.get('/api/product/projects/:id/inputs/:fileId', async (request, reply) => {
    const { id, fileId } = request.params as { id: string; fileId: string };
    if (!findProjectRow(deps.db, id)) return notFound(reply);
    const file = findFileRow(deps.db, fileId);
    if (!file || file.project_id !== id || file.kind !== 'source-input') return fileNotFound(reply);
    const content = deps.storage.readSourceInput(file.path);
    return reply.type('text/plain; charset=utf-8').send(content);
  });

  app.post('/api/product/projects/:id/runs', async (request, reply) => {
    const { id: projectId } = request.params as { id: string };
    if (!findProjectRow(deps.db, projectId)) return notFound(reply);
    const body = request.body as Partial<CreateRunRequest> | undefined;
    const kind = body?.kind;
    if (!kind || !RUN_KINDS.includes(kind)) {
      return reply.code(400).send(badRequest('kind 必须是 script 或 asset-extraction'));
    }
    // 剧本生成必须明确引用本项目的一份原始输入；asset-extraction 的引用模型
    //（消费已接受的剧本运行）属于工单 04+，此处留空
    const sourceFileId = typeof body?.sourceFileId === 'string' ? body.sourceFileId : '';
    if (kind === 'script' && !sourceFileId) {
      return reply.code(400).send(badRequest('sourceFileId 不能为空：剧本生成必须明确引用一份原始输入'));
    }
    let sourceFileRow: string | null = null;
    if (sourceFileId) {
      const sourceFile = findFileRow(deps.db, sourceFileId);
      if (!sourceFile || sourceFile.project_id !== projectId || sourceFile.kind !== 'source-input') {
        return fileNotFound(reply);
      }
      sourceFileRow = sourceFileId;
    }
    // 工单 01：只登记运行元数据，不执行生成业务（工单 04 负责真实运行）
    const row: RunRow = {
      id: randomUUID(),
      project_id: projectId,
      kind,
      status: 'created',
      source_file_id: sourceFileRow,
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

function saveSourceInput(
  deps: AppDeps,
  projectId: string,
  mode: ProjectMode,
  fileName: string,
  text: string,
  at: string,
): FileMeta {
  // 每次保存落盘为唯一文件名：同一文件名重复保存不覆盖旧文件，
  // 否则引用旧文件的运行会读到被替换的内容（原始输入不可变）
  const storedName = `${randomUUID().slice(0, 8)}-${fileName}`;
  const saved = deps.storage.saveSourceInput(projectId, storedName, text);
  const meta: FileMeta = {
    id: randomUUID(),
    projectId,
    runId: null,
    kind: 'source-input',
    role: mode === 'novel' ? 'novel-source' : 'script-source',
    path: saved.relPath,
    mimeType: fileName.toLowerCase().endsWith('.md') ? 'text/markdown' : 'text/plain',
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

/** 粘贴 / 上传的原始文本共用：按项目模式校验字数上下限；返回错误响应表示拦截 */
function checkSourceText(reply: FastifyReply, mode: ProjectMode, text: string): FastifyReply | undefined {
  if (text.trim().length < SOURCE_INPUT_LIMITS.minChars) {
    return reply.code(400).send(badRequest(`文本太短：原始输入至少 ${SOURCE_INPUT_LIMITS.minChars} 字`));
  }
  const maxChars = mode === 'novel' ? SOURCE_INPUT_LIMITS.novelMaxChars : SOURCE_INPUT_LIMITS.scriptMaxChars;
  if (text.length > maxChars) {
    const hint = mode === 'novel' ? '小说不超过 10 万字' : '剧本不超过 30 万字';
    return reply.code(413).send(badRequest(`原始输入超出字数上限：${hint}`));
  }
  return undefined;
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

/** 兜底命名与非法名（点号、路径片段、Windows 保留字符）都收敛到随机文件名，避免写到项目目录之外 */
function sanitizeFilename(name: string): string {
  const fallback = `input-${randomUUID()}.txt`;
  const cleaned = name.trim().replace(/[\\/]/g, '');
  if (!cleaned || /^\.+$/.test(cleaned) || /[<>:"|?*\x00-\x1f]/.test(cleaned)) return fallback;
  return cleaned;
}

function badRequest(message: string): ApiError {
  return { message };
}

function notFound(reply: FastifyReply): FastifyReply {
  return reply.code(404).send({ message: '项目不存在' } satisfies ApiError);
}

function fileNotFound(reply: FastifyReply): FastifyReply {
  return reply.code(404).send({ message: '原始输入文件不存在' } satisfies ApiError);
}
