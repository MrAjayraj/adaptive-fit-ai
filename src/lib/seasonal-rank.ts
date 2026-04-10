// ── Seasonal Rank System ──────────────────────────────────────
// Client-side implementation that mirrors DB schema for rank_seasons,
// user_ranks, and rank_history. Persisted to localStorage.

export type RankTier =
  | 'iron' | 'bronze' | 'silver' | 'gold'
  | 'platinum' | 'diamond' | 'master';

export interface RankSeason {
  id: string;
  seasonNumber: number;
  name: string;
  startedAt: string;    // ISO date string YYYY-MM-DD
  endsAt: string;
  isActive: boolean;
}

export interface UserRank {
  seasonId: string;
  rp: number;
  tier: RankTier;
  division: 1 | 2 | 3 | 4;
}

export interface RankHistoryEntry {
  id: string;
  seasonId: string;
  rpGained: number;
  reason: string;
  createdAt: string;
}

// ── RP Award Constants ─────────────────────────────────────────
export const RP = {
  WORKOUT_COMPLETE: 15,
  NEW_PR: 25,
  STREAK_BONUS_7: 20,
  STREAK_BONUS_30: 50,
  MISSION_COMPLETE: 10,
  CHALLENGE_COMPLETE: 40,
  LOG_STATS: 5,
} as const;

// ── Tier Thresholds (cumulative RP within a season) ───────────
export const TIER_THRESHOLDS: Record<RankTier, number> = {
  iron:     0,
  bronze:   200,
  silver:   500,
  gold:     1000,
  platinum: 2000,
  diamond:  3500,
  master:   5000,
};

export const TIER_META: Record<RankTier, { label: string; icon: string; color: string; glow: string }> = {
  iron:     { label: 'Iron',     icon: '⚙️',  color: '#8B8B8B', glow: 'rgba(139,139,139,0.3)' },
  bronze:   { label: 'Bronze',   icon: '🥉',  color: '#CD7F32', glow: 'rgba(205,127,50,0.3)' },
  silver:   { label: 'Silver',   icon: '🥈',  color: '#C0C0C0', glow: 'rgba(192,192,192,0.3)' },
  gold:     { label: 'Gold',     icon: '🥇',  color: '#F5C518', glow: 'rgba(245,197,24,0.4)' },
  platinum: { label: 'Platinum', icon: '💠',  color: '#00BCD4', glow: 'rgba(0,188,212,0.35)' },
  diamond:  { label: 'Diamond',  icon: '💎',  color: '#7C4DFF', glow: 'rgba(124,77,255,0.35)' },
  master:   { label: 'Master',   icon: '👑',  color: '#FF6B35', glow: 'rgba(255,107,53,0.4)' },
};

export const TIER_ORDER: RankTier[] = [
  'iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master',
];

// ── Helper: Get tier from RP ──────────────────────────────────
export function getTierFromRP(rp: number): RankTier {
  let tier: RankTier = 'iron';
  for (const [t, threshold] of Object.entries(TIER_THRESHOLDS)) {
    if (rp >= threshold) tier = t as RankTier;
  }
  return tier;
}

// ── Helper: Division (1=best, 4=worst) within a tier ─────────
export function getDivisionFromRP(rp: number, tier: RankTier): 1 | 2 | 3 | 4 {
  const base = TIER_THRESHOLDS[tier];
  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
  const next = nextTier ? TIER_THRESHOLDS[nextTier] : base + 400;
  const window = next - base;
  const progress = (rp - base) / window;
  if (progress >= 0.75) return 1;
  if (progress >= 0.5) return 2;
  if (progress >= 0.25) return 3;
  return 4;
}

// ── Helper: RP needed to reach next tier ─────────────────────
export function rpToNextTier(rp: number): { needed: number; next: RankTier | null } {
  const current = getTierFromRP(rp);
  const currentIdx = TIER_ORDER.indexOf(current);
  if (currentIdx >= TIER_ORDER.length - 1) return { needed: 0, next: null };
  const next = TIER_ORDER[currentIdx + 1];
  return { needed: TIER_THRESHOLDS[next] - rp, next };
}

// ── Helper: Progress % within current tier ───────────────────
export function tierProgressPct(rp: number): number {
  const current = getTierFromRP(rp);
  const base = TIER_THRESHOLDS[current];
  const currentIdx = TIER_ORDER.indexOf(current);
  const next = TIER_ORDER[currentIdx + 1];
  if (!next) return 100;
  const cap = TIER_THRESHOLDS[next];
  return Math.min(((rp - base) / (cap - base)) * 100, 100);
}

// ── Active Season (computed from today) ──────────────────────
export function getActiveSeason(): RankSeason {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
  const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
  const seasonNumber = (year - 2026) * 12 + month + 1;
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return {
    id: `season-${year}-${month + 1}`,
    seasonNumber,
    name: `Season ${seasonNumber} — ${MONTHS[month]} ${year}`,
    startedAt: firstDay,
    endsAt: lastDay,
    isActive: true,
  };
}
