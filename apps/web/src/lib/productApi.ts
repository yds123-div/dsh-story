import type {
  ApiError,
  CreateProjectRequest,
  HealthResponse,
  ProjectDetail,
  ProjectListResponse,
  UpdateProjectRequest,
} from '@dsh-story/contracts';

/**
 * 产品 API 客户端：前端访问产品数据的唯一入口。
 * 产品接口挂在 /api/product/* 前缀下，与旧原型页的 mock 接口（/api/*）并存：
 * msw 拦截旧接口，未匹配的产品接口经 Vite 代理落到 apps/api。
 * 也可用 VITE_API_BASE_URL 指向后端地址。
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiClientError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
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

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const api = {
  health(): Promise<HealthResponse> {
    return request<HealthResponse>('/health');
  },

  listProjects(): Promise<ProjectListResponse> {
    return request<ProjectListResponse>('/api/product/projects');
  },

  getProject(id: string): Promise<ProjectDetail> {
    return request<ProjectDetail>(`/api/product/projects/${id}`);
  },

  createProject(input: CreateProjectRequest): Promise<ProjectDetail> {
    return request<ProjectDetail>('/api/product/projects', jsonInit('POST', input));
  },

  updateProject(id: string, input: UpdateProjectRequest): Promise<ProjectDetail> {
    return request<ProjectDetail>(`/api/product/projects/${id}`, jsonInit('PATCH', input));
  },
};
