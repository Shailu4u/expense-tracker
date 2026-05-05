# PRD: Client-Side-Only Expense Tracker Mobile App for India

## Title
RuppeSafe: A Privacy-First, Offline-First Expense Tracker for Indian Users

## Overview

This product is a mobile expense tracker designed for Indian users that runs entirely on the client side, with all user data stored locally on the device rather than on a backend server. The app is intended to help users track expenses across cash, UPI, cards, and bank transfers while preserving privacy, reducing infrastructure complexity, and supporting offline usage from day one.

The product should be built as an offline-first mobile application with local persistence as the source of truth, making it suitable for single-user, single-device use cases in its first release. The initial version should prioritize simplicity, reliability, and a strong India-specific experience over features that depend on backend infrastructure such as shared budgets across multiple users or multi-device sync.

## Problem Statement

Indian users often spend money through multiple payment methods including cash, UPI, cards, and bank transfers, which makes personal expense tracking fragmented and hard to maintain consistently. Many users also want privacy and may prefer not to upload sensitive financial data to cloud services, especially for a personal budgeting tool.

Most existing expense tools either rely heavily on online syncing and server-managed features or require too much manual effort without offering a smooth local-first experience. There is room for a focused app that works well without internet, stores data on-device, and solves the core problem of daily money tracking for an Indian individual user.

## Product Vision

Build a privacy-first, offline-first mobile expense tracker for India that helps a single user record, organize, analyze, and improve personal spending habits without requiring a backend. The app should feel fast, trustworthy, and practical, with low-friction entry, strong local analytics, and simple exports for backup and further analysis.

## Goals

- Enable users to track expenses and income fully offline with all essential records stored locally on the device.
- Support Indian spending behavior with payment modes such as cash, UPI, cards, and bank transfer.
- Reduce logging friction through quick-add flows, templates, smart defaults, and optional receipt attachment.
- Provide meaningful insights through budgets, recurring expense tracking, monthly summaries, and category analytics.
- Preserve privacy by keeping data on-device and avoiding mandatory server sync or cloud dependency.

## Non-Goals

- Multi-user shared budgets in v1, because these require synchronization and shared state management beyond a purely client-side architecture.
- Cross-device sync in v1, because a client-side-only app cannot guarantee consistency or recovery across devices without backend support.
- Real-time bank aggregation or Account Aggregator integration in v1, because regulated financial connectivity and consent lifecycle management are more practical with server-backed systems.
- Server-driven push campaigns, remote analytics pipelines, or centralized fraud monitoring.

## Target Users

### Primary user

A salaried or self-employed Indian individual who wants to track daily spending, monitor monthly budgets, and maintain control over finances on a single personal smartphone.

### Secondary users

- Privacy-conscious users who prefer local storage over cloud syncing for financial data.
- Students and young professionals managing mixed payment methods including cash and UPI.
- Freelancers or side-hustlers who need personal expense logging with receipt capture and category tagging.

## Core User Stories

- As a user, I want to quickly add an expense in a few taps so that I can maintain tracking consistently.
- As a user, I want to see a clear dashboard of my current month’s spending and remaining budget so that I can understand my financial health at a glance.
- As a user, I want to track expenses across cash, UPI, cards, and bank transfers automatically by scanning SMS or bank notifications so that I can have a complete picture of my spending.
- As a user, I want to set up recurring expenses and receive reminders so that I don’t forget important bills.
- As a user, I want to classify transactions by category and payment mode so that I can understand my spending patterns.
- As a user, I want the app to work without internet so that I can log expenses anytime.
- As a user, I want to set monthly budgets and receive warnings when I overspend so that I can control expenses better.
- As a user, I want to attach a receipt image to a transaction so that I can preserve proof of purchase or reimbursement records.
- As a user, I want to export my data so that I can keep backups or analyze it elsewhere.
- As a user, I want biometric or app-lock protection so that my financial data remains private on my device.

## Platform Scope

The first version should support Android first, because the India market is strongly Android-led and Android also aligns well with permission-based local device workflows such as file export and receipt capture. iOS can follow after validating retention and core usage patterns.

The app can be built using React Native, Flutter, or native Android, but the architecture should remain client-side-first with a local database and no mandatory backend dependencies.

## Feature Requirements

### 1. Onboarding and setup

The app should allow a user to start quickly without mandatory account creation, since there is no backend requirement in the first release. The setup flow should include currency default as INR, month-start preference, expense categories, and optional passcode or biometric setup.

Requirements:
- Welcome screen with privacy-first positioning.
- Choose default currency as INR, with optional future multi-currency support hidden for v1.
- Preloaded India-focused categories such as rent, groceries, fuel, recharge, EMI, SIP, maid salary, medicines, eating out, travel, shopping, and bills.
- Optional budget setup during onboarding.
- Optional app lock activation.

### 2. Transaction capture

The app should support extremely fast manual logging because manual entry is the primary capture method in a client-side-only architecture. Expense entry should support payment mode, amount, date, category, merchant, notes, and tags.

Requirements:
- Add expense and add income flows.
- Quick-add presets for common spends like tea, auto, groceries, recharge, fuel, and food delivery.
- Payment modes: cash, UPI, card, bank transfer, wallet.
- Recent merchant suggestions and repeat entry shortcuts.
- Editable date and time for backdated logging.
- Support for notes and custom tags.

### 3. Categories and rules

Users should be able to organize data in a way that feels locally relevant and easy to maintain. The app should include both system categories and user-defined categories, along with simple local rules to remember preferred mappings.

Requirements:
- Default category set optimized for India.
- Create, edit, reorder, hide, and merge categories.
- Local merchant-to-category memory on device.
- Icon and color choice per category.

### 4. Dashboard and insights

The home screen should summarize what matters most: current month spend, remaining budget, top categories, recent transactions, and simple trend visibility. Because the app runs locally, all analytics should be generated on-device from the user’s own records.

Requirements:
- This month total spend.
- Category-wise breakdown.
- Daily/weekly/monthly trend charts.
- Income vs expense summary.
- Budget remaining indicator.
- Top merchants and recurring categories.

### 5. Budgeting

Budgeting should be one of the app’s central value propositions because it works well offline and directly improves usefulness beyond simple logging. Users should be able to define total monthly budgets as well as category-level budgets.

Requirements:
- Overall monthly budget.
- Category budgets.
- Overspend alerts and near-limit warnings.
- Optional rollover budgets for next month.
- Progress bars and simple month-close summary.

### 6. Recurring transactions and bill reminders

Many users have predictable recurring expenses such as rent, EMI, subscriptions, SIPs, recharge, and utility bills, so the app should support recurring entries locally. This creates habit value even without account integrations.

Requirements:
- Create recurring expense/income templates.
- Reminder notifications for bills and due dates.
- Mark bill as paid or skip for this cycle.
- Detect possible recurring patterns based on past entries using on-device heuristics.

### 7. Receipt capture

Receipt capture is useful even in a local-only app, especially for reimbursements, tax prep, and record-keeping. The first version can store receipt images locally and later add OCR as an optional enhancement.

Requirements:
- Attach photo from camera or gallery.
- Store and preview receipt locally.
- Link one or more images to a transaction.
- Future-ready placeholder for OCR extraction.

### 8. Search and filters

Users should be able to find transactions quickly by merchant, note, tag, date range, amount range, payment type, and category. Search is essential because local-first apps rely on good retrieval rather than cloud intelligence.

Requirements:
- Free-text search.
- Filter by date, category, payment mode, amount, and tag.
- Sort by latest, highest, lowest, and category.

### 9. Reports and export

A client-side-only app must provide strong export and backup options because there is no automatic cloud recovery. Export should be simple, visible, and trustworthy.

Requirements:
- CSV export for transactions.
- Monthly summary export.
- Local file backup and restore.
- Human-readable PDF summary as a later enhancement.

### 10. Security and privacy

Security and privacy must be product-level differentiators because the app stores financial data locally. Users should clearly understand that their data stays on the device unless they choose to export it.

Requirements:
- App passcode or biometric lock.
- Hide sensitive values from app switcher preview where platform supports it.
- Data deletion controls.
- Clear privacy explainer in onboarding and settings.
- Optional encrypted local backup in later versions.

## Differentiators

The app should differentiate not through bank sync in the first version, but through excellence in privacy, India fit, and offline usability.

### Differentiation themes

- **Privacy-first by default**: all records remain local unless explicitly exported.
- **India-native categories and flows**: UPI-first spending model, local bill types, and familiar category defaults.
- **Single-tap logging**: templates and recent-entry recall for repeated daily expenses.
- **Strong local analytics**: actionable budget and recurring-spend insights generated entirely on-device.
- **Backup transparency**: clear local export and restore path to reduce fear of data loss.

## Functional Requirements Summary

| Area | Requirement | Priority |
|---|---|---|
| Onboarding | No mandatory signup, INR defaults, category presets | P0 |
| Logging | Manual expense and income entry | P0 |
| Storage | Local database as source of truth | P0 |
| Budgets | Monthly and category budgets | P0 |
| Analytics | Dashboard, category breakdown, monthly summaries | P0 |
| Security | App lock / biometric | P0 |
| Search | Search and filter transactions | P1 |
| Recurring | Recurring transactions and reminders | P1 |
| Receipts | Photo attachment to transactions | P1 |
| Export | CSV export and local backup | P1 |
| OCR | Receipt OCR | P2 |
| Smart rules | Local merchant mapping suggestions | P2 |

## Non-Functional Requirements

- The app should open quickly and remain responsive even with several thousand local transactions stored on device.
- Data should be persisted reliably using a structured local database rather than only simple key-value storage.
- Core functionality should work fully offline after install.
- Data loss risk should be minimized through explicit export and restore workflows.
- The app should handle low-end Android devices gracefully with careful image and database usage.

## Suggested Technical Architecture

A local-first architecture is the right fit for this product, where the mobile UI reads and writes to an on-device database and all analytics are computed locally. SQLite or a structured local persistence layer is preferable because expense tracking data is relational enough to benefit from indexed queries, filtering, and report generation.

### Suggested layers

- UI layer for entry, dashboards, and settings.
- Local database for transactions, categories, budgets, reminders, receipts metadata, and rules.
- Device file storage for receipt images and export files.
- Local notification layer for bill reminders.
- Optional future sync adapter, designed but not implemented in v1.

## Screens

- Welcome / onboarding
- Home dashboard
- Add transaction
- Transaction list
- Transaction details / edit
- Budgets
- Categories
- Recurring expenses / bills
- Reports
- Export / backup
- Settings / privacy / security

## Success Metrics

Since the product does not rely on server analytics initially, early success can be evaluated through optional local telemetry summaries surfaced to the user or through beta feedback and exported usage diagnostics if users opt in. Product success should focus on habit formation and perceived usefulness rather than scale metrics in the first phase.

Suggested metrics:
- Number of transactions logged in first 7 days.
- Percentage of users setting at least one budget.
- Percentage of users returning in week 2.
- Percentage of users creating recurring expenses.
- Export/backup usage rate.
- Subjective trust and privacy satisfaction from beta testing.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Device loss can cause data loss | High | Add clear export/backup prompts and periodic reminders. |
| Users may expect sync across devices | Medium | Position product clearly as private and offline-first in v1. |
| Manual logging can reduce retention | High | Invest heavily in quick-add flows, templates, recurring entries, and smart defaults. |
| Receipt images can bloat storage | Medium | Compress images and provide storage usage controls. |
| Future backend migration may be hard if ignored early | Medium | Keep data model and repository layer ready for optional sync later. |

## Roadmap

### MVP

- Android app
- Local database
- Manual expense/income entry
- Track all payment modes: cash, UPI, card, bank transfer etc automatically by scanning SMS or bank notifications.
- Categories
- Dashboard with monthly spend and category breakdown
- Budgets
- Search and filters
- Recurring transactions
- Receipt attachment
- Export and backup
- App lock

### Phase 2

- Receipt OCR.
- Smarter category suggestions.
- Better insight engine for burn rate and monthly patterns.
- Encrypted backup.
- iOS app.

### Phase 3

- Optional cloud sync for users who opt in.
- Shared family budgets and group expenses.
- Optional AA or bank-linked insights where architecture and compliance justify it.

## Product Positioning

The product should be positioned as a private, offline-first Indian expense tracker that works without account signup and keeps financial data on the device. This creates a clear contrast with cloud-heavy finance apps and makes the product especially attractive to users who care about simplicity, privacy, and control.
