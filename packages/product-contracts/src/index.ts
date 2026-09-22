/**
 * oh-story 产品平台前后端共享契约（工单 01 最小集，后端优先定义）。
 *
 * 前端只通过产品 API 访问数据。产品 API 挂在 /api/product/* 前缀下，
 * 与旧原型页面的 mock 接口（/api/*）并存：msw 拦截旧接口，未匹配的
 * 产品接口经 Vite 代理落到 apps/api；旧页面逐页改接真 API 后，
 * 旧前缀整体退场，届时再决定产品前缀是否归一。
 *
 * 时间统一使用 ISO 8601 字符串；ID 为 UUID。
 */

// ---------------------------------------------------------------------------
// 错误
// ---------------------------------------------------------------------------

export interface ApiError {
  message: string;
}

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

/** 首期无权限模型；归档只是产品状态，不涉及访问控制 */
export type ProjectStatus = 'active' | 'archived';

export interface ProjectSummary {
  id: string;
  title: string;
  mode: ProjectMode;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
}

export interface CreateProjectRequest {
  title: string;
  mode?: ProjectMode;
  /** 创建时附带的原始输入（如粘贴的剧本），保存到本地文件目录并登记元数据 */
  sourceText?: string;
}

export interface UpdateProjectRequest {
  title?: string;
  status?: ProjectStatus;
}

// ---------------------------------------------------------------------------
// 原始输入约束
// ---------------------------------------------------------------------------

/**
 * 原始输入（粘贴文本或上传文件）的首期约束，前后端共用同一来源。
 * 首期文件上传只收 txt / md 纯文本；docx / pdf 等二进制格式的解析是后续工单的范围，
 * 提前放行只会产生生成阶段无法读取的输入。
 */
export const SOURCE_INPUT_LIMITS = {
  /** 粘贴或文件内容的字符数下限（防止误提交空内容） */
  minChars: 10,
  /** 剧本模式字数上限 */
  scriptMaxChars: 300_000,
  /** 小说模式字数上限 */
  novelMaxChars: 100_000,
  /** 上传文件大小上限 */
  maxFileBytes: 10 * 1024 * 1024,
  /** 允许上传的文件扩展名 */
  allowedFileExtensions: ['.txt', '.md'],
} as const;

// ---------------------------------------------------------------------------
// 运行元数据
// ---------------------------------------------------------------------------

export type RunKind = 'script' | 'asset-extraction';

/** 工单 01 只登记运行元数据，不执行生成业务；真实运行是工单 04 的范围 */
export type RunStatus = 'created' | 'running' | 'succeeded' | 'failed' | 'timeout' | 'rejected';

export interface RunMeta {
  id: string;
  projectId: string;
  kind: RunKind;
  status: RunStatus;
  /** 本次运行消费的原始输入文件；工单 03 之前登记的旧运行可能为 null */
  sourceFileId: string | null;
  createdAt: string;
  /** Harness 接受任务的时间；created 状态为 null */
  startedAt: string | null;
  finishedAt: string | null;
  /** 最近上报的执行步骤（工具名或步骤序号）；执行前为 null */
  currentStep: string | null;
  /** failed/timeout 状态下的失败或超时原因 */
  failureReason: string | null;
}

export interface CreateRunRequest {
  kind: RunKind;
  /** 运行必须明确引用本项目的一份原始输入（kind = source-input 的文件） */
  sourceFileId: string;
  /** 幂等键：同一项目内相同键的重复请求返回已存在的运行，不重复创建 */
  idempotencyKey?: string;
}

export interface RunListResponse {
  runs: RunMeta[];
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
  /** 业务角色：原始输入按项目模式记 'script-source' / 'novel-source'；生成产物如 'script-output' */
  role: string;
  /** 相对数据目录的 POSIX 风格路径；首期不做对象存储，后续可替换实现 */
  path: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface SaveSourceInputRequest {
  /** 原始输入文件名；缺省时后端命名 */
  filename?: string;
  text: string;
}

// ---------------------------------------------------------------------------
// 项目详情（项目 + 运行/文件元数据投影）
// ---------------------------------------------------------------------------

export interface ProjectDetail {
  project: ProjectSummary;
  runs: RunMeta[];
  files: FileMeta[];
}
