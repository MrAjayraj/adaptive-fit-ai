// src/pages/Rank.tsx
import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Zap, Shield, TrendingUp, Clock,
  Flame, Crown, BarChart2, Bell, ChevronRight,
} from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import {
  TIER_META, TIER_ORDER, TIER_THRESHOLDS, tierProgressPct,
  rpToNextTier, getActiveSeason, RankTier,
} from '@/lib/seasonal-rank';

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const DUMMY_LEADERBOARD = [
  { name: 'FitWarrior99', rp: 4820, tier: 'platinum' as RankTier, country: 'USA' },
  { name: 'IronMike',     rp: 3540, tier: 'diamond'  as RankTier, country: 'UK' },
  { name: 'GymQueen',     rp: 2980, tier: 'gold'     as RankTier, country: 'Canada' },
  { name: 'BeastMode',    rp: 2450, tier: 'gold'     as RankTier, country: 'Brazil' },
  { name: 'PowerLifter',  rp: 1820, tier: 'silver'   as RankTier, country: 'Germany' },
  { name: 'RunnerX',      rp: 1200, tier: 'silver'   as RankTier, country: 'Japan' },
  { name: 'SwoleSister',  rp: 780,  tier: 'bronze'   as RankTier, country: 'Australia' },
  { name: 'GainsTrain',   rp: 420,  tier: 'bronze'   as RankTier, country: 'France' },
  { name: 'FlexKing',     rp: 180,  tier: 'iron'     as RankTier, country: 'Italy' },
  { name: 'NewbiePro',    rp: 60,   tier: 'iron'     as RankTier, country: 'Spain' },
];

type Tab = 'overview' | 'history' | 'leaderboard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stringToGradient(name: string): string {
  const gradients = [
    'linear-gradient(135deg,#00E676,#1DE9B6)',
    'linear-gradient(135deg,#F59E0B,#F97316)',
    'linear-gradient(135deg,#A78BFA,#EC4899)',
    'linear-gradient(135deg,#38BDF8,#6366F1)',
    'linear-gradient(135deg,#EF4444,#F97316)',
  ];
  return gradients[name.charCodeAt(0) % gradients.length];
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-black flex-shrink-0"
      style={{ width: size, height: size, background: stringToGradient(name), fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────────

function PodiumSpot({
  entry, rank, height, highlight,
}: {
  entry: typeof DUMMY_LEADERBOARD[0];
  rank: 1 | 2 | 3;
  height: number;
  highlight: boolean;
}) {
  const medals = ['', '🥇', '🥈', '🥉'] as const;
  const meta = TIER_META[entry.tier];
  const avatarSize = rank === 1 ? 52 : 42;

  return (
    <div className="flex flex-col items-center gap-2" style={{ width: rank === 1 ? '36%' : '30%' }}>
      {/* Medal + Badge float */}
      <div className="flex flex-col items-center gap-1">
        <div
          className="rounded-full flex items-center justify-center ring-2"
          style={{
            boxShadow: highlight ? `0 0 20px ${meta.glow}` : 'none',
            ringColor: highlight ? meta.color : 'transparent',
          }}
        >
          <Avatar name={entry.name} size={avatarSize} />
        </div>
        <div className="text-[20px] leading-none">{medals[rank]}</div>
      </div>

      {/* Card */}
      <div
        className="w-full rounded-[16px] p-2.5 text-center border"
        style={{
          background: highlight
            ? `linear-gradient(160deg, ${meta.color}18, rgba(0,0,0,0.4))`
            : 'rgba(255,255,255,0.04)',
          borderColor: highlight ? `${meta.color}40` : 'rgba(255,255,255,0.07)',
          boxShadow: highlight ? `0 0 24px ${meta.glow}` : 'none',
        }}
      >
        <p
          className="text-[11px] font-extrabold truncate leading-tight"
          style={{ color: highlight ? meta.color : 'rgba(255,255,255,0.8)' }}
        >
          {entry.name}
        </p>
        <p className="text-[10px] text-white/40 mt-0.5 tabular-nums">
          {entry.rp.toLocaleString()} RP
        </p>
      </div>

      {/* Pedestal */}
      <div
        className="w-full rounded-t-xl"
        style={{
          height,
          background: highlight
            ? `linear-gradient(180deg, ${meta.color}30, ${meta.color}08)`
            : 'rgba(255,255,255,0.05)',
          borderTop: `2px solid ${highlight ? meta.color + '50' : 'rgba(255,255,255,0.08)'}`,
        }}
      />
    </div>
  );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────

function LeaderboardRow({
  entry, position, isMe,
}: {
  entry: typeof DUMMY_LEADERBOARD[0];
  position: number;
  isMe: boolean;
}) {
  const meta = TIER_META[entry.tier as RankTier];
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: position * 0.04 }}
      className="flex items-center gap-3 rounded-[18px] px-4 py-3 border transition-all"
      style={{
        background: isMe
          ? 'linear-gradient(135deg,rgba(245,197,24,0.12),rgba(245,197,24,0.04))'
          : 'rgba(255,255,255,0.03)',
        borderColor: isMe ? 'rgba(245,197,24,0.35)' : 'rgba(255,255,255,0.06)',
        boxShadow: isMe ? '0 0 20px rgba(245,197,24,0.1)' : 'none',
      }}
    >
      <span
        className="w-7 text-[13px] font-extrabold text-center tabular-nums"
        style={{ color: isMe ? '#F5C518' : 'rgba(255,255,255,0.3)' }}
      >
        {position}
      </span>

      <div
        className="w-9 h-9 rounded-[12px] flex items-center justify-center text-base flex-shrink-0"
        style={{ background: `${meta.color}18` }}
      >
        {meta.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className="text-[13px] font-bold truncate"
            style={{ color: isMe ? '#F5C518' : 'rgba(255,255,255,0.9)' }}
          >
            {entry.name}
          </p>
          {isMe && (
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#F5C518]/20 text-[#F5C518] uppercase tracking-wide">
              You
            </span>
          )}
        </div>
        <p className="text-[10px] text-white/30">{entry.country} · {meta.label}</p>
      </div>

      <span
        className="text-[14px] font-extrabold tabular-nums"
        style={{ color: isMe ? '#F5C518' : 'rgba(255,255,255,0.7)' }}
      >
        {entry.rp.toLocaleString()}
        <span className="text-[10px] font-semibold ml-0.5 text-white/30"> RP</span>
      </span>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RankPage() {
  const { seasonalRank, profile } = useFitness();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  const season = getActiveSeason();
  const { rp, tier, division } = seasonalRank.userRank;
  const meta = TIER_META[tier];
  const pct = tierProgressPct(rp);
  const { needed, next } = rpToNextTier(rp);
  const nextMeta = next ? TIER_META[next] : null;

  const endsAt = new Date(season.endsAt);
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const myName = profile?.name || 'You';
  const leaderboard = [...DUMMY_LEADERBOARD, { name: myName, rp, tier, country: 'You' }]
    .sort((a, b) => b.rp - a.rp);
  const myRank = leaderboard.findIndex((e) => e.name === myName) + 1;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview',    label: '📊 Stats'   },
    { key: 'history',     label: '📜 History' },
    { key: 'leaderboard', label: '🏆 Board'   },
  ];

  return (
    <div className="min-h-screen bg-canvas pb-[100px] font-sans">
      <div className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8 px-4 pt-6 space-y-4">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-white/8 bg-white/[0.04] hover:bg-white/8 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-white/70" />
            </button>
            <div>
              <h1 className="text-[20px] font-extrabold text-white">Seasonal Rank</h1>
              <p className="text-[11px] text-white/40">
                {season.name} · <span className="text-[#F5C518]/80">{daysLeft} days left</span>
              </p>
            </div>
          </div>
          <button className="w-9 h-9 rounded-full flex items-center justify-center border border-white/8 bg-white/[0.04] hover:bg-white/8 transition-all relative">
            <Bell className="w-4 h-4 text-white/50" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F5C518]" />
          </button>
        </div>

        {/* ── Hero Card ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-[28px] overflow-hidden p-6 border"
          style={{
            background: `linear-gradient(145deg, ${meta.color}18 0%, rgba(10,10,14,0.95) 55%)`,
            borderColor: `${meta.color}30`,
            boxShadow: `0 0 60px ${meta.glow}`,
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute -top-12 -right-12 w-56 h-56 rounded-full blur-[80px] pointer-events-none opacity-50"
            style={{ background: meta.glow }}
          />

          <div className="relative z-10">
            {/* Top row */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-1">Your Standing</p>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-[52px] font-black leading-none tabular-nums"
                    style={{ color: meta.color, textShadow: `0 0 30px ${meta.glow}` }}
                  >
                    #{myRank}
                  </span>
                </div>
                <p className="text-[13px] font-bold text-white/50 mt-1">
                  Next Rank:{' '}
                  <span className="text-white font-extrabold">{nextMeta?.label ?? 'MAX'}</span>
                </p>
              </div>

              <div
                className="rounded-[18px] px-4 py-3 text-center border"
                style={{
                  background: `${meta.color}12`,
                  borderColor: `${meta.color}25`,
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Global Rank</p>
                <p className="text-[18px] font-black" style={{ color: meta.color }}>
                  TOP 5%
                </p>
              </div>
            </div>

            {/* Tier badge */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[26px] border"
                style={{
                  background: `${meta.color}18`,
                  borderColor: `${meta.color}35`,
                  boxShadow: `0 4px 20px ${meta.glow}`,
                }}
              >
                {meta.icon}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[20px] font-extrabold" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${meta.color}20`, color: meta.color }}
                  >
                    Div {division}
                  </span>
                </div>
                <p className="text-[12px] font-bold text-white/50">
                  {rp.toLocaleString()} RP
                  {nextMeta && needed > 0 && (
                    <span className="text-white/30 font-normal">
                      {' '}· {needed.toLocaleString()} to {nextMeta.label}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-semibold">
                <span style={{ color: meta.color }}>{meta.label}</span>
                {nextMeta && <span className="text-white/30">{nextMeta.label}</span>}
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${meta.color}aa, ${meta.color})`,
                    boxShadow: `0 0 8px ${meta.glow}`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 18, delay: 0.3 }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Tier Path ─────────────────────────────────────────── */}
        <div
          className="rounded-[22px] border border-white/6 p-4"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-4">Tier Path</p>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-5 right-5 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div
              className="absolute top-4 left-5 h-0.5 rounded-full transition-all duration-700"
              style={{
                width: `${(TIER_ORDER.indexOf(tier) / (TIER_ORDER.length - 1)) * (100 - (10 / TIER_ORDER.length) * 2)}%`,
                background: `linear-gradient(90deg, ${meta.color}55, ${meta.color})`,
              }}
            />
            {TIER_ORDER.map((t) => {
              const m = TIER_META[t];
              const reached = rp >= TIER_THRESHOLDS[t];
              const isCurrent = t === tier;
              return (
                <div key={t} className="flex flex-col items-center gap-1.5 z-10">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base border-2 transition-all duration-300"
                    style={{
                      background: reached ? `${m.color}20` : 'rgba(255,255,255,0.04)',
                      borderColor: isCurrent ? m.color : reached ? `${m.color}50` : 'rgba(255,255,255,0.08)',
                      boxShadow: isCurrent ? `0 0 14px ${m.glow}` : 'none',
                      transform: isCurrent ? 'scale(1.2)' : 'scale(1)',
                    }}
                  >
                    {reached ? m.icon : <span className="text-white/20 text-[10px]">—</span>}
                  </div>
                  <span
                    className="text-[8px] font-bold tracking-wide"
                    style={{ color: isCurrent ? m.color : reached ? m.color + '70' : 'rgba(255,255,255,0.2)' }}
                  >
                    {m.label.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div
          className="flex gap-1 p-1 rounded-2xl border border-white/6"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200"
              style={
                tab === key
                  ? { background: '#F5C518', color: '#0a0a0a' }
                  : { color: 'rgba(255,255,255,0.35)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ───────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="space-y-3"
            >
              {/* RP Sources */}
              <div className="rounded-[22px] border border-white/6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-[12px] font-bold text-white/50 uppercase tracking-wider">RP Sources</p>
                </div>
                {[
                  { icon: Zap,        label: 'Complete a workout',   value: '+15 RP', color: '#F5C518' },
                  { icon: TrendingUp, label: 'New Personal Record',  value: '+25 RP', color: '#34D399' },
                  { icon: Flame,      label: '7-day streak bonus',   value: '+20 RP', color: '#F97316' },
                  { icon: Flame,      label: '30-day streak bonus',  value: '+50 RP', color: '#EF4444' },
                  { icon: Shield,     label: 'Complete a challenge', value: '+40 RP', color: '#38BDF8' },
                  { icon: BarChart2,  label: 'Complete a mission',   value: '+10 RP', color: '#A78BFA' },
                  { icon: Clock,      label: 'Log body stats',       value: '+5 RP',  color: 'rgba(255,255,255,0.3)' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 group hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="flex-1 text-[13px] text-white/60">{label}</span>
                    <span className="text-[13px] font-extrabold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Season info */}
              <div
                className="rounded-[22px] border border-white/6 p-4 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div>
                  <p className="text-[11px] text-white/35 font-semibold mb-0.5">Season ends</p>
                  <p className="text-[18px] font-extrabold text-white">{daysLeft} days left</p>
                  <p className="text-[11px] text-white/30 mt-0.5">{season.name}</p>
                </div>
                <div>
                  <div
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold border"
                    style={{ background: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}25` }}
                  >
                    Soft Reset
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 mx-auto mt-1" />
                </div>
              </div>
            </motion.div>
          )}

          {/* HISTORY */}
          {tab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="space-y-2"
            >
              {seasonalRank.history.length === 0 ? (
                <div className="text-center py-14">
                  <p className="text-[36px] mb-3">📜</p>
                  <p className="text-[16px] font-bold text-white">No RP history yet</p>
                  <p className="text-[13px] text-white/35 mt-1">Complete workouts to earn RP</p>
                </div>
              ) : (
                seasonalRank.history.map((entry, i) => {
                  const d = new Date(entry.createdAt);
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: i * 0.04 }}
                      className="flex items-center gap-3 rounded-[18px] border border-white/6 px-4 py-3"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: 'rgba(245,197,24,0.12)' }}>
                        <Zap className="w-4 h-4 text-[#F5C518]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white/85 truncate">{entry.reason}</p>
                        <p className="text-[11px] text-white/30">
                          {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' · '}
                          {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-[15px] font-extrabold text-[#F5C518]">+{entry.rpGained}</span>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {/* LEADERBOARD */}
          {tab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="space-y-3"
            >
              {/* Podium — top 3 */}
              {leaderboard.length >= 3 && (
                <div className="flex items-end justify-center gap-2 pt-4 pb-2">
                  {/* #2 */}
                  <PodiumSpot entry={leaderboard[1]} rank={2} height={56} highlight={leaderboard[1].name === myName} />
                  {/* #1 */}
                  <PodiumSpot entry={leaderboard[0]} rank={1} height={80} highlight={leaderboard[0].name === myName} />
                  {/* #3 */}
                  <PodiumSpot entry={leaderboard[2]} rank={3} height={36} highlight={leaderboard[2].name === myName} />
                </div>
              )}

              {/* Separator */}
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 h-px bg-white/6" />
                <span className="text-[10px] text-white/25 font-semibold">{leaderboard.length} Athletes</span>
                <div className="flex-1 h-px bg-white/6" />
              </div>

              {/* Rest of list */}
              <div className="space-y-2">
                {leaderboard.slice(3).map((entry, i) => (
                  <LeaderboardRow
                    key={`${entry.name}-${i}`}
                    entry={entry}
                    position={i + 4}
                    isMe={entry.name === myName}
                  />
                ))}
              </div>

              {/* My sticky row */}
              {myRank > 3 && (
                <div className="sticky bottom-20 pt-2">
                  <div className="h-px bg-white/6 mb-2" />
                  <LeaderboardRow
                    entry={{ name: myName, rp, tier, country: 'You' }}
                    position={myRank}
                    isMe={true}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
