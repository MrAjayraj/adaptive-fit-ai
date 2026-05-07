import { useMemo } from 'react';
import type { Workout } from '@/types/fitness';

interface HeatmapProps {
  workouts: Workout[];
}

export function WorkoutHeatmap({ workouts }: HeatmapProps) {
  // Generate last 180 days (approx 6 months)
  const days = 180;
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const calendarMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of workouts) {
      if (w.date && (w.completed || w.status === 'completed')) {
        map.set(w.date, (map.get(w.date) || 0) + 1);
      }
    }
    return map;
  }, [workouts]);

  const cells = useMemo(() => {
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      arr.push({
        date: dateStr,
        count: calendarMap.get(dateStr) || 0,
        dayOfWeek: d.getDay(), // 0 = Sun
      });
    }
    return arr;
  }, [calendarMap, today]);

  // Fill empty days at start to align with Sunday
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - (days - 1));
  const emptyStartDays = startDay.getDay(); // number of empty cells to add
  const gridCells = [...Array(emptyStartDays).fill(null), ...cells];

  // Group by weeks
  const weeks = [];
  for (let i = 0; i < gridCells.length; i += 7) {
    weeks.push(gridCells.slice(i, i + 7));
  }

  const getColor = (count: number) => {
    if (count === 0) return 'rgba(255,255,255,0.05)';
    if (count === 1) return 'rgba(12,255,156,0.4)';
    if (count === 2) return 'rgba(12,255,156,0.7)';
    return '#0CFF9C';
  };

  return (
    <div style={{
      background: 'rgba(20,26,31,0.6)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: 16,
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {weeks.map((week, wIndex) => (
          <div key={wIndex} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {week.map((cell, dIndex) => {
              if (!cell) {
                return <div key={`empty-${dIndex}`} style={{ width: 12, height: 12, borderRadius: 2 }} />;
              }
              return (
                <div
                  key={cell.date}
                  title={`${cell.count} workouts on ${cell.date}`}
                  style={{
                    width: 12, height: 12, borderRadius: 2,
                    background: getColor(cell.count),
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 10, color: '#8899AA' }}>
        <span>Less</span>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(12,255,156,0.4)' }} />
        <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(12,255,156,0.7)' }} />
        <div style={{ width: 10, height: 10, borderRadius: 2, background: '#0CFF9C' }} />
        <span>More</span>
      </div>
    </div>
  );
}
