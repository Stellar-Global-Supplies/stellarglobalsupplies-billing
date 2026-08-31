import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchBillById } from '../utils/api';
import { printBill, printBillViaBrowser } from '../utils/printBill';

const fmt = (n) => `₹${Number(n).toFixed(2)}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function BillDetailPage() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillById(id)
      .then(setBill)
      .catch(e => { toast.error(e.message); navigate('/bills'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
      <span className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
    </div>
  );
  if (!bill) return null;

  const items = bill.bill_items || [];
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div className="page">
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/bills')} style={{ marginBottom: 16, paddingLeft: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        All Bills
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Bill #{bill.bill_number}</h1>
          <p className="page-subtitle">{fmtDate(bill.created_at)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`badge ${bill.payment_status === 'Paid' ? 'badge-paid' : 'badge-pending'}`} style={{ fontSize: 13, padding: '5px 12px' }}>
            {bill.payment_status}
          </span>
          <button
            className="btn btn-primary"
            onClick={() => printBill(bill, items)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Reprint
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'right', marginTop: -12, marginBottom: 12 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 12, color: 'var(--text-muted)' }}
          onClick={() => printBillViaBrowser(bill, items)}
        >
          Trouble printing? Print via browser instead
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Customer details */}
        <div className="card">
          <div className="card-header"><span className="card-title">Customer Details</span></div>
          <div className="card-body">
            <Row label="Name"    value={bill.customer_name  || 'Walk-in customer'} />
            <Row label="Phone"   value={bill.customer_phone || '—'} />
            <Row label="Payment" value={bill.payment_status} />
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Items</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Rate</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.unit && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unit}</div>}
                    </td>
                    <td style={{ textAlign: 'right' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(item.rate)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '14px 20px', borderTop: '2px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 15 }}>TOTAL</span>
            <span style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 20, color: 'var(--brand-teal-dark)' }}>{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
