import { supabase } from './supabase';

// ── Products ────────────────────────────────────────────────────────────────

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('billing_products')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function createProduct(payload) {
  const { data, error } = await supabase
    .from('billing_products')
    .insert([payload])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProduct(id, payload) {
  const { data, error } = await supabase
    .from('billing_products')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProduct(id) {
  const { error } = await supabase
    .from('billing_products')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Bills ───────────────────────────────────────────────────────────────────

export async function fetchBills({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('bills')
    .select('*, bill_items(id)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchBillById(id) {
  const { data, error } = await supabase
    .from('bills')
    .select('*, bill_items(*, billing_products(name, unit))')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createBill(billPayload, items) {
  // Insert bill
  const { data: bill, error: billErr } = await supabase
    .from('bills')
    .insert([billPayload])
    .select()
    .single();
  if (billErr) throw new Error(billErr.message);

  // Insert items
  const itemRows = items.map(item => ({
    bill_id:    bill.id,
    product_id: item.product_id,
    name:       item.name,
    unit:       item.unit,
    qty:        item.qty,
    rate:       item.rate,
    amount:     item.qty * item.rate,
  }));

  const { error: itemErr } = await supabase.from('bill_items').insert(itemRows);
  if (itemErr) throw new Error(itemErr.message);

  return bill;
}

export async function fetchDashboardStats() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const { data: allBills, error } = await supabase
    .from('bills')
    .select('id, total, created_at, payment_status');
  if (error) throw new Error(error.message);

  const totalBills     = allBills.length;
  const totalRevenue   = allBills.reduce((s, b) => s + Number(b.total || 0), 0);
  const monthBills     = allBills.filter(b => b.created_at >= startOfMonth);
  const monthRevenue   = monthBills.reduce((s, b) => s + Number(b.total || 0), 0);
  const pendingRevenue = allBills
    .filter(b => b.payment_status === 'Pending')
    .reduce((s, b) => s + Number(b.total || 0), 0);

  return { totalBills, totalRevenue, monthBills: monthBills.length, monthRevenue, pendingRevenue };
}
