/**
 * printBill — shares the receipt as a .txt file via the Web Share API.
 *
 * How it works:
 *   1. Formats the bill into a plain-text receipt string (58mm-friendly,
 *      monospace-compatible columns).
 *   2. Wraps the text in an in-memory File named "Bill-<no>.txt"
 *      (type: text/plain) — never written to disk.
 *   3. Calls navigator.share({ files: [file] }) — opens the OS share sheet
 *      with an actual file attachment (ACTION_SEND + file Uri), not just
 *      inline text.
 *   4. User picks iPrint (com.frogtosea.iprint) from the sheet.
 *   5. iPrint receives the .txt file, shows its print preview, and the
 *      user taps Print inside iPrint to send it to the thermal printer.
 *
 * Why a .txt file and not inline text:
 *   Some share targets, including iPrint's file-based print flow, only
 *   register as a share target for file attachments (ACTION_SEND with a
 *   file Uri) and don't pick up shares that only carry EXTRA_TEXT. Sharing
 *   a real .txt file ensures iPrint shows up in the share sheet and opens
 *   directly into its print preview.
 *
 * navigator.share({ files }) is supported on:
 *   - Chrome on Android (modern versions)
 *   - Safari on iOS 15+
 *   - NOT supported on most desktop browsers — falls back to a plain-text
 *     share (EXTRA_TEXT only), then clipboard copy.
 *
 * Nothing is saved/downloaded to the device — the file only exists in
 * memory for the duration of the share call.
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
  const padLen = Math.floor((COL_WIDTH - s.length) / 2);
  return ' '.repeat(Math.max(padLen, 0)) + s;
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

  // Items header
  lines.push(pad('#', 3) + 'Item');
  lines.push(divider());

  // Item rows — name on its own line, then "qty x rate ... amt" below it
  // so Rate fits cleanly within the 32-char thermal width.
  items.forEach((item, i) => {
    const num    = pad(i + 1, 2) + ' ';
    const name   = item.name + (item.unit ? ` (${item.unit})` : '');
    lines.push(num + name);

    const rate   = Number(item.rate);
    const qtyStr = `${item.qty} x ${rate.toFixed(2)}`;
    const amtStr = Number(item.amount).toFixed(2);
    const width  = COL_WIDTH - 3; // account for the 3-space indent below
    const left   = qtyStr.slice(0, width - amtStr.length - 1).padEnd(width - amtStr.length);
    lines.push('   ' + left + amtStr);
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
 * printBill — builds the receipt as an in-memory .txt file and opens the
 * OS share sheet so it can be sent to iPrint as a file attachment (not just
 * inline text). Nothing is saved/downloaded to disk — the File object only
 * exists in memory for the duration of the share call.
 *
 * Some share targets (like iPrint's file-based print flow) only pick up
 * shares that include an actual file (ACTION_SEND with a file Uri), not
 * shares that only carry EXTRA_TEXT. So we prefer sharing a real .txt File
 * first, and fall back to plain text / clipboard if file sharing isn't
 * supported.
 *
 * Always returns a Promise.
 */
export async function printBill(bill, items) {
  const text     = buildReceiptText(bill, items);
  const fileName = `Bill-${billNo(bill)}.txt`;
  const title    = `Bill ${billNo(bill)} – Stellar Global Supplies`;

  // Preferred path: share an actual .txt file
  if (navigator.canShare) {
    try {
      const file = new File([text], fileName, { type: 'text/plain' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
        });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err; // user dismissed share sheet
      console.error('.txt file share failed, falling back to text share:', err);
    }
  }

  // Fallback: plain-text share (EXTRA_TEXT, no file attached)
  if (navigator.share) {
    await navigator.share({ text, title });
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
