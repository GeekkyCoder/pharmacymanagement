import React, { useState } from 'react';
import { Layout, Menu, Grid } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/dashboard.css';
import AdminOverview from './dashboard/AdminOverview.tsx';

const { Header, Sider, Content } = Layout;




const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const base = '/dashboard';
  const menuItems = [
    ...(user?.role === 'admin' ? [{ key: 'overview', label: 'Dashboard' }] : []),
    { key: 'inventory', label: 'Inventory' },
    { key: 'pos', label: 'POS', disabled: user?.role !== 'employee' },
    { key: 'reports/sales', label: 'Sales Reports' },
    ...(user?.role === 'admin' ? [{ key: 'employees', label: 'Employees' }] : []),
    { key: 'logout', label: 'Logout' }
  ];

  const selected = (() => {
    if (location.pathname === base && user?.role === 'admin') return 'overview';
    const path = location.pathname.replace(base + '/', '');
    if (path.startsWith('inventory')) return 'inventory';
    if (path.startsWith('reports/sales')) return 'reports/sales';
    if (path.startsWith('employees')) return 'employees';
    if (path.startsWith('pos')) return 'pos';
    return user?.role === 'admin' ? 'overview' : 'inventory';
  })();

  return (
    <Layout className="dashboard-root">
      <Sider
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        breakpoint="lg"
        collapsedWidth={screens.xs ? 0 : 64}
        className="dashboard-sider"
      >
        <div className="logo-area" onClick={()=>navigate(base)}>
          {collapsed ? '💊' : 'Pharmacy' }
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selected]}
          onClick={(info) => {
            if (info.key === 'logout') { logout(); navigate('/login'); return; }
            navigate(base + '/' + info.key);
          }}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header className="dashboard-header">
          <div className="header-left">Welcome, {user?.name}</div>
          <div className="header-right">Role: {user?.role}</div>
        </Header>
        <Content className="dashboard-content">
          <div className="content-inner">
            {location.pathname === base && user?.role === 'admin' ? <AdminOverview /> : <Outlet />}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard;
