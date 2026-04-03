import { useFitness } from '@/context/FitnessContext';
import { XP_SOURCES, getLevelTier, xpForLevel, xpForNextLevel } from '@/lib/gamification';
import { Progress } from '@/components/ui/progress';
import { Zap } from 'lucide-react';

export default function XPBreakdownCard() {
  const { gamification } = useFitness();
  const { xp, level } = gamification;
  const tier = getLevelTier(level);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForNextLevel(level);
  const xpProgress = nextLevelXP > currentLevelXP
    ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">XP Breakdown</h3>

      <div className="flex items-center gap-3 mb-3">
        <div className="text-3xl">{tier.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold capitalize ${tier.color}`}>{tier.tier}</span>
            <span className="text-lg font-display font-bold text-foreground">Lv.{level}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>{xp - currentLevelXP} / {nextLevelXP - currentLevelXP} XP to next</span>
          </div>
          <Progress value={xpProgress} className="h-2 bg-muted" />
        </div>
      </div>

      <div className="space-y-1.5">
        {XP_SOURCES.map(s => (
          <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
            <span className="text-xs text-foreground">{s.label}</span>
            <span className="text-xs font-bold text-primary flex items-center gap-1">
              <Zap className="w-3 h-3" />+{s.xp}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
