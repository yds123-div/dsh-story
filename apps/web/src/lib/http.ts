export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const TOKEN_KEY = 'deepsfv-token';
const PLACEHOLDER_TOKEN = 'dev-placeholder-token';

export function getAuthToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? PLACEHOLDER_TOKEN;
  } catch {
    return PLACEHOLDER_TOKEN;
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${getAuthToken()}`);
  if (init.body !== undefined && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, { ...init, headers });

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new HttpError(401, 'Unauthorized');
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new HttpError(response.status, detail || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
