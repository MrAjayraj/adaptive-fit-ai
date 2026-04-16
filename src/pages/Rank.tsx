// src/pages/Rank.tsx — Premium leaderboard redesign
import { useState, useEffect, useRef } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { Bell, Crown, Star, ChevronRight, Zap, TrendingUp, Flame, Shield, BarChart2, Clock } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import {
  TIER_META, TIER_ORDER, TIER_THRESHOLDS, tierProgressPct,
  rpToNextTier, getActiveSeason, RankTier,
} from '@/lib/seasonal-rank';

// ─── Gold design tokens ───────────────────────────────────────────────────────
const GOLD = '#D4A843';
const GOLD_LIGHT = '#F5D78E';
const GOLD_GLOW = 'rgba(212,168,67,0.18)';
const GOLD_BORDER = 'rgba(212,168,67,0.25)';
const SILVER = '#94A3B8';
const BRONZE = '#C07840';

// ─── Dummy leaderboard data ───────────────────────────────────────────────────
const DUMMY_BOARD = [
  { name: 'FitWarrior99', rp: 4820, tier: 'platinum' as RankTier, country: 'USA', avatar: null },
  { name: 'IronMike',     rp: 3540, tier: 'diamond'  as RankTier, country: 'UK',  avatar: null },
  { name: 'GymQueen',     rp: 2980, tier: 'gold'     as RankTier, country: 'CA',  avatar: null },
  { name: 'BeastMode',    rp: 2450, tier: 'gold'     as RankTier, country: 'BR',  avatar: null },
  { name: 'PowerLifter',  rp: 1820, tier: 'silver'   as RankTier, country: 'DE',  avatar: null },
  { name: 'RunnerX',      rp: 1200, tier: 'silver'   as RankTier, country: 'JP',  avatar: null },
  { name: 'SwoleSister',  rp: 780,  tier: 'bronze'   as RankTier, country: 'AU',  avatar: null },
  { name: 'GainsTrain',   rp: 420,  tier: 'bronze'   as RankTier, country: 'FR',  avatar: null },
  { name: 'FlexKing',     rp: 180,  tier: 'iron'     as RankTier, country: 'IT',  avatar: null },
  { name: 'NewbiePro',    rp: 60,   tier: 'iron'     as RankTier, country: 'ES',  avatar: null },
];

type BoardTab = 'GLOBAL' | 'FRIENDS' | 'LOCAL';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gradient(name: string) {
  const g = [
    'linear-gradient(135deg,#D4A843,#F5D78E)',
    'linear-gradient(135deg,#A78BFA,#EC4899)',
    'linear-gradient(135deg,#38BDF8,#6366F1)',
    'linear-gradient(135deg,#34D399,#06B6D4)',
    'linear-gradient(135deg,#F97316,#EF4444)',
  ];
  return g[name.charCodeAt(0) % g.length];
}

// ─── Avatar circle ────────────────────────────────────────────────────────────
function AvatarCircle({
  name, src, size, ring, glowing,
}: {
  name: string; src?: string | null; size: number; ring?: string; glowing?: boolean;
}) {
  const initials = name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="relative rounded-full flex-shrink-0"
      style={{
        width: size, height: size,
        boxShadow: glowing ? `0 0 24px ${GOLD_GLOW}, 0 0 0 3px ${GOLD}` : ring ? `0 0 0 3px ${ring}` : undefined,
      }}
    >
      {glowing && (
        <div
          className="absolute inset-0 rounded-full blur-2xl -z-10"
          style={{ background: GOLD_GLOW, transform: 'scale(1.6)' }}
        />
      )}
      {src ? (
        <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-extrabold text-black"
          style={{ background: gradient(name), fontSize: size * 0.32 }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── Count-up animation ───────────────────────────────────────────────────────
function CountUp({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  const ref = useRef(false);
  useEffect(() => {
    if (!ref.current) { ref.current = true; mv.set(value); void duration; }
  }, [value, mv, duration]);
  return <motion.span>{display}</motion.span>;
}

// ─── Podium ───────────────────────────────────────────────────────────────────
type BoardEntry = { name: string; rp: number; tier: RankTier; country: string; avatar?: string | null };

function Podium({ entries, myName }: { entries: BoardEntry[]; myName: string }) {
  const order = [entries[1], entries[0], entries[2]]; // 2-1-3 visual order
  const ranks = [2, 1, 3];
  const sizes = [64, 80, 64];
  const offsets = [16, 0, 16]; // px down for #2 and #3
  const rings = [SILVER, GOLD, BRONZE];
  const labels = ['2nd', '1st', '3rd'];
  const crowns = [false, true, false];
  const pedestalHeights = [72, 100, 52];

  return (
    <div className="flex items-end justify-center gap-3 pt-6 pb-2">
      {order.map((entry, i) => {
        const isMe = entry.name === myName;
        const meta = TIER_META[entry.tier];
        return (
          <motion.div
            key={entry.name}
            className="flex flex-col items-center gap-2"
            style={{ width: '30%' }}
            initial={{ opacity: 0, scale: 0.5, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: offsets[i] }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: ranks[i] === 1 ? 0 : 0.12 }}
          >
            {/* Crown for #1 */}
            {crowns[i] && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.25, type: 'spring' }}
              >
                <Crown size={22} style={{ color: GOLD, filter: `drop-shadow(0 0 8px ${GOLD})` }} />
              </motion.div>
            )}

            {/* Avatar */}
            <div className="relative">
              <AvatarCircle
                name={entry.name}
                src={entry.avatar}
                size={sizes[i]}
                ring={rings[i]}
                glowing={ranks[i] === 1}
              />
              {/* Rank badge */}
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-[#0D0D10]"
                style={{
                  background: ranks[i] === 1 ? GOLD : ranks[i] === 2 ? SILVER : BRONZE,
                  color: '#0D0D10',
                }}
              >
                {ranks[i]}
              </div>
            </div>

            {/* Name + score */}
            <div className="text-center">
              <p
                className="text-[11px] font-bold truncate max-w-[80px]"
                style={{ color: isMe ? GOLD_LIGHT : 'rgba(255,255,255,0.85)' }}
              >
                {entry.name}
              </p>
              <p className="text-[10px] font-semibold tabular-nums mt-0.5" style={{ color: GOLD }}>
                {entry.rp.toLocaleString()} RP
              </p>
            </div>

            {/* Pedestal */}
            <div
              className="w-full rounded-t-[10px] flex items-center justify-center"
              style={{
                height: pedestalHeights[i],
                background: `linear-gradient(180deg, ${rings[i]}22 0%, ${rings[i]}06 100%)`,
                borderTop: `2px solid ${rings[i]}50`,
              }}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-40" style={{ color: rings[i] }}>
                {labels[i]}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────
function BoardRow({ entry, rank, isMe, delay }: { entry: BoardEntry; rank: number; isMe: boolean; delay: number }) {
  const meta = TIER_META[entry.tier];
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, delay }}
      className="flex items-center gap-3 px-4 rounded-[16px] border transition-all"
      style={{
        height: 68,
        background: isMe ? `rgba(212,168,67,0.06)` : 'rgba(255,255,255,0.025)',
        borderColor: isMe ? GOLD_BORDER : 'rgba(255,255,255,0.06)',
        boxShadow: isMe ? `0 0 16px rgba(212,168,67,0.1)` : 'none',
      }}
    >
      {/* Rank */}
      <span
        className="w-7 text-[14px] font-black text-center tabular-nums flex-shrink-0"
        style={{ color: isMe ? GOLD : 'rgba(255,255,255,0.25)' }}
      >
        {rank}
      </span>

      {/* Avatar */}
      <AvatarCircle name={entry.name} src={entry.avatar} size={40} ring={isMe ? GOLD : undefined} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className="text-[14px] font-bold truncate"
            style={{ color: isMe ? GOLD_LIGHT : 'rgba(255,255,255,0.9)' }}
          >
            {entry.name}
          </p>
          {isMe && (
            <span
              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${GOLD}22`, color: GOLD }}
            >
              YOU
            </span>
          )}
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: SILVER + '80' }}>
          {entry.country} · <span style={{ color: meta.color + 'cc' }}>{meta.label}</span>
        </p>
      </div>

      {/* Score */}
      <span
        className="text-[15px] font-extrabold tabular-nums flex-shrink-0"
        style={{ color: isMe ? GOLD : 'rgba(255,255,255,0.7)' }}
      >
        {entry.rp.toLocaleString()}
        <span className="text-[10px] font-semibold ml-0.5 opacity-40"> RP</span>
      </span>
    </motion.div>
  );
}

// ─── Standing card ────────────────────────────────────────────────────────────
function StandingCard({ rp, tier, myRank, nextLabel, needed }: {
  rp: number; tier: RankTier; myRank: number; nextLabel: string | null; needed: number;
}) {
  const meta = TIER_META[tier];
  const pct = tierProgressPct(rp);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-[20px] border p-5"
      style={{
        background: `linear-gradient(145deg, ${GOLD_GLOW} 0%, rgba(13,13,16,0.98) 60%)`,
        borderColor: GOLD_BORDER,
        boxShadow: `0 4px 32px rgba(0,0,0,0.6), 0 0 0 1px ${GOLD_BORDER}`,
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3"
        style={{ color: GOLD + 'aa' }}
      >
        Your Standing
      </p>

      <div className="flex items-start justify-between gap-4">
        {/* Rank number */}
        <div>
          <div
            className="text-[52px] font-black leading-none tabular-nums"
            style={{ color: GOLD, textShadow: `0 0 32px ${GOLD_GLOW}` }}
          >
            #<CountUp value={myRank} />
          </div>
          {nextLabel && (
            <p className="text-[13px] font-medium mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Next: <span className="font-bold text-white">{nextLabel}</span>
            </p>
          )}
        </div>

        {/* Tier badge */}
        <div className="flex flex-col items-end gap-1.5">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}
          >
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
            <span className="opacity-50">· TOP 5%</span>
          </div>
          <p className="text-[12px] font-semibold tabular-nums" style={{ color: GOLD }}>
            {rp.toLocaleString()} RP
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-[10px] font-semibold">
          <span style={{ color: meta.color }}>{meta.label}</span>
          {needed > 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>{needed.toLocaleString()} XP to go</span>}
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, #EF4444, #F59E0B ${pct * 0.5}%, #22C55E)`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RankPage() {
  const { seasonalRank, profile } = useFitness();
  const navigate = useNavigate();
  const [boardTab, setBoardTab] = useState<BoardTab>('GLOBAL');
  const [showHistory, setShowHistory] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const season = getActiveSeason();
  const { rp, tier } = seasonalRank.userRank;
  const meta = TIER_META[tier];
  const { needed, next } = rpToNextTier(rp);
  const nextMeta = next ? TIER_META[next] : null;

  const endsAt = new Date(season.endsAt);
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const myName = profile?.name || 'You';
  const myEntry: BoardEntry = { name: myName, rp, tier, country: 'You', avatar: profile?.avatarUrl };

  // Build merged leaderboard
  const fullBoard: BoardEntry[] = [...DUMMY_BOARD.map(d => ({ ...d, avatar: null })), myEntry]
    .sort((a, b) => b.rp - a.rp)
    .map((e, i, arr) => ({ ...e, rank: i + 1 })) as BoardEntry[];

  const myRank = fullBoard.findIndex((e) => e.name === myName) + 1;
  const top3 = fullBoard.slice(0, 3);
  const rest = fullBoard.slice(3, showAll ? undefined : 10);
  const userInTop10 = myRank <= 10;

  const BOARD_TABS: BoardTab[] = ['GLOBAL', 'FRIENDS', 'LOCAL'];

  return (
    <div className="min-h-screen bg-[#0D0D10] pb-[100px] font-sans">
      {/* Background gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${GOLD_GLOW} 0%, transparent 70%)`,
        }}
      />

      <div className="relative w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8 px-4 pt-6 space-y-5">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-[22px] font-black tracking-tight"
              style={{ color: GOLD_LIGHT }}
            >
              FIT PULSE
            </h1>
            <p className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {season.name} · <span style={{ color: GOLD + 'cc' }}>{daysLeft}d left</span>
            </p>
          </div>
          <button
            className="relative w-9 h-9 rounded-full flex items-center justify-center border"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <Bell size={16} className="text-white/50" />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: GOLD }}
            />
          </button>
        </div>

        {/* ── Your Standing Card ─────────────────────────────────── */}
        <StandingCard
          rp={rp}
          tier={tier}
          myRank={myRank}
          nextLabel={nextMeta?.label ?? null}
          needed={needed}
        />

        {/* ── Board Tab Switcher ─────────────────────────────────── */}
        <div
          className="flex gap-1 p-1 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {BOARD_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setBoardTab(t)}
              className="flex-1 py-2 rounded-xl text-[12px] font-extrabold tracking-widest uppercase transition-all duration-200"
              style={
                boardTab === t
                  ? { background: GOLD, color: '#0D0D10' }
                  : { color: 'rgba(255,255,255,0.3)' }
              }
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Board Content ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {boardTab === 'GLOBAL' && (
            <motion.div
              key="global"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              {/* Podium */}
              {top3.length >= 3 && <Podium entries={top3} myName={myName} />}

              {/* Separator */}
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {fullBoard.length} ATHLETES
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Rows #4+ */}
              <div className="space-y-2">
                {rest.map((entry, i) => (
                  <BoardRow
                    key={entry.name}
                    entry={entry}
                    rank={i + 4}
                    isMe={entry.name === myName}
                    delay={i * 0.04}
                  />
                ))}
              </div>

              {/* Load more */}
              {fullBoard.length > 10 && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full py-3 rounded-[14px] text-[13px] font-bold transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  Load more
                </button>
              )}
            </motion.div>
          )}

          {boardTab === 'FRIENDS' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="py-16 flex flex-col items-center gap-4 text-center"
            >
              <div
                className="w-20 h-20 rounded-[24px] flex items-center justify-center"
                style={{ background: GOLD_GLOW, border: `1px solid ${GOLD_BORDER}` }}
              >
                <span className="text-[36px]">🏆</span>
              </div>
              <div>
                <p className="text-[17px] font-bold text-white">Friends Leaderboard</p>
                <p className="text-[13px] mt-1.5 max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Add friends from the Social tab to see how you rank against them.
                </p>
              </div>
            </motion.div>
          )}

          {boardTab === 'LOCAL' && (
            <motion.div
              key="local"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="py-16 flex flex-col items-center gap-4 text-center"
            >
              <div
                className="w-20 h-20 rounded-[24px] flex items-center justify-center"
                style={{ background: GOLD_GLOW, border: `1px solid ${GOLD_BORDER}` }}
              >
                <span className="text-[36px]">🌍</span>
              </div>
              <div>
                <p className="text-[17px] font-bold text-white">Local Rankings</p>
                <p className="text-[13px] mt-1.5 max-w-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Region-based leaderboards are coming soon. Stay tuned!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Pinned User Row (if not in top 10) ────────────────── */}
        {boardTab === 'GLOBAL' && !userInTop10 && (
          <div className="sticky bottom-20">
            <div className="h-px mb-2" style={{ background: `${GOLD}20` }} />
            <BoardRow entry={myEntry} rank={myRank} isMe delay={0} />
          </div>
        )}

        {/* ── Tier Path ─────────────────────────────────────────── */}
        <div
          className="rounded-[20px] border p-4"
          style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-4"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Tier Path
          </p>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-4 right-4 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <motion.div
              className="absolute top-4 left-4 h-0.5 rounded-full"
              style={{ background: `linear-gradient(90deg, ${meta.color}55, ${meta.color})` }}
              initial={{ width: 0 }}
              animate={{ width: `${(TIER_ORDER.indexOf(tier) / (TIER_ORDER.length - 1)) * 100}%` }}
              transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
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
                      boxShadow: isCurrent ? `0 0 14px ${m.color}40` : 'none',
                      transform: isCurrent ? 'scale(1.2)' : 'scale(1)',
                    }}
                  >
                    {reached ? m.icon : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10 }}>—</span>}
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

        {/* ── RP Sources (collapsible) ──────────────────────────── */}
        <div
          className="rounded-[20px] border overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors"
          >
            <p className="text-[12px] font-bold text-white/50 uppercase tracking-wider">RP Sources</p>
            <ChevronRight
              size={14}
              className="text-white/20 transition-transform duration-200"
              style={{ transform: showHistory ? 'rotate(90deg)' : undefined }}
            />
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                {[
                  { icon: Zap,        label: 'Complete a workout',   value: '+15 RP', color: GOLD },
                  { icon: TrendingUp, label: 'New Personal Record',  value: '+25 RP', color: '#34D399' },
                  { icon: Flame,      label: '7-day streak bonus',   value: '+20 RP', color: '#F97316' },
                  { icon: Flame,      label: '30-day streak bonus',  value: '+50 RP', color: '#EF4444' },
                  { icon: Shield,     label: 'Complete a challenge', value: '+40 RP', color: '#38BDF8' },
                  { icon: BarChart2,  label: 'Complete a mission',   value: '+10 RP', color: '#A78BFA' },
                  { icon: Clock,      label: 'Log body stats',       value: '+5 RP',  color: 'rgba(255,255,255,0.3)' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 px-4 py-3 border-t hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="flex-1 text-[13px] text-white/55">{label}</span>
                    <span className="text-[13px] font-extrabold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RP History ─────────────────────────────────────────── */}
        {seasonalRank.history.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest px-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Recent RP
            </p>
            {seasonalRank.history.slice(0, 5).map((entry, i) => {
              const d = new Date(entry.createdAt);
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-[14px] border px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${GOLD}18` }}>
                    <Zap size={14} style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white/80 truncate">{entry.reason}</p>
                    <p className="text-[10px] text-white/30">
                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' · '}{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-[15px] font-extrabold tabular-nums" style={{ color: GOLD }}>
                    +{entry.rpGained}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
