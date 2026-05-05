import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Dot } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useExerciseProgress, useUserExercises } from '@/hooks/useProgressStats';
import { Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function ExerciseProgressChart() {
  const { user } = useAuth();
  const exercises = useUserExercises(user?.id);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [metric, setMetric] = useState<'estimated_1rm' | 'total_volume' | 'max_weight'>('estimated_1rm');

  // Auto-select first exercise when loaded
  React.useEffect(() => {
    if (exercises.length > 0 && !selectedExerciseId) {
      setSelectedExerciseId(exercises[0].id);
    }
  }, [exercises, selectedExerciseId]);

  const { data, loading, error } = useExerciseProgress(selectedExerciseId, user?.id, metric);

  const formattedData = data.map(d => ({
    ...d,
    dateLabel: format(parseISO(d.week_start), 'MMM d'),
    // Use the correct column for each metric (max_weight is now in the view)
    value: metric === 'estimated_1rm'
      ? (d.estimated_1rm ?? 0)
      : metric === 'total_volume'
        ? (d.total_volume ?? 0)
        : ((d as any).max_weight ?? d.estimated_1rm ?? 0),
  }));

  const bestValue = formattedData.length > 0 ? Math.max(...formattedData.map(d => d.value)) : 0;
  const lastWeekValue = formattedData.length > 1 ? formattedData[formattedData.length - 2].value : 0;
  const currentWeekValue = formattedData.length > 0 ? formattedData[formattedData.length - 1].value : 0;
  const changePercent = lastWeekValue > 0 ? ((currentWeekValue - lastWeekValue) / lastWeekValue) * 100 : 0;

  return (
    <div className="bg-[#1a1a1a] p-4 rounded-xl shadow-lg border border-white/5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-green-500" />
          Exercise Progress
        </h3>
        <select 
          className="bg-black/50 text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:border-green-500 max-w-[150px]"
          value={selectedExerciseId || ''}
          onChange={(e) => setSelectedExerciseId(e.target.value)}
        >
          <option value="" disabled>Select exercise</option>
          {exercises.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { id: 'estimated_1rm', label: 'Est. 1RM' },
          { id: 'max_weight', label: 'Max Weight' },
          { id: 'total_volume', label: 'Total Volume' }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id as any)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              metric === m.id 
                ? 'bg-green-500 text-black' 
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="h-48 w-full mb-4">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center text-red-400">Error loading data</div>
        ) : formattedData.length < 3 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            Log more sessions to see your trend
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="dateLabel" 
                stroke="#666" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#666" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dx={-10}
                domain={['auto', 'auto']}
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ color: '#22c55e' }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#22c55e" 
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, index } = props;
                  const isPR = formattedData[index].value === bestValue;
                  return (
                    <Dot 
                      key={index} 
                      cx={cx} 
                      cy={cy} 
                      r={isPR ? 6 : 4} 
                      fill={isPR ? '#eab308' : '#1a1a1a'} 
                      stroke={isPR ? '#eab308' : '#22c55e'} 
                      strokeWidth={2} 
                    />
                  );
                }}
                activeDot={{ r: 6, fill: '#22c55e', stroke: '#1a1a1a', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {formattedData.length > 0 && (
        <div className="flex justify-between items-center bg-black/30 rounded-lg p-3 border border-white/5">
          <div className="text-center flex-1 border-r border-white/5">
            <div className="text-gray-500 text-xs mb-1">Best</div>
            <div className="text-white font-semibold">{Math.round(bestValue)} kg</div>
          </div>
          <div className="text-center flex-1 border-r border-white/5">
            <div className="text-gray-500 text-xs mb-1">Last Week</div>
            <div className="text-white font-semibold">{Math.round(lastWeekValue)} kg</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-gray-500 text-xs mb-1">Change</div>
            <div className={`font-semibold ${changePercent > 0 ? 'text-green-500' : changePercent < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
