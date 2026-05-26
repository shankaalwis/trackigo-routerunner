# TrackiGo Route Runner

## Tagline
**Fair turns, on time, every time.**

---

## Short Description
*(For LinkedIn posts, portfolio cards, project summaries — ~2 sentences)*

TrackiGo Route Runner is a full-stack bus fleet scheduling system that auto-generates fair daily trip assignments using a round-robin queue algorithm with peak/off-peak awareness. Built with React, TypeScript, and Supabase, it gives transit operators a real-time dashboard, live route map, and deep analytics — all in one tool.

---

## Long Description
*(For LinkedIn featured section, portfolio project page, case study intro — ~3–4 paragraphs)*

TrackiGo Route Runner is a professional bus turn scheduling and fleet management platform built for public transit operators. The core of the system is a fair-turn engine: a configurable round-robin queue algorithm that assigns departure slots to buses throughout the operational day, respects peak and off-peak service windows, enforces turnaround times, and automatically flags missed departures when no bus is available. Dispatchers can override assignments manually, and queue state carries forward across days — so fairness isn't just within a day, it's maintained over an entire operating week.

The application is built as a full-stack React + TypeScript single-page app powered by Vite, styled with Tailwind CSS, and backed by Supabase for both authentication and cloud persistence. The UI is built on a Radix UI component library and uses TanStack Router and TanStack Query for routing and server state management. Data falls back gracefully to localStorage when Supabase is unavailable, giving operators full offline capability during connectivity issues.

Beyond scheduling, Route Runner includes a live animated route map that simulates bus positions in real time, a comprehensive analytics dashboard with KPI cards and utilization metrics, a full fleet manager for bus and driver administration, and a visual logic-flow diagram that explains the scheduling algorithm step by step. Schedules can be exported to CSV for external reporting and printed directly from the browser.

The product was designed with real operational constraints in mind: configurable departure intervals, multiple peak windows, variable turn durations, and a clean override system for dispatchers who need to make on-the-fly decisions. It is deployed on Cloudflare and is production-ready, with a responsive layout that works on desktop, tablet, and mobile devices.

---

## Key Features

- **Fair Queue Engine** — Round-robin scheduler with availability checking; no bus gets more turns than others
- **Peak / Off-Peak Awareness** — Separate intervals and turn durations for rush hour vs. normal service
- **Manual Override** — Dispatcher can reassign any trip to a specific bus on demand
- **Multi-Day Queue Carryover** — Queue state persists from day to day for sustained fairness
- **Live Route Map** — Animated SVG simulation of buses traveling the route in real time
- **Analytics Dashboard** — KPIs, efficiency %, utilization rates, peak breakdowns, top performer
- **Fleet Manager** — Add, remove, and edit buses and driver assignments
- **Dual Persistence** — Supabase (cloud) with localStorage fallback for offline use
- **CSV Export & Print** — Full schedule export and print-optimized layout
- **Supabase Auth** — Email/password login with protected routes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5.8, Vite 7 |
| Routing | TanStack Router v1 (file-based) |
| Server State | TanStack Query v5 |
| UI Components | Radix UI + Tailwind CSS v4 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Deployment | Cloudflare Pages |

---

## Core Algorithm

The scheduling engine (`src/lib/scheduler/engine.ts`) works as follows:

1. Initialize all active buses as available at the service start time
2. Iterate through every departure slot from start to end of day
3. Detect whether the current slot falls in a peak or off-peak window
4. Scan the queue from front to back for the first bus whose next-available time has passed
5. If a bus is available: assign it, update its state, and move it to the back of the queue
6. If no bus is available: mark the slot as a missed departure
7. Advance to the next slot by the configured interval (peak or off-peak)
8. Repeat until the operational day ends

The algorithm is O(n × m) where n is the number of departure slots and m is the number of buses — efficient for any real-world fleet size.

---

## Target Users

- **Transit operators** managing intercity or metro bus routes
- **Fleet dispatchers** who need visibility into daily assignments and the ability to override
- **Operations managers** who need utilization analytics and fair workload distribution
- **Transit planners** evaluating schedule efficiency and missed departures

---

## Links

- **Live App:** *(Add deployment URL)*
- **GitHub:** *(Add repo URL)*
- **Portfolio:** *(Add portfolio link)*
