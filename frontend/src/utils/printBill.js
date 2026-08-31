/**
 * printBill — shares the receipt as plain text via the Web Share API.
 *
 * How it works:
 *   1. Formats the bill into a plain-text receipt string (58mm-friendly,
 *      monospace-compatible columns).
 *   2. Calls navigator.share({ text }) — opens the OS share sheet.
 *   3. User picks iPrint (com.frogtosea.iprint) from the sheet.
 *   4. iPrint receives the text, displays it in its print preview, and
 *      the user taps Print inside iPrint to send to the thermal printer.
 *
 * Why text not image:
 *   iPrint explicitly accepts ACTION_SEND / text/plain shares. Sharing text
 *   lands directly in iPrint's print screen — no extra steps inside the app.
 *
 * navigator.share({ text }) is supported on:
 *   - Chrome on Android (all modern versions)
 *   - Safari on iOS 12.1+
 *   - NOT supported on most desktop browsers (falls back to clipboard copy)
 *
 * Returns a Promise. Wire with an async onClick — see BillDetailPage.
 * AbortError (user dismissed share sheet) should be caught and ignored.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHOP = {
  name:    'STELLAR GLOBAL SUPPLIES',
  address: 'Talawade, Pune – 411062',
  phone:   '+91 9637655556',
};

const COL_WIDTH = 32; // characters across for 58mm monospace

const billNo = (bill) => 'SG-' + String(bill.bill_number).slice(-6).toUpperCase();

// ---------------------------------------------------------------------------
// Text receipt formatter
// ---------------------------------------------------------------------------

function pad(str, len, right = false) {
  const s = String(str).slice(0, len);
  return right ? s.padStart(len) : s.padEnd(len);
}

function row(left, right) {
  const r = String(right);
  const l = String(left).slice(0, COL_WIDTH - r.length - 1);
  return l.padEnd(COL_WIDTH - r.length) + r;
}

function divider(char = '-') {
  return char.repeat(COL_WIDTH);
}

function center(str) {
  const s = String(str).slice(0, COL_WIDTH);
  const pad = Math.floor((COL_WIDTH - s.length) / 2);
  return ' '.repeat(pad) + s;
}

function buildReceiptText(bill, items) {
  const IST     = { timeZone: 'Asia/Kolkata' };
  const dateStr = new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...IST });
  const timeStr = new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', ...IST });
  const total   = Number(bill.total);
  const billNoStr = billNo(bill);

  const lines = [];

  // Header
  lines.push(center(SHOP.name));
  if (SHOP.address) lines.push(center(SHOP.address));
  if (SHOP.phone)   lines.push(center('Ph: ' + SHOP.phone));
  lines.push(divider('='));

  // Meta
  lines.push(row('Bill: ' + billNoStr, dateStr));
  lines.push(row('Cust: ' + (bill.customer_name || 'Walk-in'), timeStr));
  if (bill.customer_phone) lines.push('Ph: ' + bill.customer_phone);
  lines.push(divider());

  // Items header  (#  Item           Qty   Amt)
  lines.push(pad('#', 2) + pad('Item', 16) + pad('Qty', 5, true) + pad('Amt', 9, true));
  lines.push(divider());

  // Item rows
  items.forEach((item, i) => {
    const num  = pad(i + 1, 2);
    const name = pad(item.name + (item.unit ? ` (${item.unit})` : ''), 16);
    const qty  = pad(item.qty, 5, true);
    const amt  = pad(Number(item.amount).toFixed(2), 9, true);
    lines.push(num + name + qty + amt);
  });

  lines.push(divider());

  // Subtotal / total
  lines.push(row('Subtotal', total.toFixed(2)));
  lines.push(divider('='));
  lines.push(row('TOTAL', 'Rs. ' + total.toFixed(2)));
  lines.push(divider('='));

  // Paid stamp
  if (bill.payment_status === 'Paid') {
    lines.push('');
    lines.push(center('** PAID **'));
  }

  // Footer
  lines.push('');
  lines.push(center('Thank you!'));
  lines.push(center('Stellar Global Supplies'));

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * printBill — formats the receipt as plain text and opens the OS share sheet.
 * The user picks iPrint from the sheet; iPrint shows a print preview and
 * sends it to the paired thermal printer.
 *
 * On desktop browsers that don't support navigator.share, falls back to
 * copying the receipt text to the clipboard and showing an alert.
 *
 * Always returns a Promise.
 */
export async function printBill(bill, items) {
  const text = buildReceiptText(bill, items);

  if (navigator.share) {
    await navigator.share({
      text,
      title: `Bill ${billNo(bill)} – Stellar Global Supplies`,
    });
    return;
  }

  // Desktop fallback — copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    alert('Receipt copied to clipboard.\nPaste it into iPrint or any text app to print.');
  } catch {
    // If clipboard also fails, show the text in a new window
    const win = window.open('', '_blank');
    if (win) {
      win.document.write('<pre style="font-family:monospace;font-size:14px">' + text + '</pre>');
      win.document.close();
    }
  }
}
