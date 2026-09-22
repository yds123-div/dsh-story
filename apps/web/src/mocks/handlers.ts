import type { PatchSegmentBody } from '../types/api';
import { delay, http, HttpResponse } from 'msw';
import {
  addProject,
  completeAssetsRecord,
  createAssetImageTask,
  createEpisodeExportTask,
  createEpisodeSplitTask,
  createOutlineTask,
  createNovelTask,
  createSegmentRecord,
  createSegmentVideoTask,
  createCreativeTask,
  finalizeOutlineRecord,
  getCreditsBalance,
  getEpisodeRecord,
  getOutlineRecord,
  getProject,
  getProjects,
  getStorage,
  getTaskRecord,
  getWorkflowRecord,
  isModelId,
  listAssetRecords,
  listEpisodeRecords,
  listModelRecords,
  listNotificationRecords,
  listSegmentRecords,
  listTemplateRecords,
  patchAssetRecord,
  patchSegmentRecord,
  renameProject,
} from './db';

function netDelay(ms: number): Promise<void> {
  if (import.meta.env.MODE === 'test') return Promise.resolve();
  return delay(ms);
}

export const handlers = [
  http.get('/api/projects', async () => {
    await netDelay(80);
    return HttpResponse.json({
      projects: getProjects(),
      storage: getStorage(),
    });
  }),

  http.post('/api/projects', async ({ request }) => {
    await netDelay(80);
    const body = (await request.json()) as { name?: string; aspectRatio?: string; style?: string };
    const name = body.name?.trim();
    if (!name) {
      return HttpResponse.json({ message: '项目名称不能为空' }, { status: 400 });
    }
    const project = addProject({ name, aspectRatio: body.aspectRatio, style: body.style });
    return HttpResponse.json(project, { status: 201 });
  }),

  http.patch('/api/projects/:id', async ({ params, request }) => {
    await netDelay(80);
    const body = (await request.json()) as { name?: string };
    const name = body.name?.trim();
    if (!name) {
      return HttpResponse.json({ message: '项目名称不能为空' }, { status: 400 });
    }
    const updated = renameProject(String(params.id), name);
    if (!updated) {
      return HttpResponse.json({ message: '项目不存在' }, { status: 404 });
    }
    return HttpResponse.json(updated);
  }),

  http.get('/api/credits', async () => {
    await netDelay(60);
    return HttpResponse.json({ balance: getCreditsBalance() });
  }),

  http.post('/api/projects/:id/outline-tasks', async ({ params, request }) => {
    await netDelay(120);
    const project = getProject(String(params.id));
    if (!project) {
      return HttpResponse.json({ message: '项目不存在' }, { status: 404 });
    }
    const body = (await request.json()) as { sourceType?: string; text?: string; fileName?: string };
    if (body.sourceType !== 'paste' && body.sourceType !== 'file') {
      return HttpResponse.json({ message: 'sourceType 无效' }, { status: 400 });
    }
    const task = createOutlineTask(project.id);
    return HttpResponse.json({ taskId: task.taskId }, { status: 202 });
  }),

  http.post('/api/projects/:id/novel-tasks', async ({ params, request }) => {
    await netDelay(120);
    const project = getProject(String(params.id));
    if (!project) {
      return HttpResponse.json({ message: '项目不存在' }, { status: 404 });
    }
    const body = (await request.json()) as { sourceType?: string; text?: string; fileName?: string };
    if (body.sourceType !== 'paste' && body.sourceType !== 'file') {
      return HttpResponse.json({ message: 'sourceType 无效' }, { status: 400 });
    }
    const task = createNovelTask(project.id);
    return HttpResponse.json({ taskId: task.taskId }, { status: 202 });
  }),

  http.get('/api/tasks/:taskId', async ({ params }) => {
    await netDelay(40);
    const task = getTaskRecord(String(params.taskId));
    if (!task) {
      return HttpResponse.json({ message: '任务不存在' }, { status: 404 });
    }
    return HttpResponse.json(task);
  }),

  http.get('/api/projects/:id/outline', async ({ params }) => {
    await netDelay(80);
    const outline = getOutlineRecord(String(params.id));
    if (!outline) {
      return HttpResponse.json({ message: '大纲不存在' }, { status: 404 });
    }
    return HttpResponse.json(outline);
  }),

  http.post('/api/projects/:id/outline/finalize', async ({ params }) => {
    await netDelay(80);
    const workflow = finalizeOutlineRecord(String(params.id));
    if (!workflow) {
      return HttpResponse.json({ message: '大纲不存在' }, { status: 404 });
    }
    return HttpResponse.json(workflow);
  }),

  http.patch('/api/projects/:id/outline/screenplay', async ({ params, request }) => {
    await netDelay(80);
    const body = (await request.json()) as { screenplay?: string };
    if (typeof body.screenplay !== 'string') {
      return HttpResponse.json({ message: 'screenplay 无效' }, { status: 400 });
    }
    const outline = getOutlineRecord(String(params.id));
    if (!outline) {
      return HttpResponse.json({ message: '大纲不存在' }, { status: 404 });
    }
    outline.screenplay = body.screenplay;
    return HttpResponse.json(outline);
  }),

  http.get('/api/projects/:id/workflow', async ({ params }) => {
    await netDelay(40);
    const workflow = getWorkflowRecord(String(params.id));
    if (!workflow) {
      return HttpResponse.json({ message: '项目不存在' }, { status: 404 });
    }
    return HttpResponse.json(workflow);
  }),

  http.get('/api/projects/:id/assets', async ({ params }) => {
    await netDelay(80);
    const list = listAssetRecords(String(params.id));
    if (!list) {
      return HttpResponse.json({ message: '项目不存在' }, { status: 404 });
    }
    return HttpResponse.json({ assets: list });
  }),

  http.post('/api/assets/:id/image-tasks', async ({ params }) => {
    await netDelay(120);
    const task = createAssetImageTask(String(params.id));
    if (!task) {
      return HttpResponse.json({ message: '资产不存在' }, { status: 404 });
    }
    return HttpResponse.json({ taskId: task.taskId }, { status: 202 });
  }),

  http.patch('/api/assets/:id', async ({ params, request }) => {
    await netDelay(80);
    const body = (await request.json()) as { consistencyLocked?: boolean; currentAlt?: number };
    if (body.consistencyLocked !== undefined && typeof body.consistencyLocked !== 'boolean') {
      return HttpResponse.json({ message: 'consistencyLocked 无效' }, { status: 400 });
    }
    if (body.currentAlt !== undefined && typeof body.currentAlt !== 'number') {
      return HttpResponse.json({ message: 'currentAlt 无效' }, { status: 400 });
    }
    const updated = patchAssetRecord(String(params.id), body);
    if (!updated) {
      return HttpResponse.json({ message: '资产不存在' }, { status: 404 });
    }
    return HttpResponse.json(updated);
  }),

  http.post('/api/projects/:id/assets/complete', async ({ params }) => {
    await netDelay(80);
    const workflow = completeAssetsRecord(String(params.id));
    if (!workflow) {
      return HttpResponse.json({ message: '请先完成剧本定稿' }, { status: 400 });
    }
    return HttpResponse.json(workflow);
  }),

  http.post('/api/projects/:id/episode-split-tasks', async ({ params }) => {
    await netDelay(120);
    const task = createEpisodeSplitTask(String(params.id));
    if (!task) {
      return HttpResponse.json({ message: '请先完成资产步骤' }, { status: 400 });
    }
    return HttpResponse.json({ taskId: task.taskId }, { status: 202 });
  }),

  http.get('/api/projects/:id/episodes', async ({ params }) => {
    await netDelay(80);
    const list = listEpisodeRecords(String(params.id));
    if (!list) {
      return HttpResponse.json({ message: '项目不存在' }, { status: 404 });
    }
    return HttpResponse.json({ episodes: list });
  }),

  http.get('/api/models', async () => {
    await netDelay(40);
    return HttpResponse.json({ models: listModelRecords() });
  }),

  http.get('/api/episodes/:episodeId', async ({ params }) => {
    await netDelay(80);
    const episode = getEpisodeRecord(String(params.episodeId));
    if (!episode) {
      return HttpResponse.json({ message: '分集不存在' }, { status: 404 });
    }
    return HttpResponse.json(episode);
  }),

  http.get('/api/episodes/:episodeId/segments', async ({ params }) => {
    await netDelay(80);
    const list = listSegmentRecords(String(params.episodeId));
    if (!list) {
      return HttpResponse.json({ message: '分集不存在' }, { status: 404 });
    }
    return HttpResponse.json({ segments: list });
  }),

  http.patch('/api/segments/:id', async ({ params, request }) => {
    await netDelay(80);
    const body = (await request.json()) as PatchSegmentBody;
    const updated = patchSegmentRecord(String(params.id), body);
    if (!updated) {
      return HttpResponse.json({ message: '片段不存在' }, { status: 404 });
    }
    return HttpResponse.json(updated);
  }),

  http.post('/api/episodes/:episodeId/segments', async ({ params, request }) => {
    await netDelay(80);
    const body = (await request.json()) as { prompt: string; durationSec: number; title: string };
    const created = createSegmentRecord(String(params.episodeId), body);
    if (!created) {
      return HttpResponse.json({ message: '分集不存在' }, { status: 404 });
    }
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post('/api/segments/:id/video-tasks', async ({ params, request }) => {
    await netDelay(120);
    const body = (await request.json()) as { model?: string };
    if (!body.model || !isModelId(body.model)) {
      return HttpResponse.json({ message: 'model 无效' }, { status: 400 });
    }
    const task = createSegmentVideoTask(String(params.id), body.model);
    if (!task) {
      return HttpResponse.json({ message: '片段不存在' }, { status: 404 });
    }
    return HttpResponse.json({ taskId: task.taskId }, { status: 202 });
  }),

  http.post('/api/episodes/:episodeId/export-tasks', async ({ params }) => {
    await netDelay(120);
    const task = createEpisodeExportTask(String(params.episodeId));
    if (!task) {
      return HttpResponse.json({ message: '分集不存在或尚未拆分' }, { status: 400 });
    }
    return HttpResponse.json({ taskId: task.taskId }, { status: 202 });
  }),

  http.get('/api/templates', async () => {
    await netDelay(80);
    return HttpResponse.json({ templates: listTemplateRecords() });
  }),

  http.get('/api/notifications', async () => {
    await netDelay(60);
    return HttpResponse.json({ notifications: listNotificationRecords() });
  }),

  http.post('/api/creative-tasks', async ({ request }) => {
    await netDelay(120);
    const body = (await request.json()) as { kind?: string; prompt?: string };
    if (!body.kind || (body.kind !== 'image' && body.kind !== 'video')) {
      return HttpResponse.json({ message: 'kind 无效' }, { status: 400 });
    }
    if (!body.prompt || typeof body.prompt !== 'string') {
      return HttpResponse.json({ message: 'prompt 无效' }, { status: 400 });
    }
    const task = createCreativeTask(body.kind === 'image' ? 'creative-image' : 'creative-video');
    return HttpResponse.json({ taskId: task.taskId }, { status: 202 });
  }),
];
