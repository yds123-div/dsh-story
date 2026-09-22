import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from './support.js';

let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

describe('POST /api/product/projects', () => {
  it('创建项目，把原始输入存为本地文件并登记元数据', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: '林晚的雨夜', mode: 'script', sourceText: '第一场 内景 长廊 - 夜' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.project.id).toBeTruthy();
    expect(body.project.title).toBe('林晚的雨夜');
    expect(body.project.mode).toBe('script');
    expect(body.project.status).toBe('active');

    // 本地文件目录里有原始输入，且内容一致
    expect(body.files).toHaveLength(1);
    const file = body.files[0];
    expect(file.kind).toBe('source-input');
    expect(file.role).toBe('script-source');
    expect(file.path).toMatch(/^source-input\//);
    const onDisk = readFileSync(path.join(ctx.dataDir, file.path), 'utf8');
    expect(onDisk).toBe('第一场 内景 长廊 - 夜');
    expect(file.sizeBytes).toBeGreaterThan(0);
  });

  it('无 sourceText 时不产生文件元数据', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: '空项目', mode: 'novel' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.project.mode).toBe('novel');
    expect(body.files).toHaveLength(0);
  });

  it('mode 缺省为 script', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: '默认模式' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().project.mode).toBe('script');
  });

  it('拒绝空标题', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: '  ', mode: 'script' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBeTruthy();
  });

  it('拒绝非法 mode', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: 'x', mode: 'essay' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/product/projects', () => {
  it('按创建时间倒序列出项目', async () => {
    ctx = await createTestApp();
    await ctx.app.inject({ method: 'POST', url: '/api/product/projects', payload: { title: '甲' } });
    await ctx.app.inject({ method: 'POST', url: '/api/product/projects', payload: { title: '乙' } });
    const res = await ctx.app.inject({ method: 'GET', url: '/api/product/projects' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.projects).toHaveLength(2);
    expect(body.projects.map((p: { title: string }) => p.title)).toEqual(['乙', '甲']);
  });
});

describe('GET /api/product/projects/:id', () => {
  it('返回项目详情（project + runs + files）', async () => {
    ctx = await createTestApp();
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: '详情', mode: 'script', sourceText: '第一场 内景 长廊 - 夜' },
    });
    const { id } = created.json().project;
    const res = await ctx.app.inject({ method: 'GET', url: `/api/product/projects/${id}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.project.id).toBe(id);
    expect(body.runs).toEqual([]);
    expect(body.files).toHaveLength(1);
  });

  it('未知项目返回 404', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({ method: 'GET', url: '/api/product/projects/no-such-id' });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /api/product/projects/:id', () => {
  it('重命名并刷新 updatedAt', async () => {
    ctx = await createTestApp();
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: '旧标题' },
    });
    const { id, updatedAt } = created.json().project;
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/product/projects/${id}`,
      payload: { title: '新标题' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.project.title).toBe('新标题');
    expect(body.project.updatedAt >= updatedAt).toBe(true);
  });

  it('归档项目', async () => {
    ctx = await createTestApp();
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: '待归档' },
    });
    const { id } = created.json().project;
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/product/projects/${id}`,
      payload: { status: 'archived' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().project.status).toBe('archived');
  });

  it('拒绝空标题与非法 status', async () => {
    ctx = await createTestApp();
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: 'x' },
    });
    const { id } = created.json().project;
    const badTitle = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/product/projects/${id}`,
      payload: { title: ' ' },
    });
    expect(badTitle.statusCode).toBe(400);
    const badStatus = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/product/projects/${id}`,
      payload: { status: 'deleted' },
    });
    expect(badStatus.statusCode).toBe(400);
  });

  it('拒绝非字符串 title', async () => {
    ctx = await createTestApp();
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: 'x' },
    });
    const { id } = created.json().project;
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/product/projects/${id}`,
      payload: { title: 123 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('未知项目返回 404', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'PATCH',
      url: '/api/product/projects/no-such-id',
      payload: { title: 'y' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/product/projects/:id/inputs', () => {
  it('保存原始输入到本地文件目录并登记元数据', async () => {
    ctx = await createTestApp();
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: '补传输入' },
    });
    const { id } = created.json().project;
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${id}/inputs`,
      payload: { filename: 'novel.txt', text: '小说正文第一章，开篇。' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.projectId).toBe(id);
    expect(body.role).toBe('script-source');
    expect(body.path).toMatch(new RegExp(`^source-input/${id}/[\\w-]+-novel\\.txt$`));
    const onDisk = readFileSync(path.join(ctx.dataDir, body.path), 'utf8');
    expect(onDisk).toBe('小说正文第一章，开篇。');
  });

  it('filename 为 .. 时收敛到随机文件名，不越出项目目录', async () => {
    ctx = await createTestApp();
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: '路径安全' },
    });
    const { id } = created.json().project;
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${id}/inputs`,
      payload: { filename: '..', text: '路径安全测试文本内容。' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.path).toMatch(new RegExp(`^source-input/${id}/[\\w-]+-input-[\\w-]+\\.txt$`));
  });

  it('拒绝空文本', async () => {
    ctx = await createTestApp();
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects',
      payload: { title: 'x' },
    });
    const { id } = created.json().project;
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${id}/inputs`,
      payload: { text: '' },
    });
    expect(res.statusCode).toBe(400);
  });
});
