# Changelog

All notable changes to Fit Pulse are documented here.

---

## [1.0.0] — 2026-04-11

### Initial Release

#### Features
- **Workout Logging** — Full workout tracker with sets, reps, weights, and rest timer
- **Adaptive Plans** — Weekly plan auto-generation based on profile and history (PPL, Upper/Lower, Full Body, Bro Split)
- **XP & Leveling** — Experience points earned from workouts, PRs, missions, and streaks
- **Seasonal Ranks** — Iron → Bronze → Silver → Gold → Platinum → Diamond → Master tiers with RP points and 90-day seasons
- **Streaks** — Consecutive workout tracking with one streak-freeze per week
- **Daily Missions** — 3 rotating missions per day with XP rewards
- **40+ Achievements** — Unlockable across Strength, Cardio, Consistency, and Milestone categories
- **Personal Records** — Auto-detected weight, reps, and volume PRs per exercise
- **Progress Charts** — Volume over time, muscle group breakdown, exercise-specific progression
- **Challenges** — Join or create community/personal challenges with leaderboard
- **Calorie Calculator** — BMR + TDEE + macro split based on goal and activity level
- **Profile** — Avatar upload, body stats history chart, BMI display
- **Guest Mode** — Full app access without sign-in; data migrates to account on sign-up
- **Google OAuth** — One-tap sign-in via Supabase Auth

#### Infrastructure
- React 18 + Vite + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + Auth + Storage)
- Deployed on Vercel with SPA routing, HSTS, CSP, and cache headers
- Vercel Analytics + Speed Insights integrated
- Global Error Boundary with Reload + Go Home fallback
- Offline indicator banner
- Route-level code splitting (lazy loading) for all pages
- Input validation utilities for all user-submitted data
- Client-side error logger with unhandled rejection capture

#### Security
- RLS enabled on all database tables
- HTTP security headers via vercel.json
- Auth attempt throttling (5s cooldown)
- No secrets in client bundle — anon key only
- `.env` excluded from git

---

## Known Limitations (V2 Backlog)

- Leaderboard uses dummy data when no real entries exist — V2 will require users to opt-in
- Imperial unit toggle (UI only) — conversion logic deferred to V2
- Push notifications for streaks and missions — deferred
- Social features (friend challenges, following) — deferred
- Apple Sign-In — deferred
- Offline workout logging with sync queue — deferred
