# VOMS Mockup — Port of Subic Bay

This is an interactive UI mockup of the **Vessel Operations Monitoring System (VOMS)**. It illustrates the business requirements in the VOMS BRD (draft v0.1) for the Port of Subic Bay, Subic Bay Metropolitan Authority (SBMA).

> **Demo only.** All vessels, IMO numbers, agencies, berths and figures are fictitious. Berths B-01 to B-15 are placeholders until they are validated against the official SBMA facility register. The app has no connection to SBMA, AIS, TOS or any government system. Integration is simulated, and every simulated record is labelled.

## What it shows

The mockup follows the **Project Design Document v0.1**. It has **six operational roles** (BRD Section 18), and each role has two perspectives:

| Role | Submission perspective (record & submit) | Management perspective (verify, approve & monitor) |
| --- | --- | --- |
| Port Control Operator | Movement events, daily vessel movement log, AIS feed | Port-wide traffic and delays; verifies movement records |
| Harbor Master / Authorized Officer | Berth assignment, safety inspection reports, incidents | Verifies production and final tally; closes incidents and vessel calls |
| Terminal Operator | Daily terminal reports (Excel/PDF), production, delays, TOS API | Terminal KPIs for one or several terminals; approves terminal submissions |
| Shipping Agent | Pre-arrival notices, ETA updates, manifests | Own vessel calls from arrival to departure |
| Port Authority Management | Monthly port statistics report | Port-wide KPIs, alerts, AI insights and discussion |
| System / Access Administrator | Access and connector changes, mapping tables, simulator | System health, data freshness and audit |

A record is never approved from the perspective that created it, and a submitter cannot approve their own submission.

| Module | Reference |
| --- | --- |
| Demo sign-in: Organization → Role → Perspective → Scope (no password) and quick-start personas | PDD §2 |
| Scoped access: one terminal, several terminals or port-wide; dashboards, alerts, files and AI answers all respect the scope | PDD §2 |
| Submission dashboard and Management dashboard for every role | PDD §6 |
| Submission Center: simulated Excel/PDF extraction with confidence and source citation, anomaly detection, correction history, approval | PDD §5 |
| API Integration Monitor: success/failure, retries, mapping errors, freshness, failure simulation | PDD §5, BRD §19 |
| Alerts with severity, evidence, owner, acknowledgment and resolution, plus an empty state | PDD §6 |
| AI insight cards and a contextual discussion box (rule-based, clearly labelled simulation) | PDD §7 |
| Vessel calls, berths, cargo in commodity units, incidents, closure, audit trail, integrated report | BRD §8–16 |

The Demo Guide covers the five PDD scenarios, with a start button for each. You can also link straight into a persona with `#/login?as=<key>`, where the key is one of `ta-coordinator`, `tb-coordinator`, `ta-manager`, `terminal-group`, `port-authority` or `harbor-master`. The layout is mobile-first, and every journey works on a phone.

## Run locally

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

To build a static site in `dist/`:

```bash
npm run build
```

The build uses relative paths and hash-based routing, so `dist/` can be hosted on any static host, including GitHub Pages under `/<repo>/`.

## Deploy to GitHub Pages

The workflow `.github/workflows/deploy.yml` builds and publishes the site on every push to `main`. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions** once.

## Credits and licenses

- UI shell based on [shadcn-admin](https://github.com/satnaing/shadcn-admin) by Sat Naing, MIT License (see `LICENSE`).
- shadcn/ui, Radix UI, Tailwind CSS, TanStack Router, Recharts, Zustand, date-fns, Sonner (MIT); Lucide icons (ISC).
- The event vocabulary follows concepts from the DCSA Port Call / Just-in-Time standard and IALA S-211 Port Call Message. These are used as reference only; no code was copied.
