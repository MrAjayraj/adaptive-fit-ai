import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { calculateBMR, calculateFullCalories } from '@/lib/calories';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Activity, Sparkles, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface Props {
  className?: string;
}

export default function CalorieMacroCard({ className }: Props) {
  const { profile } = useFitness();
  const [expanded, setExpanded] = useState(false);

  if (!profile) return null;

  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender, profile.bodyFat);
  const cal = calculateFullCalories(bmr, profile.goal, profile.activityLevel);

  const total = cal.protein * 4 + cal.carbs * 4 + cal.fat * 9;
  const proteinDeg = (cal.protein * 4 / total) * 360;
  const carbsDeg = (cal.carbs * 4 / total) * 360;

  // Modern HSL gradient donut matching Kinetic Noir Design System
  const donutStyle = {
    background: `conic-gradient(
      #F5C518 0deg ${proteinDeg}deg,
      #00E475 ${proteinDeg}deg ${proteinDeg + carbsDeg}deg,
      #EF4444 ${proteinDeg + carbsDeg}deg 360deg
    )`,
  };

  // Custom AI recommendations depending on goals
  const getNutritionAdvice = (goal: string) => {
    switch(goal) {
      case 'aggressive_cut':
        return 'Maintain high protein intake to defend lean muscle mass. Consume fibrous vegetables to stay satisfied during caloric deficits.';
      case 'lose_fat':
        return 'Prioritize a 500 kcal deficit. Distribute proteins evenly across 4 daily meals to optimize metabolic thermal effects.';
      case 'lean_bulk':
        return 'Fuel workouts with high-quality complex carbs 90 mins prior. Maintain a light 250 kcal surplus to minimize fat gains.';
      case 'build_muscle':
        return 'Target 2.0g+ protein per kg. Consume a slow-digesting protein (like casein) before sleep to optimize overnight muscle repair.';
      default:
        return 'Focus on wholesome whole foods. Drink 3.5L of water daily to support hydration, recovery, and cognitive function.';
    }
  };

  return (
    <div className={`glass-card p-5 shadow-glow hover:border-border/30 transition-all ${className}`}>
      <h3 className="text-[10px] font-bold text-text-3 uppercase tracking-widest mb-4">Daily Fuel Distribution</h3>

      <div className="flex items-center gap-6">
        {/* Dynamic Premium Donut Chart */}
        <div className="relative w-24 h-24 shrink-0 rounded-full flex items-center justify-center p-[2.5px] bg-surface-2 border border-border/10">
          <div className="w-full h-full rounded-full animate-spin-slow opacity-90" style={donutStyle} />
          <div className="absolute inset-[9px] rounded-full bg-surface-1 flex flex-col items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] z-10">
            <span className="text-[20px] font-black text-text-1 leading-none tracking-tighter tabular-nums">{cal.target}</span>
            <span className="text-[8px] text-text-3 uppercase font-bold tracking-widest mt-0.5">kcal</span>
          </div>
        </div>

        {/* High-Fidelity Macro Tracks */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11px] text-text-2 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F5C518] shadow-[0_0_8px_#F5C518]" />
                Protein
              </span>
              <span className="text-[12px] font-black text-text-1 tabular-nums">{cal.protein}g <span className="text-[9px] text-text-3 font-semibold">({cal.proteinPct}%)</span></span>
            </div>
            <div className="h-2 bg-surface-3 rounded-full overflow-hidden p-[1px] border border-border/5">
              <div 
                className="h-full bg-gradient-to-r from-[#F5C518] to-yellow-500 rounded-full" 
                style={{ width: `${cal.proteinPct}%` }} 
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11px] text-text-2 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00E475] shadow-[0_0_8px_#00E475]" />
                Carbohydrates
              </span>
              <span className="text-[12px] font-black text-text-1 tabular-nums">{cal.carbs}g <span className="text-[9px] text-text-3 font-semibold">({cal.carbsPct}%)</span></span>
            </div>
            <div className="h-2 bg-surface-3 rounded-full overflow-hidden p-[1px] border border-border/5">
              <div 
                className="h-full bg-gradient-to-r from-[#00E475] to-emerald-500 rounded-full" 
                style={{ width: `${cal.carbsPct}%` }} 
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11px] text-text-2 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444]" />
                Fats
              </span>
              <span className="text-[12px] font-black text-text-1 tabular-nums">{cal.fat}g <span className="text-[9px] text-text-3 font-semibold">({cal.fatPct}%)</span></span>
            </div>
            <div className="h-2 bg-surface-3 rounded-full overflow-hidden p-[1px] border border-border/5">
              <div 
                className="h-full bg-gradient-to-r from-[#EF4444] to-red-600 rounded-full" 
                style={{ width: `${cal.fatPct}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Structured Info Card Metrics Grid */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <div className="bg-surface-2/40 border border-border/10 rounded-2xl p-2.5 text-center">
          <p className="text-[9px] font-bold text-text-3 uppercase tracking-wider mb-0.5">Basal BMR</p>
          <p className="text-[14px] font-black text-text-1 tabular-nums">{cal.bmr}</p>
        </div>
        <div className="bg-surface-2/40 border border-border/10 rounded-2xl p-2.5 text-center">
          <p className="text-[9px] font-bold text-text-3 uppercase tracking-wider mb-0.5">Active TDEE</p>
          <p className="text-[14px] font-black text-text-1 tabular-nums">{cal.tdee}</p>
        </div>
        <div className="bg-primary/5 border border-primary/25 rounded-2xl p-2.5 text-center shadow-md">
          <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">Target Net</p>
          <p className="text-[14px] font-black text-primary tabular-nums">{cal.target}</p>
        </div>
      </div>

      {/* Expandable Fuel Calculations & Advice Details Section */}
      <div className="mt-4 border-t border-border/20 pt-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between py-1 text-[11px] font-bold text-text-3 hover:text-text-2 transition-colors uppercase tracking-wider"
        >
          <span>Fuel calculations & advice</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3 pt-3"
            >
              <div className="p-3 bg-surface-2/60 border border-border/15 rounded-2xl text-[11px] leading-relaxed text-text-2 space-y-2">
                <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-widest text-[9px]">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                  <span>Personalized Coaching Target</span>
                </div>
                <p>{getNutritionAdvice(profile.goal)}</p>
              </div>

              <div className="p-3 bg-surface-2/30 border border-border/5 rounded-2xl text-[10px] leading-relaxed text-text-3 space-y-1.5">
                <div className="flex justify-between border-b border-border/10 pb-1">
                  <span className="font-bold">BMR Formula</span>
                  <span className="tabular-nums">Katch-McArdle (Body Fat basis)</span>
                </div>
                <div className="flex justify-between border-b border-border/10 pb-1">
                  <span className="font-bold">Activity Modifier</span>
                  <span className="tabular-nums">× {cal.tdee > 0 && cal.bmr > 0 ? (cal.tdee / cal.bmr).toFixed(3) : '1.375'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Caloric Bias</span>
                  <span className="tabular-nums">
                    {profile.goal === 'aggressive_cut' ? '–750 cal (Cut)' :
                     profile.goal === 'lose_fat' ? '–500 cal (Deficit)' :
                     profile.goal === 'lean_bulk' ? '+250 cal (Surplus)' :
                     profile.goal === 'build_muscle' ? '+500 cal (Bulk)' :
                     '0 cal (Maintenance)'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
