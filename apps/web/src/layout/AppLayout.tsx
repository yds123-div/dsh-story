import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';

export function AppLayout() {
  return (
    <div className="ds-app">
      <Layout style={{ height: '100vh' }}>
        <Layout.Sider width={78} collapsedWidth={78} trigger={null} collapsible={false}>
          <SideNav />
        </Layout.Sider>
        <Layout>
          <Layout.Header>
            <TopBar />
          </Layout.Header>
          <Layout.Content className="ds-content">
            <Outlet />
          </Layout.Content>
        </Layout>
      </Layout>
    </div>
  );
}
