/**
 * printBill — renders the 58mm receipt as a PNG and opens the OS share
 * sheet via the Web Share API so the user can pick WePrint to print.
 *
 * Flow:
 *   1. Inject an off-screen <div> with the receipt HTML.
 *   2. Rasterise it at 3× scale with html2canvas → PNG File.
 *   3. navigator.share({ files: [pngFile] }) → OS share sheet.
 *   4. User picks WePrint → prints as image label.
 *
 * Returns a Promise. Wire with an async onClick that manages loading state.
 * AbortError (user dismissed share sheet) should be caught and ignored by
 * the caller — it is not a real error.
 */

import html2canvas from 'html2canvas';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHOP = {
  name:    'Stellar Global Supplies',
  address: 'Talawade, Pune – 411062',
  phone:   '9637655556',
};

const billNo = (bill) => 'SG-' + String(bill.bill_number).slice(-6).toUpperCase();

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Receipt HTML
// ---------------------------------------------------------------------------

function buildReceiptHtml(bill, items) {
  const IST     = { timeZone: 'Asia/Kolkata' };
  const dateStr = new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...IST });
  const timeStr = new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', ...IST });
  const total   = Number(bill.total);
  const billNoStr = billNo(bill);

  const itemRows = items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(item.name)}${item.unit ? ` <small>(${escapeHtml(item.unit)})</small>` : ''}</td>
      <td class="c">${item.qty}</td>
      <td class="r">${Number(item.rate).toFixed(2)}</td>
      <td class="r">${Number(item.amount).toFixed(2)}</td>
    </tr>`).join('');

  const paidStamp = bill.payment_status === 'Paid'
    ? `<div class="paid">** PAID **</div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
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
  </style>
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
      <span><b>Bill:</b> ${billNoStr}</span>
      <span>${dateStr}</span>
    </div>
    <div class="row">
      <span><b>Customer:</b> ${escapeHtml(bill.customer_name || 'Walk-in')}</span>
      <span>${timeStr}</span>
    </div>
    ${bill.customer_phone ? `<div><b>Ph:</b> ${escapeHtml(bill.customer_phone)}</div>` : ''}
  </div>
  <hr class="dd">
  <table>
    <thead>
      <tr>
        <th>#</th><th>Item</th><th class="c">Qty</th><th class="r">Rate</th><th class="r">Amt</th>
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
}

// ---------------------------------------------------------------------------
// Core: render → PNG → share
// ---------------------------------------------------------------------------

async function shareReceiptAsPng(bill, items) {
  const RECEIPT_WIDTH_PX = 220; // ~58mm at 96 dpi

  const host = document.createElement('div');
  host.style.cssText = [
    'position:fixed',
    'top:0',
    `left:-${RECEIPT_WIDTH_PX + 40}px`,
    `width:${RECEIPT_WIDTH_PX}px`,
    'background:#fff',
    'z-index:-9999',
    'overflow:visible',
  ].join(';');

  host.innerHTML = buildReceiptHtml(bill, items);
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host, {
      scale: 3,
      useCORS: false,
      backgroundColor: '#ffffff',
      logging: false,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth:  RECEIPT_WIDTH_PX,
      windowHeight: host.scrollHeight,
    });

    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')),
        'image/png'
      );
    });

    const file = new File([pngBlob], `bill-${billNo(bill)}.png`, { type: 'image/png' });

    await navigator.share({
      files: [file],
      title: `Bill ${billNo(bill)} – Stellar Global Supplies`,
    });

  } finally {
    if (host.parentNode) host.parentNode.removeChild(host);
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * printBill — renders the receipt as a PNG and opens the OS share sheet.
 * The user picks WePrint from the sheet to print.
 * Always returns a Promise — wire with an async onClick.
 */
export async function printBill(bill, items) {
  await shareReceiptAsPng(bill, items);
}
