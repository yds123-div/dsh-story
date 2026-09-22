import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from './support.js';

let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

describe('POST /api/projects', () => {
  it('创建项目，把原始输入存为本地文件并登记元数据', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { title: '林晚的雨夜', mode: 'script', sourceText: '第一场 内景 长廊 - 夜' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.title).toBe('林晚的雨夜');
    expect(body.mode).toBe('script');

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
      url: '/api/projects',
      payload: { title: '空项目', mode: 'novel' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().files).toHaveLength(0);
  });

  it('拒绝空标题', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { title: '  ', mode: 'script' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBeTruthy();
  });

  it('拒绝非法 mode', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { title: 'x', mode: 'essay' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/projects', () => {
  it('按创建时间倒序列出项目', async () => {
    ctx = await createTestApp();
    await ctx.app.inject({ method: 'POST', url: '/api/projects', payload: { title: '甲', mode: 'script' } });
    await ctx.app.inject({ method: 'POST', url: '/api/projects', payload: { title: '乙', mode: 'script' } });
    const res = await ctx.app.inject({ method: 'GET', url: '/api/projects' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
    expect(body.map((p: { title: string }) => p.title)).toEqual(['乙', '甲']);
  });
});

describe('GET /api/projects/:id', () => {
  it('返回项目详情（runs + files）', async () => {
    ctx = await createTestApp();
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { title: '详情', mode: 'script', sourceText: 'text' },
    });
    const { id } = created.json();
    const res = await ctx.app.inject({ method: 'GET', url: `/api/projects/${id}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(id);
    expect(body.runs).toEqual([]);
    expect(body.files).toHaveLength(1);
  });

  it('未知项目返回 404', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({ method: 'GET', url: '/api/projects/no-such-id' });
    expect(res.statusCode).toBe(404);
  });
});
