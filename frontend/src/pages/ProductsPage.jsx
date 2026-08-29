import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../utils/api';

const EMPTY = { name: '', unit: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null); // product being edited
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try { setProducts(await fetchProducts()); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, unit: p.unit || '' }); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(EMPTY); };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim())          return toast.error('Product name is required');
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), unit: form.unit.trim() };
      if (editing) {
        await updateProduct(editing.id, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product added');
      }
      closeModal();
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    setDeleting(id);
    try { await deleteProduct(id); toast.success('Product deleted'); load(); }
    catch (e) { toast.error(e.message); }
    finally { setDeleting(null); }
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your product catalogue</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Product
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">No products yet</div>
            <div className="empty-state-sub">Add your first product to start billing</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.unit || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => remove(p.id)}
                          disabled={deleting === p.id}
                        >
                          {deleting === p.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ animation: 'slideUp .2s ease' }}>
            <h2 className="modal-title">{editing ? 'Edit Product' : 'Add Product'}</h2>
            <p className="modal-subtitle">{editing ? 'Update product details' : 'Add a new product to your catalogue'}</p>

            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. M8 Hex Nut" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input className="form-input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g. pcs, box, kg" />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : (editing ? 'Save Changes' : 'Add Product')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}