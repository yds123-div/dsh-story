import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from './support.js';

let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

async function createProject(ctx: TestContext): Promise<string> {
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/projects',
    payload: { title: '运行元数据', mode: 'script' },
  });
  return res.json().id as string;
}

describe('POST /api/projects/:id/runs', () => {
  it('登记一条 pending 运行元数据（不执行生成业务）', async () => {
    ctx = await createTestApp();
    const projectId = await createProject(ctx);
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/runs`,
      payload: { kind: 'script' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.projectId).toBe(projectId);
    expect(body.kind).toBe('script');
    expect(body.status).toBe('pending');
    expect(body.finishedAt).toBeNull();
  });

  it('拒绝非法 kind', async () => {
    ctx = await createTestApp();
    const projectId = await createProject(ctx);
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/runs`,
      payload: { kind: 'video' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('未知项目返回 404', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/projects/no-such-id/runs',
      payload: { kind: 'script' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/projects/:id/runs', () => {
  it('列出项目的运行元数据', async () => {
    ctx = await createTestApp();
    const projectId = await createProject(ctx);
    await ctx.app.inject({ method: 'POST', url: `/api/projects/${projectId}/runs`, payload: { kind: 'script' } });
    const res = await ctx.app.inject({ method: 'GET', url: `/api/projects/${projectId}/runs` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].kind).toBe('script');
  });
});

describe('GET /api/projects/:id/files', () => {
  it('列出项目的文件元数据', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { title: '带文件', mode: 'script', sourceText: 'abc' },
    });
    const { id } = res.json();
    const filesRes = await ctx.app.inject({ method: 'GET', url: `/api/projects/${id}/files` });
    expect(filesRes.statusCode).toBe(200);
    const body = filesRes.json();
    expect(body).toHaveLength(1);
    expect(body[0].mimeType).toBe('text/plain');
  });
});
