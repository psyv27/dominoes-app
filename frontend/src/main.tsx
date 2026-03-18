import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#d4a962',
          colorBgBase: '#16221c',
          colorBgContainer: '#202e26',
          colorBgElevated: '#253029',
          colorBorder: 'rgba(212, 169, 98, 0.2)',
          colorText: '#f5f0e6',
          colorTextSecondary: '#a8b3a0',
          borderRadius: 12,
          fontFamily: "'Inter', system-ui, sans-serif",
          colorError: '#d32f2f',
          colorSuccess: '#2e7d32',
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
);
