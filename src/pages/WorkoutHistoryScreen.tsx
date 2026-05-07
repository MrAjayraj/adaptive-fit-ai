import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Dumbbell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorkoutHistory } from '@/services/workoutService';
import type { ActiveWorkout } from '@/services/workoutService';
import { useAuth } from '@/context/AuthContext';
import { WorkoutDetailSheet } from '@/components/workout/WorkoutDetailSheet';

export default function WorkoutHistoryScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [workouts, setWorkouts] = useState<ActiveWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ActiveWorkout | null>(null);
  
  // Simple "infinite" scroll vars (we'll just load 50 for now, could be enhanced)
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  useEffect(() => {
    if (!user) return;
    loadMore(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadMore = async (reset = false) => {
    if (!user) return;
    const currentOffset = reset ? 0 : offset;
    try {
      const data = await getWorkoutHistory(user.id, LIMIT, currentOffset);
      if (reset) {
        setWorkouts(data);
      } else {
        setWorkouts(prev => [...prev, ...data]);
      }
      setOffset(currentOffset + data.length);
      setHasMore(data.length === LIMIT);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div style={{ background: '#0d0d0d', minHeight: '100dvh', paddingBottom: 40, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:30, background:'rgba(13,13,13,0.95)', backdropFilter:'blur(20px)', padding:'max(16px,env(safe-area-inset-top)) 16px 12px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => navigate(-1)} style={{ width:32, height:32, borderRadius:'50%', background:'#1e1e1e', border:'none', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ChevronLeft size={18} />
        </button>
        <h1 style={{ fontSize:18, fontWeight:800, color:'#fff', margin:0 }}>Workout History</h1>
      </div>

      <div style={{ padding: 16 }}>
        {loading && workouts.length === 0 ? (
          <div style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>Loading history...</div>
        ) : workouts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 16px', background:'#161616', borderRadius:14, border:'1px dashed rgba(255,255,255,0.08)' }}>
            <Dumbbell style={{ width:32, height:32, color:'#555', margin:'0 auto 12px' }} />
            <p style={{ fontSize:15, fontWeight:600, color:'#aaa', margin:0 }}>No completed workouts yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {workouts.map(w => (
              <motion.div key={w.id} whileTap={{ scale: 0.98 }} onClick={() => setSelected(w)}
                style={{ background: '#161616', borderRadius: 14, padding: 16, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>{w.name}</h3>
                  <span style={{ fontSize: 12, color: '#1ed760', fontWeight: 600 }}>{timeAgo(w.date)}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#aaa' }}>
                  {w.duration && <span>{w.duration} min</span>}
                  <span>{Array.isArray(w.exercises) ? w.exercises.length : 0} exercises</span>
                  {w.total_volume_kg != null && <span>{w.total_volume_kg} kg</span>}
                </div>
              </motion.div>
            ))}
            
            {hasMore && (
              <button onClick={() => loadMore(false)} style={{ margin: '16px 0', padding: 12, background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 12, fontWeight: 600 }}>
                Load More
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <WorkoutDetailSheet workout={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
