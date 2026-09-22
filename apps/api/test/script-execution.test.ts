import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestContext } from './support.js';

let ctx: TestContext | undefined;
afterEach(async () => {
  await ctx?.close();
  ctx = undefined;
  vi.clearAllMocks();
});

async function createProjectWithSourceInput(ctx: TestContext): Promise<{ projectId: string; sourceFileId: string }> {
  // 创建项目
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/product/projects',
    payload: {
      title: '测试剧本',
      mode: 'script',
      sourceText: '这是一个测试剧本内容。\n\n场景1：房间内\n人物：小明\n小明：你好，世界！',
    },
  });
  expect(res.statusCode).toBe(201);
  const project = res.json();
  const projectId = project.project.id;

  // 获取输入文件
  const filesRes = await ctx.app.inject({
    method: 'GET',
    url: `/api/product/projects/${projectId}`,
  });
  expect(filesRes.statusCode).toBe(200);
  const files = filesRes.json().files;
  const sourceFile = files.find((f: any) => f.kind === 'source-input');
  expect(sourceFile).toBeDefined();

  return { projectId, sourceFileId: sourceFile.id };
}

async function createRun(ctx: TestContext, projectId: string, sourceFileId: string): Promise<string> {
  const res = await ctx.app.inject({
    method: 'POST',
    url: `/api/product/projects/${projectId}/runs`,
    payload: {
      kind: 'script',
      sourceFileId,
    },
  });
  expect(res.statusCode).toBe(201);
  const run = res.json();
  return run.id;
}

describe('POST /api/product/runs/:id/execute', () => {
  it('should execute a script run successfully with mock harness', async () => {
    ctx = await createTestApp();
    const { projectId, sourceFileId } = await createProjectWithSourceInput(ctx);
    const runId = await createRun(ctx, projectId, sourceFileId);

    // 模拟 Harness 适配器
    vi.mock('../src/harness/index.js', () => ({
      HarnessFactory: {
        createScriptStageHarness: () => ({
          execute: vi.fn().mockImplementation(
            (runId: string, sourceText: string, onStatusUpdate: (update: any) => void) => {
              // 立即更新状态为 running
              onStatusUpdate({
                status: 'running',
                currentStep: 'initializing',
                startedAt: new Date().toISOString(),
              });

              // 模拟执行过程
              return new Promise(resolve => {
                setTimeout(() => {
                  // 更新状态为 succeeded
                  onStatusUpdate({
                    status: 'succeeded',
                    finishedAt: new Date().toISOString(),
                    currentStep: 'completed',
                  });

                  resolve({
                    sessionId: 'test-session-id',
                    finalResponse: '测试剧本生成完成',
                    events: [],
                    notifications: [],
                    artifacts: ['剧本.md', '剧本分析.md', '场景索引.md', '资产候选.md'],
                  });
                }, 100);
              });
            }
          ),
          cancel: vi.fn().mockResolvedValue(undefined),
        }),
      },
    }));

    // 执行运行
    const executeRes = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/runs/${runId}/execute`,
    });
    expect(executeRes.statusCode).toBe(200);
    const executeData = executeRes.json();
    expect(executeData.run).toBeDefined();
    expect(executeData.artifacts).toEqual(['剧本.md', '剧本分析.md', '场景索引.md', '资产候选.md']);

    // 等待状态更新完成
    await new Promise(resolve => setTimeout(resolve, 200));

    // 检查运行状态已更新
    const runRes = await ctx.app.inject({
      method: 'GET',
      url: `/api/product/runs/${runId}`,
    });
    expect(runRes.statusCode).toBe(200);
    const runData = runRes.json();
    expect(runData.run.status).toBe('succeeded');
    expect(runData.run.startedAt).toBeDefined();
    expect(runData.run.finishedAt).toBeDefined();
    expect(runData.files).toHaveLength(4); // 4个生成的文件
  }, 10000);

  it('should return 404 for non-existent run', async () => {
    ctx = await createTestApp();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/product/runs/non-existent/execute',
    });
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 if run is not in created state', async () => {
    ctx = await createTestApp();
    const { projectId, sourceFileId } = await createProjectWithSourceInput(ctx);
    const runId = await createRun(ctx, projectId, sourceFileId);

    // 模拟 Harness 适配器，执行会延迟
    vi.mock('../src/harness/index.js', () => ({
      HarnessFactory: {
        createScriptStageHarness: () => ({
          execute: vi.fn().mockImplementation(() => new Promise(resolve => {
            setTimeout(() => resolve({
              sessionId: 'test-session-id',
              finalResponse: '测试剧本生成完成',
              events: [],
              notifications: [],
              artifacts: [],
            }), 2000);
          })),
          cancel: vi.fn().mockResolvedValue(undefined),
        }),
      },
    }));

    // 开始执行
    ctx.app.inject({
      method: 'POST',
      url: `/api/product/runs/${runId}/execute`,
    });

    // 等待一下让执行开始
    await new Promise(resolve => setTimeout(resolve, 100));

    // 再次执行应该失败
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/runs/${runId}/execute`,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('运行状态必须为 created 才能执行');
  });
});

describe('POST /api/product/runs/:id/cancel', () => {
  it('should cancel a running run', async () => {
    ctx = await createTestApp();
    const { projectId, sourceFileId } = await createProjectWithSourceInput(ctx);
    const runId = await createRun(ctx, projectId, sourceFileId);

    // 模拟 Harness 适配器，执行会延迟
    vi.mock('../src/harness/index.js', () => ({
      HarnessFactory: {
        createScriptStageHarness: () => ({
          execute: vi.fn().mockImplementation(() => new Promise(resolve => {
            setTimeout(() => resolve({
              sessionId: 'test-session-id',
              finalResponse: '测试剧本生成完成',
              events: [],
              notifications: [],
              artifacts: [],
            }), 5000);
          })),
          cancel: vi.fn().mockResolvedValue(undefined),
        }),
      },
    }));

    // 开始执行
    const executePromise = ctx.app.inject({
      method: 'POST',
      url: `/api/product/runs/${runId}/execute`,
    });

    // 等待一下让执行开始
    await new Promise(resolve => setTimeout(resolve, 500));

    // 取消运行
    const cancelRes = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/runs/${runId}/cancel`,
    });
    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.json().status).toBe('failed');

    // 验证 cancel 被调用
    const harnessModule = await import('../src/harness/index.js');
    expect(harnessModule.HarnessFactory.createScriptStageHarness).toHaveBeenCalled();
    const harness = harnessModule.HarnessFactory.createScriptStageHarness.mock.results[0].value;
    expect(harness.cancel).toHaveBeenCalledWith(runId);
  });

  it('should return 400 if run is not in running state', async () => {
    ctx = await createTestApp();
    const { projectId, sourceFileId } = await createProjectWithSourceInput(ctx);
    const runId = await createRun(ctx, projectId, sourceFileId);

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/product/runs/${runId}/cancel`,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain('只有 running 状态的运行才能取消');
  });
});

describe('GET /api/product/runs/:id', () => {
  it('should get run details with files', async () => {
    ctx = await createTestApp();
    const { projectId, sourceFileId } = await createProjectWithSourceInput(ctx);
    const runId = await createRun(ctx, projectId, sourceFileId);

    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/product/runs/${runId}`,
    });
    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.run).toBeDefined();
    expect(data.run.id).toBe(runId);
    expect(data.run.projectId).toBe(projectId);
    expect(data.run.status).toBe('created');
    expect(data.files).toBeDefined();
    // 初始状态下只有原始输入文件，但在这个测试中我们还没有执行，所以应该是0个生成文件
    expect(data.files).toHaveLength(0);
  });
});