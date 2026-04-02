import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import './index.css';
import App from './App';

// Global Fetch Interceptor for JWT Refresh Strategy
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    let response = await originalFetch(...args);
    
    // If unauthorized, and we have a token, attempt to refresh
    if (response.status === 401) {
        const token = localStorage.getItem('token');
        if (token && !args[0].toString().includes('/auth/refresh')) {
            try {
                const refreshRes = await originalFetch('http://localhost:5001/auth/refresh', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                        // Clone the original request arguments and update the Authorization header
                        const newArgs: any = [...args];
                        if (newArgs[1]) {
                            newArgs[1] = {
                                ...(newArgs[1] as any),
                                headers: {
                                    ...(newArgs[1] as any).headers,
                                    'Authorization': `Bearer ${data.token}`
                                }
                            };
                        } else {
                            if (newArgs[0] instanceof Request) {
                                newArgs[0].headers.set('Authorization', `Bearer ${data.token}`);
                            } else {
                                newArgs[1] = { headers: { 'Authorization': `Bearer ${data.token}` } };
                            }
                        }
                        // Replay the request with the new token
                        return await originalFetch(newArgs[0], newArgs[1]);
                    }
                } else {
                    // Refresh failed, clean up
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                }
            } catch (err) {
                console.error("Token refresh failed", err);
            }
        }
    }
    return response;
};

createRoot(document.getElementById('root')!).render(
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
