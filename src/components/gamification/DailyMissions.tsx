import { useState, useEffect } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Dumbbell, Footprints, Scale, Droplets, Timer, Flame } from 'lucide-react';

export default function DailyMissions() {
  const { getDailyMissions, completeMission } = useFitness();
  const navigate = useNavigate();
  const missions = getDailyMissions();
  const completedCount = missions.filter(m => m.completed).length;
  const allComplete = completedCount === missions.length && missions.length > 0;
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  const missionIcons: Record<string, React.ReactNode> = {
    workout: <Dumbbell className="w-4 h-4" />,
    steps: <Footprints className="w-4 h-4" />,
    weight_log: <Scale className="w-4 h-4" />,
    stretch: <Flame className="w-4 h-4" />,
    hydration: <Droplets className="w-4 h-4" />,
  };

  const handleMissionTap = (m: typeof missions[0]) => {
    if (m.completed) return;
    if (m.type === 'weight_log') navigate('/profile');
    else if (m.type === 'workout') navigate('/workout');
    else if (m.type === 'stretch' || m.type === 'hydration') {
      completeMission(m.id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>🎯</span>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Daily Missions</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Timer className="w-3 h-3" />
          <span>Resets in {timeLeft}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {missions.map(m => {
          const pct = m.target > 1 ? (m.progress / m.target) * 100 : m.completed ? 100 : 0;
          return (
            <button
              key={m.id}
              onClick={() => handleMissionTap(m)}
              className={`glass-card p-3 transition-all text-left ${m.completed ? 'border-primary/30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  m.completed ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {m.completed ? <CheckCircle2 className="w-4 h-4" /> : missionIcons[m.type] || missionIcons.workout}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${m.completed ? 'text-primary line-through' : 'text-foreground'}`}>
                    {m.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{m.description}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                  m.completed ? 'bg-primary/20 text-primary' : 'bg-muted text-primary'
                }`}>
                  {m.completed ? '✓' : `+${m.xpReward}`}
                </span>
              </div>
              {m.target > 1 && !m.completed && (
                <div className="mt-2 ml-11">
                  <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                    <span>{m.progress.toLocaleString()}</span>
                    <span>{m.target.toLocaleString()}</span>
                  </div>
                  <Progress value={pct} className="h-1 bg-muted" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">{completedCount}/{missions.length} Missions Complete</span>
          {allComplete && (
            <span className="text-primary font-bold animate-pulse">🎉 BONUS +100 XP</span>
          )}
        </div>
        <Progress value={(completedCount / Math.max(missions.length, 1)) * 100} className="h-1.5 bg-muted" />
      </div>
    </div>
  );
}
