# Trading Journal

A private, authenticated trading journal built with React (Vite) and Supabase.

- **Journal** — add, edit, delete and review trades, with running capital on every row.
- **Dashboard** — headline stats, a month-by-month chart, and the monthly performance table.

All derived numbers (net prices, P/L, ROI, ROCE, risk, RRR, status, target) are calculated in the
browser from the raw inputs. Nothing derived is ever saved to the database.

## Setup

You need Node 18+ and a Supabase project.

1. **Install**
   ```bash
   npm install
   ```
2. **Set up authentication** — create your account in Supabase Authentication, and turn off public
   sign-ups. The app has sign-in only; it does not offer account creation.
3. **Set up the database** — for a fresh project, run `supabase/schema.sql` in the SQL editor. To
   preserve trades in the existing database, replace the email placeholder in
   `supabase/migrate-to-auth.sql` with the account email you just created, then run that migration.
   It assigns existing trades to that account and removes the old anonymous access policy.
4. **Configure** — copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` from Supabase → Project Settings → API. Set the same two variables in
   the hosting provider's build environment. Set starting capital after signing in using **Edit base**.
5. **Run**
   ```bash
   npm run dev
   ```
   Open the URL Vite prints (usually http://localhost:5173).

Other scripts: `npm run build` (production build to `dist/`), `npm test` (calculation tests,
uses Node's built-in test runner — no extra packages).

The browser uses Supabase's publishable/anon key, which is expected to be visible in a static app.
Database access is protected by row-level security and requires an authenticated session. Keep the
Supabase project settings private, disable public sign-ups, and never put a Supabase secret/service
role key in this frontend.

## Private free hosting with GitHub and Cloudflare Pages

Keep the source repository private. Cloudflare Pages supports private GitHub repositories and
deploys on each push. GitHub Pages on the free plan requires a public repository, so it is not the
recommended option for this private project.

1. Create a private GitHub repository and push the `main` branch.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git** and select
   the repository. Limit the GitHub App installation to this repository.
3. Set the build command to `npm run build`, the output directory to `dist`, and add
   `VITE_SUPABASE_URL` plus `VITE_SUPABASE_ANON_KEY` as build environment variables.
4. In Supabase Authentication settings, turn off public sign-ups and add the Cloudflare Pages URL
   to the allowed site URLs. Create your sign-in user in the dashboard.
5. Before first login, run `supabase/migrate-to-auth.sql` as described above (or `schema.sql` on a
   fresh project). Then sign in and set the starting capital with **Edit base**.

## Project structure

```
supabase/schema.sql          trades table (raw columns only) + access policy
src/
  lib/
    calculations.js          every derived field, as pure functions (ported from the sheet)
    calculations.test.js     tests for the above
    supabaseClient.js        Supabase client from env vars
    tradeMapper.js           DB (snake_case) <-> app (camelCase) <-> form
    validation.js            trade form checks
    format.js                number / date / percent display
  store/useTradeStore.js     Zustand store (raw trades) + useDerivedTrades() hook
  pages/
    Journal.jsx
    Dashboard.jsx
  components/
    TradeForm.jsx
    TradeTable.jsx
    StatCard.jsx
    MonthlyTable.jsx
```

## How the numbers work

The formulas in `calculations.js` follow `trading-journal-build-spec.md` exactly, including the
original sheet's quirks. Things worth knowing:

- **Running capital** starts with the account's private starting-capital setting, then adds capital
  adjustments and realized trade P/L in entry order (`created_at`). Open P/L stays unrealized until
  close.
  ROCE, risk on capital and allocation all divide by this figure. With a starting capital of 0 and
  no adjustments, those columns show `—` (the sheet would show `#DIV/0!`).
- **Blank cells count as 0** in arithmetic, as in Excel.
- **Trade status** returns `'Closed'`, or a *number* (the open position's value) for open trades.
  The journal shows that number as "Open" with the value underneath.
- **Open shorts show "Closed\*"** — the sheet's status formula only checks whether there's a sell
  date, and a short always has one. So an uncovered short is reported as Closed and is counted in
  the dashboard's closed-trade stats. This is ported as-is so the numbers match the sheet; the row
  is still styled as open and marked with `*`.
- **Open P/L** — open trades' P/L is marked to the saved LTP, less estimated closing brokerage. The initial stop remains the risk reference.
- **Percentages** — ROI, ROCE and risk on capital are fractions shown as %, like Excel.
  Allocation is already × 100 in the spec.
- **Expectancy** — when there are no winners (or no losers), the missing average is treated as 0.
  The sheet shows `#DIV/0!` there; the result is otherwise identical.
- **Profit factor** — shows `—` when there are no wins or no losses.
- **Open exposure** — not captured from the sheet, so defined as: value of open positions ÷ latest
  running capital.
- **Monthly table** — closed trades grouped by the month of their buy date.

## Status

| Milestone | State |
|---|---|
| 1. Scaffold, Supabase client, `trades` table | Done |
| 2. Journal: list (newest first), add/edit form, running capital | Done (plus delete and an open/closed filter) |
| 3. Calculation layer as pure functions | Done, with tests |
| 4. Dashboard: 11 stat cards + monthly table | Done (plus a monthly P/L chart) |
| 5. Polish: open/closed styling, responsive, validation | Done |
| Original Allocation / Original Risk (pyramiding) | Deferred, as planned for v1 |

**Before calling v1 done:** enter a few trades from the original Excel tracker and check the
Journal and Dashboard numbers against the sheet — that comparison needs your real data.
