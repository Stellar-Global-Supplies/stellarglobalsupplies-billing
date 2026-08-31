# Stellar Global Supplies — Billing App
**bills.stellarglobalsupplies.com**

## Stack
- React (CRA) — frontend
- Supabase — database + auth
- Cloudflare Pages — hosting (+ a Pages Function for the print API)
- Bluetooth Print (mate.bluetoothprint) thermal printing via direct app deep-link

---

## 1. Supabase Setup

1. Go to your existing Stellar Global Supplies Supabase project
2. Open the **SQL Editor**
3. Run `supabase_schema.sql` — creates `billing_products`, `bills`, and `bill_items` tables with RLS

---

## 2. Frontend — Local Dev

```bash
cd frontend
cp .env.example .env
# Fill in your Supabase URL and anon key
npm install
npm start
```

### Environment variables (`.env`)
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_LANDING_URL=https://apps.stellarglobalsupplies.com
```

---

## 3. Deploy to Cloudflare Pages

1. Build:
   ```bash
   cd frontend
   npm run build
   ```
2. Go to Cloudflare Pages → Create project → Upload `frontend/build/` folder
3. Set custom domain: `bills.stellarglobalsupplies.com`
4. Add environment variables in CF Pages settings (same as `.env` above)

---

## 4. Auth (SSO)

Uses the **same SSO strategy** as the orders app:
- User visits `bills.stellarglobalsupplies.com`
- Redirected to `apps.stellarglobalsupplies.com/login?callback=...`
- Portal issues a signed token → redirects to `/auth/callback?token=...&ts=...`
- `SSOCallback` exchanges the token via the existing `sso-exchange` Supabase Edge Function
- Session is set via `supabase.auth.setSession()` — user is logged in

No additional backend needed. Uses the same Supabase project and `sso-exchange` function already deployed for the orders app.

---

## 5. Thermal Printing — "Bluetooth Print" app (direct deep-link)

Printing no longer depends on Android's print dialog or which app is set
as the system default print service — it launches the printer app directly.

1. Install **Bluetooth Print** on the Android device connected to the thermal
   printer: https://play.google.com/store/apps/details?id=mate.bluetoothprint
2. Open the app → **Menu → Browser Print** → enable the toggle
3. Pair the Bluetooth/USB thermal printer inside the app once
4. In the Cloudflare Pages project → **Settings → Environment variables**,
   add (Production **and** Preview):
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Settings → API → `service_role` key (keep secret — this is server-side only, used by `functions/api/print-bill.js`)
5. When **Print** / **Reprint** is tapped:
   - The app navigates to `my.bluetoothprint.scheme://<origin>/api/print-bill?id=<bill_id>`
   - Android matches that custom scheme straight to the Bluetooth Print app and opens it — no dialog, no default-app setting involved
   - Bluetooth Print itself fetches `/api/print-bill?id=...` (a Cloudflare Pages Function), which returns the receipt as structured JSON, and sends it straight to the paired thermal printer
6. If Bluetooth Print isn't installed (e.g. testing on desktop or iOS), it automatically falls back to the old browser print-dialog flow so a receipt can still be produced/printed manually
7. Works with 58mm and 80mm thermal printers (Bluetooth or USB via the phone)

**Testing tip:** you can hit `/api/print-bill?id=<a-real-bill-id>` directly in
a browser to confirm it returns clean JSON before testing the deep-link on
the phone.

---

## 6. Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | Stats + recent bills |
| New Bill | `/bills/new` | Create bill + print |
| All Bills | `/bills` | List with search/filter |
| Bill Detail | `/bills/:id` | View + reprint |
| Products | `/products` | Add/edit/delete products |
