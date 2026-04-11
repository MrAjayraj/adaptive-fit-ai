# Fit Pulse

**Track. Compete. Level Up.** — A gamified fitness tracking app with seasonal ranks, daily missions, workout logging, and adaptive progression.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| State | React Context + TanStack React Query |
| Charts | Recharts |
| Deployment | Vercel |

---

## Features

- **Workout Logging** — Log exercises, sets, reps, and weights with rest timers
- **Adaptive Plans** — Auto-generated weekly plans with progressive overload
- **Gamification** — XP system, levels, streaks, 40+ achievements
- **Seasonal Ranks** — Iron → Master tiered ranking with RP points (resets every 90 days)
- **Daily Missions** — 3 rotating missions with XP rewards
- **Progress Tracking** — Volume charts, personal records, muscle group breakdown
- **Challenges** — Join community or personal challenges, track progress
- **Leaderboard** — Compare XP, volume, workouts, and streaks globally
- **Guest Mode** — Use the app without an account; data syncs on sign-in
- **Offline Indicator** — Shows banner when network is unavailable

---

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+
- A [Supabase](https://supabase.com) project

### Setup

```bash
# 1. Clone
git clone https://github.com/your-username/fit-pulse.git
cd fit-pulse

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
# Edit .env and fill in your Supabase URL and anon key

# 4. Apply database migrations
# In Supabase Dashboard → SQL Editor, run each file in supabase/migrations/ in order.
# Then run supabase/seed.sql to populate exercises and challenges.

# 5. Start dev server
npm run dev
# Open http://localhost:8080
```

### Environment Variables

See `.env.example` for all required variables.

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

---

## Supabase Setup

### 1. Database
Run migration files from `supabase/migrations/` in chronological order via the Supabase SQL editor, then run `supabase/seed.sql`.

### 2. Authentication
- Go to **Authentication → Providers → Google** and enable Google OAuth
- Add your OAuth credentials (Client ID + Secret from Google Cloud Console)
- Go to **Authentication → URL Configuration**:
  - **Site URL**: `https://your-domain.vercel.app`
  - **Redirect URLs**: Add `https://your-domain.vercel.app/auth/callback`

### 3. Storage
- Create a bucket named `user-avatars`
- Set it to **public** (so avatar URLs are accessible)
- Add a policy: authenticated users can upload to `avatars/{userId}.*`

---

## Deployment (Vercel)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Framework preset: **Vite** (auto-detected)
4. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy — `vercel.json` handles SPA routing rewrites and security headers automatically

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (localhost:8080) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |

---

## Project Structure

```
src/
├── components/
│   ├── gamification/   # XP, rank, missions, achievements UI
│   ├── layout/         # BottomNav, ProtectedRoute, OfflineIndicator
│   ├── onboarding/     # 6-step onboarding wizard
│   ├── profile/        # Calorie card, XP breakdown
│   └── ui/             # shadcn/ui primitives
├── context/
│   ├── AuthContext.tsx  # Supabase auth state
│   └── FitnessContext.tsx # App-wide fitness data & gamification
├── integrations/supabase/ # Supabase client + generated types
├── lib/
│   ├── calories.ts      # BMR / TDEE / macro calculator
│   ├── errorLogger.ts   # Global error capture + event tracking
│   ├── gamification.ts  # XP, levels, achievements, missions logic
│   ├── seasonal-rank.ts # RP tiers, seasons, division logic
│   ├── validators.ts    # Input validation utilities
│   └── workout-generator.ts # Adaptive weekly plan generation
├── pages/              # Route-level page components (lazy loaded)
├── services/api.ts     # All Supabase query functions
└── types/              # TypeScript interfaces
```

---

## Database

See [DATABASE.md](./DATABASE.md) for full schema documentation.

---

## Security

- All API calls use Supabase Row Level Security (RLS)
- No secrets in client-side code — only anon key (safe to expose)
- Security headers set via `vercel.json` (HSTS, X-Frame-Options, CSP, etc.)
- Auth throttled client-side: max 1 sign-in attempt per 5 seconds
- No `dangerouslySetInnerHTML` in user-controlled content
- Input validation on all form submissions via `src/lib/validators.ts`
