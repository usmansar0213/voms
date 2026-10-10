# VOMS Mockup — Port of Subic Bay

This is an interactive UI mockup of the **Vessel Operations Monitoring System (VOMS)**. It illustrates the business requirements in the VOMS BRD (draft v0.1) for the Port of Subic Bay, Subic Bay Metropolitan Authority (SBMA).

> **Demo only.** All vessels, IMO numbers, agencies, berths and figures are fictitious. Berths B-01 to B-15 are placeholders until they are validated against the official SBMA facility register. The app has no connection to SBMA, AIS, TOS or any government system. Integration is simulated, and every simulated record is labelled.

## What it shows

| Module | BRD reference |
| --- | --- |
| Port operations dashboard with KPI tiles, cargo progress, alerts, berth status and charts | §4, §16 |
| Vessel calls: one **Vessel Call ID** per call, lifecycle stepper and next-step guidance | §8, §9 |
| Movement events from ETA to ATD (ATA, pilot, first line, All Fast, ops start/end, last line), with source, recorder, verifier and sequence checks | §10, §15 |
| Berth assignment with LOA, draft and vessel-type compatibility checks; berth board | §11 |
| Cargo in commodity-specific units (TEU, MT, KL, units): production log, verification, delays, productivity, final tally | §12, §13 |
| Safety, security, environmental and dangerous-cargo incidents with corrective actions and restricted detail | §14 |
| Closure checklist, controlled reopening and an audit trail on every change | §15, §17 |
| Integrated Vessel Call Report (print / save as PDF) and CSV export | §16 |
| Simulated AIS and TOS feeds with online/offline fallback and source reconciliation | §19 |
| Roles & access: role switcher and permission matrix, with recorder and approver kept separate | §18 |

The demo guide in the app walks through three scenarios: a **container vessel**, a **bulk carrier** and a **fuel tanker**. The layout is mobile-first: a bottom navigation bar on phones, two columns on tablets and the full dashboard on desktop. Demo data lives in the browser's local storage, and **Reset demo data** restores the starting scenario relative to the current time.

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
