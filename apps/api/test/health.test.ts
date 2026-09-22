import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestContext } from './support.js';

let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
});

describe('GET /health', () => {
  it('数据库和存储都可用时返回 ok', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('dsh-story-api');
    expect(body.components.db).toBe('ok');
    expect(body.components.storage).toBe('ok');
  });

  it('数据库不可用时返回 degraded + 503', async () => {
    ctx = await createTestApp();
    ctx.db.close();
    const res = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.status).toBe('degraded');
    expect(body.components.db).toBe('error');
  });
});
