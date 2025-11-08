import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useIsFetching } from '@tanstack/react-query';
import router from './router';
import { AuthProvider } from './context/AuthContext';
import { ConfigProvider, App as AntdApp, Spin } from 'antd';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import AppFooter from './components/AppFooter';
import './styles/print.css';

const queryClient = new QueryClient();

const LoadingOverlay: React.FC = () => {
  const fetching = useIsFetching();
  if (!fetching) return null;
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.4)', zIndex:9999 }}>
      <Spin size="large" />
    </div>
  );
};

const App: React.FC = () => (
  <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
    <AntdApp>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ErrorBoundary>
            <RouterProvider router={router} />
            <LoadingOverlay />
            <AppFooter />
          </ErrorBoundary>
        </AuthProvider>
      </QueryClientProvider>
    </AntdApp>
  </ConfigProvider>
);

export default App;
