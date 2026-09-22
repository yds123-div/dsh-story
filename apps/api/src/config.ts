import path from 'node:path';

export interface AppConfig {
  host: string;
  port: number;
  /** 数据目录：SQLite 库 + 本地文件目录 */
  dataDir: string;
  logLevel: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    host: env.DSH_API_HOST ?? '127.0.0.1',
    port: Number(env.DSH_API_PORT ?? 3001),
    dataDir: path.resolve(env.DSH_DATA_DIR ?? 'data'),
    logLevel: env.DSH_API_LOG_LEVEL ?? 'info',
  };
}
