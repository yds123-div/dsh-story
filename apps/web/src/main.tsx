import '@ant-design/v5-patch-for-react-19';
import './styles/overrides.css';
import { StrictMode, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { setUnauthorizedHandler } from './lib/http';
import { hogeeDarkTheme, hogeeLightTheme } from './theme';
import { useThemeAttribute, useThemeStore } from './stores/themeStore';

function Root() {
  const mode = useThemeStore((s) => s.mode);
  useThemeAttribute();
  const theme = useMemo(() => (mode === 'light' ? hogeeLightTheme : hogeeDarkTheme), [mode]);

  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntApp>
        <UnauthorizedBridge />
        <App />
      </AntApp>
    </ConfigProvider>
  );
}

function UnauthorizedBridge() {
  const { message } = AntApp.useApp();
  useEffect(() => {
    setUnauthorizedHandler(() => {
      message.error('登录已失效（401），请重新获取访问令牌');
    });
    return () => setUnauthorizedHandler(null);
  }, [message]);
  return null;
}

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW === 'false') return;
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
});
