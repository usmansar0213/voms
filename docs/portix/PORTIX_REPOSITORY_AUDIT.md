# PORTIX — Repository Audit (VOMS mockup)

| Item | Value |
|---|---|
| Repository | `github.com/usmansar0213/voms` (local: `C:\IPOS\voms-mockup`) |
| Audited commit | `1e9378d` — "Tighten type scale across the app" (branch `main`) |
| Audit date | 11 October 2026 |
| Mode | Read-only audit. No source, dependency, configuration or deployment changes were made. |
| Related inputs | `C:\IPOS\BRD_VOMS_Section_01-19.md` (BRD v0.1, Sections 1–19), `C:\IPOS\VOMS_Project_Design_Document_v0.1.docx` (PDD v0.1) |

Evidence labels used in this document:
- **[CODE]** — verified by reading source in this repository.
- **[RUN]** — verified by executing a command during this engagement (build, type check, browser walkthrough).
- **[ASSUMPTION]** — inference that still needs product-owner or SBMA confirmation.

---

## 1. Executive finding

VOMS is a **front-end-only, simulated management demonstrator**. It has no backend, no API client, no database, no authentication and no automated tests [CODE]. Every visible capability — submissions, AI extraction, API connectors, KPIs, approvals — runs on synthetic data inside the browser and is persisted to `localStorage` [CODE].

The UI layer and the domain logic (event model, KPI calculations, permission matrix, alerting rules) are well structured and largely reusable for a PORTIX **management demonstration**. Very little is reusable as **production** infrastructure, because no production infrastructure exists yet.

---

## 2. Technology stack [CODE]

| Layer | Technology | Installed version | Notes |
|---|---|---|---|
| UI framework | React | 19.3.0 | Function components and hooks only |
| Language | TypeScript | 6.0.3 | `strict`, `noUnusedLocals`; `tsc -b` is part of `npm run build` |
| Build | Vite | 8.3.4 | `base: './'` so the build works under any sub-path (GitHub Pages) |
| Routing | TanStack Router | 1.170.41 | File-based routes; `routeTree.gen.ts` is generated and committed; **hash history** (`createHashHistory`) |
| State | Zustand | 5.0.15 | One global store with the `persist` middleware (`localStorage` key `voms-demo-v2`) |
| Styling | Tailwind CSS | 4.3.3 | Design tokens in `src/styles/theme.css` (light and dark) |
| Components | shadcn/ui on Radix UI | multiple | 22 primitives in `src/components/ui/` |
| Charts | Recharts | 3.10.1 | Bar charts only |
| Icons | lucide-react | 1.54.0 | — |
| Other | date-fns 4, sonner (toasts), cmdk (command palette), react-top-loading-bar | — | — |
| Base template | `satnaing/shadcn-admin` (MIT) | v2.2.1 | Licence retained in `LICENSE` |

Not present: HTTP client, server runtime, ORM or database driver, auth library, i18n, test runner, linter dependencies, error monitoring, analytics.

---

## 3. Repository structure

```
voms-mockup/
├─ .github/workflows/deploy.yml   GitHub Pages: npm ci → npm run build → deploy dist/
├─ public/images/                 subic-bay-hero.jpg (182 KB), subic-bay-hero-960.jpg (67 KB)
├─ eslint.config.js               ORPHANED: imports eslint plugins that are no longer in package.json
├─ index.html                     Google Fonts (Inter, Manrope, Great Vibes) loaded from the network
└─ src/
   ├─ main.tsx                    Router (hash history), theme, font and direction providers
   ├─ routes/                     __root, login, _app/* (15 route files)
   ├─ components/                 template shell: layout/, ui/, search, command-menu, config-drawer
   ├─ context/ hooks/ lib/        template providers and utilities
   └─ features/
      ├─ errors/                  404 / 500 pages (template)
      └─ voms/                    ALL domain code (≈7,900 LOC)
         ├─ types.ts              domain model (VesselCall, Submission, Connector, Alert, DailyStat…)
         ├─ org.ts                organizations, units, perspectives, access scopes
         ├─ roles.ts              6 roles × 2 perspectives permission matrix (`can()`)
         ├─ calc.ts               lifecycle status, KPI and duration calculations, closure checklist
         ├─ submissions.ts        report templates, simulated extraction, validation, anomaly rules
         ├─ ai.ts                 rule-based "AI" insights and scripted Q&A
         ├─ seed.ts, seed-pdd.ts  synthetic master and transactional data
         ├─ store.ts              Zustand store: state + ~35 actions + scope selectors (694 LOC)
         ├─ format.ts, lib-export.ts
         ├─ components/           shared domain UI (dialogs, charts, alerts, AI panel, vessel art…)
         └─ pages/                19 page components
```

Size [RUN, `wc -l`]: `src/features/voms` ≈ 7,897 lines; template shell ≈ 3,989 lines. Largest files: `call-detail.tsx` (713), `store.ts` (694), `dialogs.tsx` (537), `seed.ts` (501).

---

## 4. Application architecture

### 4.1 Runtime model [CODE]
- **Static single-page application.** There are no network calls anywhere: a search for `fetch(`, `axios`, `XMLHttpRequest` and `WebSocket` under `src/` returns nothing.
- **Data source.** `initialData()` in `store.ts` seeds everything relative to "now" from `seed.ts` and `seed-pdd.ts`, and the store persists to `localStorage` via `createJSONStorage`. "Reset demo data" reseeds.
- **Coupling.** 27 `.tsx` files read the store directly through `useVoms()`. There is no repository or service layer between the UI and the data.
- **Dev hook.** `window.__voms` is exposed only when `import.meta.env.DEV`, for automated UI checks, and is excluded from production builds [RUN: grep of `dist/`].

### 4.2 Routing and navigation [CODE]
- Public route `/login`, with `?as=<persona>` for shareable quick-start links.
- Signed-in layout `/_app`, guarded in `components/layout/authenticated-layout.tsx` by checking `session` in the store and redirecting with `<Navigate to='/login'>`.
- Routes: `/` (dashboard, varies by perspective), `/submissions`, `/submissions/$subId`, `/alerts`, `/ask`, `/vessel-calls`, `/vessel-calls/$callId`, `/berths`, `/cargo`, `/incidents`, `/vessels`, `/reports`, `/reports/$callId`, `/api-monitor`, `/access`, `/guide`.
- Navigation data lives in `components/layout/data/sidebar-data.ts`. Items can be limited to one perspective (`only: 'submission' | 'management'`). Phones get a bottom navigation bar (`page-shell.tsx`).

### 4.3 Identity, authorization and scope [CODE]
- **Demo sign-in only** (`pages/login.tsx`). The user picks organization → role → perspective → scope; there is no password and no identity provider. The UI states that this is demo-only.
- **Model.** Six roles (`roles.ts`: port_control, harbor_master, terminal_operator, shipping_agent, management, admin), each with two perspectives (`submission`, `management`). The `matrix` maps 24 actions to `role:perspective` keys.
- **Enforcement.** Enforced twice, both **client-side**: in the UI through `can(actor, action)`, and in store actions through `guard()`. The store also enforces segregation of duties (an approver cannot be the submitter; `approveSubmission`).
- **Scope.** Scope is enforced by selector functions in `store.ts`: `visibleCalls`, `visibleAlerts`, `visibleSubmissions` and `visibleConnectors`. Organization isolation is demonstrated, for example Shipping Agency B sees only its own calls [RUN].
- **Limitation.** All of the above can be bypassed by anyone with browser devtools. That is acceptable for a demo and **not acceptable for production**: PORTIX principle 8 requires backend enforcement.

### 4.4 Build, test and deployment
| Concern | Status | Evidence |
|---|---|---|
| Type check | Passes | [RUN] `npx tsc -b` returned no errors at `1e9378d` |
| Production build | Passes | [RUN] `npm run build` |
| Automated tests | **None** | [CODE] zero `*.test.*` files; no test script |
| Lint | **Broken configuration** | [CODE] `eslint.config.js` imports `@eslint/js`, `@tanstack/eslint-plugin-query`, `eslint-plugin-react-hooks`, which were removed from `package.json` |
| Dependency audit | 0 known vulnerabilities | [RUN] `npm audit` (Oct 2026) |
| CI/CD | GitHub Actions → GitHub Pages on push to `main` | `.github/workflows/deploy.yml`; last deploys successful [RUN] |
| Hosting | Public static site `usmansar0213.github.io/voms/` | Public repository; `noindex` meta tag |
| Secrets | None used | No environment variables or keys |

---

## 5. Functional module status

Classification is evidence-based: a visible screen is **not** treated as a working backend.

| # | Capability | Status | Evidence (files) | Notes |
|---|---|---|---|---|
| 1 | Executive / operational dashboard | **MOCKED / SIMULATED** (UI complete) | `pages/dashboard.tsx`, `components/charts.tsx`, `trend-charts.tsx` | Management dashboard with KPI tiles, cargo progress, attention list, berth status, AI insights, trends, turnaround and occupancy charts. All values are computed from seed data. |
| 2 | Vessel Calls | **IMPLEMENTED (client-side) on simulated data** | `pages/vessel-calls.tsx`, `pages/call-detail.tsx`, `calc.ts` | Full lifecycle ETA→ATA→…→ATD, verification, closure checklist, reopen, audit trail. **Records operational events manually**, which overlaps with VTMS/PMIS (see Gap Analysis). |
| 3 | Berth Board | **IMPLEMENTED (client-side) on simulated data** | `pages/berths.tsx`, `components/berth-tile.tsx`, `calc.ts#berthCompatibility` | 15 placeholder berths, compatibility checks (LOA, draft, type), restriction status. |
| 4 | Cargo monitoring | **IMPLEMENTED (client-side) on simulated data** | `pages/cargo.tsx`, `calc.ts#lineProgress/productivity` | Commodity-specific units (TEU/MT/KL/UNIT), never added across units; gross and net productivity. |
| 5 | Terminal performance | **PARTIALLY IMPLEMENTED** | `components/trend-charts.tsx`, `ai.ts#metricTrend` | Daily per-terminal metric trends exist. No terminal benchmarking, productivity league table or contractual KPIs. |
| 6 | Safety incidents | **IMPLEMENTED (client-side) on simulated data** | `pages/incidents.tsx`, `store.ts#reportIncident/setIncidentStatus` | Corrective actions, close rules, restricted detail for some roles. |
| 7 | KPI monitoring | **PARTIALLY IMPLEMENTED** | `pages/reports.tsx`, `calc.ts#turnaround` | Six KPI tiles and charts. **No KPI definition registry, targets, variance or thresholds.** "KPI-001" exists only as a label. |
| 8 | Role-based dashboards | **IMPLEMENTED (client-side, demo auth)** | `pages/dashboard.tsx`, `pages/submission-home.tsx`, `org.ts`, `roles.ts` | Two dashboards (Submission / Management), scoped by organization and unit. Not backend-enforced. |
| 9 | Document submission | **MOCKED / SIMULATED** | `submissions.ts`, `pages/submissions.tsx`, `pages/submission-detail.tsx` | The upload control reads only the **file name**. Extracted values come from sample templates. Validation, anomaly detection, correction history and approval workflow are real logic running on simulated input. |
| 10 | API integrations | **MOCKED / SIMULATED** | `pages/api-monitor.tsx`, `seed-pdd.ts#seedConnectors`, `store.ts#ingestAis/ingestTos/simulateFailure` | Connector health, retries, mapping errors and failure simulation. No network I/O. |
| 11 | AI functionality | **MOCKED / SIMULATED** (rule-based) | `ai.ts`, `components/ai-panel.tsx` | Deterministic insights and keyword-routed Q&A with scope guard. Labelled "Simulated AI · rule-based". No model calls. |
| 12 | Administrative settings | **PARTIALLY IMPLEMENTED / MOCKED** | `pages/access.tsx`, `components/config-drawer.tsx` | Read-only role matrix, plus UI theme and layout settings. No user, organization, KPI or connector administration. |
| — | Management action tracking | **NOT AVAILABLE** | — | No action, owner, due date or outcome entity. |
| — | KPI targets / strategic KPIs | **NOT AVAILABLE** | — | — |
| — | Multi-port configuration | **NOT AVAILABLE** | `org.ts` hard-codes Subic Bay | — |
| — | Backend, database, real auth | **NOT AVAILABLE** | — | — |

---

## 6. Reusability assessment

| Module / asset | Decision | Files | Justification |
|---|---|---|---|
| App shell (sidebar, header, bottom navigation, theme, command palette) | **RETAIN** (rebrand) | `components/layout/*`, `components/ui/*`, `styles/theme.css`, `context/*` | Generic, responsive, accessible; already navy-themed. Rebrand and restructure navigation only. |
| UI primitives (shadcn/ui) | **RETAIN** | `components/ui/*` | Standard, MIT-licensed. |
| Domain presentation components | **RETAIN / REFACTOR** | `features/voms/components/common.tsx` (StatTile, ToneBadge, ProgressBar, PageHeader), `charts.tsx`, `trend-charts.tsx`, `berth-tile.tsx`, `vessel-art.tsx`, `connector-strip.tsx`, `alerts-panel.tsx` | Presentational, prop-driven, and they already follow the data-viz colour rules. Need generalisation (for example, a multi-series benchmark chart). |
| KPI and lifecycle calculations | **REFACTOR** | `calc.ts` | Correct and pure, but hard-coded per KPI. Move into a KPI engine driven by definitions and targets. |
| Domain types | **REFACTOR** | `types.ts`, `org.ts` | Good starting point. Must become the canonical model (Port, Terminal, KPI Definition/Target, Management Action, Data Source, Integration Job); remove the Subic-only hard-coding. |
| Permission model | **REFACTOR** | `roles.ts`, store `guard()` | The concept (role × perspective × scope, segregation of duties) carries over. Must move to the backend and be re-cut for PORTIX personas. |
| Submission pipeline | **REFACTOR** | `submissions.ts`, `pages/submissions*.tsx`, `submission-detail.tsx` | Validation, anomaly, correction and approval UX carries over. Extraction must call a real document service later (P4). |
| API monitor | **REFACTOR** | `pages/api-monitor.tsx`, `connector-strip.tsx` | The UI is reusable as the Integration Monitor. Data must come from integration-job records. |
| AI layer | **REFACTOR → REPLACE in P4** | `ai.ts`, `ai-panel.tsx` | Keep as the labelled simulation for P1. Replace with a governed LLM service plus retrieval in P4. Keep the UI components. |
| Global store | **REPLACE (progressively)** | `store.ts` | A 694-line monolith mixing data, rules and permissions. Split into a domain service layer behind interfaces, so a mock adapter (demo) and an API adapter (production) can coexist. |
| Seed data | **REPLACE / EXTEND** | `seed.ts`, `seed-pdd.ts` | Only 7 days of history and 15 vessel calls — too thin for executive trends, benchmarking or targets. A generated 12–24-month synthetic dataset is required for P1. |
| Operational transaction screens | **REFACTOR (re-scope)** | `call-detail.tsx`, `dialogs.tsx` (Record event, Assign berth, Production) | PORTIX must not be the system of record for movements or berth allocation. Keep these as read-only drill-downs fed by source systems; keep manual entry only as a governed fallback. |
| Login / demo personas | **REFACTOR** | `pages/login.tsx`, `org.ts#scopeOptions` | Hero and persona UX is reusable; personas must be re-cut for PORTIX. Production needs an IdP (OIDC/SAML). |
| Management action tracker, KPI registry, benchmarking, multi-port config, backend | **BUILD** | — | Not present. |

**Reusability estimate** [ASSUMPTION, based on line counts and the decisions above]:
- **P1 management demo:** about 65–75% of the existing front-end code can be retained or refactored (shell, primitives, presentation components, calculations, submission and monitor UX).
- **Production platform:** about 25–35% (UI layer only), since there is no backend to reuse.

---

## 7. Quality and risk findings

1. **No automated tests** (unit, component or end-to-end). Verification so far has been manual browser walkthroughs and type checks [RUN].
2. **Client-side security only.** Permissions, scope isolation and segregation of duties all live in the browser.
3. **Monolithic store and large page components** (`store.ts`, `call-detail.tsx`). These raise change risk when the data layer is replaced.
4. **Orphaned lint configuration** (`eslint.config.js`).
5. **Persistence versioning.** `persist` has `version: 2` but no `migrate` function; a schema change silently discards or breaks stored demo state.
6. **Shallow history.** Synthetic history covers 7–14 days; executive trend views need months.
7. **Subic-specific hard-coding** in `org.ts`, `seed.ts`, copy and the login hero, which blocks multi-port configurability.
8. **External font dependency** (Google Fonts). The app degrades gracefully offline, but this is a privacy and offline consideration for government deployment.
9. **Public hosting of a demo naming SBMA.** All data is fictitious and labelled, but the product owner should confirm that a public link is acceptable.
10. **Scope overlap with source systems.** Manual recording of ATA, All Fast, berth assignment and production contradicts the PORTIX principle "do not replace TOS/VTMS/PMIS".

---

## 8. What was verified in this engagement

| Check | Result |
|---|---|
| `npx tsc -b` | No errors (commit `1e9378d`) |
| `npm run build` | Success |
| `npm audit` | 0 known vulnerabilities |
| Manual walkthroughs (earlier in this engagement) | PDD scenarios 1–2 executed end-to-end; around 80 page × persona combinations loaded without console errors; 375 px mobile width without horizontal overflow |
| Automated tests | **Not executed — none exist** |
