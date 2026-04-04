import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { ACHIEVEMENT_DEFS, AchievementCategory, AchievementRarity, getAchievementProgress } from '@/lib/gamification';
import { Progress } from '@/components/ui/progress';

const TABS: { value: AchievementCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'consistency', label: 'Consistency' },
  { value: 'milestones', label: 'Milestones' },
];

const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: 'bg-muted text-muted-foreground',
  rare: 'bg-accent/20 text-accent',
  epic: 'bg-purple-500/20 text-purple-400',
  legendary: 'bg-yellow-500/20 text-yellow-400',
};

const RARITY_BORDER: Record<AchievementRarity, string> = {
  common: 'border-border',
  rare: 'border-accent/30',
  epic: 'border-purple-500/30',
  legendary: 'border-yellow-500/30',
};

export default function Achievements() {
  const { gamification, workouts, progressHistory } = useFitness();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AchievementCategory | 'all'>('all');

  const { achievements, stepsToday, totalSteps, prs, streak, level } = gamification;
  const totalVolume = progressHistory.reduce((s, p) => s + p.totalVolume, 0);
  const workoutCount = workouts.length;

  const unlockedSet = new Set(achievements.filter(a => a.unlockedAt).map(a => a.id));
  const unlockedCount = unlockedSet.size;
  const totalCount = ACHIEVEMENT_DEFS.length;

  const filtered = tab === 'all' ? ACHIEVEMENT_DEFS : ACHIEVEMENT_DEFS.filter(a => a.category === tab);

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Achievements</h1>
          <p className="text-sm text-muted-foreground">{unlockedCount}/{totalCount} Unlocked</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-5 mb-5 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              tab === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="px-5 grid grid-cols-2 gap-3">
        {filtered.map(def => {
          const unlocked = unlockedSet.has(def.id);
          const unlockedAch = achievements.find(a => a.id === def.id);
          const progress = getAchievementProgress(def.id, workoutCount, totalVolume, streak, level, prs.length, stepsToday, totalSteps);
          const progressPct = def.progressTarget ? Math.min((progress / def.progressTarget) * 100, 100) : unlocked ? 100 : 0;

          return (
            <div key={def.id} className={`glass-card p-3 border ${unlocked ? RARITY_BORDER[def.rarity] : 'border-border'} ${unlocked ? 'shadow-[0_0_10px_hsl(var(--glow)_/_0.1)]' : ''} relative`}>
              {/* Rarity badge */}
              <span className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize ${RARITY_COLORS[def.rarity]}`}>
                {def.rarity}
              </span>

              {/* Icon */}
              <div className="flex items-center justify-center mb-2 mt-1">
                {unlocked ? (
                  <span className="text-3xl">{def.icon}</span>
                ) : (
                  <div className="relative">
                    <span className="text-3xl opacity-30 grayscale">{def.icon}</span>
                    <Lock className="w-4 h-4 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                )}
              </div>

              <p className={`text-xs font-medium text-center ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>{def.name}</p>
              <p className="text-[9px] text-muted-foreground text-center mt-0.5 line-clamp-2">{def.description}</p>

              {/* Progress bar */}
              {def.progressTarget && !unlocked && (
                <div className="mt-2">
                  <Progress value={progressPct} className="h-1 bg-muted" />
                  <p className="text-[9px] text-muted-foreground text-center mt-0.5">
                    {Math.round(progress)}/{def.progressTarget}
                  </p>
                </div>
              )}

              {/* Unlock date */}
              {unlocked && unlockedAch?.unlockedAt && (
                <p className="text-[9px] text-primary text-center mt-1">
                  {new Date(unlockedAch.unlockedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
