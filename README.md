# PORTIX — Port Intelligence & Executive Management System (demo)

**One Port. One Intelligence. Better Decisions.**

PORTIX is a strategic and management intelligence layer for Port Authorities. This repository holds the management demonstration for the Port of Subic Bay (SBMA). It evolved from the VOMS mockup.

> **Demo only.** All vessels, organizations, berths, figures and KPI targets are fictitious; targets are *illustrative* until SBMA approves them. The demo has no connection to SBMA, AIS/VTMS, TOS, PMIS or any government system. AI features are rule-based simulations and are labelled as such.

## Positioning

PORTIX sits **above** the operational systems of record. It does not replace them:

| Level | Systems | Role |
| --- | --- | --- |
| 3 — Strategic & management intelligence | **PORTIX** | Executive dashboards, KPIs vs targets, benchmarking, alerts, management actions, AI insights |
| 2 — Data integration & intelligence | PORTIX platform services (planned) | Ingestion (API, files, manual), validation, reconciliation, lineage, access control |
| 1 — Operational systems of record | TOS (per terminal), VTMS/AIS, PMIS | Remain authoritative |

Movement events on vessel calls are shown as **ingested** (simulated). Manual entry is a labelled fallback for sources that are not yet integrated.

## Modules

| Menu | What it shows |
| --- | --- |
| Executive Overview | KPI achievement vs target, throughput by terminal (own units), trend, top risks, actions, terminal benchmark, executive summary (facts / interpretation / proposed actions) |
| Port Performance | Actual vs target, turnaround decomposition, bottlenecks, vessel-level reports |
| Vessel Intelligence | Delay Pareto, waiting-time trends, current calls, vessel-call drill-down, berths, live operations |
| Terminal Intelligence | Cross-terminal benchmark with confidentiality: terminal managers see their own terminal and the port average only |
| Strategic KPIs | Registry of 9 KPIs (definition, formula, unit, owner, sources, illustrative targets) and KPI detail with 24-month trend |
| Alerts & Risks | KPI-breach, data-quality, API, safety and environmental alerts with escalation; "Create action" |
| Management Actions | Issue → action → owner → due → status → follow-ups → outcome review against the KPI baseline (the owner cannot assess their own outcome) |
| AI Intelligence | Scope-aware Q&A and insights (simulated) |
| Data Integration | Excel/PDF submissions with simulated extraction and approval, API integration monitor, vessel registry |
| Administration | Role × perspective permission matrix, demo guide |

Demo personas: open `#/login?as=<key>` with `port-authority`, `harbor-master`, `ta-manager`, `terminal-group`, `ta-coordinator` or `integration-admin`.

## Run, test, build

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

`npm test` runs the Vitest unit tests for the KPI engine, business rules, permission matrix, scope isolation, submission validation, management-action workflow and executive summary. The build uses relative paths and hash routing, so `dist/` works on any static host. Every push to `main` is deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Documentation

The assessment and transformation proposal are in `docs/portix/`:
- repository audit
- gap analysis
- target architecture
- data model
- UI/UX transformation
- implementation roadmap (P0–P4)

This demo implements **P0 (rebranding)** and **P1 (strategic management demo)**. P2 onwards (backend, real integrations, governed AI) is not built.

## Credits and licences

- UI shell based on [shadcn-admin](https://github.com/satnaing/shadcn-admin) by Sat Naing, MIT licence (see `LICENSE`).
- Other libraries: shadcn/ui, Radix UI, Tailwind CSS, TanStack Router, Recharts, Zustand, date-fns, Sonner (MIT); Lucide icons (ISC).
- Event vocabulary informed by DCSA Port Call / JIT and IALA S-211 concepts (reference only).
