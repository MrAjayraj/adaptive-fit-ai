// src/components/profile/TrophyShowcase.tsx
// FitPulse — Premium, glowing horizontal trophy carousel for the redesigned Profile page.
import { useFitness } from '@/context/FitnessContext';
import {
  ACHIEVEMENT_DEFS, AchievementCategory, AchievementRarity,
  getAchievementProgress,
} from '@/lib/gamification';
import { Progress } from '@/components/ui/progress';
import { Lock, Trophy, Award, Zap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const RARITY_GRADIENTS: Record<AchievementRarity, string> = {
  common: 'from-surface-3 to-surface-2 border-border/40',
  rare: 'from-surface-2 to-primary/5 border-primary/20 hover:border-primary/40',
  epic: 'from-surface-2 to-purple-500/5 border-purple-500/20 hover:border-purple-500/40',
  legendary: 'from-surface-2 to-yellow-500/10 border-yellow-500/25 hover:border-yellow-500/50',
};

const RARITY_GLOWS: Record<AchievementRarity, string> = {
  common: 'shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
  rare: 'shadow-[0_4px_24px_rgba(0,230,118,0.04)]',
  epic: 'shadow-[0_4px_24px_rgba(139,92,246,0.06)]',
  legendary: 'shadow-[0_4px_30px_rgba(245,197,24,0.08)] animate-pulse-glow',
};

const RARITY_TEXTS: Record<AchievementRarity, string> = {
  common: 'text-text-3',
  rare: 'text-[#00E676]',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400 font-extrabold',
};

export default function TrophyShowcase() {
  const { gamification, workouts, progressHistory } = useFitness();
  const { achievements, streak, prs, stepsToday, totalSteps, level } = gamification;

  const totalVolume = progressHistory.reduce((s, p) => s + p.totalVolume, 0);
  const workoutCount = workouts.length;
  const prCount = prs.length;

  // Set of unlocked IDs
  const unlockedSet = new Set(achievements.filter(a => a.unlockedAt).map(a => a.id));

  // Determine top achievements to display:
  // - Show unlocked ones first (sorted by legendary -> epic -> rare -> common)
  // - Show closest-to-unlock locked ones next
  const sortedShowcase = [...ACHIEVEMENT_DEFS]
    .map(def => {
      const unlocked = unlockedSet.has(def.id);
      const progress = getAchievementProgress(
        def.id, workoutCount, totalVolume, streak, level, prCount, stepsToday, totalSteps
      );
      const target = def.progressTarget || 1;
      const pct = Math.min(100, (progress / target) * 100);
      const unlockedAt = achievements.find(a => a.id === def.id)?.unlockedAt;

      // Priority calculation for ordering:
      // Unlocked Legendary: 100, Epic: 90, Rare: 80, Common: 70
      // Locked: based on progress percentage
      let score = pct;
      if (unlocked) {
        if (def.rarity === 'legendary') score = 500;
        else if (def.rarity === 'epic') score = 400;
        else if (def.rarity === 'rare') score = 300;
        else score = 200;
      }

      return {
        ...def,
        unlocked,
        progress,
        target,
        pct,
        score,
        unlockedAt,
      };
    })
    .sort((a, b) => b.score - a.score);

  const handleCardClick = (name: string, desc: string, unlocked: boolean, rarity: string) => {
    toast.dismiss();
    toast(`${unlocked ? '🏆 Unlocked!' : '🔒 Locked'}`, {
      description: `${name}: ${desc} (${rarity.toUpperCase()})`,
      duration: 3500,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-primary" />
          <h3 className="text-[12px] font-bold text-text-3 uppercase tracking-wider">Trophy Showcase</h3>
        </div>
        <span className="text-[11px] font-semibold text-text-2 bg-surface-2 px-2.5 py-0.5 rounded-full">
          {unlockedSet.size} / {ACHIEVEMENT_DEFS.length}
        </span>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 px-0.5">
        {sortedShowcase.map(trophy => {
          const isLegendary = trophy.rarity === 'legendary';
          const isEpic = trophy.rarity === 'epic';
          const isRare = trophy.rarity === 'rare';

          return (
            <motion.button
              key={trophy.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCardClick(trophy.name, trophy.description, trophy.unlocked, trophy.rarity)}
              className={`shrink-0 w-[150px] p-3.5 rounded-[22px] bg-gradient-to-br text-left border transition-all duration-300 flex flex-col justify-between h-[168px] ${
                trophy.unlocked ? 'opacity-100' : 'opacity-50 hover:opacity-75'
              } ${RARITY_GRADIENTS[trophy.rarity]} ${trophy.unlocked ? RARITY_GLOWS[trophy.rarity] : ''}`}
            >
              {/* Badge Rarity */}
              <div className="flex items-start justify-between w-full">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-surface-3/50 backdrop-blur-md relative ${
                  trophy.unlocked && isLegendary ? 'animate-pulse' : ''
                }`}>
                  {trophy.unlocked ? (
                    <span className="text-xl relative z-10">{trophy.icon}</span>
                  ) : (
                    <>
                      <span className="text-xl grayscale opacity-30 relative z-10">{trophy.icon}</span>
                      <Lock className="w-3.5 h-3.5 text-text-3 absolute z-20" />
                    </>
                  )}
                  {trophy.unlocked && (isLegendary || isEpic) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                  )}
                </div>

                <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-surface-3/60 backdrop-blur-md border border-border/20 ${RARITY_TEXTS[trophy.rarity]}`}>
                  {trophy.rarity}
                </span>
              </div>

              {/* Text Info */}
              <div className="mt-3 flex-1 flex flex-col justify-end">
                <h4 className="text-[12px] font-bold text-text-1 leading-snug line-clamp-1">
                  {trophy.name}
                </h4>
                <p className="text-[9px] text-text-2 leading-snug line-clamp-2 mt-0.5 min-h-[24px]">
                  {trophy.description}
                </p>

                {/* Progress Indicators */}
                <div className="mt-2.5 w-full">
                  {!trophy.unlocked && trophy.progressTarget ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-semibold tracking-wider text-text-3">
                        <span>{Math.round(trophy.progress)}/{trophy.target}</span>
                        <span>{Math.round(trophy.pct)}%</span>
                      </div>
                      <div className="h-1 w-full bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${
                            isLegendary ? 'from-yellow-400 to-amber-500' :
                            isEpic ? 'from-purple-500 to-indigo-500' :
                            isRare ? 'from-[#00E676] to-[#00BFA5]' :
                            'from-text-3 to-text-2'
                          }`}
                          style={{ width: `${trophy.pct}%` }}
                        />
                      </div>
                    </div>
                  ) : trophy.unlocked ? (
                    <div className="flex items-center gap-1 text-[8px] font-bold text-[#00E676] uppercase tracking-wider">
                      <Sparkles className="w-2.5 h-2.5 text-yellow-400" />
                      <span>Unlocked</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[8px] font-bold text-text-3 uppercase tracking-wider">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Locked</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
