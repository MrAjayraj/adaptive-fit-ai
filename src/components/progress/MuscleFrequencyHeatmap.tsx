import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMuscleFrequency } from '@/hooks/useProgressStats';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';

const SVG_WIDTH = 120;
const SVG_HEIGHT = 280;

// Extremely simplified SVG body regions for illustration
const BodyFront = ({ data, getColor }: { data: any, getColor: (muscle: string) => string }) => (
  <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full max-h-[300px] drop-shadow-lg">
    {/* Head/Neck */}
    <path d="M 50 10 C 40 10 40 30 50 35 C 55 37 65 37 70 35 C 80 30 80 10 70 10 Z" fill="#2a2a2a" />
    
    {/* Shoulders (Front Delt) */}
    <path d="M 45 35 Q 30 40 25 55 L 35 60 Q 40 45 50 40 Z" fill={getColor('shoulders')} />
    <path d="M 75 35 Q 90 40 95 55 L 85 60 Q 80 45 70 40 Z" fill={getColor('shoulders')} />
    
    {/* Chest */}
    <path d="M 50 40 L 70 40 Q 80 50 75 65 L 45 65 Q 40 50 50 40 Z" fill={getColor('chest')} />
    
    {/* Biceps */}
    <path d="M 25 55 Q 15 80 20 95 L 30 90 Q 30 70 35 60 Z" fill={getColor('biceps')} />
    <path d="M 95 55 Q 105 80 100 95 L 90 90 Q 90 70 85 60 Z" fill={getColor('biceps')} />
    
    {/* Forearms */}
    <path d="M 20 95 Q 10 120 15 135 L 25 130 Q 25 110 30 90 Z" fill={getColor('forearms')} />
    <path d="M 100 95 Q 110 120 105 135 L 95 130 Q 95 110 90 90 Z" fill={getColor('forearms')} />
    
    {/* Core/Abs */}
    <path d="M 45 65 L 75 65 Q 70 100 65 110 L 55 110 Q 50 100 45 65 Z" fill={getColor('abdominals')} />
    
    {/* Hip Flexors (approximated) */}
    <path d="M 45 100 L 75 100 Q 80 120 60 130 Q 40 120 45 100 Z" fill={getColor('hip flexors')} />
    
    {/* Quads */}
    <path d="M 42 120 Q 30 160 38 190 L 52 185 Q 55 150 58 130 Z" fill={getColor('quads')} />
    <path d="M 78 120 Q 90 160 82 190 L 68 185 Q 65 150 62 130 Z" fill={getColor('quads')} />
    
    {/* Calves (Front visible part, mostly shins but grouped for visual) */}
    <path d="M 38 190 Q 35 220 40 250 L 50 245 Q 45 220 52 185 Z" fill={getColor('calves')} />
    <path d="M 82 190 Q 85 220 80 250 L 70 245 Q 75 220 68 185 Z" fill={getColor('calves')} />
  </svg>
);

const BodyBack = ({ data, getColor }: { data: any, getColor: (muscle: string) => string }) => (
  <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full max-h-[300px] drop-shadow-lg">
    {/* Head/Neck */}
    <path d="M 50 10 C 40 10 40 30 50 35 C 55 37 65 37 70 35 C 80 30 80 10 70 10 Z" fill="#2a2a2a" />
    
    {/* Traps */}
    <path d="M 45 30 L 75 30 L 65 45 L 55 45 Z" fill={getColor('traps')} />
    
    {/* Delts (Rear) */}
    <path d="M 45 35 Q 30 40 25 55 L 35 60 Q 40 45 50 40 Z" fill={getColor('delts')} />
    <path d="M 75 35 Q 90 40 95 55 L 85 60 Q 80 45 70 40 Z" fill={getColor('delts')} />
    
    {/* Lats */}
    <path d="M 35 60 Q 40 90 50 100 L 70 100 Q 80 90 85 60 L 75 65 L 45 65 Z" fill={getColor('lats')} />
    
    {/* Triceps */}
    <path d="M 25 55 Q 15 80 20 95 L 30 90 Q 30 70 35 60 Z" fill={getColor('triceps')} />
    <path d="M 95 55 Q 105 80 100 95 L 90 90 Q 90 70 85 60 Z" fill={getColor('triceps')} />
    
    {/* Lower Back / Spine */}
    <path d="M 50 90 L 70 90 Q 65 110 60 120 L 55 110 Z" fill={getColor('spine')} />
    
    {/* Glutes */}
    <path d="M 40 105 Q 35 125 45 135 L 60 135 L 60 115 Z" fill={getColor('glutes')} />
    <path d="M 80 105 Q 85 125 75 135 L 60 135 L 60 115 Z" fill={getColor('glutes')} />
    
    {/* Hamstrings */}
    <path d="M 42 130 Q 35 160 38 190 L 52 185 Q 55 150 60 135 Z" fill={getColor('hamstrings')} />
    <path d="M 78 130 Q 85 160 82 190 L 68 185 Q 65 150 60 135 Z" fill={getColor('hamstrings')} />
    
    {/* Calves */}
    <path d="M 38 190 Q 25 210 40 250 L 50 245 Q 45 220 52 185 Z" fill={getColor('calves')} />
    <path d="M 82 190 Q 95 210 80 250 L 70 245 Q 75 220 68 185 Z" fill={getColor('calves')} />
  </svg>
);

export function MuscleFrequencyHeatmap() {
  const { user } = useAuth();
  const { data, loading } = useMuscleFrequency(user?.id);
  const [view, setView] = useState<'front' | 'back'>('front');

  const getColor = (muscle: string) => {
    // Normalize muscle names to match database (they might be slightly different in UI)
    const normalizedMuscle = Object.keys(data).find(k => k.toLowerCase().includes(muscle.toLowerCase())) || muscle;
    const freq = data[normalizedMuscle]?.sessions_this_week || 0;
    
    if (freq === 0) return '#2a2a2a'; // Untrained
    if (freq === 1) return '#166534'; // Dim green
    if (freq === 2) return '#16a34a'; // Medium green
    return '#22c55e'; // Bright green (3+)
  };

  const getTooltipContent = (muscle: string) => {
    const normalizedMuscle = Object.keys(data).find(k => k.toLowerCase().includes(muscle.toLowerCase())) || muscle;
    const info = data[normalizedMuscle];
    return info ? `${info.sessions_this_week} sessions` : 'Untrained';
  };

  const chips = [
    { label: 'Chest', key: 'chest' },
    { label: 'Back', key: 'lats' },
    { label: 'Shoulders', key: 'shoulders' },
    { label: 'Arms', key: 'biceps' },
    { label: 'Legs', key: 'quads' },
    { label: 'Core', key: 'abdominals' }
  ];

  return (
    <div className="bg-[#1a1a1a] p-4 rounded-xl shadow-lg border border-white/5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-white flex items-center gap-2">
          <User className="w-5 h-5 text-green-500" />
          Muscle Heatmap
        </h3>
        <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setView('front')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === 'front' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Front
          </button>
          <button
            onClick={() => setView('back')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === 'back' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Back
          </button>
        </div>
      </div>

      <div className="relative flex justify-center py-6 min-h-[300px]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">Loading...</div>
        ) : (
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {view === 'front' ? (
              <BodyFront data={data} getColor={getColor} />
            ) : (
              <BodyBack data={data} getColor={getColor} />
            )}
          </motion.div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {chips.map(chip => (
          <div key={chip.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/30 border border-white/5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(chip.key) }} />
            <span className="text-xs text-gray-400">{chip.label}</span>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-gray-500">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#2a2a2a]"></div> 0</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#166534]"></div> 1</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#16a34a]"></div> 2</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[#22c55e]"></div> 3+</div>
      </div>
    </div>
  );
}
