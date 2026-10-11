# PORTIX — Implementation Roadmap

## Estimation assumptions
- **Effort unit:** effort is given in **person-weeks (pw)** for experienced engineers. These are not calendar commitments.
- **Team for P0–P1:** 1 senior full-stack engineer and 0.5 UX/product. P2 onwards adds backend capacity.
- **Ranges:** estimates assume requirement decisions are available on time. Ranges reflect uncertainty that is **[ASSUMPTION]** until SBMA confirms scope, data access and hosting.
- **Exclusions:** procurement, security accreditation, SBMA approval cycles and terminal-operator negotiations are not included; they often dominate elapsed time for P3.
- **Current baseline:** zero automated tests. Every phase below includes building its own test coverage.

---

## P0 — Rebranding and navigation (front-end only)

| Item | Detail |
|---|---|
| Scope | PORTIX name, mark, favicon, teal accent, banner and login copy; the 10-item navigation; route renames with redirects from old routes; persona list updated; README and Demo Guide copy |
| Reused | Entire current app (shell, pages, store) |
| Development | `portix-mark.tsx`; `sidebar-data.ts` restructure; route aliases; theme token for teal; text changes in `login.tsx`, `page-shell.tsx`, `app-sidebar.tsx`, `call-report.tsx`; fix the orphaned `eslint.config.js` (either reinstall ESLint or remove the file); add Vitest + Testing Library + Playwright scaffolding |
| Dependencies | Product-owner approval of name, palette and repo/URL policy (public vs private) |
| Risks | Brand still "VOMS" in persisted demo state → bump the storage key; broken deep links → keep redirects |
| Deliverables | Rebranded demo at the same URL (or a new repository, if decided); smoke tests |
| Acceptance tests | (1) No "VOMS" string in the UI except the change log; (2) every old route redirects; (3) Playwright smoke test opens every menu item for 3 personas with no console errors; (4) 375 px has no horizontal overflow |
| Effort | **1.5–2.5 pw** |

## P1 — Strategic Management Demo (front-end, simulated data)

| Item | Detail |
|---|---|
| Scope | Executive Overview; Port Performance with KPI detail and drill-down; Terminal Intelligence benchmarking; Strategic KPI registry (static, illustrative targets); Alerts & Risks with KPI-breach rules and escalation; **Management Action Tracker** (create from alert, KPI or insight; follow-ups; outcome); three-part AI insights and executive summary (rule-based); Vessel Intelligence analytics (delay Pareto, waiting trend, ETA reliability); events shown read-only with source badges, and manual entry kept as a labelled fallback |
| Reused | `calc.ts` formulas, `StatTile` → KpiTile, `charts.tsx`, `trend-charts.tsx`, `alerts-panel.tsx`, `ai-panel.tsx`, `dialogs.tsx` pattern, scope model, submissions and API monitor (moved under Data Integration) |
| Development | (a) Introduce the `data/` repository interfaces and wrap the current store as the mock adapter; (b) synthetic history generator covering 18–24 months for 3 terminals, with seasonality and anomalies, and a deterministic seed; (c) KPI registry + calculation module + snapshot cache; (d) new entities in TypeScript: `KpiDefinition`, `KpiTarget`, `ManagementAction`, `ActionUpdate`, `AiInsight`, `Port`; (e) new pages and components (TrendChart with target band, BenchmarkBars, ActionBoard); (f) updated persona scenarios and Demo Guide |
| Dependencies | Product-owner list of headline KPIs (draft from BRD §4 is acceptable); benchmark visibility rule; approval to show illustrative targets |
| Risks | Scope creep into production features; synthetic numbers mistaken for real → mandatory "Illustrative" labels; store refactor regressions → snapshot tests before refactor |
| Deliverables | PORTIX management demo with 5 presenter scenarios: (1) monthly executive review; (2) KPI breach → action → outcome; (3) terminal benchmark with confidentiality; (4) data-quality issue → submission correction; (5) AI executive summary and Q&A |
| Acceptance tests | Unit tests for every KPI formula against hand-calculated fixtures; component tests for KpiTile and ActionBoard; Playwright end-to-end for the 5 scenarios; scope tests (a terminal persona never sees a peer's named data); every target and AI output carries its label; all PORTIX screens usable at 375 px |
| Effort | **6–9 pw** |

## P2 — Intelligence Foundation (backend)

| Item | Detail |
|---|---|
| Scope | Canonical data model in PostgreSQL; backend modular monolith with API; KPI engine and snapshot jobs (shared TypeScript domain package); server-side RBAC and row-level security; append-only audit log; SSO integration; admin screens for users, scopes and KPI targets (four-eyes approval); multi-port-ready schema |
| Reused | Domain types and formulas (moved to a shared `domain/` package); front-end through the API adapter; permission concepts from `roles.ts` |
| Development | Schema and migrations; services; OpenAPI contract; API adapter in the front end; seed loader for the synthetic dataset; observability; CI pipeline with tests and security scanning |
| Dependencies | **[DECISION]** hosting environment and data residency; SBMA IdP details; security review requirements |
| Risks | Hosting approval delays; IdP integration lead time; over-engineering → modular monolith, no microservices |
| Deliverables | Deployed non-production environment running the P1 demo on a real backend with synthetic data; security design document; data dictionary |
| Acceptance tests | API tenancy tests (cross-organization requests return 403); row-level security tests at database level; KPI snapshot equals the P1 reference values for the same dataset; audit entries are immutable; load test at the target scale (Architecture §6) |
| Effort | **12–20 pw** |

## P3 — Integration Pilot (one authorized source)

| Item | Detail |
|---|---|
| Scope | One real source under a signed data-sharing arrangement. Preferred candidates: (a) one terminal's **daily Excel/PDF report** (lowest access barrier), or (b) one **API/SFTP extract** from PMIS or a TOS. Ingestion pipeline, validation, idempotency, reconciliation, freshness monitoring, real KPI calculation for that scope |
| Reused | Submission review UI; API monitor UI; validation and anomaly rules (`submissions.ts#check`); integration-job model |
| Development | Connector or file parser for the chosen source; data contract; raw landing and retention; reconciliation rules; data-quality dashboard; runbook |
| Dependencies | **Access agreement with the data owner**; sample files and specifications; test environment of the source system; credential management |
| Risks | Access refused or delayed (highest risk in the programme); source data quality; vendor-controlled TOS; legal and privacy review |
| Deliverables | Pilot running for ≥ 4 weeks on real data in a controlled environment; data-quality report; lessons learned for scaling |
| Acceptance tests | Re-ingesting the same file or batch creates no duplicates; malformed input is quarantined with reasons; freshness SLA breaches raise alerts; KPI values reconcile with the source's own report within agreed tolerance; full lineage from KPI to source record |
| Effort | **8–14 pw** (excluding the time needed to obtain access) |

## P4 — AI Intelligence

| Item | Detail |
|---|---|
| Scope | Real document extraction for Excel/PDF (templated first, then layout-tolerant); AI management assistant with retrieval over authorised data only; statistical anomaly detection; forecasting **only where ≥ 12–24 months of clean history exist**; explainable recommendations (facts / interpretation / proposed action) with a human approval step |
| Reused | AI UI components, insight structure from P1, scope-guard pattern, anomaly rules as baseline and fallback |
| Development | AI gateway (policy-checked context assembly, citation enforcement, logging); evaluation suite (accuracy, refusal of out-of-scope requests, hallucination checks); model hosting per data-residency decision; extraction confidence and review workflow |
| Dependencies | Approval of AI processing and data-residency approach under Philippine data-privacy obligations **[ASSUMPTION]**; sufficient history from P3 |
| Risks | Hallucinated figures; data leakage across organizations; regulatory concerns; cost |
| Deliverables | AI features enabled per tenant behind a feature flag; evaluation report |
| Acceptance tests | ≥ 95% field accuracy on the agreed document test set (target **TBC**); 100% refusal on a cross-tenant probing test set; every numeric claim in an answer traceable to a metric or record; no AI action is executed without human approval |
| Effort | **10–16 pw** |

---

## Recommended sequence and gates

```
P0 (rebrand) ─▶ P1 (management demo) ─▶ [Gate: SBMA demo feedback & decisions]
              ─▶ P2 (foundation) ─▶ [Gate: hosting/security approval]
              ─▶ P3 (pilot source) ─▶ [Gate: data-sharing agreement]
              ─▶ P4 (AI)
```
P0 and P1 can start immediately after approval, because they need no external access. Begin data-access conversations for P3 **in parallel with P1**, since that is the longest lead-time item.

**Minimum transformation scope for a credible SBMA management demo:** P0 + P1, estimated at **7.5–11.5 pw**.

---

## Executive summary

**Current VOMS maturity**
- A polished, mobile-first, **front-end-only demonstrator** with sound domain logic: event lifecycle, KPI formulas, segregation of duties, scope isolation, submission validation and anomaly rules.
- Everything runs on synthetic data in the browser.
- No backend, real authentication, integrations, AI or automated tests.

**Estimated reusability**
- About **65–75%** of the front-end for the PORTIX demo.
- About **25–35%** of a production platform, since only the UI layer exists.

**Critical gaps**
1. No KPI registry, targets or variance.
2. No Management Action Tracker.
3. No historical depth for executive trends.
4. Operational recording screens conflict with PORTIX's "system-of-record separation".
5. All security is client-side.
6. No backend, ingestion or audit infrastructure.
7. No tests.

**Recommended minimum scope** — P0 + P1, delivering a credible executive demo with illustrative targets, benchmarking, alerts→actions→outcomes and labelled simulated AI.

**Top technical risks**
- Access to TOS, VTMS and PMIS data (P3).
- Hosting and data-residency approval (P2 and P4).
- Terminal confidentiality in benchmarking.
- Synthetic or illustrative values mistaken for real performance.
- Refactoring the monolithic store without tests — mitigated by writing tests first in P0.

**Decisions required from the product owner**
1. Approve PORTIX as **intelligence layer only**: PORTIX does not record operational movements (this requires a BRD change request).
2. Approve the brand assets: name, tagline, teal accent and wordmark direction.
3. Choose the repository strategy: rebrand `usmansar0213/voms` in place, or start a new `portix` repository. Also decide whether the demo stays public.
4. Provide or approve the headline KPI list (10–15) and permission to show illustrative targets.
5. Set the benchmark visibility policy between terminal operators.
6. Confirm the PORTIX personas, including whether shipping agents remain in scope.
7. Choose a backend stack direction (TypeScript recommended) and a hosting constraint (government cloud / on-premises / region).
8. Name the preferred pilot source for P3 (file-based vs API) and start the access conversation.
