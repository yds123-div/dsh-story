import { setupServer } from 'msw/node';
import {
  completeAssets,
  createProject,
  finalizeOutline,
  getCredits,
  getEpisode,
  getOutline,
  getTask,
  getWorkflow,
  listAssets,
  listEpisodes,
  listModels,
  listNotifications,
  listProjects,
  listSegments,
  listTemplates,
  patchAsset,
  patchProject,
  patchSegment,
  submitAssetImageTask,
  submitEpisodeExportTask,
  submitEpisodeSplitTask,
  submitOutlineTask,
  submitSegmentVideoTask,
} from '../lib/api';
import { resetDb } from './db';
import { handlers } from './handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  resetDb();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('MSW project and credits contracts', () => {
  it('lists seeded projects including 逆命木叶', async () => {
    const data = await listProjects();
    expect(data.projects.map((p) => p.name)).toContain('逆命木叶');
    expect(data.storage.usedBytes).toBeGreaterThan(0);
    expect(data.storage.quotaBytes).toBe(10 * 1024 * 1024 * 1024);
  });

  it('creates a project that then appears in the list', async () => {
    const created = await createProject({ name: '新剧本' });
    expect(created.name).toBe('新剧本');
    const data = await listProjects();
    expect(data.projects[0]?.name).toBe('新剧本');
  });

  it('renames a project through PATCH and persists it', async () => {
    await patchProject('proj-nming-muye', { name: '逆命木叶·改' });
    const data = await listProjects();
    const found = data.projects.find((p) => p.id === 'proj-nming-muye');
    expect(found?.name).toBe('逆命木叶·改');
  });

  it('returns credit balance 940', async () => {
    const credits = await getCredits();
    expect(credits.balance).toBe(940);
  });
});

describe('outline task polling contract', () => {
  it('returns a taskId and reaches succeeded with progress', async () => {
    const { taskId } = await submitOutlineTask('proj-nming-muye', {
      sourceType: 'paste',
      text: '林晚扶着廊柱，指尖颤抖。鼬从阴影走出。',
    });
    expect(taskId).toMatch(/^task-/);

    let status = await getTask(taskId);
    for (let i = 0; i < 80 && status.status !== 'succeeded'; i += 1) {
      await new Promise((r) => setTimeout(r, 10));
      status = await getTask(taskId);
    }

    expect(status.status).toBe('succeeded');
    expect(status.progress).toBe(100);
    expect(status.result).toMatchObject({ projectId: 'proj-nming-muye' });
  });
});

async function waitSucceeded(taskId: string) {
  let status = await getTask(taskId);
  for (let i = 0; i < 80 && status.status !== 'succeeded'; i += 1) {
    await new Promise((r) => setTimeout(r, 10));
    status = await getTask(taskId);
  }
  return status;
}

describe('outline contract', () => {
  it('returns 逆命木叶 setting, summary and extracted assets', async () => {
    const outline = await getOutline('proj-nming-muye');
    expect(outline.setting.videoStyle).toBe('赛博朋克电影（冷调月夜 · 高对比光影）');
    expect(outline.setting.aspectRatio).toBe('9:16');
    expect(outline.summary.protagonists).toBe('林晚、鼬');
    expect(outline.extractedAssets.map((a) => a.name)).toEqual([
      '林晚',
      '宇智波鼬',
      '宇智波止水',
      '木叶长老',
      '木叶长廊',
    ]);
    expect(outline.extractedAssets.every((a) => typeof a.id === 'string' && a.id.length > 0)).toBe(true);
    expect(outline.finalized).toBe(false);
  });

  it('keeps the demo project seeded at STEP3 for the showcase', async () => {
    // 演示种子是部署展示要的行为（seedDemoContent 直接种子到制作中），加守护防回归
    const workflow = await getWorkflow('proj-nming-muye');
    expect(workflow).toMatchObject({
      projectId: 'proj-nming-muye',
      unlockedStep: 3,
      outlineFinalized: true,
      assetsCompleted: true,
    });
  });

  it('finalizes the outline and unlocks STEP2 on a fresh project', async () => {
    const created = await createProject({ name: '闸门验证' });
    const { taskId } = await submitOutlineTask(created.id, {
      sourceType: 'paste',
      text: '林晚扶着廊柱，指尖颤抖。',
    });
    await waitSucceeded(taskId);

    const workflow = await finalizeOutline(created.id);
    expect(workflow).toMatchObject({
      projectId: created.id,
      unlockedStep: 2,
      outlineFinalized: true,
    });
    const outline = await getOutline(created.id);
    expect(outline.finalized).toBe(true);
    const again = await getWorkflow(created.id);
    expect(again.unlockedStep).toBe(2);
  });
});

describe('assets contract', () => {
  it('lists assets with stable ids and type tags', async () => {
    const { assets } = await listAssets('proj-nming-muye');
    expect(assets.map((a) => a.id)).toEqual([
      'proj-nming-muye-char-linwan',
      'proj-nming-muye-char-itachi',
      'proj-nming-muye-char-shisui',
      'proj-nming-muye-char-elder',
      'proj-nming-muye-scene-corridor',
    ]);
    expect(assets.filter((a) => a.type === 'character')).toHaveLength(4);
    expect(assets.filter((a) => a.type === 'scene')).toHaveLength(1);
    expect(assets.filter((a) => a.type === 'prop')).toHaveLength(0);
  });

  it('generates a character image through the task API', async () => {
    const { taskId } = await submitAssetImageTask('proj-nming-muye-char-linwan');
    const status = await waitSucceeded(taskId);
    expect(status.status).toBe('succeeded');
    expect(status.result).toMatchObject({
      assetId: 'proj-nming-muye-char-linwan',
      imageUrl: '/demo-assets/linwan.png',
    });
    const { assets } = await listAssets('proj-nming-muye');
    const linwan = assets.find((a) => a.id === 'proj-nming-muye-char-linwan');
    expect(linwan?.imageUrl).toBe('/demo-assets/linwan.png');
    expect(linwan?.status).toBe('ready');
  });

  it('persists consistency lock through PATCH', async () => {
    const updated = await patchAsset('proj-nming-muye-char-linwan', { consistencyLocked: false });
    expect(updated.consistencyLocked).toBe(false);
    const { assets } = await listAssets('proj-nming-muye');
    expect(assets.find((a) => a.id === 'proj-nming-muye-char-linwan')?.consistencyLocked).toBe(false);
  });
});

describe('episodes and workflow chain', () => {
  it('unlocks STEP3 then splits into 1 episode with 3 segments / 37s', async () => {
    // 用新项目走完整链路：演示项目（proj-nming-muye）种子时已处于 STEP3 且分集已拆
    const created = await createProject({ name: '分集验证' });
    const outlineTask = await submitOutlineTask(created.id, {
      sourceType: 'paste',
      text: '林晚扶着廊柱，指尖颤抖。',
    });
    await waitSucceeded(outlineTask.taskId);
    await finalizeOutline(created.id);

    const afterAssets = await completeAssets(created.id);
    expect(afterAssets.unlockedStep).toBe(3);

    const before = await listEpisodes(created.id);
    expect(before.episodes).toEqual([]);

    const { taskId } = await submitEpisodeSplitTask(created.id);
    const status = await waitSucceeded(taskId);
    expect(status.status).toBe('succeeded');

    const { episodes } = await listEpisodes(created.id);
    const ep1 = episodes.find((e) => e.number === 1);
    expect(ep1).toMatchObject({
      title: '异世囚笼',
      segmentCount: 3,
      durationSec: 37,
      status: 'split',
    });
    expect(ep1?.id).toBe(`${created.id}-ep-1`);
  });
});

async function prepareSplitEpisode() {
  await finalizeOutline('proj-nming-muye');
  await completeAssets('proj-nming-muye');
  const { taskId } = await submitEpisodeSplitTask('proj-nming-muye');
  await waitSucceeded(taskId);
}

describe('studio segments and video generation', () => {
  it('lists three models from the constant table', async () => {
    const { models } = await listModels();
    expect(models.map((m) => m.id)).toEqual(['seedance-2.5', 'minimax-h3-max', 'wan-3.0']);
    expect(models.map((m) => m.name)).toEqual(['Seedance 2.5', 'Minimax H3 Max', 'Wan 3.0']);
  });

  it('returns 3 segments with SEGS shot data after split', async () => {
    await prepareSplitEpisode();
    const episode = await getEpisode('proj-nming-muye-ep-1');
    expect(episode).toMatchObject({ title: '异世囚笼', segmentCount: 3, durationSec: 37 });

    const { segments } = await listSegments('proj-nming-muye-ep-1');
    expect(segments.map((s) => s.no)).toEqual([1, 2, 3]);
    expect(segments[0]).toMatchObject({
      title: '穿越惊惶 · 扶柱独白',
      durationSec: 13,
      generated: true,
      videoUrl: '/demo-assets/clip1.mp4',
    });
    expect(segments[0]?.prompt).toContain('@[proj-nming-muye-char-linwan]');
    expect(segments[0]?.shots.map((s) => s.id)).toEqual(['c01', 'c02']);
    expect(segments[0]?.shots[0]).toMatchObject({
      durationSec: 4,
      shotType: '全景',
      speaker: '林晚（惊惶痛苦，低声断续）',
    });
    expect(segments[2]).toMatchObject({ generated: false, videoUrl: null, durationSec: 10 });
  });

  it('persists prompt edits through PATCH', async () => {
    await prepareSplitEpisode();
    const { segments } = await listSegments('proj-nming-muye-ep-1');
    const id = segments[0]?.id ?? '';
    const updated = await patchSegment(id, { prompt: '新提示词 @[proj-nming-muye-char-linwan]' });
    expect(updated.prompt).toBe('新提示词 @[proj-nming-muye-char-linwan]');
    const again = await listSegments('proj-nming-muye-ep-1');
    expect(again.segments[0]?.prompt).toBe('新提示词 @[proj-nming-muye-char-linwan]');
  });

  it('submits a video task carrying the selected model', async () => {
    await prepareSplitEpisode();
    const { segments } = await listSegments('proj-nming-muye-ep-1');
    const ungenerated = segments.find((s) => s.no === 3);
    expect(ungenerated).toBeDefined();
    const { taskId } = await submitSegmentVideoTask(ungenerated!.id, { model: 'minimax-h3-max' });
    const status = await waitSucceeded(taskId);
    expect(status.status).toBe('succeeded');
    expect(status.result).toMatchObject({
      segmentId: ungenerated!.id,
      videoUrl: '/demo-assets/clip3.mp4',
      model: 'minimax-h3-max',
    });
    const after = await listSegments('proj-nming-muye-ep-1');
    expect(after.segments.find((s) => s.no === 3)).toMatchObject({
      generated: true,
      videoUrl: '/demo-assets/clip3.mp4',
      model: 'minimax-h3-max',
    });
  });
});

describe('episode export', () => {
  it('completes an export task and returns a downloadable mp4', async () => {
    await prepareSplitEpisode();
    const { taskId } = await submitEpisodeExportTask('proj-nming-muye-ep-1', { resolution: '720P', format: 'MP4' });
    const status = await waitSucceeded(taskId);
    expect(status.status).toBe('succeeded');
    expect(status.result).toMatchObject({
      downloadUrl: '/demo-assets/clip1.mp4',
      fileName: '逆命木叶_第1集_720P.mp4',
    });
  });
});

describe('templates and notifications', () => {
  it('lists official example templates including 星环之外', async () => {
    const { templates } = await listTemplates();
    expect(templates.map((t) => t.name)).toContain('星环之外');
    expect(templates.find((t) => t.name === '星环之外')?.scriptText.length).toBeGreaterThan(20);
    expect(templates.every((t) => t.tags.length > 0)).toBe(true);
  });

  it('lists DeepSFV notifications without Hogee copy', async () => {
    const { notifications } = await listNotifications();
    expect(notifications.length).toBeGreaterThanOrEqual(4);
    expect(notifications.some((n) => n.title.includes('Seedance 2.5'))).toBe(true);
    expect(notifications.every((n) => !n.title.includes('Hogee'))).toBe(true);
  });
});
