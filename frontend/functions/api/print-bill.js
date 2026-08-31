// Cloudflare Pages Function — GET /api/print-bill?id=<bill_id>
//
// This is the "response URL" that the Bluetooth Print Android app
// (mate.bluetoothprint) fetches directly after it's launched via the
// my.bluetoothprint.scheme:// deep-link in printBill.js.
//
// It must return a PURE JSON array/object of print-instruction rows —
// no HTML wrapper, no stray output before/after — in the format Bluetooth
// Print expects:
//   { type: 0, content, bold, align, format }   — text row
//     bold:   0 | 1
//     align:  0 left | 1 center | 2 right
//     format: 0 normal | 1 double height | 2 double height+width | 3 double width | 4 small
//
// Docs: https://play.google.com/store/apps/details?id=mate.bluetoothprint
// (see "Instructions" — request page links to my.bluetoothprint.scheme://<RESPONSE_URL>,
// response page must return JSON built the same way as below.)

import { createClient } from '@supabase/supabase-js';

const SHOP = {
  name:    'Stellar Global Supplies',
  address: 'www.stellarglobalsupplies.com',
  phone:   '', // add phone number if needed
};

const billNo = (bill) => 'SG-' + String(bill.bill_number).slice(-6).toUpperCase();

const pad = (str, len, right = false) => {
  const s = String(str).substring(0, len);
  return right ? s.padStart(len) : s.padEnd(len);
};

const text = (content, { bold = 0, align = 0, format = 0 } = {}) =>
  ({ type: 0, content, bold, align, format });

const SOLID = '================================';
const BLANK = { type: 0, content: ' ', bold: 0, align: 0, format: 0 };

export async function onRequestGet(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  const url = new URL(request.url);
  const id  = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing ?id= parameter' }), { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = env.SUPABASE_URL || env.REACT_APP_SUPABASE_URL;
  const serviceKey  = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: bill, error: billErr } = await supabase
    .from('bills')
    .select('*')
    .eq('id', id)
    .single();

  if (billErr || !bill) {
    return new Response(JSON.stringify({ error: 'Bill not found' }), { status: 404, headers: corsHeaders });
  }

  const { data: items = [] } = await supabase
    .from('bill_items')
    .select('*')
    .eq('bill_id', id)
    .order('created_at');

  const rows = [];

  // Header
  rows.push(text('STELLAR GLOBAL', { bold: 1, align: 1, format: 2 }));
  rows.push(text('SUPPLIES',       { bold: 1, align: 1, format: 2 }));
  if (SHOP.address) rows.push(text(SHOP.address, { align: 1, format: 0 }));
  if (SHOP.phone)   rows.push(text(`Ph: ${SHOP.phone}`, { align: 1, format: 0 }));
  rows.push(text(SOLID));

  // Bill meta — IST timezone explicitly set
  const IST = { timeZone: 'Asia/Kolkata' };
  const dateStr = new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...IST });
  const timeStr = new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', ...IST });

  rows.push(text(`Bill: ${billNo(bill)}`, { format: 0 }));
  rows.push(text(`Date: ${dateStr} ${timeStr}`, { format: 0 }));
  rows.push(text(`Cust: ${bill.customer_name || 'Walk-in'}`, { format: 0 }));
  if (bill.customer_phone) {
    rows.push(text(`Ph  : ${bill.customer_phone}`, { format: 0 }));
  }
  rows.push(text(SOLID));

  rows.push(text('# Item       Qty  Rate    Amt', { bold: 1, format: 0 }));
  rows.push(text('------------------------------', { format: 0 }));

  let subtotal = 0;
  (items || []).forEach((item, i) => {
    const rate = Number(item.rate);
    const amt  = Number(item.amount != null ? item.amount : rate * Number(item.qty));
    subtotal  += amt;
    const num   = pad(i + 1, 1);
    const name  = pad(item.name, 10);
    const qty   = pad(item.qty,   3, true);
    const rateS = pad(rate.toFixed(2), 6, true);
    const amtS  = pad(amt.toFixed(2),  7, true);
    rows.push(text(`${num} ${name} ${qty} ${rateS} ${amtS}`, { format: 0 }));
  });

  rows.push(text(SOLID));

  const total = Number(bill.total != null ? bill.total : subtotal);

  rows.push(text(`TOTAL Rs.${total.toFixed(2)}`, { bold: 1, align: 1, format: 3 }));
  rows.push(text(SOLID));

  if (bill.payment_status === 'Paid') {
    rows.push(BLANK);
    rows.push(text('** PAID **', { bold: 1, align: 1, format: 3 }));
  }

  rows.push(BLANK);
  rows.push(text('Thank you!', { bold: 1, align: 1, format: 3 }));
  rows.push(text('Shopping with us', { align: 1, format: 4 }));
  if (SHOP.name) rows.push(text(SHOP.name, { align: 1, format: 0 }));
  rows.push(BLANK);
  rows.push(BLANK);

  const payload = {};
  rows.forEach((row, i) => { payload[i] = row; });

  return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders });
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
