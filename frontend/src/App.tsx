import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Room from './pages/Room';
import Store from './pages/Store';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import Tournament from './pages/Tournament';
import Admin from './pages/Admin';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth() as any;
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const RegisteredRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth() as any;
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (user.isGuest) {
    return <Navigate to="/lobby" replace />;
  }
  return <>{children}</>;
};

function App() {
  const { user } = useAuth() as any;

  return (
    <div className="app-wrapper">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={user ? <Navigate to="/lobby" replace /> : <Auth />} />
        <Route path="/home" element={<Home />} />

        {/* Authenticated routes */}
        <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
        <Route path="/room/:id" element={<ProtectedRoute><Room /></ProtectedRoute>} />
        <Route path="/store" element={<RegisteredRoute><Store /></RegisteredRoute>} />
        <Route path="/inventory" element={<RegisteredRoute><Inventory /></RegisteredRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
        <Route path="/tournaments" element={<ProtectedRoute><Tournament /></ProtectedRoute>} />
        <Route path="/emin/admin" element={<Admin />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
