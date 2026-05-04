import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePersonalRecordsBoard } from '@/hooks/useProgressStats';
import { Trophy, ChevronRight, TrendingUp } from 'lucide-react';
import { format, formatDistanceToNow, isAfter, subDays } from 'date-fns';
import { motion } from 'framer-motion';

export function PersonalRecordsBoard() {
  const { user } = useAuth();
  const { data, loading } = usePersonalRecordsBoard(user?.id);
  const [filter, setFilter] = useState<'all' | 'month' | 'recent'>('all');

  const now = new Date();
  
  const filteredData = data.filter(pr => {
    const date = new Date(pr.achieved_at);
    if (filter === 'month') return isAfter(date, subDays(now, 30));
    if (filter === 'recent') return isAfter(date, subDays(now, 7));
    return true;
  });

  const getRecordLabel = (type: string) => {
    switch(type) {
      case '1rm_estimated': return 'Est. 1RM';
      case 'max_weight': return 'Max Weight';
      case 'max_volume_session': return 'Best Volume';
      default: return type;
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl shadow-lg border border-white/5 mb-6 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-semibold text-lg text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Personal Records
        </h3>
        <div className="flex bg-black/50 rounded-lg p-1 border border-white/10 self-start sm:self-auto">
          {['all', 'month', 'recent'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
                filter === f ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2">
        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading records...</div>
        ) : filteredData.length === 0 ? (
          <div className="py-8 text-center px-4">
            <Trophy className="w-8 h-8 text-gray-600 mx-auto mb-3 opacity-50" />
            <p className="text-gray-400 text-sm">Complete a workout to start tracking your PRs.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredData.map((pr, i) => {
              const isNew = isAfter(new Date(pr.achieved_at), subDays(now, 7));
              
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={pr.id} 
                  className="bg-black/20 hover:bg-black/40 transition-colors p-3 rounded-lg border border-white/5 flex items-center group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mr-4 flex-shrink-0">
                    <Trophy className={`w-5 h-5 ${isNew ? 'text-yellow-500' : 'text-green-500'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-medium truncate">{pr.exercise_name}</h4>
                      {isNew && (
                        <span className="bg-green-500/20 text-green-400 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">{getRecordLabel(pr.record_type)}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500">{formatDistanceToNow(new Date(pr.achieved_at))} ago</span>
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="text-xl font-bold text-white">{Math.round(pr.value)} <span className="text-xs text-gray-500 font-normal">kg</span></div>
                    {/* Small sparkline could go here, replacing it with a View Progress button for now to match PM spec simplistically */}
                    <div className="text-[10px] text-green-500 flex items-center justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      View <ChevronRight className="w-3 h-3 ml-0.5" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
