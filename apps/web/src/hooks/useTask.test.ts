import { renderHook, waitFor } from '@testing-library/react';
import { useTask } from './useTask';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useTask', () => {
  it('polls until succeeded then stops', async () => {
    let n = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      n += 1;
      if (n === 1) return jsonResponse({ taskId: 't1', status: 'pending', progress: 0 });
      if (n === 2) return jsonResponse({ taskId: 't1', status: 'running', progress: 40 });
      return jsonResponse({ taskId: 't1', status: 'succeeded', progress: 100, result: { projectId: 'p1' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const onSucceeded = vi.fn();

    renderHook(() => useTask('t1', { intervalMs: 20, onSucceeded }));

    await waitFor(() => expect(onSucceeded).toHaveBeenCalledTimes(1));
    const calls = fetchMock.mock.calls.length;
    await new Promise((r) => setTimeout(r, 80));
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it('clears polling when the component unmounts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ taskId: 't1', status: 'running', progress: 10 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = renderHook(() => useTask('t1', { intervalMs: 20 }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    unmount();
    const calls = fetchMock.mock.calls.length;
    await new Promise((r) => setTimeout(r, 80));
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
