import type { RunStatus } from '@dsh-story/contracts';

// 动态导入 Harness SDK 类型，避免静态依赖
// 实际类型在运行时通过 deepblue-harness 包加载
type SessionEvent = any;
type HarnessNotification = any;

/** 剧本阶段执行结果 */
export interface ScriptStageResult {
  /** 会话 ID */
  sessionId: string;
  /** 最终响应文本 */
  finalResponse: string;
  /** 所有会话事件 */
  events: SessionEvent[];
  /** 所有通知 */
  notifications: HarnessNotification[];
  /** 生成的产物文件路径（相对于数据目录） */
  artifacts: string[];
}

/** 执行状态更新 */
export interface RunStatusUpdate {
  /** 运行 ID */
  runId: string;
  /** 新状态 */
  status: RunStatus;
  /** 当前步骤（可选） */
  currentStep?: string;
  /** 失败原因（可选，仅失败/超时状态） */
  failureReason?: string;
  /** 开始时间（可选，running 状态时设置） */
  startedAt?: string;
  /** 结束时间（可选，succeeded/failed/timeout 状态时设置） */
  finishedAt?: string;
}

/** Harness 适配器接口 */
export interface ScriptStageHarness {
  /**
   * 执行剧本阶段任务
   * @param runId 运行 ID
   * @param sourceText 原始剧本文本
   * @param onStatusUpdate 状态更新回调
   * @param timeoutMs 超时时间（毫秒）
   */
  execute(
    runId: string,
    sourceText: string,
    onStatusUpdate: (update: RunStatusUpdate) => void,
    timeoutMs?: number
  ): Promise<ScriptStageResult>;

  /**
   * 取消正在执行的任务
   * @param runId 运行 ID
   */
  cancel(runId: string): Promise<void>;
}

/** 产物映射配置 */
export interface ArtifactMapping {
  /** 文件路径匹配模式 */
  pattern: RegExp;
  /** 产物角色 */
  role: string;
  /** MIME 类型 */
  mimeType: string;
}