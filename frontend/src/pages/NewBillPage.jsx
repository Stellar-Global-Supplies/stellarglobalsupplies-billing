import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchProducts, createBill } from '../utils/api';
import { printBill } from '../utils/printBill';

const fmt = (n) => `₹${Number(n).toFixed(2)}`;

function genBillNumber() {
  const d = new Date();
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${String(Date.now()).slice(-4)}`;
}

export default function NewBillPage() {
  const navigate = useNavigate();
  const [products,  setProducts]  = useState([]);
  const [search,    setSearch]    = useState('');
  const [items,     setItems]     = useState([]); // { product_id, name, unit, qty, rate, amount }
  const [customer,  setCustomer]  = useState({ name: '', phone: '' });
  const [payment,   setPayment]   = useState('Pending');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(e => toast.error(e.message));
  }, []);

  // Filtered product list for the picker
  const filtered = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  // Add a product to the bill (or bump qty if already added)
  const addProduct = (p) => {
    setItems(prev => {
      const exists = prev.find(i => i.product_id === p.id);
      if (exists) {
        return prev.map(i => i.product_id === p.id
          ? { ...i, qty: i.qty + 1, amount: (i.qty + 1) * i.rate }
          : i);
      }
      return [...prev, {
        product_id: p.id,
        name: p.name,
        unit: p.unit || '',
        qty: 1,
        rate: Number(p.rate),
        amount: Number(p.rate),
      }];
    });
    setSearch('');
  };

  const updateQty = (idx, val) => {
    const qty = Number(val);
    if (isNaN(qty) || qty < 0) return;
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, qty, amount: qty * item.rate } : item));
  };

  const updateRate = (idx, val) => {
    const rate = Number(val);
    if (isNaN(rate) || rate < 0) return;
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, rate, amount: item.qty * rate } : item));
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const total = items.reduce((s, i) => s + i.amount, 0);

  const handleSave = useCallback(async (andPrint = false) => {
    if (items.length === 0) return toast.error('Add at least one product');
    const invalidQty = items.find(i => !i.qty || i.qty <= 0);
    if (invalidQty) return toast.error(`Set a valid quantity for "${invalidQty.name}"`);

    setSaving(true);
    try {
      const billPayload = {
        bill_number:    genBillNumber(),
        customer_name:  customer.name.trim() || null,
        customer_phone: customer.phone.trim() || null,
        payment_status: payment,
        total,
        created_at:     new Date().toISOString(),
      };
      const bill = await createBill(billPayload, items);
      toast.success('Bill created!');
      if (andPrint) {
        printBill(bill, items);
      }
      navigate(`/bills/${bill.id}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }, [items, customer, payment, total, navigate]);

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">New Bill</h1>
        <p className="page-subtitle">Create and print a new customer bill</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Customer */}
        <div className="card">
          <div className="card-header"><span className="card-title">Customer Details</span><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Optional</span></div>
          <div className="card-body">
            <div className="form-row form-row-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Customer Name</label>
                <input className="form-input" value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} placeholder="Walk-in customer" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone</label>
                <input className="form-input" value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} placeholder="Phone number" />
              </div>
            </div>
          </div>
        </div>

        {/* Product picker */}
        <div className="card">
          <div className="card-header"><span className="card-title">Add Products</span></div>
          <div className="card-body">
            <div className="form-group" style={{ marginBottom: filtered.length > 0 && search ? 0 : 16 }}>
              <label className="form-label">Search & Select Product</label>
              <input
                className="form-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Type product name…"
              />
            </div>

            {/* Search results dropdown */}
            {search.trim() && (
              <div style={{
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                overflow: 'hidden', marginBottom: 16, background: 'var(--bg-card)',
                boxShadow: 'var(--shadow-md)',
              }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No products found</div>
                ) : filtered.map(p => (
                  <div
                    key={p.id}
                    onClick={() => addProduct(p)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--neutral-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                      {p.unit && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.unit}</div>}
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--brand-teal-dark)', fontSize: 14 }}>₹{Number(p.rate).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Or pick from full list */}
            {!search.trim() && products.length > 0 && (
              <div>
                <div className="form-label" style={{ marginBottom: 10 }}>All Products — tap to add</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {products.map(p => (
                    <button
                      key={p.id}
                      className="btn btn-secondary btn-sm"
                      onClick={() => addProduct(p)}
                      style={{ borderRadius: 99 }}
                    >
                      {p.name} — ₹{Number(p.rate).toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bill items */}
        {items.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Bill Items</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="card-body" style={{ padding: '12px 20px' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 36px', gap: 8, paddingBottom: 8, marginBottom: 4 }}>
                <div className="form-label" style={{ margin: 0 }}>Product</div>
                <div className="form-label" style={{ margin: 0 }}>Qty</div>
                <div className="form-label" style={{ margin: 0 }}>Rate (₹)</div>
                <div></div>
              </div>

              {items.map((item, idx) => (
                <div key={idx} style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 110px 36px',
                  gap: 8, alignItems: 'center', padding: '10px 0',
                  borderBottom: idx < items.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                    {item.unit && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unit}</div>}
                    <div style={{ fontSize: 12, color: 'var(--brand-teal-dark)', fontWeight: 600, marginTop: 2 }}>{fmt(item.amount)}</div>
                  </div>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="1"
                    value={item.qty === 0 ? '' : item.qty}
                    onChange={e => updateQty(idx, e.target.value)}
                    placeholder="0"
                    style={{ padding: '8px 10px', fontSize: 14, textAlign: 'center' }}
                  />
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate === 0 ? '' : item.rate}
                    onChange={e => updateRate(idx, e.target.value)}
                    placeholder="0.00"
                    style={{ padding: '8px 10px', fontSize: 14 }}
                  />
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeItem(idx)}
                    style={{ padding: '8px', minHeight: 36, width: 36 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}

              {/* Total */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 0 0', marginTop: 8, borderTop: '2px solid var(--border-color)',
              }}>
                <span style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 16 }}>TOTAL</span>
                <span style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 20, color: 'var(--brand-teal-dark)' }}>{fmt(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment & actions */}
        {items.length > 0 && (
          <div className="card">
            <div className="card-header"><span className="card-title">Payment</span></div>
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Payment Status</label>
                <select className="form-input" value={payment} onChange={e => setPayment(e.target.value)}>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save Bill'}
                </button>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => handleSave(true)} disabled={saving}>
                  {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      Save & Print
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
