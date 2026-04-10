import { motion } from 'framer-motion';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import {
  getActiveSeason, TIER_META, TIER_ORDER, TIER_THRESHOLDS,
  tierProgressPct, rpToNextTier, getDivisionFromRP, getTierFromRP,
} from '@/lib/seasonal-rank';
import { ChevronRight, Flame } from 'lucide-react';

export default function RankBadgeCard() {
  const { seasonalRank } = useFitness();
  const navigate = useNavigate();
  const season = getActiveSeason();

  const { rp, tier, division } = seasonalRank.userRank;
  const meta = TIER_META[tier];
  const pct = tierProgressPct(rp);
  const { needed, next } = rpToNextTier(rp);
  const nextMeta = next ? TIER_META[next] : null;

  // Days remaining in season
  const endsAt = new Date(season.endsAt);
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <motion.button
      onClick={() => navigate('/rank')}
      className="w-full relative bg-surface-1 rounded-[24px] border border-border-subtle overflow-hidden text-left p-4"
      whileTap={{ scale: 0.99 }}
    >
      {/* Glow blob matching tier color */}
      <div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-[50px] pointer-events-none"
        style={{ background: meta.glow }}
      />

      {/* Season label */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: meta.color }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
            {season.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-text-3" />
          <span className="text-[10px] text-text-3">{daysLeft}d left</span>
          <ChevronRight className="w-3 h-3 text-text-3 ml-1" />
        </div>
      </div>

      {/* Rank badge + info */}
      <div className="flex items-center gap-4 relative z-10">
        {/* Badge */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-[32px] shrink-0 border-2"
          style={{
            background: `${meta.color}18`,
            borderColor: `${meta.color}40`,
            boxShadow: `0 4px 20px ${meta.glow}`,
          }}
        >
          {meta.icon}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <h3 className="text-[22px] font-extrabold leading-none" style={{ color: meta.color }}>
              {meta.label}
            </h3>
            <span className="text-[13px] font-bold text-text-3">IV — I</span>
            <span
              className="text-[12px] font-extrabold px-2 py-0.5 rounded-full"
              style={{ background: `${meta.color}20`, color: meta.color }}
            >
              Div {division}
            </span>
          </div>
          <p className="text-[12px] text-text-2 font-semibold mb-2">
            {rp.toLocaleString()} RP
            {nextMeta && (
              <span className="text-text-3 font-normal"> · {needed} to {nextMeta.label}</span>
            )}
          </p>

          {/* Progress bar */}
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: meta.color }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 20 }}
            />
          </div>

          {/* Tier nodes mini-row */}
          <div className="flex items-center justify-between mt-2">
            {TIER_ORDER.map(t => {
              const m = TIER_META[t];
              const reached = rp >= TIER_THRESHOLDS[t];
              const isCurrent = t === tier;
              return (
                <div key={t} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] border"
                    style={{
                      background: reached ? `${m.color}30` : 'transparent',
                      borderColor: isCurrent ? m.color : reached ? `${m.color}60` : 'rgba(255,255,255,0.1)',
                      boxShadow: isCurrent ? `0 0 6px ${m.glow}` : 'none',
                    }}
                  >
                    {reached ? m.icon : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.button>
  );
}
