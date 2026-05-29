import { useFitness } from '@/context/FitnessContext';
import { XP_SOURCES, getLevelTier, xpForLevel, xpForNextLevel } from '@/lib/gamification';
import { Zap, Award, Sparkles, TrendingUp, CheckCircle } from 'lucide-react';

export default function XPBreakdownCard() {
  const { gamification } = useFitness();
  const { xp, level, streak } = gamification;
  
  const tier = getLevelTier(level);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForNextLevel(level);
  const xpProgress = nextLevelXP > currentLevelXP
    ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;

  // Visual icons for different source multipliers
  const getSourceIcon = (label: string) => {
    if (label.includes('workout')) return <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />;
    if (label.includes('PR')) return <Award className="w-3.5 h-3.5 text-primary shrink-0" />;
    if (label.includes('streak')) return <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />;
    return <Zap className="w-3.5 h-3.5 text-primary shrink-0" />;
  };

  // Dynamic calculations for the athlete's current efficiency status
  const currentStreakBonus = Math.min(100, streak * 10);

  return (
    <div className="glass-card p-5 shadow-glow hover:border-border/30 transition-all">
      <h3 className="text-[10px] font-bold text-text-3 uppercase tracking-widest mb-4">Level Progress & Multipliers</h3>

      {/* Identity status card row */}
      <div className="flex items-center gap-4 bg-surface-2/40 border border-border/10 p-3.5 rounded-2xl mb-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient(circle at top right, rgba(245,197,24,0.01), transparent 60%) pointer-events-none" />
        <div className="text-[32px] w-12 h-12 flex items-center justify-center bg-surface-3/50 rounded-xl border border-border/5 shadow-inner select-none leading-none">
          {tier.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`text-[12px] font-black uppercase tracking-wider ${tier.color}`}>{tier.tier}</span>
            <span className="text-[18px] font-black text-text-1 tabular-nums">Level {level}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-3 font-semibold mt-1">
            <span>{xp - currentLevelXP} / {nextLevelXP - currentLevelXP} XP to Next</span>
            <span className="text-primary">{Math.round(xpProgress)}%</span>
          </div>
          
          {/* High-Fidelity Custom Progress Track */}
          <div className="h-2 w-full bg-surface-3 rounded-full overflow-hidden p-[1px] border border-border/5 mt-2">
            <div 
              className="h-full bg-gradient-to-r from-primary to-yellow-500 rounded-full shadow-[0_0_8px_#F5C518]" 
              style={{ width: `${xpProgress}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Gamified allocation sources checklist */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase font-bold text-text-3 tracking-widest px-0.5">XP Core Allocations</p>
        
        {XP_SOURCES.map(s => {
          // Highlight active multiplier fields
          const isStreakBonus = s.label.includes('streak');
          const isPR = s.label.includes('PR');

          return (
            <div 
              key={s.label} 
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                isStreakBonus && streak > 1 
                  ? 'border-primary/20 bg-primary/5 shadow-sm shadow-primary/5' 
                  : 'border-border/10 bg-surface-2/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-surface-3/40 border border-border/5 flex items-center justify-center">
                  {getSourceIcon(s.label)}
                </div>
                <div>
                  <span className="text-[12px] font-bold text-text-1 leading-none">{s.label}</span>
                  {isStreakBonus && streak > 1 && (
                    <span className="text-[8px] font-bold uppercase tracking-widest text-primary flex items-center gap-1 mt-0.5 animate-pulse">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{streak}d Active bonus! (+{currentStreakBonus} XP)</span>
                    </span>
                  )}
                  {isPR && gamification.prs.length > 0 && (
                    <p className="text-[8px] text-text-3 font-semibold mt-0.5 uppercase tracking-wide">
                      {gamification.prs.length} Records Locked In 🏆
                    </p>
                  )}
                </div>
              </div>
              <span className="text-[12px] font-black text-primary flex items-center gap-0.5 tabular-nums">
                +{s.xp} <span className="text-[9px] text-text-3 font-semibold">XP</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
