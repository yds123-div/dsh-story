import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, api } from '../src/lib/api';

function stubFetch(handler: (url: string, init?: RequestInit) => { status: number; body: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const { status, body } = handler(url, init);
      return new Response(JSON.stringify(body), { status });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api 客户端', () => {
  it('health() 请求 /health 并解析响应', async () => {
    stubFetch((url) => {
      expect(url).toBe('/health');
      return { status: 200, body: { status: 'ok', service: 'dsh-story-api', version: 'test', components: { db: 'ok', storage: 'ok' }, time: '2026-01-01T00:00:00Z' } };
    });
    const health = await api.health();
    expect(health.status).toBe('ok');
  });

  it('createProject() 以 JSON POST 到 /api/projects', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    stubFetch((url, init) => {
      calls.push({ url, init });
      return {
        status: 201,
        body: { id: 'p1', title: '甲', mode: 'script', createdAt: 't', updatedAt: 't', runs: [], files: [] },
      };
    });
    const created = await api.createProject({ title: '甲', mode: 'script', sourceText: 'abc' });
    expect(created.id).toBe('p1');
    expect(calls[0].url).toBe('/api/projects');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.body).toBe(JSON.stringify({ title: '甲', mode: 'script', sourceText: 'abc' }));
  });

  it('非 2xx 响应抛出 ApiClientError 并带后端 message', async () => {
    stubFetch(() => ({ status: 400, body: { statusCode: 400, error: 'Bad Request', message: 'title 不能为空' } }));
    const err = await api.createProject({ title: '', mode: 'script' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).statusCode).toBe(400);
    expect((err as ApiClientError).message).toBe('title 不能为空');
  });
});
