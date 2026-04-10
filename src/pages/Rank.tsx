import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Zap, Shield, TrendingUp, Clock,
  Flame, Crown, BarChart2,
} from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import {
  TIER_META, TIER_ORDER, TIER_THRESHOLDS, tierProgressPct,
  rpToNextTier, getActiveSeason, RankTier,
} from '@/lib/seasonal-rank';

const DUMMY_LEADERBOARD = [
  { name: 'FitWarrior99', rp: 4820, tier: 'platinum' as RankTier },
  { name: 'IronMike',     rp: 3540, tier: 'diamond'  as RankTier },
  { name: 'GymQueen',     rp: 2980, tier: 'gold'     as RankTier },
  { name: 'BeastMode',    rp: 2450, tier: 'gold'     as RankTier },
  { name: 'PowerLifter',  rp: 1820, tier: 'silver'   as RankTier },
  { name: 'RunnerX',      rp: 1200, tier: 'silver'   as RankTier },
  { name: 'SwoleSister',  rp: 780,  tier: 'bronze'   as RankTier },
  { name: 'GainsTrain',   rp: 420,  tier: 'bronze'   as RankTier },
  { name: 'FlexKing',     rp: 180,  tier: 'iron'     as RankTier },
  { name: 'NewbiePro',    rp: 60,   tier: 'iron'     as RankTier },
];

type Tab = 'overview' | 'history' | 'leaderboard';

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

  // Insert user into leaderboard
  const myName = profile?.name || 'You';
  const leaderboard = [...DUMMY_LEADERBOARD, { name: myName, rp, tier }]
    .sort((a, b) => b.rp - a.rp);
  const myRank = leaderboard.findIndex(e => e.name === myName) + 1;

  return (
    <div className="min-h-screen bg-canvas pb-[100px] font-sans">
      <div className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8 px-4 pt-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-surface-1 border border-border-subtle flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-text-1" />
          </button>
          <div>
            <h1 className="text-[20px] font-extrabold text-text-1">Seasonal Rank</h1>
            <p className="text-[11px] text-text-3">{season.name} · {daysLeft} days left</p>
          </div>
        </div>

        {/* Hero Rank Badge */}
        <motion.div
          className="relative rounded-[28px] overflow-hidden p-6 border"
          style={{
            background: `linear-gradient(135deg, ${meta.color}12, #111113 60%)`,
            borderColor: `${meta.color}35`,
            boxShadow: `0 0 40px ${meta.glow}`,
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-[60px] pointer-events-none"
            style={{ background: meta.glow }}
          />

          <div className="relative z-10 flex items-center gap-5">
            {/* Giant Badge */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-[40px] shrink-0 border-2"
              style={{
                background: `${meta.color}20`,
                borderColor: `${meta.color}50`,
                boxShadow: `0 8px 32px ${meta.glow}`,
              }}
            >
              {meta.icon}
            </div>

            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <h2 className="text-[28px] font-extrabold" style={{ color: meta.color }}>
                  {meta.label}
                </h2>
                <span
                  className="text-[13px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: `${meta.color}20`, color: meta.color }}
                >
                  Div {division}
                </span>
              </div>
              <p className="text-[15px] font-extrabold text-text-1 tabular-nums">
                {rp.toLocaleString()} RP
              </p>
              {nextMeta && (
                <p className="text-[11px] text-text-3 mt-0.5">
                  {needed} RP to {nextMeta.label} {nextMeta.icon}
                </p>
              )}

              {/* Progress bar */}
              <div className="mt-3 h-2 bg-surface-3 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: meta.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 18 }}
                />
              </div>
            </div>
          </div>

          {/* Rank in leaderboard */}
          <div
            className="relative z-10 mt-4 flex items-center justify-between px-3 py-2 rounded-xl"
            style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}20` }}
          >
            <div className="flex items-center gap-2">
              <Crown className="w-3.5 h-3.5" style={{ color: meta.color }} />
              <span className="text-[12px] font-semibold text-text-2">Season Rank</span>
            </div>
            <span className="text-[14px] font-extrabold" style={{ color: meta.color }}>
              #{myRank} / {leaderboard.length}
            </span>
          </div>
        </motion.div>

        {/* Tier Node Path */}
        <div className="bg-surface-1 rounded-[24px] border border-border-subtle p-4">
          <p className="text-[10px] text-text-3 font-bold uppercase tracking-widest mb-4">Tier Progression</p>
          <div className="flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-surface-3 z-0" />
            {/* Filled portion */}
            <div
              className="absolute top-5 left-5 h-0.5 z-0"
              style={{
                width: `${(TIER_ORDER.indexOf(tier) / (TIER_ORDER.length - 1)) * 100}%`,
                background: meta.color,
              }}
            />

            {TIER_ORDER.map((t, idx) => {
              const m = TIER_META[t];
              const reached = rp >= TIER_THRESHOLDS[t];
              const isCurrent = t === tier;
              return (
                <div key={t} className="flex flex-col items-center gap-1.5 z-10">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] border-2 transition-all"
                    style={{
                      background: reached ? `${m.color}25` : '#1C1C1E',
                      borderColor: isCurrent ? m.color : reached ? `${m.color}60` : 'rgba(255,255,255,0.08)',
                      boxShadow: isCurrent ? `0 0 12px ${m.glow}` : 'none',
                    }}
                  >
                    {reached ? m.icon : '·'}
                  </div>
                  <span
                    className="text-[9px] font-bold"
                    style={{ color: isCurrent ? m.color : reached ? m.color + '80' : '#555' }}
                  >
                    {m.label.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="text-[8px] text-text-3">{TIER_THRESHOLDS[t]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-surface-1 p-1.5 rounded-2xl border border-border-subtle">
          {(['overview', 'history', 'leaderboard'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold capitalize transition-all ${
                tab === t
                  ? 'bg-primary-accent text-canvas shadow-volt'
                  : 'text-text-3 hover:text-text-2'
              }`}
            >
              {t === 'overview' ? '📊 Stats' : t === 'history' ? '📜 History' : '🏆 Board'}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {/* RP Sources */}
            <div className="bg-surface-1 rounded-[20px] border border-border-subtle overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle">
                <p className="text-[12px] font-bold text-text-2">RP Sources</p>
              </div>
              {[
                { icon: Zap,       label: 'Complete a workout', value: '+15 RP', color: 'text-primary-accent' },
                { icon: TrendingUp,label: 'New Personal Record', value: '+25 RP', color: 'text-emerald-400' },
                { icon: Flame,     label: '7-day streak bonus', value: '+20 RP', color: 'text-orange-400' },
                { icon: Flame,     label: '30-day streak bonus', value: '+50 RP', color: 'text-red-400' },
                { icon: Shield,    label: 'Complete a challenge', value: '+40 RP', color: 'text-blue-400' },
                { icon: BarChart2, label: 'Complete a mission', value: '+10 RP', color: 'text-violet-400' },
                { icon: Clock,     label: 'Log body stats', value: '+5 RP', color: 'text-text-3' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle last:border-0">
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <span className="flex-1 text-[13px] text-text-2">{label}</span>
                  <span className={`text-[13px] font-extrabold ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Season info */}
            <div className="bg-surface-1 rounded-[20px] border border-border-subtle p-4 flex items-center justify-between">
              <div>
                <p className="text-[12px] text-text-3 font-semibold">Season ends</p>
                <p className="text-[16px] font-extrabold text-text-1">{daysLeft} days left</p>
              </div>
              <div
                className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                style={{ background: `${meta.color}20`, color: meta.color }}
              >
                Soft Reset on End
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: History */}
        {tab === 'history' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {seasonalRank.history.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[32px] mb-2">📜</p>
                <p className="text-[15px] font-bold text-text-1 mb-1">No RP history yet</p>
                <p className="text-[13px] text-text-3">Complete workouts to earn RP</p>
              </div>
            ) : (
              seasonalRank.history.map((entry) => {
                const d = new Date(entry.createdAt);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 bg-surface-1 rounded-2xl border border-border-subtle px-4 py-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary-accent/15 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-primary-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-1 truncate">{entry.reason}</p>
                      <p className="text-[11px] text-text-3">
                        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' · '}
                        {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-[15px] font-extrabold text-primary-accent">+{entry.rpGained}</span>
                  </div>
                );
              })
            )}
          </motion.div>
        )}

        {/* Tab: Leaderboard */}
        {tab === 'leaderboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {/* Top 3 podium */}
            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-2 pt-2 pb-4">
                {/* #2 */}
                <div className="w-[30%] text-center">
                  <div className="text-[22px] mb-1">{TIER_META[leaderboard[1].tier as RankTier].icon}</div>
                  <div className="bg-surface-1 border border-border-subtle rounded-[16px] p-2 mb-1">
                    <p className="text-[11px] font-bold text-text-1 truncate">{leaderboard[1].name}</p>
                    <p className="text-[10px] text-text-3">{leaderboard[1].rp.toLocaleString()} RP</p>
                  </div>
                  <div className="text-[20px]">🥈</div>
                  <div className="h-10 bg-surface-2 rounded-b-xl mt-1" />
                </div>
                {/* #1 */}
                <div className="w-[35%] text-center">
                  <div className="text-[28px] mb-1">{TIER_META[leaderboard[0].tier as RankTier].icon}</div>
                  <div className="bg-surface-1 border border-primary-accent/30 rounded-[16px] p-2 mb-1" style={{ boxShadow: '0 0 16px rgba(245,197,24,0.15)' }}>
                    <p className="text-[12px] font-bold text-primary-accent truncate">{leaderboard[0].name}</p>
                    <p className="text-[10px] text-primary-accent/70">{leaderboard[0].rp.toLocaleString()} RP</p>
                  </div>
                  <div className="text-[24px]">👑</div>
                  <div className="h-16 bg-primary-accent/10 rounded-b-xl mt-1" />
                </div>
                {/* #3 */}
                <div className="w-[30%] text-center">
                  <div className="text-[22px] mb-1">{TIER_META[leaderboard[2].tier as RankTier].icon}</div>
                  <div className="bg-surface-1 border border-border-subtle rounded-[16px] p-2 mb-1">
                    <p className="text-[11px] font-bold text-text-1 truncate">{leaderboard[2].name}</p>
                    <p className="text-[10px] text-text-3">{leaderboard[2].rp.toLocaleString()} RP</p>
                  </div>
                  <div className="text-[20px]">🥉</div>
                  <div className="h-6 bg-surface-2 rounded-b-xl mt-1" />
                </div>
              </div>
            )}

            {/* Rest of list */}
            {leaderboard.slice(3).map((entry, i) => {
              const isMe = entry.name === myName;
              const m = TIER_META[entry.tier as RankTier];
              return (
                <div
                  key={`${entry.name}-${i}`}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                    isMe
                      ? 'bg-primary-accent/8 border-primary-accent/30'
                      : 'bg-surface-1 border-border-subtle'
                  }`}
                >
                  <span className="w-7 text-[13px] font-extrabold text-text-3 text-center">#{i + 4}</span>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[14px]"
                    style={{ background: `${m.color}20` }}
                  >
                    {m.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`text-[13px] font-semibold ${isMe ? 'text-primary-accent' : 'text-text-1'}`}>
                      {entry.name}
                      {isMe && <span className="text-[10px] ml-2 font-bold text-primary-accent/70">YOU</span>}
                    </p>
                    <p className="text-[10px] text-text-3">{m.label}</p>
                  </div>
                  <span className={`text-[14px] font-extrabold tabular-nums ${isMe ? 'text-primary-accent' : 'text-text-1'}`}>
                    {entry.rp.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
