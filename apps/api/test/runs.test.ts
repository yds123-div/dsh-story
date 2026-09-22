import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from './support.js';

let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

/** 建项目 + 存一份原始输入，返回 { projectId, sourceFileId } */
async function setupProjectWithInput(ctx: TestContext): Promise<{ projectId: string; sourceFileId: string }> {
  const created = await ctx.app.inject({
    method: 'POST',
    url: '/api/product/projects',
    payload: { title: '运行元数据', mode: 'script', sourceText: '第一场 内景 长廊 - 夜' },
  });
  const projectId = created.json().project.id as string;
  const sourceFileId = created.json().files[0].id as string;
  return { projectId, sourceFileId };
}

describe('POST /api/product/projects/:id/runs', () => {
  it('登记一条 created 运行元数据，并引用原始输入', async () => {
    ctx = await createTestApp();
    const { projectId, sourceFileId } = await setupProjectWithInput(ctx);
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/runs`,
      payload: { kind: 'script', sourceFileId },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.projectId).toBe(projectId);
    expect(body.kind).toBe('script');
    expect(body.status).toBe('created');
    expect(body.sourceFileId).toBe(sourceFileId);
    expect(body.finishedAt).toBeNull();
  });

  it('拒绝非法 kind', async () => {
    ctx = await createTestApp();
    const { projectId, sourceFileId } = await setupProjectWithInput(ctx);
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/runs`,
      payload: { kind: 'video', sourceFileId },
    });
    expect(res.statusCode).toBe(400);
  });

  it('未知项目返回 404', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/projects/no-such-id/runs',
      payload: { kind: 'script', sourceFileId: 'any' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/product/projects/:id/runs', () => {
  it('列出项目的运行元数据', async () => {
    ctx = await createTestApp();
    const { projectId, sourceFileId } = await setupProjectWithInput(ctx);
    await ctx.app.inject({
      method: 'POST',
      url: `/api/product/projects/${projectId}/runs`,
      payload: { kind: 'script', sourceFileId },
    });
    const res = await ctx.app.inject({ method: 'GET', url: `/api/product/projects/${projectId}/runs` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.runs).toHaveLength(1);
    expect(body.runs[0].kind).toBe('script');
    expect(body.runs[0].sourceFileId).toBe(sourceFileId);
  });
});
