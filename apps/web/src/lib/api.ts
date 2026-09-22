import type {
  ApiError,
  CreateProjectRequest,
  CreateRunRequest,
  HealthResponse,
  ProjectDetail,
  ProjectSummary,
  Run,
} from '@dsh-story/contracts';

/**
 * 产品 API 客户端：前端访问数据的唯一入口。
 * 开发模式经 vite 代理到 apps/api；也可用 VITE_API_BASE_URL 指向后端地址。
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiClientError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as ApiError;
      if (body?.message) message = body.message;
    } catch {
      // 非 JSON 错误体，保留默认 message
    }
    throw new ApiClientError(res.status, message);
  }
  return (await res.json()) as T;
}

export const api = {
  health(): Promise<HealthResponse> {
    return request<HealthResponse>('/health');
  },
  listProjects(): Promise<ProjectSummary[]> {
    return request<ProjectSummary[]>('/api/projects');
  },
  getProject(id: string): Promise<ProjectDetail> {
    return request<ProjectDetail>(`/api/projects/${id}`);
  },
  createProject(input: CreateProjectRequest): Promise<ProjectDetail> {
    return request<ProjectDetail>('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
  createRun(projectId: string, input: CreateRunRequest): Promise<Run> {
    return request<Run>(`/api/projects/${projectId}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
};
