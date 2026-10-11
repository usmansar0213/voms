# PORTIX — Functional Gap Analysis (VOMS → PORTIX)

Baseline: commit `1e9378d` (see `PORTIX_REPOSITORY_AUDIT.md`). File paths are relative to `src/features/voms/` unless stated otherwise.

**Complexity** — S (≤ 1 week), M (1–3 weeks), L (3–8 weeks), XL (> 8 weeks), for one experienced full-stack engineer. These are indicative only (see the Roadmap for assumptions).

**Priority** — P0 rebrand, P1 management demo, P2 intelligence foundation, P3 integration pilot, P4 AI.

**Requirement status:**
- **V** — Validated by an existing source (BRD v0.1, PDD v0.1 or the PORTIX master brief).
- **A** — Assumption that needs SBMA or product-owner confirmation.

---

## 0. Strategic gap: from operational recorder to intelligence layer

VOMS — following the BRD and PDD — lets SBMA users **record** operational events: Port Control records ATA, All Fast and ATD; the Harbor Master assigns berths; terminal coordinators key in production (`store.ts#recordEvent`, `assignBerth`, `addProduction`).

PORTIX positions TOS, VTMS and PMIS as the **systems of record**, with PORTIX as Level 3 intelligence above them.

**Consequence.** The operational transaction screens must be re-scoped:
- They become drill-down views of **ingested** data, each value carrying source attribution.
- Manual entry remains only as a governed **fallback**, used when a source has no integration, and it is labelled and reconciled.

This is the single most important functional change. It also implies a **BRD change request** (BRD 1.7.2), because BRD Sections 10, 11 and 15 currently describe VOMS-recorded events. — **V** (PORTIX brief §1) / **A** (SBMA acceptance)

---

## 1. Domain-by-domain gaps

### 1.1 Executive Intelligence — unified port-wide executive dashboard
| Attribute | Assessment |
|---|---|
| Existing | `pages/dashboard.tsx` (Management perspective): KPI tiles, cargo progress, attention list, berth status, AI insights, 14-day trends, turnaround, berth occupancy. Operational in tone; current-state only. |
| Required modification | Re-centre on the executive questions — **how is the port performing against target, where, why, and what are we doing about it**. Add period selector (MTD/QTD/YTD, comparisons), KPI achievement vs target, terminal benchmark strip, top risks, open management actions, and an executive summary. |
| Reusable | `StatTile`, `PageHeader`, `ProgressBar`, `AttentionList`, `InsightCards`, `DiscussionBox`, `TrendGrid`, `ConnectorStrip`, page shell |
| New | Period/filter bar, KPI-achievement tiles (actual / target / variance / trend), benchmark mini-chart, "Actions due" widget, executive-summary card |
| Dependencies | KPI registry and targets (1.5), 12–24-month synthetic history, Management Actions (1.7) |
| Complexity / Priority | M / **P1** |
| Risks | Overloading the page; KPI targets look authoritative even though they are invented → every target must be labelled "illustrative target". |
| Acceptance | One screen answers the four executive questions; every figure shows its period and source; works at 375 px; all targets labelled. |
| Status | V (brief §4.1); KPI list and targets **A** |

### 1.2 Port Performance — throughput, turnaround, productivity, utilization
| Attribute | Assessment |
|---|---|
| Existing | `pages/reports.tsx` (6 tiles, two charts, per-call table, CSV export); `calc.ts#turnaround`, `berthOccupancyHours`, `productivity`; `components/charts.tsx` |
| Required modification | Time-series by month/week, actual vs target, variance decomposition (waiting vs berth vs departure), bottleneck view, drill-down Port → Terminal → Berth → Vessel Call. |
| Reusable | All of `calc.ts` (moved into the KPI engine), `TurnaroundChart`, `BerthUtilizationChart`, `downloadCsv` |
| New | Line/area trend chart with target band, variance waterfall, drill-down breadcrumbs, KPI detail page |
| Dependencies | KPI engine (P2 logic, mocked in P1), historical dataset |
| Complexity / Priority | M / **P1** |
| Risks | KPI formula disputes (for example, whether turnaround is measured ATA→ATD or pilot-on→pilot-off) → definitions must be versioned and displayed. |
| Acceptance | Each KPI shows formula, unit, target, owner and data sources; drill-down reaches the underlying vessel calls; numbers reconcile between levels. |
| Status | V (BRD §4, §16); formulas **A** (BRD 4.5 marks baselines TBC) |

### 1.3 Terminal Benchmarking — cross-terminal comparison
| Attribute | Assessment |
|---|---|
| Existing | Per-unit trends (`trend-charts.tsx`); multi-terminal scope persona (`org.ts#scopeOptions` "multi") |
| Required modification | Side-by-side comparison of terminals on **comparable, normalised** metrics: berth productivity per hour, turnaround per call, waiting time, utilisation, data timeliness. Never add TEU to MT. |
| Reusable | Scope model, `UnitTrend`, colour palette (≤ 3 terminals validated all-pairs) |
| New | Benchmark table with ranking and variance to port average; small-multiple charts; "confidential" masking when a viewer is not entitled to a peer's data |
| Dependencies | Data-sharing agreements between SBMA and terminal operators; KPI engine |
| Complexity / Priority | M / **P1** (demo), L / P2 (real) |
| Risks | **Commercial confidentiality** — terminal operators may not consent to peers seeing their figures. Default: Port Authority sees all; a terminal sees itself plus an anonymised port average. |
| Acceptance | A terminal manager never sees another terminal's named figures; Port Authority sees the full benchmark. |
| Status | V (brief §3); visibility rules **A** |

### 1.4 Vessel Intelligence — lifecycle and delay analytics
| Attribute | Assessment |
|---|---|
| Existing | `pages/vessel-calls.tsx`, `pages/call-detail.tsx` (lifecycle, events, verification, closure, audit), `calc.ts#etaVariance`, delays per call |
| Required modification | Shift from transaction entry to **analytics**: turnaround distribution, waiting-time trend, delay categories (Pareto), ETA reliability by agent, anchorage queue. Event recording becomes read-only with source badges; manual entry is restricted to the fallback flow. |
| Reusable | Lifecycle stepper, movement timeline, `SourceBadge`, closure checklist logic, integrated report (`call-report.tsx`) |
| New | Delay Pareto, ETA-reliability chart, queue chart, "source / freshness" per event |
| Dependencies | VTMS/PMIS ingestion (P3) for real data; delay taxonomy approved by SBMA |
| Complexity / Priority | M / **P1** (analytics on synthetic data) |
| Risks | Duplicating VTMS real-time traffic control → **no live map, no traffic-control actions**. |
| Acceptance | No PORTIX screen offers navigational or traffic-control actions; every movement event shows its source system. |
| Status | V (brief §4.3) |

### 1.5 Strategic KPIs — definitions, targets, variance, trends
| Attribute | Assessment |
|---|---|
| Existing | **Not available.** KPI names appear only as labels (`calc.ts` comment "KPI-001"); the BRD §4 KPI list (KPI-001…021) exists only in documentation. |
| Required modification | KPI registry: definition, formula, unit, direction (higher/lower is better), owner, frequency, data sources, version. Targets per period and level (port, terminal), with thresholds (green/amber/red). |
| Reusable | BRD Section 4 KPI catalogue (content), `calc.ts` formulas |
| New | KPI registry UI, KPI detail page, target editor (admin, approval-gated), variance computation |
| Dependencies | Canonical data model (P2); product-owner list of 10–15 headline KPIs |
| Complexity / Priority | M (demo, static registry) / **P1**; L (governed, versioned) / P2 |
| Risks | Invented targets mistaken for SBMA commitments. |
| Acceptance | Every KPI tile links to its definition; target changes require a second approver and are audited. |
| Status | V (brief §4.2); KPI set and targets **A** |

### 1.6 Management Alerts — thresholds, exceptions, escalations
| Attribute | Assessment |
|---|---|
| Existing | `types.ts#Alert` (severity, category, owner, ack/resolve), `components/alerts-panel.tsx`, `pages/alerts.tsx`; alerts generated on anomaly, API failure and incident (`store.ts#addAlert`). Seeded thresholds are illustrative. |
| Required modification | Add **KPI-threshold alerts** (target breach, declining trend), escalation levels and time-to-escalate, link alert → management action, alert rules configuration. |
| Reusable | Alert entity, list, acknowledge/resolve flow, scope filtering |
| New | Rule definitions (KPI, threshold, window, severity), escalation policy, "create action from alert" |
| Dependencies | KPI registry (1.5), Management Actions (1.7) |
| Complexity / Priority | M / **P1** |
| Risks | Alert fatigue; rules seen as approved policy → label as "illustrative rule". |
| Acceptance | A KPI breach produces a scoped alert with evidence; one click converts it into an action. |
| Status | V (brief §4.5, PDD §6); thresholds **A** |

### 1.7 Decision Support — insights, recommendations, management actions
| Attribute | Assessment |
|---|---|
| Existing | Insight cards and scripted Q&A (`ai.ts`); **no Management Action entity**. |
| Required modification | Build the **Management Action Tracker**: issue → recommended action → owner → priority → due date → status → follow-ups → outcome assessment (KPI before/after). Link actions to alerts, KPIs, terminals and vessel calls. Distinguish *verified facts / inferred explanations / proposed actions* in every insight. |
| Reusable | `InsightCards` (add three-part structure), dialog pattern (`components/dialogs.tsx`), audit pattern |
| New | Action entity, list/kanban, action detail with follow-up log, "my actions", overdue alerts, outcome review |
| Dependencies | Users and organizations (for owners), KPI history (for outcome measurement) |
| Complexity / Priority | M / **P1** — the key differentiator |
| Risks | Becoming a generic task tool → keep it tied to KPIs and alerts, with an outcome measured against data. |
| Acceptance | An action created from an alert shows the KPI baseline; closing it requires an outcome note, and the KPI delta is displayed. |
| Status | V (brief §4.6) |

### 1.8 Data Integration — TOS, VTMS, PMIS, files, APIs
| Attribute | Assessment |
|---|---|
| Existing | Simulated connectors and API monitor (`pages/api-monitor.tsx`, `seed-pdd.ts`), simulated file pipeline (`submissions.ts`). No network I/O. |
| Required modification | Real ingestion service: connector registry, integration jobs, raw landing, validation, idempotent upsert, reconciliation, freshness SLAs. Each source is connected **directly** (PMIS is not an intermediary for TOS/VTMS). |
| Reusable | Monitor UI, submission review UI, validation/anomaly rules (`submissions.ts#check`), mapping-error concept |
| New | Backend ingestion workers, data contracts, schema registry, credentials vault, reconciliation jobs |
| Dependencies | **SBMA and terminal access agreements**; sample files and API documentation; hosting decision |
| Complexity / Priority | XL / **P3** (one pilot source) |
| Risks | Access may be unavailable or slow to obtain; terminal systems may be vendor-controlled (for example, an ICTSI-operated terminal). **Do not assume public APIs.** |
| Acceptance | Pilot: one source ingested on schedule, with idempotent re-runs, quarantine of invalid records, freshness shown, and KPI recomputed from ingested data. |
| Status | V (brief §6); source inventory **A** |

### 1.9 Data Governance — ownership, lineage, access, audit
| Attribute | Assessment |
|---|---|
| Existing | Per-call audit trail (`VesselCall.audit`), submission history, source badges; ownership tables in BRD §17 (documentation). |
| Required modification | Data-source and data-owner registry; lineage from KPI → metric → records → source/job; tamper-evident audit log; data classification; retention policy. |
| Reusable | Audit display components, source badge |
| New | Lineage view ("where does this number come from?"), classification labels, audit service |
| Dependencies | Backend (P2), SBMA records policy |
| Complexity / Priority | L / **P2** |
| Risks | Retention periods and classification are legal questions → SBMA must decide. |
| Acceptance | Any KPI value can be traced to its source records and jobs; audit entries cannot be modified by the application. |
| Status | V (BRD §17, brief §7); policies **A** |

### 1.10 AI Intelligence — document understanding, anomaly detection, Q&A
| Attribute | Assessment |
|---|---|
| Existing | Rule-based simulation (`ai.ts`, `submissions.ts#extract/check`), clearly labelled; scope-guarded answers. |
| Required modification | P1: keep the simulation but restructure the outputs into *Facts / Interpretation / Proposed action*, and add an executive-summary generator (templated). P4: governed LLM service with retrieval over authorised data only, document extraction service, statistical anomaly detection, forecasting where history permits. |
| Reusable | UI components (`ai-panel.tsx`), scope-guard pattern, anomaly rules as a baseline |
| New | AI gateway (P4), evaluation set, prompt and citation framework, human-review loop |
| Dependencies | Data residency and privacy approval (Philippine Data Privacy Act — **A**), model hosting decision |
| Complexity / Priority | S (P1 restructure) / XL (P4) |
| Risks | Hallucinated figures; cross-tenant leakage; presenting a simulation as real. |
| Acceptance | Every AI statement cites the data it used; no answer includes out-of-scope data (tested); simulated outputs carry a visible label. |
| Status | V (brief §4.7, PDD §7); deployment constraints **A** |

### 1.11 Multi-organization — Port Authority and terminal-level access
| Attribute | Assessment |
|---|---|
| Existing | Organizations, units, perspectives and scopes (`org.ts`); scope selectors (`store.ts`); segregation of duties; all client-side. |
| Required modification | Backend-enforced tenancy (organization ID on every row, row-level security), IdP-derived roles, PORTIX personas (Executive, Port Authority Manager, Terminal Manager, Data Steward / Submission Coordinator, Integration Admin, Auditor). |
| Reusable | Scope concepts, persona UX, permission-matrix page |
| New | Auth service (OIDC/SAML), policy engine, admin screens for users, roles and scopes |
| Dependencies | SBMA identity provider and the terminal operators' identities **(A)** |
| Complexity / Priority | M (demo personas, P1) / L (P2) |
| Risks | UI-only enforcement mistaken for security. |
| Acceptance | API returns 403 for out-of-scope data even when called directly; automated tenancy tests pass. |
| Status | V (brief §7, PDD §2) |

### 1.12 Multi-port Readiness — configurable architecture
| Attribute | Assessment |
|---|---|
| Existing | Single port hard-coded (`org.ts`, `seed.ts`, copy, login hero). |
| Required modification | `Port` and `PortAuthority` entities; per-port configuration (units, berths, KPIs, branding, time zone, currency); tenant-aware routing (`/p/:portCode/...`). |
| Reusable | All presentation components |
| New | Port configuration module, port switcher (for group users) |
| Dependencies | Canonical model (P2) |
| Complexity / Priority | M / **P2** (data model) — UI switcher later |
| Risks | Over-engineering before the first customer → model it now, expose it later. |
| Acceptance | Adding a second (synthetic) port requires configuration only, no code change. |
| Status | V (brief §1 "future market"); timing **A** |

---

## 2. Gap summary

| Domain | Current | Gap size | Priority |
|---|---|---|---|
| Executive Intelligence | Operational dashboard | Medium | P1 |
| Port Performance | Basic KPI page | Medium | P1 |
| Terminal Benchmarking | Trends only | Medium | P1 |
| Vessel Intelligence | Transactional lifecycle | Medium (re-scope) | P1 |
| Strategic KPIs | None | **Large** | P1 (static) / P2 |
| Management Alerts | Partial | Small–Medium | P1 |
| Decision Support / Actions | None | **Large** | P1 |
| Data Integration | Simulated | **Very large** | P3 |
| Data Governance | Display only | Large | P2 |
| AI Intelligence | Simulated | Small (P1) / Very large (P4) | P1 / P4 |
| Multi-organization | Client-side | Large (backend) | P1 demo / P2 |
| Multi-port | None | Medium | P2 |

## 3. Items requiring SBMA / product-owner confirmation
1. Acceptance that PORTIX **does not record** operational movements (TOS/VTMS/PMIS remain systems of record), and the resulting BRD change request.
2. The headline KPI set (10–15) and whether illustrative targets may be shown in demos.
3. Benchmark visibility rules between terminal operators.
4. Inventory of source systems (TOS per terminal, VTMS, PMIS), their owners, and what access is realistic for a pilot.
5. Hosting and data-residency constraints (cloud vs on-premises, Philippine data privacy requirements).
6. Identity provider for SBMA and for external organizations.
7. Whether the public demo URL and repository may remain public under the PORTIX brand.
