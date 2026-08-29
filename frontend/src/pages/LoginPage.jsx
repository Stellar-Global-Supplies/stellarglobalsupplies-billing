import { useEffect } from 'react';

const LANDING_URL =
  process.env.REACT_APP_LANDING_URL || 'https://apps.stellarglobalsupplies.com';

export default function LoginPage() {
  useEffect(() => {
    // /login is only a local entry point.
    // The actual authentication happens in the central portal.
    const params = new URLSearchParams(window.location.search);

    const requestedRedirect = params.get('redirect') || '/';

    const safeRedirect = (() => {
      try {
        const url = new URL(requestedRedirect, window.location.origin);

        if (url.origin !== window.location.origin) {
          return '/';
        }

        return url.pathname + url.search + url.hash;
      } catch {
        return '/';
      }
    })();

    const callback = encodeURIComponent(
      `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
        safeRedirect
      )}`
    );

    window.location.replace(
      `${LANDING_URL}/login?callback=${callback}`
    );
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8FAFC',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#00B98E',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            margin: '0 auto 16px',
          }}
        >
          SG
        </div>

        <p style={{ color: '#64748B', fontSize: 14 }}>
          Redirecting to portal…
        </p>
      </div>
    </div>
  );
}