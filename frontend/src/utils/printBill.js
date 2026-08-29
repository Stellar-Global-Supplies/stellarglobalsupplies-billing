/**
 * printBill — generates a 58mm thermal receipt and auto-triggers print.
 *
 * Strategy (same as mayurmasala-billing reference app):
 *   1. Build HTML string with embedded CSS sized for 58mm paper
 *   2. Create a Blob URL from the HTML
 *   3. Open in a new tab — the HTML itself calls window.print() on load
 *   4. RawBT on Android intercepts window.print() and sends to thermal printer
 *
 * Font sizes are intentionally large (16px base) — 58mm thermal heads
 * render at ~8 dots/mm so larger text prints crisper than tiny fonts.
 */

const SHOP = {
  name:    'Stellar Global Supplies',
  address: 'www.stellarglobalsupplies.com',
  phone:   '', // add phone number if needed
};

const billNo = (bill) => 'SG-' + String(bill.bill_number).slice(-6).toUpperCase();

export function printBill(bill, items) {
  const IST     = { timeZone: 'Asia/Kolkata' };
  const dateStr = new Date(bill.created_at).toLocaleDateString('en-IN',  { day: '2-digit', month: 'short', year: 'numeric', ...IST });
  const timeStr = new Date(bill.created_at).toLocaleTimeString('en-IN',  { hour: '2-digit', minute: '2-digit', ...IST });
  const total   = Number(bill.total);

  const itemRows = items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.name}${item.unit ? ` <small>(${item.unit})</small>` : ''}</td>
      <td class="c">${item.qty}</td>
      <td class="r">${Number(item.rate).toFixed(2)}</td>
      <td class="r">${Number(item.amount).toFixed(2)}</td>
    </tr>`).join('');

  const paidStamp = bill.payment_status === 'Paid'
    ? `<div class="paid">** PAID **</div>` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bill ${billNo(bill)}</title>
  <style>
    @page { size: 58mm auto; margin: 2mm 1px; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 16px;
      width: 56mm;
      color: #000;
      background: #fff;
    }
    .hdr  { text-align: center; margin-bottom: 4px; }
    .s1   { font-size: 18px; font-weight: bold; line-height: 1.2; }
    .s3   { font-size: 13px; color: #333; }
    hr.dl { border: none; border-top: 1.5px solid #000; margin: 4px 0; }
    hr.dd { border: none; border-top: 1px dashed #888; margin: 4px 0; }
    .meta { font-size: 15px; margin-bottom: 3px; line-height: 1.5; }
    .row  { display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 15px; font-weight: bold; padding: 3px 0; border-bottom: 1px dashed #888; text-align: left; }
    td { font-size: 16px; padding: 2px 0; vertical-align: top; line-height: 1.4; }
    td.c { text-align: center; width: 18px; }
    td.r { text-align: right; }
    td:nth-child(1) { width: 14px; font-size: 14px; color: #555; }
    td:nth-child(4) { width: 34px; }
    td:nth-child(5) { width: 36px; }
    .sub td { font-size: 15px; color: #333; padding-top: 4px; }
    .tot    { border-top: 2px solid #000; }
    .tot td { font-size: 22px; font-weight: bold; padding-top: 4px; }
    .paid { text-align: center; font-size: 22px; font-weight: bold; color: #007a60; margin: 6px 0 3px; }
    .ftr  { text-align: center; font-size: 16px; color: #333; margin-top: 8px; line-height: 1.6; font-weight: bold; }
    .ftr small { font-size: 13px; font-weight: normal; color: #555; }
    @media print {
      body { width: auto !important; zoom: 1 !important; transform: none !important; }
    }
  </style>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  <\/script>
</head>
<body>
  <div class="hdr">
    <div class="s1">STELLAR GLOBAL</div>
    <div class="s1">SUPPLIES</div>
    ${SHOP.address ? `<div class="s3">${SHOP.address}</div>` : ''}
    ${SHOP.phone   ? `<div class="s3">Ph: ${SHOP.phone}</div>` : ''}
  </div>
  <hr class="dl">
  <div class="meta">
    <div class="row">
      <span><b>Bill:</b> ${billNo(bill)}</span>
      <span>${dateStr}</span>
    </div>
    <div class="row">
      <span><b>Customer:</b> ${bill.customer_name || 'Walk-in'}</span>
      <span>${timeStr}</span>
    </div>
    ${bill.customer_phone ? `<div><b>Ph:</b> ${bill.customer_phone}</div>` : ''}
  </div>
  <hr class="dd">
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th class="c">Qty</th>
        <th class="r">Rate</th>
        <th class="r">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="sub">
        <td colspan="4" class="r"><b>Subtotal</b></td>
        <td class="r"><b>${total.toFixed(2)}</b></td>
      </tr>
    </tbody>
  </table>
  <hr class="dl">
  <table class="tot">
    <tr>
      <td><b>TOTAL</b></td>
      <td colspan="4" class="r"><b>Rs. ${total.toFixed(2)}</b></td>
    </tr>
  </table>
  ${paidStamp}
  <div class="ftr">
    Thank you!<br>
    <small>Stellar Global Supplies</small>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (!win) {
    // Fallback if popup blocked — open in same tab
    window.location.href = url;
  }
  // Revoke blob URL after 60s to free memory
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
