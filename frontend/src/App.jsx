import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { supabase } from './utils/supabase';

import Shell          from './components/Shell';
import SSOCallback    from './components/SSOCallback';
import LoginPage      from './pages/LoginPage';
import DashboardPage  from './pages/DashboardPage';
import ProductsPage   from './pages/ProductsPage';
import NewBillPage    from './pages/NewBillPage';
import BillsPage      from './pages/BillsPage';
import BillDetailPage from './pages/BillDetailPage';

import './styles/globals.css';

const LANDING_URL =
  process.env.REACT_APP_LANDING_URL || 'https://apps.stellarglobalsupplies.com';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(false);
  const [confirmedAbsent, setConfirmedAbsent] = useState(false);

  useEffect(() => {
    // If context says there's no user, don't trust it blindly — it may
    // just not have caught up yet with a session that was set moments
    // ago (e.g. right after the SSO callback). Do one direct check
    // against Supabase before redirecting out to the landing page.
    if (!loading && !user) {
      let cancelled = false;
      setChecking(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        setChecking(false);
        if (!session) setConfirmedAbsent(true);
      });
      return () => { cancelled = true; };
    }
    setConfirmedAbsent(false);
  }, [loading, user]);

  if (loading || (!user && checking)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F4F7FB',
        }}
      >
        <span className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!user && confirmedAbsent) {
    // Always return from the portal through the SSO callback.
    // Preserve the page the user originally requested.
    const redirect =
      location.pathname + location.search + location.hash;

    const callback = encodeURIComponent(
      `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
    );

    window.location.replace(`${LANDING_URL}/login?callback=${callback}`);
    return null;
  }

  if (!user) return null; // waiting on the direct check above

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
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              borderRadius: 10,
              boxShadow: '0 4px 20px rgba(0,0,0,.12)',
            },
            success: {
              iconTheme: {
                primary: '#00B98E',
                secondary: '#fff',
              },
            },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<SSOCallback />} />

          {/* Protected */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />

          <Route
            path="/bills"
            element={
              <RequireAuth>
                <BillsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/bills/new"
            element={
              <RequireAuth>
                <NewBillPage />
              </RequireAuth>
            }
          />

          <Route
            path="/bills/:id"
            element={
              <RequireAuth>
                <BillDetailPage />
              </RequireAuth>
            }
          />

          <Route
            path="/products"
            element={
              <RequireAuth>
                <ProductsPage />
              </RequireAuth>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}