import { useFitness } from '@/context/FitnessContext';
import {
  ACHIEVEMENT_DEFS, AchievementCategory, AchievementRarity,
  getAchievementProgress,
} from '@/lib/gamification';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';

const CATEGORIES: { key: AchievementCategory; label: string; icon: string }[] = [
  { key: 'strength', label: 'Strength', icon: '🏋️' },
  { key: 'cardio', label: 'Cardio', icon: '🏃' },
  { key: 'consistency', label: 'Consistency', icon: '🔥' },
  { key: 'milestones', label: 'Milestones', icon: '⭐' },
];

const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: 'border-border',
  rare: 'border-accent/50',
  epic: 'border-purple-500/50',
  legendary: 'border-yellow-500/50',
};

const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export default function AchievementsGrid() {
  const { gamification, workouts, progressHistory } = useFitness();
  const { achievements, streak, prs, stepsToday, totalSteps, level } = gamification;
  const [activeCategory, setActiveCategory] = useState<AchievementCategory>('consistency');

  const totalVolume = progressHistory.reduce((s, p) => s + p.totalVolume, 0);
  const workoutCount = workouts.length;
  const prCount = prs.length;
  const unlockedIds = new Set(achievements.filter(a => a.unlockedAt).map(a => a.id));

  const filtered = ACHIEVEMENT_DEFS.filter(a => a.category === activeCategory);

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Achievements</h3>

      <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filtered.map(a => {
          const unlocked = unlockedIds.has(a.id);
          const progress = getAchievementProgress(
            a.id, workoutCount, totalVolume, streak, level, prCount, stepsToday, totalSteps
          );
          const target = a.progressTarget || 1;
          const pct = Math.min(100, (progress / target) * 100);

          return (
            <div
              key={a.id}
              className={`glass-card p-3 transition-all border ${
                unlocked ? `${RARITY_COLORS[a.rarity]} glow-border` : 'border-border/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-xl">{unlocked ? a.icon : '🔒'}</span>
                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  a.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                  a.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                  a.rarity === 'rare' ? 'bg-accent/20 text-accent' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {RARITY_LABELS[a.rarity]}
                </span>
              </div>
              <p className="text-xs font-medium text-foreground">{a.name}</p>
              <p className="text-[9px] text-muted-foreground mb-2">{a.description}</p>
              {!unlocked && a.progressTarget && (
                <div>
                  <div className="flex justify-between text-[9px] mb-0.5">
                    <span className="text-muted-foreground">{Math.round(progress)}/{target}</span>
                    <span className="text-primary">{Math.round(pct)}%</span>
                  </div>
                  <Progress value={pct} className="h-1 bg-muted" />
                </div>
              )}
              {unlocked && (
                <p className="text-[8px] text-primary">✓ Unlocked</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
