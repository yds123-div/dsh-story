/**
 * oh-story 产品平台前后端共享契约（工单 01 最小集）。
 *
 * 前端只通过产品 API 访问数据；这些类型定义了 API 的请求/响应边界。
 * 时间统一使用 ISO 8601 字符串；ID 为 UUID。
 */

// ---------------------------------------------------------------------------
// 健康检查
// ---------------------------------------------------------------------------

export type ComponentHealth = 'ok' | 'error';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  components: {
    db: ComponentHealth;
    storage: ComponentHealth;
  };
  time: string;
}

// ---------------------------------------------------------------------------
// 项目
// ---------------------------------------------------------------------------

/** 剧本模式处理已有剧本；小说模式承担完整改编链路（spec §4） */
export type ProjectMode = 'script' | 'novel';

export interface ProjectSummary {
  id: string;
  title: string;
  mode: ProjectMode;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  title: string;
  mode: ProjectMode;
  /** 原始输入（剧本正文或小说文本），保存到本地文件目录，数据库只存引用 */
  sourceText?: string;
}

export interface ProjectDetail extends ProjectSummary {
  runs: Run[];
  files: FileMeta[];
}

// ---------------------------------------------------------------------------
// 运行元数据
// ---------------------------------------------------------------------------

/**
 * 首期只登记运行元数据，不执行真实生成业务。
 * 每次生成产生独立运行结果，新运行不覆盖旧运行（spec §12）。
 */
export type RunKind = 'script' | 'asset-extraction';

export type RunStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'rejected';

export interface Run {
  id: string;
  projectId: string;
  kind: RunKind;
  status: RunStatus;
  createdAt: string;
  finishedAt: string | null;
}

export interface CreateRunRequest {
  kind: RunKind;
}

// ---------------------------------------------------------------------------
// 文件元数据
// ---------------------------------------------------------------------------

/** 原始输入文件 | 生成产物文件 */
export type FileKind = 'source-input' | 'generated';

export interface FileMeta {
  id: string;
  projectId: string;
  runId: string | null;
  kind: FileKind;
  /** 业务角色，如 'script-source'、'script-output' */
  role: string;
  /** 相对数据目录的 POSIX 风格路径 */
  path: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// 错误
// ---------------------------------------------------------------------------

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
