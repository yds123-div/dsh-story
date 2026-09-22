import { apiFetch, getAuthToken, setUnauthorizedHandler } from '../lib/http';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiFetch', () => {
  it('sends Authorization Bearer on every request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/projects');

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get('Authorization')).toBe(`Bearer ${getAuthToken()}`);
  });

  it('invokes the shared 401 handler and throws', async () => {
    const on401 = vi.fn();
    setUnauthorizedHandler(on401);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));

    await expect(apiFetch('/api/credits')).rejects.toMatchObject({ status: 401 });
    expect(on401).toHaveBeenCalledTimes(1);

    setUnauthorizedHandler(null);
  });
});
