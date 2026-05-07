import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flame } from 'lucide-react';
import type { TrackerItem, TrackerCompletion } from '@/services/dailyTrackerService';

interface HabitStreaksProps {
  userId: string;
}

export function HabitStreaks({ userId }: HabitStreaksProps) {
  const [trackers, setTrackers] = useState<TrackerItem[]>([]);
  const [completions, setCompletions] = useState<TrackerCompletion[]>([]);

  useEffect(() => {
    async function load() {
      const { data: items } = await supabase
        .from('tracker_items')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
        
      const { data: comps } = await supabase
        .from('tracker_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('completion_date', { ascending: false });

      if (items) setTrackers(items as TrackerItem[]);
      if (comps) setCompletions(comps as TrackerCompletion[]);
    }
    load();
  }, [userId]);

  const streaks = useMemo(() => {
    if (!trackers.length) return [];
    
    // Calculate current streak for each tracker
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = new Date(Date.now() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = new Date(yesterday.getTime() - yesterday.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    return trackers.map(tracker => {
      const tComps = completions.filter(c => c.tracker_id === tracker.id);
      let streak = 0;
      let checkDate = new Date(today);

      // Check if completed today
      const completedToday = tComps.some(c => c.completion_date === todayStr);
      
      // If not completed today, start checking from yesterday
      if (!completedToday) {
        const completedYesterday = tComps.some(c => c.completion_date === yesterdayStr);
        if (!completedYesterday) return { ...tracker, streak: 0 };
        checkDate = new Date(yesterday);
      }

      while (true) {
        const dStr = new Date(checkDate.getTime() - checkDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        if (tComps.some(c => c.completion_date === dStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      
      return { ...tracker, streak };
    }).sort((a, b) => b.streak - a.streak); // Sort by highest streak
  }, [trackers, completions]);

  if (streaks.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
      {streaks.map(t => (
        <div key={t.id} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: t.streak > 0 ? 'rgba(255,184,0,0.15)' : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16
          }}>
            {t.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#EAEEF2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.title}
            </div>
            <div style={{ fontSize: 12, color: t.streak > 0 ? '#FFB800' : '#8899AA', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontWeight: t.streak > 0 ? 700 : 500 }}>
              <Flame size={12} fill={t.streak > 0 ? '#FFB800' : 'none'} />
              {t.streak} day{t.streak !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
