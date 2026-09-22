import type { ScriptStageHarness, ScriptStageResult, RunStatusUpdate } from './types.js';

// 动态导入类型
type SessionEvent = any;

/**
 * 剧本阶段 Harness 抽象接口
 * 所有实现必须遵循此契约，以便后续替换不同的 Harness 后端
 */
export abstract class AbstractScriptStageHarness implements ScriptStageHarness {
  abstract execute(
    runId: string,
    sourceText: string,
    onStatusUpdate: (update: RunStatusUpdate) => void,
    timeoutMs?: number
  ): Promise<ScriptStageResult>;

  abstract cancel(runId: string): Promise<void>;

  /**
   * 从会话事件中提取当前步骤
   * @param events 会话事件列表
   * @returns 当前步骤名称
   */
  protected extractCurrentStep(events: SessionEvent[]): string | null {
    // 最后一个 tool/call 或 assistant/message 事件作为当前步骤
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.type === 'tool/call') {
        return `tool:${event.data.name}`;
      }
      if (event.type === 'assistant/message') {
        return 'assistant:thinking';
      }
      if (event.type === 'step/start') {
        return `step:${event.data.step}`;
      }
    }
    return null;
  }

  /**
   * 从会话事件中提取失败原因
   * @param events 会话事件列表
   * @returns 失败原因
   */
  protected extractFailureReason(events: SessionEvent[]): string | null {
    // 最后一个 turn/end 事件的原因
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.type === 'turn/end') {
        return `turn ended with reason: ${event.data.reason.kind}`;
      }
      if (event.type === 'tool/result' && event.error) {
        return `${event.error.name}: ${event.error.code} - ${event.data.message}`;
      }
    }
    return null;
  }
}