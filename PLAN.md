# RupeeSafe — Implementation Plan

Privacy-first, offline-first expense tracker for India. This document is the source-of-truth implementation plan for the MVP. Product requirements live in [expense-tracker-prd.md](expense-tracker-prd.md). UI/UX direction lives in [DESIGN.md](DESIGN.md). HTML mockups in [design-screens/](design-screens/) are **directional only** — match intent, not pixels.

---

## Decisions (locked)

| Area | Decision |
|---|---|
| Brand | **RupeeSafe** |
| Stack | **Expo SDK (latest stable) + Dev Client + TypeScript (strict) + Expo Router + expo-sqlite** |
| Persistence | `expo-sqlite` as the source of truth; migrations + typed repositories |
| Money | Stored as **integer paise**; formatted via `Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' })` with tabular numerals |
| State | TanStack Query over repositories + Zustand for ephemeral UI state |
| Forms | `react-hook-form` + `zod` (same zod schemas reused at repository boundary) |
| Charts | `victory-native` (or `react-native-svg` primitives) |
| Theme | Light first; dark tokens captured but not wired in v1 |
| Backend | None. No auth. No remote calls anywhere |
| SMS auto-import | **In scope, Android only** via Dev Client + native module; iOS hides the feature |
| Mocks fidelity | Directional only; favor native RN idioms where they diverge |
| Dev Client distribution | **EAS Build** (free tier, QR install) preferred; local `expo run:android` acceptable |

### Out of scope (deferred)

OCR, ML category suggestions, encrypted backup, full dark-mode wiring, iOS-specific polish, cloud sync, multi-device, shared budgets, Account Aggregator integrations.

---

## Architecture

- **Routing.** Expo Router with file-based, typed routes. Bottom tabs: **Home · Transactions · Add (center FAB → modal) · Budgets · More**. Onboarding and App Lock are root-level guards.
- **Persistence.** `expo-sqlite` opened with WAL pragma. Versioned SQL migrations in `src/storage/migrations/`. Repositories wrap raw SQL into typed APIs validated by `zod`. No ORM.
- **Receipts.** Image files under `FileSystem.documentDirectory/receipts/<txnId>/<uuid>.jpg`; metadata rows in DB. Compression via `expo-image-manipulator` (max 1600px, JPEG q=70).
- **Theme.** Single tokens module sourced from `DESIGN.md` frontmatter (colors, typography, radii, spacing). Inter font with `fontVariant: ['tabular-nums']` on money.
- **Security.** `expo-local-authentication` for biometrics; PIN fallback hashed with `expo-crypto` + per-install salt; `expo-secure-store` for the salt and lock prefs; `expo-screen-capture` to hide Android task-switcher preview.
- **Notifications.** `expo-notifications` for local-only bill reminders.
- **SMS Import (Android only).** Dev Client + `react-native-get-sms-android` (or thin custom Expo Module). Pure-TS parser packs for HDFC, SBI, ICICI, Axis, Kotak + UPI providers GPay, PhonePe, Paytm, BHIM. Always lands in a **review queue** — never auto-commits transactions.
- **Export/Backup.** CSV via streamed in-memory builder + `expo-sharing`. JSON backup is a versioned manifest of all tables; restore validates `schema_version` and performs migration if older.
- **Testing.** Jest + `@testing-library/react-native` for hooks/repos. Targeted tests: migrations idempotency, money round-trip, repository CRUD, SMS parsers against fixture corpus.

### Folder structure

```
app/                                 # Expo Router routes only (thin)
  (onboarding)/                      # welcome, defaults, optional lock
  (app)/
    (tabs)/
      home.tsx
      transactions/
        index.tsx
        [id].tsx
      add.tsx                        # center tab → modal
      budgets.tsx
      more.tsx
    recurring/
    reports/
    settings/
    sms-inbox/
  _layout.tsx                        # root guard (onboarding + lock)
  lock.tsx
src/
  components/                        # reusable UI: Button, Card, MoneyText, CategoryChip, ...
  features/
    transactions/{repository,hooks,components,screens}
    budgets/...
    recurring/...
    receipts/...
    reports/...
    sms-import/{parsers,rules,review,service.android.ts,service.ios.ts}
    backup/...
    settings/...
  storage/{db.ts,migrations/,seed.ts}
  services/{notifications.ts,security.ts,fs.ts,export.ts}
  hooks/
  utils/{money.ts,date.ts,id.ts,validation.ts}
  theme/{tokens.ts,typography.ts,ThemeProvider.tsx}
  types/
assets/
```

Routes under `app/` stay thin — they import screen components from `src/features/<area>/screens/`. Business logic stays in repositories/hooks/services.

---

## Data Model (SQLite)

All money columns are **integer paise**. Soft-delete via `deleted_at` where shown. Indices on `transactions(occurred_at)`, `(category_id, occurred_at)`, `(merchant)`.

- `categories` (id, name, icon, color, kind: `expense|income|both`, parent_id?, is_system, sort_order, hidden_at?)
- `transactions` (id, kind: `expense|income`, amount_paise INT, occurred_at, category_id FK, payment_mode: `cash|upi|card|bank_transfer|wallet`, merchant?, notes?, source: `manual|sms|recurring`, recurring_id? FK, sms_ref? FK, created_at, updated_at, deleted_at?)
- `tags` + `transaction_tags` (m:n)
- `budgets` (id, scope: `overall|category`, category_id?, period: `monthly`, amount_paise, rollover BOOL, starts_on)
- `recurring` (id, kind, amount_paise, category_id, payment_mode, cadence: `monthly|weekly|custom`, day_of_month?, next_due, reminder_minutes_before?, paused BOOL, template_meta JSON)
- `recurring_runs` (id, recurring_id, due_on, status: `pending|paid|skipped`, transaction_id?)
- `receipts` (id, transaction_id, file_path, mime, bytes, captured_at)
- `merchant_rules` (id, merchant_pattern, category_id, hits)
- `sms_messages` (id, sender, body, received_at, parsed_status, parser_id?, hash_unique)
- `sms_parsed` (sms_id, amount_paise, kind, payment_mode, merchant?, account_tail?, balance_paise?, confidence, suggested_category_id?, transaction_id?)
- `app_settings` (singleton: month_start_day, currency=`INR`, lock_kind, lock_grace_seconds, theme, sms_import_enabled)
- `backup_manifest` (id, schema_version, created_at, file_path, row_counts JSON)

### Seed data — Indian-defaults categories

Rent, Groceries, Fuel, Recharge, EMI, SIP, Maid Salary, Medicines, Eating Out, Travel, Shopping, Bills, Salary, Refund, Other.

---

## Phases

Each phase ends with an explicit verification step. Phases are sequenced by dependency, not by hours.

### Phase 0 — Scaffold *(blocks all)*
1. Init Expo TS app at repo root; install deps; configure Expo Router + Dev Client.
2. Strict `tsconfig`, ESLint, Prettier, Jest.
3. Theme tokens from `DESIGN.md`; base components: `Screen`, `Button`, `Card`, `Input`, `MoneyText`, `Icon`, `BottomTabs`.
4. Empty bottom-tab shell rendering placeholder screens.

**Verify:** `eas build` (or local `expo run:android`) produces a Dev Client that opens the tab shell. Lint + typecheck clean.

### Phase 1 — Storage + Models *(parallel with Phase 2)*
1. `storage/db.ts` opener + WAL pragma. Migration runner with versioned files.
2. Migration `001_init.sql` with the schema above.
3. Seed module with India-default categories (icons + colors).
4. Repository layer per entity with zod-validated I/O. Pure TS, no React.
5. `utils/money.ts` (rupees↔paise, `formatINR`, `parseINR`).

**Verify:** Jest tests for migrations idempotency, money round-trip, and transactions repository CRUD (create, list-by-month, edit, soft-delete).

### Phase 2 — Onboarding + App Lock *(parallel with Phase 1)*
1. Welcome → privacy explainer → month-start day → optional budget → optional biometric/PIN.
2. `services/security.ts`: PIN hash + salt in SecureStore; biometric gating.
3. Root layout guard: if lock enabled, route to `/lock` until unlocked. Re-lock after configurable grace period on background.
4. Persist onboarding completion in `app_settings`.

**Verify:** Cold start on a fresh install lands in onboarding; with lock on, app re-prompts after backgrounding past grace; PIN and biometric both unlock.

### Phase 3 — Manual Transaction CRUD + Categories *(depends on 0, 1)*
1. Add Expense/Income screen: amount keypad, category grid, payment mode chips, date/time, merchant autocomplete from history, notes, tags.
2. Quick-add presets bar (Tea, Auto, Groceries, Recharge, Fuel, Food). Stored as user-editable templates.
3. Transactions list: grouped by day, infinite scroll, fast filter chips (this month, mode, category), search bar (LIKE on merchant/notes; FTS5 deferred).
4. Transaction details + edit + safe delete (confirm + undo toast).
5. Categories management screen: create / edit / reorder / hide / **merge** (re-points transactions inside a single SQL transaction).

**Verify:** End-to-end: log an expense, see it on Home + list, edit category, delete with undo. 1k synthetic rows still scrolls smoothly.

### Phase 4 — Home Dashboard + Reports *(depends on 3)*
1. Home: month total, remaining budget bar, top categories, recent 5, recurring-due card, quick-add FAB.
2. Reports: last-6-months bars, donut by category, income vs expense, top merchants. All via SQL aggregates.
3. Empty / loading / error states for every panel.

**Verify:** Numbers reconcile against raw repository sums; switching months recomputes correctly; with zero data, panels show empty states.

### Phase 5 — Budgets *(depends on 3)*
1. Overall + per-category monthly budgets, optional rollover.
2. Progress bars, near-limit (≥80%) warning, overspend (≥100%) alert tone.
3. Month-close summary modal on first open of a new month.

**Verify:** Setting a ₹10,000 budget and logging ₹8,000 shows warning; ₹12,000 shows over; rollover carries delta to next month.

### Phase 6 — Recurring + Reminders *(depends on 3)*
1. CRUD recurring templates with cadence + next-due.
2. On-foreground sweep that materializes due `recurring_runs`; user marks paid (creates a transaction) or skips.
3. `expo-notifications` schedules local reminders at configured offset.

**Verify:** A recurring item due today shows on Home; "Mark paid" creates a linked transaction; reminder fires at scheduled time on device.

### Phase 7 — Receipts *(depends on 3)*
1. Camera + gallery via `expo-image-picker`; compress with `expo-image-manipulator`.
2. Store under `documentDirectory/receipts/<txnId>/<uuid>.jpg`; metadata in `receipts`.
3. Viewer with zoom; multi-attach per transaction; storage usage indicator in Settings.

**Verify:** Attach photo → reopen transaction → preview loads from disk; deleting transaction cascades file cleanup.

### Phase 8 — SMS Import (Android only) *(parallel with 6/7 after 3)*
1. Pure-TS parser packs: bank debit (HDFC/SBI/ICICI/Axis/Kotak), UPI (GPay/PhonePe/Paytm/BHIM), credit-card swipes, ATM withdrawal. Each rule extracts `{amount, kind, mode, merchant?, account_tail?}`.
2. `service.android.ts` (native SMS module under permission grant) + `service.ios.ts` (no-op + UI hidden).
3. Permission onboarding screen with explicit privacy copy: "SMS read on-device only, never uploaded."
4. Foreground-safe import: dedupe via SHA-256 of `(sender|body|received_at)`.
5. Review inbox screen: pending parsed SMS → user accepts (creates transaction with suggested category from `merchant_rules`), edits, or rejects. Rejections train a local ignore list.

**Verify:** Fixture dataset of 30 real-style Indian bank/UPI SMS — parsers extract correct amounts/modes for ≥90%; review flow promotes to transactions with no duplicates across re-imports; iOS build hides the feature.

### Phase 9 — Search, Filters, Export, Backup *(depends on 3)*
1. Advanced filters sheet: date range, amount range, modes, categories, tags, source.
2. CSV export (filtered or full) via streamed string builder + `expo-sharing`. Numbers exported as plain numerics, not formatted strings.
3. JSON backup: versioned manifest of all tables; restore validates `schema_version`, migrates if older, atomic swap with confirmation.

**Verify:** CSV opens cleanly in Sheets/Excel; backup → wipe DB → restore → row counts match original.

### Phase 10 — Polish + Sample Data + QA Pass
1. Dev-mode "Load realistic Indian sample data" toggle in Settings (200 transactions across 6 months).
2. Empty / loading / validation states audit across all screens.
3. Accessibility pass: hit-target ≥48dp, labels, dynamic type sanity at 130%.
4. Performance pass: list virtualization, memoized selectors, query-cache tuning.
5. Privacy explainer screen + Settings → "Delete all data" with double confirm.
6. Final lint/typecheck/test run.

**Verify:** Full manual run-through of every IA path with sample data; cold-start to interactive < 1.5s on a mid-range Android.

---

## Top-level files of work

- `app.json` / `app.config.ts` — Expo config, Android permissions (`READ_SMS`, `RECEIVE_SMS`, `USE_BIOMETRIC`, notifications), config plugins.
- `src/storage/db.ts`, `src/storage/migrations/001_init.sql`, `src/storage/seed.ts`.
- `src/theme/tokens.ts` — single source of truth from `DESIGN.md`.
- `src/features/transactions/repository.ts` — central CRUD + queries powering Home/Reports/Budgets.
- `src/features/sms-import/parsers/*.ts` + `service.android.ts` — Android only.
- `src/services/security.ts`, `src/services/notifications.ts`, `src/services/export.ts`.
- `app/_layout.tsx` — onboarding + lock guards.
- `app/(app)/(tabs)/_layout.tsx` — bottom tabs.

---

## Open considerations

1. **Dev Client distribution.** EAS Build (free tier) is the path of least friction. Local `expo run:android` works if Android SDK is configured.
2. **SMS native module.** Start with the community `react-native-get-sms-android` behind a thin Expo config plugin. Replace with a custom Expo Module via Expo Modules API only if required.
3. **Search.** v1 uses `LIKE` over merchant/notes. SQLite **FTS5** virtual table + triggers is scheduled for product Phase 2.
