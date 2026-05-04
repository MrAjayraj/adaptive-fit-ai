import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useMuscleVolume } from '@/hooks/useProgressStats';
import { Activity } from 'lucide-react';

export function MuscleVolumeBreakdown() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const { data, loading } = useMuscleVolume(user?.id, period);

  const totalVolume = data.reduce((acc, curr) => acc + curr.volume, 0);
  
  const chartData = data.map(d => ({
    ...d,
    percentage: totalVolume > 0 ? Math.round((d.volume / totalVolume) * 100) : 0,
    // Format muscle name (capitalize)
    displayName: d.muscle.charAt(0).toUpperCase() + d.muscle.slice(1)
  })).slice(0, 8); // Show top 8

  const mostTrained = chartData.length > 0 ? chartData[0].displayName : '-';
  const leastTrained = chartData.length > 0 ? chartData[chartData.length - 1].displayName : '-';

  return (
    <div className="bg-[#1a1a1a] p-4 rounded-xl shadow-lg border border-white/5 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" />
          Muscle Volume
        </h3>
        <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setPeriod('week')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${period === 'week' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Week
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${period === 'month' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Month
          </button>
        </div>
      </div>

      <div className="h-64 w-full mb-4">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-gray-500">Loading...</div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            No volume data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="displayName" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }} 
                width={80}
              />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                formatter={(value: number) => [`${Math.round(value)} kg`, 'Volume']}
              />
              <Bar dataKey="volume" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#9ca3af', fontSize: 12, formatter: (val: number, entry: any) => `${entry.payload.percentage}%` }}>
                {chartData.map((entry, index) => {
                  // Color intensity based on position (0 is highest volume)
                  const intensity = Math.max(0.4, 1 - (index * 0.1));
                  return <Cell key={`cell-${index}`} fill={`rgba(34, 197, 94, ${intensity})`} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex gap-2">
        <div className="bg-black/30 rounded-lg p-2 border border-white/5 flex-1 text-center">
          <div className="text-gray-500 text-xs mb-1">Most Trained</div>
          <div className="text-green-500 font-medium text-sm">{mostTrained}</div>
        </div>
        <div className="bg-black/30 rounded-lg p-2 border border-white/5 flex-1 text-center">
          <div className="text-gray-500 text-xs mb-1">Least Trained</div>
          <div className="text-gray-400 font-medium text-sm">{leastTrained}</div>
        </div>
      </div>
    </div>
  );
}
