import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ExternalLink, Target, Calendar, Repeat, Award, Lock, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSessionHistory, getMasteryLevels, getUserProgress } from '@/services/mmaService';
import type { Technique, TechniqueProgress, SessionLog } from '@/types/mma';
import { QuickLogModal } from './QuickLogModal';
import type { QuickLogResult } from './QuickLogModal';

const BG     = '#0d0d0d';
const CARD   = '#161616';
const CARD2  = '#1e1e1e';
const ACCENT = '#1ed760';
const T1     = '#ffffff';
const T2     = '#aaaaaa';
const T3     = '#555555';
const BORDER = 'rgba(255,255,255,0.08)';

const LEVEL_COLORS = ['#555','#3B82F6','#14B8A6','#22C55E','#F59E0B','#EF4444'];
const LEVEL_NAMES_STRIKING  = ['','Raw','Building','Developing','Reliable','Sharp','Elite'];
const LEVEL_NAMES_GRAPPLING = ['','Unfamiliar','Learning','Drilling','Ingraining','Automatic','Reflexive'];
const GRAPPLING_SPORTS = ['wrestling', 'bjj', 'judo', 'sambo'];

interface TechniqueDetailProps {
  technique: Technique;
  sportSlug: string;
  experienceLevel?: string | null;
  onBack: () => void;
}

export function TechniqueDetailScreen({ technique, sportSlug, experienceLevel, onBack }: TechniqueDetailProps) {
  const { user } = useAuth();
  const [progress,   setProgress]   = useState<TechniqueProgress | null>(null);
  const [history,    setHistory]    = useState<SessionLog[]>([]);
  const [allProgress,setAllProgress]= useState<Record<string, TechniqueProgress>>({});
  const [isLogOpen,  setIsLogOpen]  = useState(false);
  const [loading,    setLoading]    = useState(true);

  const isGrappling = GRAPPLING_SPORTS.includes(sportSlug);
  const levelNames  = isGrappling ? LEVEL_NAMES_GRAPPLING : LEVEL_NAMES_STRIKING;
  const levels      = getMasteryLevels(sportSlug, experienceLevel);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getUserProgress(user.id),
      getSessionHistory(user.id, technique.id, 10),
    ]).then(([prog, hist]) => {
      setAllProgress(prog);
      setProgress(prog[technique.id] || null);
      setHistory(hist);
      setLoading(false);
    });
  }, [user, technique.id]);

  const totalReps   = progress?.total_reps || 0;
  const level       = progress?.mastery_level || 1;
  const nextLevel   = levels.find(l => l.level === level + 1);
  const pctToNext   = nextLevel ? Math.min(100, (totalReps / nextLevel.reps) * 100) : 100;
  const repsToNext  = nextLevel ? Math.max(0, nextLevel.reps - totalReps) : 0;
  const color       = LEVEL_COLORS[level - 1] || '#555';

  const handleLogComplete = (result: QuickLogResult) => {
    setProgress(prev => ({
      id: prev?.id || '',
      user_id: user?.id || '',
      technique_id: technique.id,
      total_reps: result.totalReps,
      mastery_level: result.newLevel,
      last_logged_at: new Date().toISOString(),
    }));
    getSessionHistory(user?.id || '', technique.id, 10).then(setHistory);
  };

  const coachingPoints   = Array.isArray(technique.coaching_points) ? technique.coaching_points : [];
  const commonMistakes   = Array.isArray(technique.common_mistakes) ? technique.common_mistakes : [];

  // Prereqs
  const prereqs = (() => {
    if (!technique.unlock_requirements) return [];
    try {
      const r = typeof technique.unlock_requirements === 'string'
        ? JSON.parse(technique.unlock_requirements) : technique.unlock_requirements;
      return Array.isArray(r) ? r : [];
    } catch { return []; }
  })();

  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(technique.name + ' tutorial')}`;

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 100 }}>
      {/* Sticky Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(20px)', padding: 'max(16px,env(safe-area-inset-top)) 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: T1, cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={28} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: T1 }}>{technique.name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
              {/* Difficulty dots */}
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < technique.difficulty ? ACCENT : CARD2 }} />
              ))}
              <span style={{ fontSize: 11, color: T3 }}>Difficulty {technique.difficulty}/5</span>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}22`, padding: '4px 10px', borderRadius: 20, border: `1px solid ${color}44` }}>
            {levelNames[level]}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Mastery Progress Card */}
        <div style={{ background: CARD, borderRadius: 20, padding: 20, border: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: T2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Mastery Level</div>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>Level {level} — {levelNames[level]}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: T1 }}>{totalReps.toLocaleString()}</div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 8, background: CARD2, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${pctToNext}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ height: '100%', background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 4 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T2 }}>
            <span>{totalReps.toLocaleString()} reps</span>
            {nextLevel ? <span>{repsToNext.toLocaleString()} to {levelNames[level + 1]}</span> : <span style={{ color: ACCENT }}>Max level reached!</span>}
          </div>
        </div>

        {/* Stats 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatCard icon={<Target size={16} color={ACCENT} />} label="Lifetime Reps" value={totalReps.toLocaleString()} />
          <StatCard icon={<Repeat size={16} color="#3B82F6" />} label="Best Session" value={history.length ? `${Math.max(...history.map(h => (h.reps || 0) * (h.sets || 1)))}` : '--'} />
          <StatCard icon={<Calendar size={16} color="#F59E0B" />} label="Sessions" value={String(history.length)} />
          <StatCard icon={<Award size={16} color="#8B5CF6" />} label="Last Session" value={progress?.last_logged_at ? `${Math.floor((Date.now() - new Date(progress.last_logged_at).getTime()) / 86400000)}d ago` : 'Never'} />
        </div>

        {/* Form Guide */}
        {technique.description && (
          <div style={{ background: CARD, borderRadius: 20, padding: 20, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T1, marginBottom: 10 }}>Correct Form</div>
            <p style={{ fontSize: 14, color: T2, lineHeight: 1.6, margin: 0 }}>{technique.description}</p>
          </div>
        )}

        {/* Coaching Points */}
        {coachingPoints.length > 0 && (
          <div style={{ background: CARD, borderRadius: 20, padding: 20, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T1, marginBottom: 12 }}>Key Coaching Points</div>
            {coachingPoints.map((pt, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#000' }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: 14, color: T2, lineHeight: 1.5 }}>{pt}</span>
              </div>
            ))}
          </div>
        )}

        {/* Common Mistakes */}
        {commonMistakes.length > 0 && (
          <div style={{ background: CARD, borderRadius: 20, padding: 20, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#EF4444', marginBottom: 12 }}>Common Mistakes</div>
            {commonMistakes.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: T2, lineHeight: 1.5 }}>{m}</span>
              </div>
            ))}
          </div>
        )}

        {/* Watch Technique Link */}
        <a href={ytSearch} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: CARD, borderRadius: 16, padding: '14px 16px', border: `1px solid ${BORDER}`, textDecoration: 'none' }}
        >
          <span style={{ fontSize: 18 }}>▶️</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: T1 }}>Watch technique on YouTube</span>
          <ExternalLink size={14} color={T3} style={{ marginLeft: 'auto' }} />
        </a>

        {/* Prerequisites */}
        {prereqs.length > 0 && (
          <div style={{ background: CARD, borderRadius: 20, padding: 20, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T1, marginBottom: 12 }}>Prerequisites</div>
            {prereqs.map((req: { technique_id: string; required_reps: number }) => {
              const p = allProgress[req.technique_id];
              const done = (p?.total_reps || 0) >= req.required_reps;
              const pct  = Math.min(100, ((p?.total_reps || 0) / req.required_reps) * 100);
              return (
                <div key={req.technique_id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {done ? <Check size={14} color={ACCENT} /> : <Lock size={14} color={T3} />}
                      <span style={{ fontSize: 13, color: done ? T1 : T3, fontWeight: 600 }}>
                        {req.required_reps} reps needed
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: done ? ACCENT : T3 }}>{p?.total_reps || 0} / {req.required_reps}</span>
                  </div>
                  <div style={{ height: 4, background: CARD2, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: done ? ACCENT : T3, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Session History */}
        {history.length > 0 && (
          <div style={{ background: CARD, borderRadius: 20, padding: 20, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T1, marginBottom: 14 }}>Session History</div>
            {history.map((log, i) => (
              <div key={log.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: i < history.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T1 }}>{log.reps * (log.sets || 1)} reps {log.sets > 1 ? `(${log.sets}×${log.reps})` : ''}</div>
                  <div style={{ fontSize: 12, color: T2, marginTop: 2 }}>
                    {log.training_type || 'Shadow'} · {log.intensity || 'Medium'}
                    {log.notes && <span style={{ color: T3 }}> · "{log.notes}"</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {history.length === 0 && !loading && (
          <div style={{ background: CARD, borderRadius: 20, padding: 28, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T1, marginBottom: 6 }}>You haven't trained this yet</div>
            <div style={{ fontSize: 13, color: T2 }}>Your first session will set your baseline.</div>
          </div>
        )}
      </div>

      {/* Fixed Log Button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(20px)', borderTop: `1px solid ${BORDER}` }}>
        <button onClick={() => setIsLogOpen(true)}
          style={{ width: '100%', height: 56, borderRadius: 16, background: ACCENT, color: '#000', fontSize: 16, fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: `0 0 24px ${ACCENT}44` }}
        >
          Log a Session
        </button>
      </div>

      <QuickLogModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        technique={technique}
        mode="single"
        onLogComplete={handleLogComplete}
      />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: CARD, borderRadius: 16, padding: '14px 16px', border: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>{icon}<span style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span></div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{value}</div>
    </div>
  );
}
