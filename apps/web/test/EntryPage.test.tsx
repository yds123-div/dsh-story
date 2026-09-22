import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EntryPage } from '../src/pages/EntryPage';

function stubFetch(handler: (url: string) => { status: number; body: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const { status, body } = handler(String(input));
      return new Response(JSON.stringify(body), { status });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EntryPage', () => {
  it('显示后端健康状态和项目列表', async () => {
    stubFetch((url) => {
      if (url === '/health') {
        return {
          status: 200,
          body: { status: 'ok', service: 'dsh-story-api', version: 'test', components: { db: 'ok', storage: 'ok' }, time: 't' },
        };
      }
      if (url === '/api/projects') {
        return {
          status: 200,
          body: [{ id: 'p1', title: '林晚的雨夜', mode: 'script', createdAt: 't', updatedAt: 't' }],
        };
      }
      return { status: 404, body: {} };
    });

    render(
      <MemoryRouter>
        <EntryPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/API 运行正常/)).toBeTruthy();
    expect(await screen.findByText('林晚的雨夜')).toBeTruthy();
  });

  it('后端不可用时显示错误徽标和空列表', async () => {
    stubFetch(() => ({ status: 503, body: { statusCode: 503, error: 'Service Unavailable', message: 'degraded' } }));

    render(
      <MemoryRouter>
        <EntryPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/API 不可用/)).toBeTruthy();
    expect(await screen.findByText('还没有项目')).toBeTruthy();
  });
});
