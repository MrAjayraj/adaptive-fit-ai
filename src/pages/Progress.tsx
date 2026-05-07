import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Dumbbell, Flame, Clock, Target, BarChart2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFitness } from '@/context/FitnessContext';
import { useAuth } from '@/context/AuthContext';
import { getWeeklyProgress, getActivityBreakdown } from '@/services/workoutService';
import type { WeeklyProgress, ActivityBreakdown } from '@/services/workoutService';
import { getMoodHistory, getScoreHistory, getAllTrackerCompletions } from '@/services/dailyTrackerService';
import type { MoodLog, DailyScore, TrackerCompletion } from '@/services/dailyTrackerService';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/layout/BottomNav';
import { ExerciseProgressChart } from '@/components/progress/ExerciseProgressChart';
import { MuscleVolumeBreakdown } from '@/components/progress/MuscleVolumeBreakdown';

import { PersonalRecordsBoard } from '@/components/progress/PersonalRecordsBoard';
import { WorkoutHeatmap } from '@/components/progress/WorkoutHeatmap';
import { HabitStreaks } from '@/components/progress/HabitStreaks';
// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT      = '#0CFF9C';
const BG          = '#0C1015';
const SURFACE     = '#141A1F';
const SURFACE_UP  = '#1C2429';
const T1          = '#EAEEF2';
const T2          = '#8899AA';
const T3          = '#4A5568';
const GREEN_GLOW  = 'rgba(12,255,156,0.1)';

// ─── Donut chart helpers ──────────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end   = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

// ─── Small circular consistency ring ─────────────────────────────────────────
function ConsistencyRing({ pct }: { pct: number }) {
  const r = 13;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" style={{ display: 'block' }}>
      <circle cx={16} cy={16} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
      <circle
        cx={16} cy={16} r={r}
        fill="none"
        stroke={ACCENT}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        transform="rotate(-90 16 16)"
      />
    </svg>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
const BREAKDOWN_COLORS = {
  strength: ACCENT,
  cardio: '#EF4444',
  skill: '#F59E0B',
  other: '#6366F1',
};
const BREAKDOWN_LABELS = ['strength', 'cardio', 'skill', 'other'] as const;

function DonutChart({ breakdown }: { breakdown: ActivityBreakdown | null }) {
  const cx = 70, cy = 70, r = 55;
  const total = breakdown?.totalMinutes ?? 0;

  if (!breakdown || total === 0) {
    return (
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={18} />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={T1} fontSize={13} fontWeight={700}>0 min</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill={T3} fontSize={10}>Total</text>
      </svg>
    );
  }

  const segments: { key: typeof BREAKDOWN_LABELS[number]; value: number }[] = BREAKDOWN_LABELS
    .map(k => ({ key: k, value: breakdown[k] }))
    .filter(s => s.value > 0);

  let currentDeg = 0;
  const paths = segments.map(seg => {
    const sweep = (seg.value / total) * 360;
    const startDeg = currentDeg;
    const endDeg   = currentDeg + sweep;
    currentDeg = endDeg;
    // Add a tiny gap between segments for visual separation
    const path = describeArc(cx, cy, r, startDeg + 1, endDeg - 1 > startDeg + 1 ? endDeg - 1 : endDeg);
    return { key: seg.key, path };
  });

  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      {/* Background ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={18} />
      {paths.map(seg => (
        <path
          key={seg.key}
          d={seg.path}
          stroke={BREAKDOWN_COLORS[seg.key]}
          strokeWidth={18}
          fill="none"
          strokeLinecap="butt"
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={T1} fontSize={13} fontWeight={700}>
        {total} min
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={T3} fontSize={10}>
        Total
      </text>
    </svg>
  );
}

// ─── Weight line chart ────────────────────────────────────────────────────────
function WeightLineChart({ data }: { data: { weight: number; logged_at: string }[] }) {
  const W = 308, H = 100;
  if (data.length < 2) return null;

  const weights = data.map(d => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (W - 16) + 8;
    const y = H - 16 - ((d.weight - minW) / range) * (H - 32);
    return { x, y };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%' }}>
      <defs>
        <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} />
          <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path
        d={`${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`}
        fill="url(#wGrad)"
      />
      {/* Line */}
      <path d={linePath} stroke={ACCENT} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={ACCENT} stroke={BG} strokeWidth={2} />
      ))}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Progress() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { workouts, weightLogs, profile, progressHistory } = useFitness();

  const [activePeriod, setActivePeriod] = useState<'week' | 'month' | 'year'>('week');
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null);
  const [breakdown, setBreakdown]           = useState<ActivityBreakdown | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [moodHistory, setMoodHistory]       = useState<MoodLog[]>([]);
  const [scoreHistory, setScoreHistory]     = useState<DailyScore[]>([]);
  const [trackerComps, setTrackerComps]     = useState<any[]>([]);

  // Derived: week ago date string
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const days = activePeriod === 'week' ? 7 : activePeriod === 'month' ? 30 : 365;
    Promise.all([
      getWeeklyProgress(user.id),
      getActivityBreakdown(user.id, days),
      getMoodHistory(user.id, days),
      getScoreHistory(user.id, days),
    ]).then(([wp, bd, mh, sh]) => {
      setWeeklyProgress(wp);
      setBreakdown(bd);
      setMoodHistory(mh);
      setScoreHistory(sh);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [user, activePeriod]);

  // Derived workout data — normalise across BOTH systems
  // System A sets completed=true; System B sets status='completed'.
  // After our fix both flags should be in sync, but keep both checks as a safety net.
  const completedWorkouts = workouts.filter(
    w => w.completed || (w as unknown as Record<string, unknown>)['status'] === 'completed'
  );
  const weekWorkouts      = completedWorkouts.filter(w => w.date >= weekAgo);

  // Stat values
  const statWorkouts    = weeklyProgress?.workoutCount ?? weekWorkouts.length;
  const statCalories    = weeklyProgress?.totalCalories ?? 0;
  const statMinutes     = weeklyProgress?.totalMinutes ?? 0;
  const statConsistency = weeklyProgress?.consistencyPct ?? 0;

  const caloriesDisplay = statCalories > 1000
    ? `${(statCalories / 1000).toFixed(1)}k`
    : String(statCalories);

  // Activity breakdown total for legend percentages
  const bdTotal = breakdown?.totalMinutes ?? 0;

  // Weight chart data (last 10, oldest first for chart left→right)
  const weightChartData = [...weightLogs].reverse().slice(-10);
  const latestWeight    = weightLogs[0]?.weight;

  // Recent completed workouts
  const recentWorkouts = completedWorkouts
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // ── Styles ────────────────────────────────────────────────────────────────
  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    color: T3,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '16px 16px 8px',
  };

  const card: React.CSSProperties = {
    background: SURFACE,
    borderRadius: 14,
    margin: '0 16px',
    padding: 16,
    border: '1px solid rgba(255,255,255,0.06)',
  };

  return (
    <div style={{ background: BG, minHeight: '100dvh', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(12,16,21,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 0,
      }}>
        {/* Title row */}
        <div style={{
          padding: 'max(16px, env(safe-area-inset-top)) 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0, color: T2 }}
          >
            <ArrowLeft size={20} />
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 800, color: T1, letterSpacing: '-0.01em' }}>
            Progress
          </span>
          <TrendingUp size={20} color={T2} />
        </div>

        {/* Period tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '12px 16px 0' }}>
          {(['week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: activePeriod === p ? ACCENT : T2,
                paddingBottom: 12,
                borderBottom: activePeriod === p ? `2px solid ${ACCENT}` : '2px solid transparent',
                transition: 'color 0.18s, border-color 0.18s',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>

        {/* ── SECTION 1: This Week Overview ─────────────────────────────────── */}
        <div style={sectionLabel}>This Week</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          style={card}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Workouts */}
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T1, lineHeight: 1.1 }}>
                {statWorkouts}
              </div>
              <div style={{ fontSize: 11, color: T3, marginTop: 4 }}>Workouts</div>
            </div>

            {/* Calories */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={15} color={ACCENT} />
                <span style={{ fontSize: 22, fontWeight: 800, color: T1, lineHeight: 1.1 }}>
                  {caloriesDisplay}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T3, marginTop: 4 }}>Calories</div>
            </div>

            {/* Minutes */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={15} color={T3} />
                <span style={{ fontSize: 22, fontWeight: 800, color: T1, lineHeight: 1.1 }}>
                  {statMinutes}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T3, marginTop: 4 }}>Minutes</div>
            </div>

            {/* Consistency */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ConsistencyRing pct={statConsistency} />
                <span style={{ fontSize: 22, fontWeight: 800, color: T1, lineHeight: 1.1 }}>
                  {statConsistency}%
                </span>
              </div>
              <div style={{ fontSize: 11, color: T3, marginTop: 4 }}>Consistency</div>
            </div>

            {/* Completion Rate */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={15} color={ACCENT} />
                <span style={{ fontSize: 22, fontWeight: 800, color: T1, lineHeight: 1.1 }}>
                  {workouts.filter(w => w.completed || w.status === 'completed').length > 0 
                    ? Math.round((workouts.filter(w => w.completed || w.status === 'completed').length / Math.max(1, workouts.filter(w => w.date && w.date <= new Date().toISOString().split('T')[0]).length)) * 100)
                    : 0}%
                </span>
              </div>
              <div style={{ fontSize: 11, color: T3, marginTop: 4 }}>Completion Rate</div>
            </div>

          </div>
        </motion.div>

        {/* ── SECTION 2: Habit/Tracker Streaks ──────────────────────────────── */}
        <div style={sectionLabel}>Daily Habits</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.05 }}
        >
          {user && <HabitStreaks userId={user.id} />}
        </motion.div>

        {/* ── SECTION 3: Activity Breakdown ─────────────────────────────────── */}
        <div style={sectionLabel}>Activity Breakdown</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1 }}
          style={{ ...card, padding: '16px 12px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Donut chart */}
            <div style={{ width: 140, flexShrink: 0 }}>
              <DonutChart breakdown={breakdown} />
            </div>

            {/* Legend */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 8 }}>
              {BREAKDOWN_LABELS.map(key => {
                const value = breakdown?.[key] ?? 0;
                if (value === 0 && bdTotal > 0) return null;
                const pct = bdTotal > 0 ? Math.round((value / bdTotal) * 100) : 0;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: BREAKDOWN_COLORS[key],
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12, color: T2, flex: 1, textTransform: 'capitalize' }}>{key}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T1 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
              {bdTotal === 0 && (
                <span style={{ fontSize: 12, color: T3 }}>No data yet</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── SECTION 4: Heatmap ────────────────────────────────────────────── */}
        <div style={sectionLabel}>Workout Heatmap (180 Days)</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.15 }}
        >
          <WorkoutHeatmap workouts={workouts} />
        </motion.div>

        {/* ── SECTION 3: Weight Progress ──────────────────────────────────────── */}
        <div style={sectionLabel}>Weight History</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1 }}
          style={card}
        >
          {weightLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 13, color: T3, marginBottom: 12 }}>No weight data yet</div>
              <button
                onClick={() => navigate('/profile')}
                style={{
                  background: GREEN_GLOW,
                  border: `1px solid ${ACCENT}`,
                  borderRadius: 8,
                  color: ACCENT,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '8px 20px',
                  cursor: 'pointer',
                }}
              >
                Log Weight
              </button>
            </div>
          ) : (
            <div>
              {weightChartData.length >= 2 ? (
                <div style={{ overflow: 'hidden', borderRadius: 8 }}>
                  <WeightLineChart data={weightChartData} />
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T1 }}>
                    {latestWeight != null ? `${latestWeight} kg` : '--'}
                  </div>
                  <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>Latest weight</div>
                </div>
                {weightLogs.length >= 2 && (() => {
                  const diff = weightLogs[0].weight - weightLogs[weightLogs.length - 1].weight;
                  const diffAbs = Math.abs(diff).toFixed(1);
                  const isDown = diff < 0;
                  return (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: isDown ? ACCENT : '#EF4444',
                      }}>
                        {isDown ? '↓' : '↑'} {diffAbs} kg
                      </div>
                      <div style={{ fontSize: 11, color: T3 }}>All time</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </motion.div>

        {/* ── SECTION 4: Mood Trend ──────────────────────────────────────────── */}
        <div style={sectionLabel}>Mood Trend</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.15 }}
          style={card}
        >
          {moodHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>😐</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T2 }}>No mood data yet</div>
              <div style={{ fontSize: 12, color: T3, marginTop: 4 }}>Log your mood on the Home tab to see trends here</div>
            </div>
          ) : (() => {
            const W = 308, H = 80;
            const pts = moodHistory.map((d, i) => ({
              x: (i / Math.max(moodHistory.length - 1, 1)) * (W - 20) + 10,
              y: H - 10 - ((d.mood_score - 1) / 4) * (H - 20),
              score: d.mood_score,
            }));
            const MOOD_COLORS = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#0CFF9C'];
            const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            const avg = moodHistory.reduce((s, m) => s + m.mood_score, 0) / moodHistory.length;
            const trend = moodHistory.length > 1
              ? moodHistory[moodHistory.length - 1].mood_score - moodHistory[0].mood_score
              : 0;
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: T1 }}>{avg.toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>Avg mood (1–5)</div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700,
                    color: trend > 0 ? '#22C55E' : trend < 0 ? '#EF4444' : T3,
                    background: trend > 0 ? 'rgba(34,197,94,0.1)' : trend < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                    padding: '4px 10px', borderRadius: 8,
                  }}>
                    {trend > 0 ? '↑ Improving' : trend < 0 ? '↓ Declining' : '→ Stable'}
                  </div>
                </div>
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
                  {[1,2,3,4,5].map(v => {
                    const y = H - 10 - ((v - 1) / 4) * (H - 20);
                    return <line key={v} x1={10} y1={y} x2={W - 10} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />;
                  })}
                  <path d={linePath} stroke={ACCENT} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  {pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={5} fill={MOOD_COLORS[p.score]} stroke={BG} strokeWidth={2} />
                  ))}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {['😫','😟','😐','😊','🤩'].map((e, i) => (
                    <span key={i} style={{ fontSize: 14 }}>{e}</span>
                  ))}
                </div>
              </>
            );
          })()}
        </motion.div>

        {/* ── SECTION 5: Daily Score Trend ───────────────────────────────────── */}
        <div style={sectionLabel}>Daily Wellness Score</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.2 }}
          style={card}
        >
          {scoreHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T2 }}>No score data yet</div>
              <div style={{ fontSize: 12, color: T3, marginTop: 4 }}>Complete your daily trackers to start building your wellness score</div>
            </div>
          ) : (() => {
            const W = 308, H = 80;
            const pts = scoreHistory.map((d, i) => ({
              x: (i / Math.max(scoreHistory.length - 1, 1)) * (W - 20) + 10,
              y: H - 10 - (d.total_score / 100) * (H - 20),
              score: d.total_score,
            }));
            const scoreColor = (s: number) => s >= 70 ? '#0CFF9C' : s >= 40 ? '#EAB308' : '#EF4444';
            const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            const avgScore = Math.round(scoreHistory.reduce((s, d) => s + d.total_score, 0) / scoreHistory.length);
            const best = Math.max(...scoreHistory.map(d => d.total_score));
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(avgScore) }}>{avgScore}</div>
                    <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>Avg score</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0CFF9C' }}>🏆 {best}</div>
                    <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>Best day</div>
                  </div>
                </div>
                <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${linePath} L ${pts[pts.length-1].x} ${H} L ${pts[0].x} ${H} Z`}
                    fill="url(#scoreGrad)"
                  />
                  <path d={linePath} stroke={ACCENT} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  {pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={4} fill={scoreColor(p.score)} stroke={BG} strokeWidth={2} />
                  ))}
                </svg>
                <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T1 }}>
                      {Math.round(scoreHistory.reduce((s, d) => s + d.task_completion_pct, 0) / scoreHistory.length)}%
                    </div>
                    <div style={{ fontSize: 10, color: T3, marginTop: 1 }}>Avg tracker completion</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T1 }}>
                      {scoreHistory.filter(d => d.workout_completed).length}/{scoreHistory.length}
                    </div>
                    <div style={{ fontSize: 10, color: T3, marginTop: 1 }}>Days with workout</div>
                  </div>
                </div>
              </>
            );
          })()}
        </motion.div>

        {/* ── SECTION 6: Mood Heatmap ────────────────────────────────────────── */}
        <div style={sectionLabel}>Mood Heatmap</div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.25 }}
          style={{ ...card, padding: '14px 12px' }}
        >
          {(() => {
            const MOOD_BG: Record<number, string> = {
              1: '#7F1D1D', 2: '#C2410C', 3: '#A16207', 4: '#166534', 5: '#0CFF9C',
            };
            const today = new Date();
            const days: { date: string; mood: number | null }[] = [];
            for (let i = 34; i >= 0; i--) {
              const d = new Date(today);
              d.setDate(today.getDate() - i);
              const ds = d.toISOString().split('T')[0];
              const found = moodHistory.find(m => m.log_date === ds);
              days.push({ date: ds, mood: found?.mood_score ?? null });
            }
            const weeks: typeof days[] = [];
            for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
            return (
              <>
                {moodHistory.length === 0 && (
                  <div style={{ textAlign: 'center', paddingBottom: 12, fontSize: 12, color: T3 }}>
                    Log your mood daily to fill in the heatmap
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {['M','T','W','T','F','S','S'].map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: T3, fontWeight: 700 }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: 'flex', gap: 4 }}>
                      {week.map((day, di) => (
                        <div
                          key={di}
                          title={day.date}
                          style={{
                            flex: 1, aspectRatio: '1', borderRadius: 4,
                            background: day.mood ? MOOD_BG[day.mood] : 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.04)',
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                  <span style={{ fontSize: 10, color: T3 }}>😫</span>
                  {[1,2,3,4,5].map(v => (
                    <div key={v} style={{ width: 14, height: 14, borderRadius: 3, background: MOOD_BG[v] }} />
                  ))}
                  <span style={{ fontSize: 10, color: T3 }}>🤩</span>
                  <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }} />
                    <span style={{ fontSize: 10, color: T3 }}>No data</span>
                  </div>
                </div>
              </>
            );
          })()}
        </motion.div>

        {/* ── NEW SECTIONS: Strength, Volume, PRs ─────────────────────────────── */}
        <div style={sectionLabel}>Strength Progress</div>
        <div style={{ padding: '0 16px' }}>
          <ExerciseProgressChart />
        </div>

        <div style={sectionLabel}>Muscle Volume</div>
        <div style={{ padding: '0 16px' }}>
          <MuscleVolumeBreakdown />
        </div>


        <div style={sectionLabel}>Personal Records</div>
        <div style={{ padding: '0 16px' }}>
          <PersonalRecordsBoard />
        </div>

        {/* ── SECTION 7: Recent Workouts ──────────────────────────────────────── */}
        <div style={sectionLabel}>Recent Workouts</div>

        {recentWorkouts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: T3, fontSize: 13 }}>
            No workouts logged yet
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {recentWorkouts.map((w, i) => {
              const dateStr = new Date(w.date).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric',
              });
              return (
                <div
                  key={w.id}
                  style={{
                    background: SURFACE,
                    borderRadius: 12,
                    margin: `0 16px ${i < recentWorkouts.length - 1 ? '8px' : '0'}`,
                    padding: '12px 14px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 32, height: 32,
                    borderRadius: 8,
                    background: GREEN_GLOW,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Dumbbell size={16} color={T3} />
                  </div>

                  {/* Name + date */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {w.name}
                    </div>
                    <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>{dateStr}</div>
                  </div>

                  {/* Duration */}
                  {w.duration != null && (
                    <div style={{ fontSize: 12, color: T2, flexShrink: 0 }}>
                      {w.duration}m
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Bottom padding spacer */}
        <div style={{ height: 16 }} />
      </div>

      <BottomNav />
    </div>
  );
}
