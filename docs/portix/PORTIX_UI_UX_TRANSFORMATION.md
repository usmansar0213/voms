# PORTIX — UI/UX Transformation

Goal: rebrand VOMS as **PORTIX — Port Intelligence & Executive Management System** ("One Port. One Intelligence. Better Decisions."). The interface moves from operational transactions to executive decisions, following the flow **DATA → PERFORMANCE → INSIGHT → DECISION → ACTION → OUTCOME**, and reuses the existing React component base.

---

## 1. Brand system

| Element | Current (VOMS) | PORTIX proposal | Files affected |
|---|---|---|---|
| Name | VOMS — Vessel Operations Monitoring System | **PORTIX** — Port Intelligence & Executive Management System | `index.html`, `app-sidebar.tsx`, `login.tsx`, `page-shell.tsx` (banner), `README.md`, `call-report.tsx` |
| Tagline | "Smarter Data. Safer Operations…" | **One Port. One Intelligence. Better Decisions.** / sub-line: *From Port Operations to Strategic Intelligence* | `login.tsx` hero |
| Mark | Ship over waves (`components/voms-mark.tsx`), ship icon in sidebar | New wordmark "PORTIX", with an "X" formed by crossing quay-crane booms or route lines. Delivered as SVG; keep the ship-and-waves mark as a secondary icon | `voms-mark.tsx` → `portix-mark.tsx`, `public/favicon.svg` |
| Colour | Navy rail `#1b2638`, primary blue `#2a78d6`, status palette | Keep navy and blue; add **teal accent** (proposed `#0f9fa8` / dark `#2bb8c0`, to be validated with the palette validator for contrast) for brand highlights only. **Data-viz colours stay on the validated categorical palette** (`theme.css --series-*`). | `src/styles/theme.css` |
| Typography | Inter; scale 12/14/16/20–24 (tightened in `1e9378d`) | Keep Inter and the current scale; use tabular numerals for all KPI values (already in place); headline weight 700 | — |
| Hero image | Subic Bay photo (text removed), `public/images/subic-bay-hero*.jpg` | Reuse; swap copy to the PORTIX positioning. Per-port hero configurable later (multi-port). | `login.tsx` |
| Demo labelling | Banner, "DEMO DATA" pill, "Simulated AI" badge | Keep all three; add "Illustrative target" badges on every target value | `common.tsx`, `page-shell.tsx` |

---

## 2. Personas (management-first)

| PORTIX persona | Primary question | Maps from current role × perspective |
|---|---|---|
| Port Authority Executive (Administrator / Deputy) | "Is the port meeting its targets, and what are we doing about it?" | `management` × management |
| Port Operations Manager (Port Authority) | "Where are the bottlenecks this week?" | `port_control` / `harbor_master` × management |
| Terminal Manager (single terminal or group) | "How does my terminal compare, and which actions are on me?" | `terminal_operator` × management (single / multi scope) |
| Data Steward / Submission Coordinator | "Is my data complete, valid and on time?" | any role × submission |
| Integration Administrator | "Are all feeds healthy and fresh?" | `admin` × submission |
| Auditor (read-only) | "Who changed what, and on what evidence?" | new |

Shipping agents remain supported for data submission and for their own calls, but they are not a primary PORTIX audience **[ASSUMPTION]**.

---

## 3. Navigation restructure

| # | PORTIX menu | Purpose | Reuses (current route / file) | New work |
|---|---|---|---|---|
| 1 | **Executive Overview** | One-screen port status vs targets, top risks, actions due | `/` → `pages/dashboard.tsx` (ManagementHome) | KPI-vs-target tiles, period selector, actions widget, executive summary |
| 2 | **Port Performance** | Trends, actual vs target, variance, drill-down | `/reports` → `pages/reports.tsx`, `charts.tsx` | Trend-with-target chart, variance waterfall, drill-down |
| 3 | **Vessel Intelligence** | Turnaround, waiting, delays, ETA reliability; vessel-call drill-down | `/vessel-calls`, `call-detail.tsx`, `/berths`, `call-report.tsx` | Delay Pareto, queue chart, analytics tab; events read-only with source badges |
| 4 | **Terminal Intelligence** | Benchmarking, throughput, productivity | `/cargo` → `pages/cargo.tsx`, `trend-charts.tsx` | Benchmark table and small multiples, confidentiality masking |
| 5 | **Strategic KPIs** | KPI registry, definitions, targets, achievement | — | **New** module |
| 6 | **Alerts & Risks** | Threshold breaches, data-quality and safety alerts, escalation | `/alerts`, `alerts-panel.tsx`, `/incidents` | KPI-breach alerts, escalation, "create action" |
| 7 | **Management Actions** | Issue → action → owner → due → status → outcome | — | **New** module (list, board, detail, outcome review) |
| 8 | **AI Intelligence** | Executive summary, Q&A, explanations | `/ask`, `ai-panel.tsx`, `ai.ts` | Facts / Interpretation / Proposed action layout; executive summary |
| 9 | **Data Integration** | Sources, submissions, API monitor, data quality | `/submissions*`, `/api-monitor`, `submission-*.tsx` | Source registry, data-quality scorecard, lineage view |
| 10 | **Administration** | Users, roles, scopes, KPI targets approval, ports | `/access`, `config-drawer.tsx` | User and scope admin (P2), target approval |
| — | Demo Guide | Presenter scripts | `/guide` | Rewrite for PORTIX scenarios |

The current Submission/Management **perspective switch** stays. In the Submission perspective the navigation collapses to Data Integration, My Submissions, Alerts (data) and Vessel Calls (read-only).

---

## 4. Key screens

### 4.1 Executive Overview (desktop, 1440 px)
```
┌ Header: PORTIX · period [This month ▾] [vs last month ▾] · scope [Port-wide ▾] ┐
│ KPI achievement row (6): Vessel calls · Throughput (by unit) · Turnaround ·   │
│   Waiting time · Berth utilisation · Safety incidents                         │
│   each: value · target · variance ▲▼ · sparkline · status pill               │
├───────────────────────────────┬───────────────────────────────────────────────┤
│ Performance trend (12 months, │ Top risks & alerts (5)                        │
│ actual vs target band)        │ Actions due / overdue (5)  [View tracker]     │
├───────────────────────────────┼───────────────────────────────────────────────┤
│ Terminal benchmark (A · B · C)│ AI executive summary                          │
│ normalised indicators         │ Facts · Interpretation · Proposed actions     │
└───────────────────────────────┴───────────────────────────────────────────────┘
```
Mobile: KPI row in 2 columns → risks → actions → summary; charts collapse to one per screen.

### 4.2 KPI detail (drill-down)
Definition card (formula, unit, owner, sources, version) → trend vs target → breakdown by terminal and berth → contributing vessel calls (table) → related alerts and actions.

### 4.3 Management Action Tracker
- **List and board views:** Proposed · Approved · In progress · Blocked · Done; filters for owner, terminal, KPI, priority and overdue.
- **Action detail:**
  - The issue, with linked alert and KPI evidence.
  - Recommended action, with its source (manual, AI-suggested or rule).
  - Owner, due date and priority.
  - Follow-up log.
  - Outcome assessment: the baseline vs current KPI, computed automatically.
  - Closure note, with approval.
- **Creating actions:** from an alert, a KPI page or an AI insight, using a pre-filled dialog based on the existing `components/dialogs.tsx` pattern.

### 4.4 Terminal Intelligence
Benchmark table (rows = terminals, columns = normalised KPIs, cells coloured by status, with rank) plus small-multiple trends (≤ 3 terminals per chart, following the palette rules). A terminal manager sees their own row named and peers shown as "Port average" or anonymised.

### 4.5 AI Intelligence
Three-part answer card for every insight and answer: **Verified facts** (with citations to metrics and records) · **Interpretation** (labelled as inferred) · **Proposed actions** (each with a "Create action" button). It keeps the "Simulated AI · rule-based" badge until P4.

---

## 5. Component reuse inventory

| Component | Status | Change |
|---|---|---|
| `components/layout/*` (sidebar, header, page shell, bottom nav) | Retain | Rebrand; new nav data |
| `components/ui/*` | Retain | — |
| `StatTile` (`common.tsx`) | Refactor | Add `target`, `variance`, `sparkline`, `status` props → **KpiTile** |
| `ProgressBar`, `ToneBadge`, `PageHeader`, `KeyValues`, `EmptyState` | Retain | — |
| `charts.tsx` (Turnaround, BerthUtilization), `trend-charts.tsx` | Refactor | Generalise into `TrendChart` (with target band), `BenchmarkBars`, `SmallMultiples` |
| `alerts-panel.tsx` | Refactor | Add escalation level, "Create action" |
| `ai-panel.tsx` | Refactor | Three-part insight layout |
| `connector-strip.tsx`, `api-monitor.tsx`, `submissions*.tsx` | Retain → move under Data Integration | — |
| `vessel-art.tsx`, `berth-tile.tsx` | Retain | — |
| `dialogs.tsx` (Record event, Assign berth, Production) | Refactor | Restricted to the manual-fallback flow, behind a "Source not integrated" notice |
| `login.tsx` | Refactor | PORTIX copy and personas; production SSO button placeholder |

---

## 6. UX principles for PORTIX
1. **Answer first, detail on demand.** Every executive tile shows status vs target; drill-down for detail.
2. **Show provenance.** Every number can show its period, source(s), freshness and completeness on hover or tap.
3. **One click from insight to action.**
4. **Honest labelling.** Synthetic data, illustrative targets and simulated AI are always visibly marked.
5. **Mobile parity for decisions.** Reviewing alerts, approving actions and reading the executive summary must work on a phone (375 px). This is already verified for the current screens.
6. **Accessibility.** WCAG 2.2 AA; status never shown by colour alone (already applied: berth dots carry labels, severity pills carry text).
