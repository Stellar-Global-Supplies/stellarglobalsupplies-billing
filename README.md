# Stellar Global Supplies — Billing App
**bills.stellarglobalsupplies.com**

## Stack
- React (CRA) — frontend
- Supabase — database + auth
- Cloudflare Pages — hosting
- RawBT thermal printing via browser print dialog

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

## 5. RawBT Thermal Printing

1. Install **RawBT** app on the Android device connected to the thermal printer
2. Set RawBT as the default print service in Android Settings → Printing
3. When "Save & Print" or "Reprint" is tapped, the app opens a print window and calls `window.print()`
4. RawBT intercepts it and sends to the thermal printer automatically
5. Works with 58mm and 80mm thermal printers

---

## 6. Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | Stats + recent bills |
| New Bill | `/bills/new` | Create bill + print |
| All Bills | `/bills` | List with search/filter |
| Bill Detail | `/bills/:id` | View + reprint |
| Products | `/products` | Add/edit/delete products |
