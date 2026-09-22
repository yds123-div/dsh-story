import type { ScriptStageHarness, ScriptStageResult, RunStatusUpdate } from './types.js';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { AppConfig } from '../config.js';

// 动态导入 Harness SDK，避免静态依赖
// @ts-ignore
let DeepSeekHarness: any;

/**
 * DeepSeek Harness 适配器实现
 * 基于官方 SDK 客户端，实现剧本阶段执行契约
 */
export class DshSdkScriptStageHarness implements ScriptStageHarness {
  private readonly config: AppConfig;
  private readonly activeRuns: Map<string, { harness: any; abortController: AbortController }> = new Map();

  constructor(config: AppConfig) {
    this.config = config;
  }

  /**
   * 延迟加载 SDK，避免在没有安装 harness 的环境中启动失败
   */
  private async loadSdk(): Promise<{
    DeepSeekHarness: typeof import('@deepseek-ai/dsh-sdk-client').DeepSeekHarness;
  }> {
    if (DeepSeekHarness) {
      return { DeepSeekHarness };
    }

    try {
      // 动态导入 deepblue-harness SDK
      const sdk = await import('@deepseek-ai/dsh-sdk-client');
      DeepSeekHarness = sdk.DeepSeekHarness;
      return { DeepSeekHarness };
    } catch (error) {
      throw new Error(
        `Failed to load DeepSeek Harness SDK: ${error instanceof Error ? error.message : String(error)}. ` +
        'Please install deepblue-harness package or use a different harness implementation.'
      );
    }
  }

  /**
   * 执行剧本阶段任务
   */
  async execute(
    runId: string,
    sourceText: string,
    onStatusUpdate: (update: RunStatusUpdate) => void,
    timeoutMs: number = 300000 // 默认 5 分钟超时
  ): Promise<ScriptStageResult> {
    const { DeepSeekHarness } = await this.loadSdk();

    // 创建工作目录
    const workspaceDir = path.join(this.config.dataDir, 'workspace', runId);
    mkdirSync(workspaceDir, { recursive: true });

    // 创建 abort controller 用于超时处理
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
      onStatusUpdate({
        runId,
        status: 'timeout',
        failureReason: `Execution timed out after ${timeoutMs}ms`,
        finishedAt: new Date().toISOString(),
      });
    }, timeoutMs);

    // 保存原始输入
    const sourceFile = path.join(workspaceDir, 'source-script.txt');
    writeFileSync(sourceFile, sourceText, 'utf8');

    try {
      // 初始化 Harness
      const harness = new DeepSeekHarness({
        cwd: workspaceDir,
        profile: 'sdk',
        // 加载 oh-story 插件
        patches: [path.join(process.cwd(), 'bundle-oh-story', 'cordis.patch.yml')],
        env: {
          ...process.env,
          DSH_HOME: path.join(this.config.dataDir, 'harness', runId),
        },
      });

      // 保存活跃运行
      this.activeRuns.set(runId, { harness, abortController });

      // 更新状态为 running
      const startedAt = new Date().toISOString();
      onStatusUpdate({
        runId,
        status: 'running',
        startedAt,
        currentStep: 'initializing',
      });

      // 构造 prompt
      const prompt = `请处理以下剧本内容：\n\n${sourceText}\n\n按照短剧剧本格式规范化，并生成剧本分析、场景索引和资产候选。`;

      // 执行任务
      const result = await harness.run(prompt, {
        onNotification: (notification: any) => {
          // 处理通知，更新当前步骤
          if (notification.method === 'session.event') {
            const event = notification.params.event;
            const currentStep = this.extractCurrentStepFromNotification(event);
            if (currentStep) {
              onStatusUpdate({
                runId,
                status: 'running',
                currentStep,
              });
            }
          }
        },
      });

      // 清理超时计时器
      clearTimeout(timeoutId);

      // 收集产物文件
      const artifacts = this.collectArtifacts(workspaceDir);

      // 更新状态为 succeeded
      const finishedAt = new Date().toISOString();
      onStatusUpdate({
        runId,
        status: 'succeeded',
        finishedAt,
        currentStep: 'completed',
      });

      return {
        sessionId: result.sessionId,
        finalResponse: result.finalResponse,
        events: result.events,
        notifications: result.notifications,
        artifacts,
      };
    } catch (error) {
      // 清理超时计时器
      clearTimeout(timeoutId);

      // 处理错误
      const failureReason = error instanceof Error ? error.message : String(error);
      onStatusUpdate({
        runId,
        status: 'failed',
        failureReason,
        finishedAt: new Date().toISOString(),
      });

      throw error;
    } finally {
      // 从活跃运行中移除
      this.activeRuns.delete(runId);
      // 清理工作目录
      try {
        // 这里可以选择保留产物，或者清理
        // rmSync(workspaceDir, { recursive: true, force: true });
      } catch {
        // 忽略清理错误
      }
    }
  }

  /**
   * 取消正在执行的任务
   */
  async cancel(runId: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found or already completed`);
    }

    try {
      run.abortController.abort();
      await run.harness.close();
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  /**
   * 从会话事件中提取当前步骤
   */
  private extractCurrentStepFromNotification(event: any): string | null {
    if (!event || !event.type) {
      return null;
    }

    switch (event.type) {
      case 'tool/call':
        return `tool:${event.data.name}`;
      case 'assistant/message':
        return 'assistant:thinking';
      case 'step/start':
        return `step:${event.data.step}`;
      case 'turn/end':
        return `turn:${event.data.reason.kind}`;
      default:
        return null;
    }
  }

  /**
   * 收集工作目录中的产物文件
   */
  private collectArtifacts(workspaceDir: string): string[] {
    const artifacts: string[] = [];

    const traverse = (dir: string, basePath: string = '') => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (entry.isDirectory()) {
          traverse(fullPath, relativePath);
        } else if (entry.isFile()) {
          // 只收集 markdown 和文本文件
          if (entry.name.endsWith('.md') || entry.name.endsWith('.txt')) {
            artifacts.push(relativePath);
          }
        }
      }
    };

    traverse(workspaceDir);
    return artifacts;
  }
}

/**
 * 空实现的 Harness 适配器（用于测试）
 */
export class MockScriptStageHarness implements ScriptStageHarness {
  async execute(
    runId: string,
    sourceText: string,
    onStatusUpdate: (update: RunStatusUpdate) => void,
    timeoutMs: number = 300000
  ): Promise<ScriptStageResult> {
    // 模拟执行进度
    const steps = ['initializing', 'analyzing script', 'generating content', 'collecting artifacts', 'completed'];
    const startedAt = new Date().toISOString();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      onStatusUpdate({
        runId,
        status: 'running',
        currentStep: step,
        startedAt: i === 0 ? startedAt : undefined,
      });

      if (step === 'completed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 模拟产物
    const artifacts = [
      '剧本.md',
      '剧本分析.md',
      '场景索引.md',
      '资产候选.md',
      '制作检查.md',
    ];

    const finishedAt = new Date().toISOString();
    onStatusUpdate({
      runId,
      status: 'succeeded',
      finishedAt,
      currentStep: 'completed',
    });

    return {
      sessionId: `mock-session-${randomUUID()}`,
      finalResponse: 'Mock script generation completed successfully',
      events: [],
      notifications: [],
      artifacts,
    };
  }

  async cancel(runId: string): Promise<void> {
    // 空实现
  }
}