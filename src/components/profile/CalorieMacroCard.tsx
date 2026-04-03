import { useFitness } from '@/context/FitnessContext';
import { calculateBMR, calculateFullCalories } from '@/lib/calories';

interface Props {
  className?: string;
}

export default function CalorieMacroCard({ className }: Props) {
  const { profile } = useFitness();
  if (!profile) return null;

  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender, profile.bodyFat);
  const cal = calculateFullCalories(bmr, profile.goal, profile.activityLevel);

  const total = cal.protein * 4 + cal.carbs * 4 + cal.fat * 9;
  const proteinDeg = (cal.protein * 4 / total) * 360;
  const carbsDeg = (cal.carbs * 4 / total) * 360;

  const donutStyle = {
    background: `conic-gradient(
      hsl(145 80% 42%) 0deg ${proteinDeg}deg,
      hsl(200 85% 55%) ${proteinDeg}deg ${proteinDeg + carbsDeg}deg,
      hsl(25 95% 55%) ${proteinDeg + carbsDeg}deg 360deg
    )`,
  };

  return (
    <div className={`glass-card p-5 ${className}`}>
      <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Daily Nutrition Target</h3>

      <div className="flex items-center gap-5">
        {/* Donut chart */}
        <div className="relative w-24 h-24 shrink-0">
          <div className="w-full h-full rounded-full" style={donutStyle} />
          <div className="absolute inset-2 rounded-full bg-card flex flex-col items-center justify-center">
            <span className="text-lg font-display font-bold text-foreground">{cal.target}</span>
            <span className="text-[9px] text-muted-foreground">cal</span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-primary font-medium">Protein</span>
              <span className="text-foreground font-bold">{cal.protein}g</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${cal.proteinPct}%` }} />
            </div>
            <span className="text-[9px] text-muted-foreground">{cal.proteinPct}%</span>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-accent font-medium">Carbs</span>
              <span className="text-foreground font-bold">{cal.carbs}g</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${cal.carbsPct}%` }} />
            </div>
            <span className="text-[9px] text-muted-foreground">{cal.carbsPct}%</span>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-destructive font-medium">Fat</span>
              <span className="text-foreground font-bold">{cal.fat}g</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-destructive rounded-full" style={{ width: `${cal.fatPct}%` }} />
            </div>
            <span className="text-[9px] text-muted-foreground">{cal.fatPct}%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="glass-card p-2">
          <p className="text-xs text-muted-foreground">BMR</p>
          <p className="text-sm font-bold text-foreground">{cal.bmr}</p>
        </div>
        <div className="glass-card p-2">
          <p className="text-xs text-muted-foreground">TDEE</p>
          <p className="text-sm font-bold text-foreground">{cal.tdee}</p>
        </div>
        <div className="glass-card p-2">
          <p className="text-xs text-primary">{cal.label.split('(')[0].trim()}</p>
          <p className="text-sm font-bold text-primary">{cal.target}</p>
        </div>
      </div>

      {profile.bodyFat && (
        <p className="text-[10px] text-muted-foreground mt-2 text-center">Using Katch-McArdle (BF: {profile.bodyFat}%)</p>
      )}
    </div>
  );
}
