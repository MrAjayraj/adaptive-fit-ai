// src/components/home/DayDetail.tsx
// Summary view for a past (or future) date shown below the calendar strip.

import { Dumbbell, Footprints, CheckCircle2, Trophy, Weight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Workout } from '@/types/fitness';

const ACCENT   = '#E2FF31';
const T1       = 'rgba(255,255,255,0.88)';
const T2       = 'rgba(255,255,255,0.50)';
const T3       = 'rgba(255,255,255,0.28)';
const SURFACE  = 'rgba(255,255,255,0.04)';
const BORDER   = 'rgba(255,255,255,0.08)';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

interface DayDetailProps {
  date: string;
  workouts: Workout[];          // already filtered to this date
  steps?: number;
  missionsDone?: number;
  missionsTotal?: number;
  todaySteps?: number;
  isFuture?: boolean;
  onPlanWorkout?: () => void;
}

function WorkoutCard({ workout }: { workout: Workout }) {
  const exCount = workout.exercises?.length ?? 0;
  const volume  = workout.exercises?.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.completed).reduce((ss, s) => ss + s.weight * s.reps, 0)
  , 0) ?? 0;

  return (
    <div style={{
      background:   SURFACE,
      border:       `1px solid ${BORDER}`,
      borderRadius: 14,
      padding:      '14px 16px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: 12,
          background:   'rgba(226,255,49,0.08)',
          border:       '1px solid rgba(226,255,49,0.15)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          flexShrink:   0,
        }}>
          <Dumbbell style={{ width: 18, height: 18, color: ACCENT }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T1, marginBottom: 2 }}>
            {workout.name || 'Workout'}
          </div>
          <div style={{ fontSize: 11, color: T3, display: 'flex', gap: 10 }}>
            {exCount > 0 && <span>{exCount} exercise{exCount !== 1 ? 's' : ''}</span>}
            {workout.duration ? <span>{workout.duration} min</span> : null}
            {volume > 0 && (
              <span>{volume >= 1000 ? `${(volume/1000).toFixed(1)}k` : volume} kg</span>
            )}
          </div>
        </div>
        <div style={{
          background:   'rgba(12,255,156,0.12)',
          color:        '#0CFF9C',
          fontSize:     10,
          fontWeight:   700,
          padding:      '3px 8px',
          borderRadius: 20,
          letterSpacing: '0.06em',
        }}>
          DONE
        </div>
      </div>

      {/* Exercise list */}
      {workout.exercises?.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
          {workout.exercises.slice(0, 4).map(ex => (
            <div key={ex.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 4, fontSize: 12, color: T3,
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: T3, display: 'block', flexShrink: 0 }} />
              {ex.exerciseName}
              <span style={{ marginLeft: 'auto', color: T3, fontSize: 11 }}>
                {ex.sets.filter(s => s.completed).length} sets
              </span>
            </div>
          ))}
          {workout.exercises.length > 4 && (
            <div style={{ fontSize: 11, color: T3, marginTop: 4, paddingLeft: 10 }}>
              +{workout.exercises.length - 4} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      gap:           12,
      padding:       '12px 0',
      borderBottom:  `1px solid ${BORDER}`,
    }}>
      <div style={{
        width: 32, height: 32,
        borderRadius: 10,
        background:   SURFACE,
        border:       `1px solid ${BORDER}`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        flexShrink:   0,
      }}>
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: 13, color: T2 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T1 }}>{value}</span>
    </div>
  );
}

export function DayDetail({
  date,
  workouts,
  missionsDone,
  missionsTotal,
  isFuture = false,
  onPlanWorkout,
}: DayDetailProps) {
  const hasWorkouts  = workouts.length > 0;
  const hasMissions  = (missionsTotal ?? 0) > 0;
  const hasAnything  = hasWorkouts || hasMissions;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={date}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        style={{ padding: '0 0 24px' }}
      >
        {/* Date header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
            {isFuture ? 'Planned' : 'Summary'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T1 }}>
            {formatDate(date)}
          </div>
        </div>

        {/* Future empty state */}
        {isFuture && !hasWorkouts && (
          <div style={{
            background:   SURFACE,
            border:       `1px dashed ${BORDER}`,
            borderRadius: 16,
            padding:      '28px 20px',
            textAlign:    'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
            <div style={{ fontSize: 14, color: T2, fontWeight: 600, marginBottom: 6 }}>
              No workout planned
            </div>
            <div style={{ fontSize: 12, color: T3, marginBottom: 16 }}>
              Schedule a workout for this day
            </div>
            {onPlanWorkout && (
              <button
                onClick={onPlanWorkout}
                style={{
                  background:   ACCENT,
                  color:        '#000',
                  border:       'none',
                  borderRadius: 20,
                  padding:      '9px 20px',
                  fontSize:     13,
                  fontWeight:   700,
                  cursor:       'pointer',
                }}
              >
                + Plan Workout
              </button>
            )}
          </div>
        )}

        {/* Past empty state */}
        {!isFuture && !hasAnything && (
          <div style={{
            background:   SURFACE,
            border:       `1px solid ${BORDER}`,
            borderRadius: 16,
            padding:      '28px 20px',
            textAlign:    'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>😴</div>
            <div style={{ fontSize: 14, color: T3, fontWeight: 600 }}>
              Rest day — no activity recorded
            </div>
          </div>
        )}

        {/* Workouts */}
        {hasWorkouts && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Workouts
            </div>
            {workouts.map(w => <WorkoutCard key={w.id} workout={w} />)}
          </div>
        )}

        {/* Stats */}
        {hasMissions && (
          <div style={{
            background:   SURFACE,
            border:       `1px solid ${BORDER}`,
            borderRadius: 14,
            padding:      '4px 16px',
          }}>
            {hasMissions && (
              <StatRow
                icon={<CheckCircle2 style={{ width: 14, height: 14, color: ACCENT }} />}
                label="Missions"
                value={`${missionsDone}/${missionsTotal} complete`}
              />
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
