import { useFitness } from '@/context/FitnessContext';
import { Progress } from '@/components/ui/progress';
import { Zap, CheckCircle2 } from 'lucide-react';

export default function DailyMissions() {
  const { getDailyMissions } = useFitness();
  const missions = getDailyMissions();
  const completedCount = missions.filter(m => m.completed).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Daily Missions</h3>
        <span className="text-xs text-primary font-medium">{completedCount}/{missions.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {missions.map(m => {
          const pct = m.type === 'steps' ? (m.progress / m.target) * 100 : m.completed ? 100 : 0;
          return (
            <div key={m.id} className={`glass-card p-3 transition-all ${m.completed ? 'glow-border' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {m.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                  )}
                  <span className={`text-sm font-medium ${m.completed ? 'text-primary line-through' : 'text-foreground'}`}>
                    {m.title}
                  </span>
                </div>
                <span className="text-xs font-bold text-primary flex items-center gap-0.5">
                  <Zap className="w-3 h-3" />+{m.xpReward}
                </span>
              </div>
              {m.type === 'steps' && !m.completed && (
                <div className="ml-6">
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                    <span>{m.progress.toLocaleString()}</span>
                    <span>{m.target.toLocaleString()}</span>
                  </div>
                  <Progress value={pct} className="h-1 bg-muted" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
