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
import { findFileRow, insertFile, listFileRowsByProject, toFileMeta, type FileRow } from '../db/files.js';
import {
  findProjectRow,
  insertProject,
  listProjectRows,
  toProjectSummary,
  updateProjectRow,
  type ProjectRow,
} from '../db/projects.js';
import { insertRun, listRunRowsByProject, toRunMeta, type RunRow } from '../db/runs.js';
import path from 'node:path';
import { HarnessFactory } from '../harness/index.js';
import { loadConfig } from '../config.js';

const config = loadConfig();

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
      started_at: null,
      finished_at: null,
      current_step: null,
      failure_reason: null,
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

  // 执行剧本阶段任务
  app.post('/api/product/runs/:id/execute', async (request, reply) => {
    const { id: runId } = request.params as { id: string };
    const runRow = deps.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as RunRow | undefined;
    if (!runRow) return notFound(reply);

    // 检查运行状态是否为 created
    if (runRow.status !== 'created') {
      return reply.code(400).send(badRequest('运行状态必须为 created 才能执行'));
    }

    // 获取原始输入文件
    const sourceFile = deps.db.prepare('SELECT * FROM files WHERE id = ?').get(runRow.source_file_id) as FileRow | undefined;
    if (!sourceFile) {
      return reply.code(404).send(badRequest('未找到原始输入文件'));
    }

    // 读取原始输入内容
    const fs = await import('node:fs/promises');
    const sourceText = await fs.readFile(path.join(deps.storage.root, sourceFile.path), 'utf8');

    // 创建 Harness 适配器
    const harness = HarnessFactory.createScriptStageHarness(config);

    // 更新状态为 running
    deps.db.prepare('UPDATE runs SET status = ?, started_at = ?, current_step = ? WHERE id = ?').run(
      'running',
      new Date().toISOString(),
      'initializing',
      runId
    );

    try {
      // 执行任务
      const result = await harness.execute(
        runId,
        sourceText,
        async (update: any) => {
          // 更新运行状态
          const updates: Record<string, any> = {};
          if (update.status) updates.status = update.status;
          if (update.currentStep !== undefined) updates.current_step = update.currentStep;
          if (update.startedAt !== undefined) updates.started_at = update.startedAt;
          if (update.finishedAt !== undefined) updates.finished_at = update.finishedAt;
          if (update.failureReason !== undefined) updates.failure_reason = update.failureReason;

          if (Object.keys(updates).length > 0) {
            const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(updates), runId];
            deps.db.prepare(`UPDATE runs SET ${setClause} WHERE id = ?`).run(...values);
          }
        }
      );

      // 保存生成的产物
      for (const artifactPath of result.artifacts) {
        const artifactFullPath = path.join(deps.storage.root, 'generated', runRow.project_id, runId, artifactPath);
        const artifactContent = await fs.readFile(artifactFullPath, 'utf8');
        const fileMeta: FileMeta = {
          id: randomUUID(),
          projectId: runRow.project_id,
          runId: runId,
          kind: 'generated',
          role: getArtifactRole(artifactPath),
          path: `generated/${runRow.project_id}/${runId}/${artifactPath}`,
          mimeType: getArtifactMimeType(artifactPath),
          sizeBytes: Buffer.byteLength(artifactContent, 'utf8'),
          createdAt: new Date().toISOString(),
        };
        insertFile(deps.db, {
          id: fileMeta.id,
          project_id: fileMeta.projectId,
          run_id: fileMeta.runId,
          kind: fileMeta.kind,
          role: fileMeta.role,
          path: fileMeta.path,
          mime_type: fileMeta.mimeType,
          size_bytes: fileMeta.sizeBytes,
          created_at: fileMeta.createdAt,
        });
      }

      return reply.code(200).send({
        run: toRunMeta(deps.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as RunRow),
        artifacts: result.artifacts,
      });
    } catch (error) {
      return reply.code(500).send(badRequest(`执行失败: ${error instanceof Error ? error.message : String(error)}`));
    }
  });

  // 获取运行详情
  app.get('/api/product/runs/:id', async (request, reply) => {
    const { id: runId } = request.params as { id: string };
    const runRow = deps.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as RunRow | undefined;
    if (!runRow) return notFound(reply);

    const files = listFileRowsByProject(deps.db, runRow.project_id)
      .filter(file => file.run_id === runId)
      .map(toFileMeta);

    return {
      run: toRunMeta(runRow),
      files,
    };
  });

  // 取消运行
  app.post('/api/product/runs/:id/cancel', async (request, reply) => {
    const { id: runId } = request.params as { id: string };
    const runRow = deps.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as RunRow | undefined;
    if (!runRow) return notFound(reply);

    if (runRow.status !== 'running') {
      return reply.code(400).send(badRequest('只有 running 状态的运行才能取消'));
    }

    try {
      const harness = HarnessFactory.createScriptStageHarness(config);
      await harness.cancel(runId);

      deps.db.prepare('UPDATE runs SET status = ?, finished_at = ?, failure_reason = ? WHERE id = ?').run(
        'failed',
        new Date().toISOString(),
        '用户取消',
        runId
      );

      return reply.code(200).send(toRunMeta(deps.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as RunRow));
    } catch (error) {
      return reply.code(500).send(badRequest(`取消失败: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}

// 辅助函数：根据文件路径获取角色
function getArtifactRole(filePath: string): string {
  const filename = path.basename(filePath).toLowerCase();
  if (filename.includes('剧本') || filename.includes('script')) {
    return 'script-body';
  }
  if (filename.includes('分析') || filename.includes('analysis')) {
    return 'script-analysis';
  }
  if (filename.includes('场景') || filename.includes('scene')) {
    return 'scene-index';
  }
  if (filename.includes('资产') || filename.includes('asset')) {
    return 'asset-candidate';
  }
  if (filename.includes('制作') || filename.includes('production')) {
    return 'production-check';
  }
  return 'generated';
}

// 辅助函数：根据文件路径获取 MIME 类型
function getArtifactMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.md' || ext === '.txt') {
    return 'text/markdown';
  }
  return 'application/octet-stream';
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
  const cleaned = name.trim().replace(/[\/]/g, '');
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