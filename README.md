# TrackiGo Route Runner

> **Fair turns, on time, every time.**

A full-stack bus fleet scheduling and management platform. Automatically generates fair daily trip assignments using a round-robin queue algorithm with peak/off-peak awareness, and gives transit operators a real-time dashboard, live route map, and deep analytics.

---

## Features

- **Fair Queue Scheduler** — Round-robin engine with availability checking; buses take turns based on who's free, not just who's first
- **Peak / Off-Peak Awareness** — Configurable intervals and turn durations for rush hour vs. normal service windows
- **Manual Override** — Dispatchers can reassign any trip to a specific bus at any time
- **Multi-Day Queue Carryover** — Queue state persists across days so fairness compounds over the full week
- **Live Route Map** — Animated SVG simulation showing buses moving along the route in real time
- **Analytics Dashboard** — Schedule efficiency %, missed departures, fleet utilization, peak breakdowns, top performer
- **Fleet Manager** — Add, remove, and edit buses and driver assignments
- **Dual Persistence** — Supabase cloud sync with localStorage fallback for offline operation
- **CSV Export & Print** — One-click schedule export and print-optimized layout
- **Authentication** — Supabase Auth with protected routes

---

## Tech Stack

- **Frontend:** React 19, TypeScript 5.8, Vite 7
- **Routing:** TanStack Router v1 (file-based)
- **Server State:** TanStack Query v5
- **UI:** Radix UI + Tailwind CSS v4 + Lucide icons
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Backend / DB:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Deployment:** Cloudflare Pages

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (or use the app in local-only mode)

### Installation

```bash
git clone https://github.com/your-username/trackigo-routerunner.git
cd trackigo-routerunner
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> If these are not provided, the app falls back to localStorage and runs fully offline.

### Development

```bash
npm run dev
```

Opens at `http://localhost:8080`.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Project Structure

```
src/
├── components/
│   ├── scheduler/
│   │   ├── Dashboard.tsx       # Main multi-tab interface
│   │   └── LiveMap.tsx         # Animated route visualization
│   ├── fleet/
│   │   └── FleetManager.tsx    # Bus and driver management
│   └── ui/                     # Radix UI component library
├── routes/
│   ├── index.tsx               # Dashboard (/)
│   ├── login.tsx               # Authentication (/login)
│   ├── profile.tsx             # User profile (/profile)
│   └── fleet.tsx               # Fleet page (/fleet)
├── hooks/
│   ├── use-auth.tsx            # Auth context and hook
│   ├── use-theme.tsx           # Dark/light theme
│   └── use-mobile.tsx          # Mobile breakpoint detection
└── lib/
    ├── scheduler/
    │   ├── engine.ts           # Core scheduling algorithm
    │   ├── types.ts            # TypeScript type definitions
    │   ├── defaults.ts         # Default config and buses
    │   └── time.ts             # Time parsing utilities
    ├── data-service.ts         # Supabase + localStorage layer
    └── supabase.ts             # Supabase client
```

---

## How the Scheduler Works

The engine iterates through every departure slot from the configured start to end of day:

1. Detect whether the current slot is **peak** or **off-peak** based on configured time windows
2. Scan the bus queue from front to back for the **first bus whose next-available time has passed**
3. **Assign** that bus to the trip, update its state, and move it to the **back of the queue**
4. If no bus is free, mark the slot as a **missed departure**
5. Advance by the configured interval and repeat

Queue state carries forward to the next day. Manual overrides by dispatchers are handled by swapping bus assignments and re-queuing affected buses.

---

## Configuration

All parameters are configurable from the **Setup** tab in the dashboard:

| Parameter | Default |
|---|---|
| Route | Kaduwela → Colombo |
| Operating hours | 04:30 – 00:00 |
| Peak windows | 07:00–09:00, 16:00–18:00 |
| Peak interval | 5 min |
| Off-peak interval | 15 min |
| Peak turn duration | 60 min |
| Off-peak turn duration | 90 min |
| Active buses | B1 – B10 (10 buses) |

---

## Database Schema

The app uses two Supabase tables:

**`buses`**
- `id` — Bus identifier (e.g. `"B1"`)
- `driver` — Driver name (optional)
- `active` — Whether the bus is available for scheduling

**`config`**
- Stores the full `SchedulerConfig` object as a JSON column

---

## Deployment

This project is configured for **Cloudflare Pages** via `@cloudflare/vite-plugin`. Connect your GitHub repo to a Cloudflare Pages project and set the build command to `npm run build` with output directory `dist`.

Set the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the Cloudflare Pages dashboard under **Settings → Environment Variables**.

---

## License

MIT

---

*Built by [Shanka Alwis](https://github.com/your-username)*
