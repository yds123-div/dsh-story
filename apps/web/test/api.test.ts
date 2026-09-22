import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, api } from '../src/lib/productApi';

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

describe('产品 API 客户端', () => {
  it('health() 请求 /health 并解析响应', async () => {
    stubFetch((url) => {
      expect(url).toBe('/health');
      return { status: 200, body: { status: 'ok', service: 'dsh-story-api', version: 'test', components: { db: 'ok', storage: 'ok' }, time: '2026-01-01T00:00:00Z' } };
    });
    const health = await api.health();
    expect(health.status).toBe('ok');
  });

  it('listProjects() 请求 /api/product/projects 并解出 projects', async () => {
    stubFetch(() => ({
      status: 200,
      body: { projects: [{ id: 'p1', title: '甲', mode: 'script', status: 'active', createdAt: 't', updatedAt: 't' }] },
    }));
    const data = await api.listProjects();
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].title).toBe('甲');
  });

  it('createProject() 以 JSON POST 到 /api/product/projects', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    stubFetch((url, init) => {
      calls.push({ url, init });
      return {
        status: 201,
        body: {
          project: { id: 'p1', title: '甲', mode: 'script', status: 'active', createdAt: 't', updatedAt: 't' },
          runs: [],
          files: [],
        },
      };
    });
    const created = await api.createProject({ title: '甲', mode: 'script', sourceText: 'abc' });
    expect(created.project.id).toBe('p1');
    expect(calls[0].url).toBe('/api/product/projects');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.body).toBe(JSON.stringify({ title: '甲', mode: 'script', sourceText: 'abc' }));
  });

  it('updateProject() 以 JSON PATCH 到 /api/product/projects/:id', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    stubFetch((url, init) => {
      calls.push({ url, init });
      return {
        status: 200,
        body: {
          project: { id: 'p1', title: '新标题', mode: 'script', status: 'archived', createdAt: 't', updatedAt: 't' },
          runs: [],
          files: [],
        },
      };
    });
    const updated = await api.updateProject('p1', { title: '新标题', status: 'archived' });
    expect(updated.project.status).toBe('archived');
    expect(calls[0].url).toBe('/api/product/projects/p1');
    expect(calls[0].init?.method).toBe('PATCH');
  });

  it('非 2xx 响应抛出 ApiClientError 并带后端 message', async () => {
    stubFetch(() => ({ status: 400, body: { message: 'title 不能为空' } }));
    const err = await api.createProject({ title: '' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).statusCode).toBe(400);
    expect((err as ApiClientError).message).toBe('title 不能为空');
  });

  it('saveSourceInput() 以 JSON POST 到 /api/product/projects/:id/inputs', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    stubFetch((url, init) => {
      calls.push({ url, init });
      return {
        status: 201,
        body: {
          id: 'f1',
          projectId: 'p1',
          runId: null,
          kind: 'source-input',
          role: 'script-source',
          path: 'source-input/p1/novel.txt',
          mimeType: 'text/plain',
          sizeBytes: 30,
          createdAt: 't',
        },
      };
    });
    const meta = await api.saveSourceInput('p1', { filename: 'novel.txt', text: '第一场 内景 长廊 - 夜' });
    expect(meta.kind).toBe('source-input');
    expect(calls[0].url).toBe('/api/product/projects/p1/inputs');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.body).toBe(JSON.stringify({ filename: 'novel.txt', text: '第一场 内景 长廊 - 夜' }));
  });

  it('uploadSourceInputFile() 以 FormData POST 到 /api/product/projects/:id/inputs/file', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    stubFetch((url, init) => {
      calls.push({ url, init });
      return {
        status: 201,
        body: {
          id: 'f2',
          projectId: 'p1',
          runId: null,
          kind: 'source-input',
          role: 'script-source',
          path: 'source-input/p1/逆命木叶.txt',
          mimeType: 'text/plain',
          sizeBytes: 42,
          createdAt: 't',
        },
      };
    });
    const file = new File(['【木叶长廊 内 夜】'], '逆命木叶.txt', { type: 'text/plain' });
    const meta = await api.uploadSourceInputFile('p1', file);
    expect(meta.id).toBe('f2');
    expect(calls[0].url).toBe('/api/product/projects/p1/inputs/file');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.body).toBeInstanceOf(FormData);
    expect((calls[0].init?.body as FormData).get('file')).toBe(file);
    // multipart 由浏览器设置边界，客户端不手动指定 Content-Type
    expect(calls[0].init?.headers).toBeUndefined();
  });
});
