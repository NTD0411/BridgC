import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import EventCreatePage from './pages/EventCreatePage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import QuoteComparisonPage from './pages/QuoteComparisonPage.jsx';
import VendorDashboardPage from './pages/VendorDashboardPage.jsx';
import VendorProfilePage from './pages/VendorProfilePage.jsx';
import LoginPage from './components/LoginPage.jsx';
import MarketplaceLayout from './components/MarketplaceLayout.jsx';
import { API_URL } from './lib/api.js';
import { useSessionStore } from './store/sessionStore.js';
import './pages.css';

function RoutedApp() {
  const token = useSessionStore((state) => state.token);
  const setToken = useSessionStore((state) => state.setToken);
  const [notification, setNotification] = useState('');
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!token) return undefined;
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
  }, [token]);

  return (
    <>
      {notification && (
        <button className="notification-toast" type="button" onClick={() => setNotification('')}>
          {notification}<span>×</span>
        </button>
      )}
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage onLogin={setToken} />} />
        <Route path="/" element={<MarketplaceLayout><LandingPage /></MarketplaceLayout>} />
        <Route path="/vendors/:slug" element={<MarketplaceLayout><VendorProfilePage /></MarketplaceLayout>} />
        <Route path="/quotes" element={<MarketplaceLayout><QuoteComparisonPage /></MarketplaceLayout>} />
        <Route path="/rfp/new" element={<MarketplaceLayout><EventCreatePage /></MarketplaceLayout>} />
        <Route path="/vendor" element={<MarketplaceLayout mode="vendor"><VendorDashboardPage /></MarketplaceLayout>} />
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
