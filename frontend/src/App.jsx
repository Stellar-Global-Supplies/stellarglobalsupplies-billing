import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';

import Shell          from './components/Shell';
import SSOCallback    from './components/SSOCallback';
import LoginPage      from './pages/LoginPage';
import DashboardPage  from './pages/DashboardPage';
import ProductsPage   from './pages/ProductsPage';
import NewBillPage    from './pages/NewBillPage';
import BillsPage      from './pages/BillsPage';
import BillDetailPage from './pages/BillDetailPage';

import './styles/globals.css';

const LANDING_URL = process.env.REACT_APP_LANDING_URL || 'https://apps.stellarglobalsupplies.com';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F7FB' }}>
        <span className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!user) {
    const callback = encodeURIComponent(window.location.origin + location.pathname);
    window.location.replace(`${LANDING_URL}/login?callback=${callback}`);
    return null;
  }

  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { fontFamily: 'Inter, sans-serif', fontSize: 14, borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,.12)' },
            success: { iconTheme: { primary: '#00B98E', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/auth/callback" element={<SSOCallback />} />

          {/* Protected */}
          <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/bills" element={<RequireAuth><BillsPage /></RequireAuth>} />
          <Route path="/bills/new" element={<RequireAuth><NewBillPage /></RequireAuth>} />
          <Route path="/bills/:id" element={<RequireAuth><BillDetailPage /></RequireAuth>} />
          <Route path="/products" element={<RequireAuth><ProductsPage /></RequireAuth>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
