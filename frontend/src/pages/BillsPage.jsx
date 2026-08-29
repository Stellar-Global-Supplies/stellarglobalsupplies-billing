import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchBills } from '../utils/api';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function BillsPage() {
  const [bills,   setBills]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('All'); // All | Paid | Pending
  const navigate = useNavigate();

  useEffect(() => {
    fetchBills({ limit: 200 })
      .then(setBills)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = bills.filter(b => {
    const matchSearch = !search.trim() ||
      (b.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      String(b.bill_number).includes(search);
    const matchFilter = filter === 'All' || b.payment_status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="page-wide">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">All Bills</h1>
          <p className="page-subtitle">{bills.length} total bills</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/bills/new')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Bill
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          style={{ maxWidth: 280 }}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or bill #…"
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Paid', 'Pending'].map(f => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <div className="empty-state-title">{bills.length === 0 ? 'No bills yet' : 'No matching bills'}</div>
            <div className="empty-state-sub">{bills.length === 0 ? 'Create your first bill to get started' : 'Try adjusting your search or filter'}</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Payment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(bill => (
                  <tr key={bill.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/bills/${bill.id}`)}>
                    <td><span style={{ fontWeight: 700, fontFamily: 'Manrope', color: 'var(--brand-teal-dark)' }}>#{bill.bill_number}</span></td>
                    <td style={{ fontWeight: 600 }}>{bill.customer_name || <span style={{ color: 'var(--text-muted)' }}>Walk-in</span>}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(bill.created_at)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(bill.total)}</td>
                    <td>
                      <span className={`badge ${bill.payment_status === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                        {bill.payment_status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
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
