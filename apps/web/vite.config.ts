import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiProxyTarget = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:3001';

export default defineConfig({
  // 外网经 nginx 路径代理部署时设置（服务器 compose 传入 VITE_BASE=/deepsfv-dev/）
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
    // 产品 API 代理：msw 开启时 /api 请求先被 mock 拦截，未匹配的（bypass）落到这里
    proxy: {
      '/api': { target: apiProxyTarget, changeOrigin: true },
      '/health': { target: apiProxyTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
