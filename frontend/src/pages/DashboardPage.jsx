import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardStats, fetchBills } from '../utils/api';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function DashboardPage() {
  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchBills({ limit: 8 })])
      .then(([s, b]) => { setStats(s); setRecent(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <span className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    </div>
  );

  return (
    <div className="page-wide">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your billing activity</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/bills/new')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Bill
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Bills</div>
          <div className="stat-value">{stats?.totalBills ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value teal" style={{ fontSize: 18 }}>{fmt(stats?.totalRevenue ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Month</div>
          <div className="stat-value">{stats?.monthBills ?? 0} bills</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(stats?.monthRevenue ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ fontSize: 18, color: '#C2410C' }}>{fmt(stats?.pendingRevenue ?? 0)}</div>
        </div>
      </div>

      {/* Recent bills */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Bills</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/bills')}>View All</button>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <div className="empty-state-title">No bills yet</div>
            <div className="empty-state-sub">Create your first bill to get started</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Payment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map(bill => (
                  <tr key={bill.id}>
                    <td><span style={{ fontWeight: 700, fontFamily: 'Manrope', color: 'var(--brand-teal-dark)' }}>#{bill.bill_number}</span></td>
                    <td style={{ fontWeight: 600 }}>{bill.customer_name || <span style={{ color: 'var(--text-muted)' }}>Walk-in</span>}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(bill.created_at)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{bill.bill_items?.length ?? 0}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(bill.total)}</td>
                    <td>
                      <span className={`badge ${bill.payment_status === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                        {bill.payment_status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/bills/${bill.id}`)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
