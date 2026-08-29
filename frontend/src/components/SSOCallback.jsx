import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const EXCHANGE_FN =
  `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/sso-exchange`;

const LANDING_URL =
  process.env.REACT_APP_LANDING_URL || 'https://apps.stellarglobalsupplies.com';

const MAX_AGE_MS = 5 * 60 * 1000;
const CLOCK_SKEW_MS = 30 * 1000;

function safeRedirect(redirect, fallback = '/') {
  try {
    const url = new URL(redirect || fallback, window.location.origin);

    // Never allow an external redirect.
    if (url.origin !== window.location.origin) {
      return fallback;
    }

    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export default function SSOCallback() {
  const [status, setStatus] = useState('Verifying your session…');
  const [error, setError] = useState(null);
  const exchanged = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const params = new URLSearchParams(window.location.search);

    const token = params.get('token');
    const ts = Number(params.get('ts') || 0);

    const redirect = safeRedirect(
      params.get('redirect') || '/',
      '/'
    );

    // Remove sensitive callback parameters from browser history.
    window.history.replaceState(
      null,
      '',
      window.location.pathname
    );

    // A callback without a token is NOT a reason to start
    // another login redirect. Show a clear error instead.
    if (!token) {
      setError(
        'No sign-in token was received. Please return to the portal and try again.'
      );
      return;
    }

    if (!Number.isFinite(ts) || ts === 0) {
      setError(
        'Invalid sign-in link. Please return to the portal.'
      );
      return;
    }

    const now = Date.now();

    if (now - ts > MAX_AGE_MS) {
      setError(
        'This sign-in link has expired. Please return to the portal.'
      );
      return;
    }

    if (ts - now > CLOCK_SKEW_MS) {
      setError(
        'This sign-in link is not yet valid. Please check your system clock.'
      );
      return;
    }

    setStatus('Exchanging credentials…');

    fetch(EXCHANGE_FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error || `Exchange failed (${res.status})`
          );
        }

        return data;
      })
      .then(async ({ access_token, refresh_token }) => {
        if (!access_token || !refresh_token) {
          throw new Error(
            'The sign-in service returned an incomplete session.'
          );
        }

        setStatus('Setting up your workspace…');

        const { error: authErr } =
          await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

        if (authErr) {
          throw new Error(authErr.message);
        }

        // Navigate client-side (no full page reload) so the app
        // never has to re-fetch the session from storage on mount,
        // which is what caused a race back to the landing page.
        navigate(redirect, { replace: true });
      })
      .catch((err) => {
        setError(
          err.message ||
            'Sign-in failed. Please return to the portal.'
        );
      });
  }, []);

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logo}>
            <span style={s.logoIcon}>SG</span>
            <span style={s.logoText}>Stellar Billing</span>
          </div>

          <p style={s.errorTitle}>Sign-in error</p>

          <p style={s.errorMsg}>{error}</p>

          <a href={LANDING_URL} style={s.btn}>
            Return to Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoIcon}>SG</span>
          <span style={s.logoText}>Stellar Billing</span>
        </div>

        <div style={s.spinner} />

        <p style={s.statusText}>{status}</p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F8FAFC',
  },

  card: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #E2E8F0',
    padding: '40px 36px',
    textAlign: 'center',
    width: 360,
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
  },

  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },

  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: '#00B98E',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 13,
  },

  logoText: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0F172A',
  },

  statusText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 12,
  },

  errorTitle: {
    fontWeight: 700,
    color: '#0F172A',
    fontSize: 15,
    marginBottom: 8,
  },

  errorMsg: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 20,
  },

  btn: {
    display: 'inline-block',
    padding: '10px 28px',
    background: '#00B98E',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  },

  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #E2E8F0',
    borderTopColor: '#00B98E',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '16px auto',
  },
};