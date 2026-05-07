import { X, Clock, Dumbbell, Zap, Flame, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActiveWorkout } from '@/services/workoutService';

interface WorkoutDetailSheetProps {
  workout: ActiveWorkout;
  onClose: () => void;
}

export function WorkoutDetailSheet({ workout, onClose }: WorkoutDetailSheetProps) {
  const dateStr = new Date(workout.date).toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });
  const duration = workout.duration ? `${workout.duration} min` : 'Unknown';
  const exCount = Array.isArray(workout.exercises) ? workout.exercises.length : 0;
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
        }}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
          background: '#161616', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#fff' }}>{workout.name}</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}>{dateStr}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, background: '#222', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '16px 20px' }}>
          <div style={{ background: '#1e1e1e', padding: 12, borderRadius: 12, textAlign: 'center' }}>
            <Clock size={16} color="#1ed760" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{duration}</div>
          </div>
          <div style={{ background: '#1e1e1e', padding: 12, borderRadius: 12, textAlign: 'center' }}>
            <Dumbbell size={16} color="#1ed760" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{exCount} Ex</div>
          </div>
          <div style={{ background: '#1e1e1e', padding: 12, borderRadius: 12, textAlign: 'center' }}>
            <BarChart2 size={16} color="#1ed760" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{workout.total_volume_kg ?? 0}kg</div>
          </div>
          <div style={{ background: '#1e1e1e', padding: 12, borderRadius: 12, textAlign: 'center' }}>
            <Flame size={16} color="#f97316" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{workout.calories_burned ?? 0}</div>
          </div>
        </div>

        {/* Exercises List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>
          {Array.isArray(workout.exercises) && workout.exercises.length > 0 ? (
            workout.exercises.map((ex: any, i: number) => (
              <div key={i} style={{ marginBottom: 16, padding: 16, background: '#1e1e1e', borderRadius: 12 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#fff' }}>
                  {i + 1}. {ex.exercise.name}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array.isArray(ex.sets) && ex.sets.map((set: any, j: number) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>Set {j + 1}</span>
                      <span style={{ fontSize: 14, color: '#fff', fontWeight: 700 }}>
                        {set.weight_kg != null ? `${set.weight_kg}kg × ` : ''}{set.reps} {set.duration_seconds ? `· ${set.duration_seconds}s` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>No exercises logged.</div>
          )}
        </div>
      </motion.div>
    </>
  );
}
