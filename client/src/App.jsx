import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import EventCreatePage from './pages/EventCreatePage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import QuoteComparisonPage from './pages/QuoteComparisonPage.jsx';
import VendorDashboardPage from './pages/VendorDashboardPage.jsx';
import VendorProfilePage from './pages/VendorProfilePage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import PersonalProfilePage from './pages/PersonalProfilePage.jsx';
import CustomerAiPage from './pages/CustomerAiPage.jsx';
import VendorAiPage from './pages/VendorAiPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import LoginPage from './components/LoginPage.jsx';
import MarketplaceLayout from './components/MarketplaceLayout.jsx';
import { API_URL } from './lib/api.js';
import { useSessionStore } from './store/sessionStore.js';
import './pages.css';

function RoleRoute({ role, children }) {
  const token = useSessionStore((state) => state.token);
  const sessionRole = useSessionStore((state) => state.role);
  const location = useLocation();
  const loginPath = role === 'vendor' ? '/vendor/login' : '/login';

  if (!token || !sessionRole) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }
  if (sessionRole !== role && sessionRole !== 'admin') {
    return <Navigate to={sessionRole === 'vendor' ? '/vendor' : '/'} replace />;
  }
  return children;
}

function AuthenticatedRoute({ children }) {
  const token = useSessionStore((state) => state.token);
  const role = useSessionStore((state) => state.role);
  const location = useLocation();
  if (!token || !role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function RoutedApp() {
  const token = useSessionStore((state) => state.token);
  const role = useSessionStore((state) => state.role);
  const setSession = useSessionStore((state) => state.setSession);
  const [notification, setNotification] = useState('');
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!token || !role) return undefined;
    if (import.meta.env.PROD && !API_URL) {
      console.error('VITE_API_URL is not configured for the production build');
      return undefined;
    }
    const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('lead:matched', (lead) => {
      setNotification(`Có yêu cầu mới phù hợp: ${lead.title}`);
    });
    socket.on('connect_error', (error) => {
      console.error('BridgC realtime connection failed', error.message);
    });
    return () => socket.disconnect();
  }, [token, role]);

  return (
    <>
      {notification && (
        <button className="notification-toast" type="button" onClick={() => setNotification('')}>
          {notification}<span>×</span>
        </button>
      )}
      <Routes>
        <Route path="/login" element={token && role ? <Navigate to={role === 'admin' ? '/admin' : role === 'vendor' ? '/vendor' : '/'} replace /> : <LoginPage role="customer" onLogin={setSession} />} />
        <Route path="/vendor/login" element={token && role ? <Navigate to={role === 'admin' ? '/admin' : role === 'vendor' ? '/vendor' : '/'} replace /> : <LoginPage role="vendor" onLogin={setSession} />} />
        <Route path="/" element={<MarketplaceLayout><LandingPage /></MarketplaceLayout>} />
        <Route path="/vendors/:slug" element={<MarketplaceLayout><VendorProfilePage /></MarketplaceLayout>} />
        <Route path="/quotes" element={<RoleRoute role="customer"><MarketplaceLayout><QuoteComparisonPage /></MarketplaceLayout></RoleRoute>} />
        <Route path="/rfp/new" element={<RoleRoute role="customer"><MarketplaceLayout><EventCreatePage /></MarketplaceLayout></RoleRoute>} />
        <Route path="/ai/customer" element={<RoleRoute role="customer"><MarketplaceLayout><CustomerAiPage /></MarketplaceLayout></RoleRoute>} />
        <Route path="/ai/vendor" element={<RoleRoute role="vendor"><MarketplaceLayout mode="vendor"><VendorAiPage /></MarketplaceLayout></RoleRoute>} />
        <Route path="/vendor" element={<RoleRoute role="vendor"><MarketplaceLayout mode="vendor"><VendorDashboardPage /></MarketplaceLayout></RoleRoute>} />
        <Route path="/admin" element={<RoleRoute role="admin"><MarketplaceLayout mode="admin"><AdminDashboardPage /></MarketplaceLayout></RoleRoute>} />
        <Route path="/messages" element={<AuthenticatedRoute><MarketplaceLayout mode={role === 'vendor' ? 'vendor' : 'customer'}><ChatPage /></MarketplaceLayout></AuthenticatedRoute>} />
        <Route path="/profile" element={<AuthenticatedRoute><MarketplaceLayout mode={role === 'vendor' ? 'vendor' : 'customer'}><PersonalProfilePage /></MarketplaceLayout></AuthenticatedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  );
}

export default App;
