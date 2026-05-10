import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Lock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getUserProgress, getMasteryLevels, computeMasteryLevel } from '@/services/mmaService';
import type { Technique, TechniqueProgress } from '@/types/mma';
import { QuickLogModal } from './QuickLogModal';
import type { QuickLogResult } from './QuickLogModal';

const BG     = '#0d0d0d';
const CARD   = '#161616';
const CARD2  = '#1e1e1e';
const ACCENT = '#1ed760';
const T1     = '#ffffff';
const T2     = '#aaaaaa';
const T3     = '#444444';
const BORDER = 'rgba(255,255,255,0.08)';

interface SportDetailProps {
  sport: { id: string; name: string; slug: string; icon_name: string; technique_categories: Array<{ id: string; name: string; display_order: number; techniques: Technique[] }> };
  onBack: () => void;
  experienceLevel?: string | null;
}

const LEVEL_COLORS = ['#555','#3B82F6','#14B8A6','#22C55E','#F59E0B','#EF4444'];

export function SportDetailScreen({ sport, onBack, experienceLevel }: SportDetailProps) {
  const { user } = useAuth();
  const [progress, setProgress]         = useState<Record<string, TechniqueProgress>>({});
  const [activeCategory, setActiveCat]  = useState(0);
  const [selectedTech, setSelectedTech] = useState<Technique | null>(null);
  const [isLogOpen, setIsLogOpen]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) getUserProgress(user.id).then(setProgress);
  }, [user]);

  const categories = sport.technique_categories?.slice().sort((a, b) => a.display_order - b.display_order) || [];
  const currentCat = categories[activeCategory];

  const sortedTechniques = [...(currentCat?.techniques || [])].sort((a, b) => {
    const pa = progress[a.id];
    const pb = progress[b.id];
    const la = pa?.mastery_level || 1;
    const lb = pb?.mastery_level || 1;
    const levelsA = getMasteryLevels(sport.slug, experienceLevel);
    const nextA = levelsA.find(l => l.level === la + 1);
    const nextB = levelsA.find(l => l.level === lb + 1);
    const pctA = nextA ? (pa?.total_reps || 0) / nextA.reps : 1;
    const pctB = nextB ? (pb?.total_reps || 0) / nextB.reps : 1;
    const hasLogsA = (pa?.total_reps || 0) > 0;
    const hasLogsB = (pb?.total_reps || 0) > 0;
    const lockedA = isLocked(a, progress);
    const lockedB = isLocked(b, progress);
    if (lockedA && !lockedB) return 1;
    if (!lockedA && lockedB) return -1;
    if (hasLogsA && !hasLogsB) return -1;
    if (!hasLogsA && hasLogsB) return 1;
    return pctB - pctA;
  });

  const handleLogComplete = (result: QuickLogResult) => {
    setProgress(prev => ({
      ...prev,
      [result.techniqueId]: {
        ...prev[result.techniqueId],
        id: prev[result.techniqueId]?.id || '',
        user_id: user?.id || '',
        technique_id: result.techniqueId,
        total_reps: result.totalReps,
        mastery_level: result.newLevel,
        last_logged_at: new Date().toISOString(),
      },
    }));
  };

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(20px)', padding: 'max(16px,env(safe-area-inset-top)) 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: T1, padding: 0, cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={28} />
          </button>
          <span style={{ fontSize: 22, fontWeight: 900, color: T1 }}>{sport.name}</span>
        </div>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch' }}>
          {categories.map((cat, i) => (
            <button key={cat.id} onClick={() => setActiveCat(i)}
              style={{ padding: '8px 16px', borderRadius: 20, background: activeCategory === i ? ACCENT : CARD2, border: `1px solid ${activeCategory === i ? ACCENT : BORDER}`, color: activeCategory === i ? '#000' : T2, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 }}
            >{cat.name}</button>
          ))}
        </div>
      </div>

      {/* Technique list */}
      <div style={{ padding: '16px 16px' }}>
        <AnimatePresence mode="wait">
          <motion.div key={activeCategory} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {sortedTechniques.map(tech => {
              const prog = progress[tech.id];
              const totalReps = prog?.total_reps || 0;
              const level = prog?.mastery_level || 1;
              const locked = isLocked(tech, progress);
              const levels = getMasteryLevels(sport.slug, experienceLevel);
              const nextLevel = levels.find(l => l.level === level + 1);
              const progress_pct = nextLevel ? Math.min(100, (totalReps / nextLevel.reps) * 100) : 100;
              const daysSince = prog?.last_logged_at
                ? Math.floor((Date.now() - new Date(prog.last_logged_at).getTime()) / 86400000)
                : null;

              return (
                <motion.div key={tech.id} whileTap={{ scale: 0.98 }}
                  onClick={() => { if (!locked) { setSelectedTech(tech); navigate(`/mma/technique/${tech.id}`, { state: { technique: tech, sportSlug: sport.slug, experienceLevel } }); } }}
                  style={{ background: locked ? 'rgba(22,22,22,0.5)' : CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10, cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.5 : 1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      {locked && <Lock size={14} color={T3} />}
                      <span style={{ fontSize: 15, fontWeight: 700, color: locked ? T3 : T1 }}>{tech.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: LEVEL_COLORS[level - 1] || '#555', background: `${LEVEL_COLORS[level - 1] || '#555'}22`, padding: '2px 8px', borderRadius: 10 }}>
                        {levels.find(l => l.level === level)?.name || 'Raw'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      {daysSince !== null && <span style={{ fontSize: 11, color: T3 }}>{daysSince === 0 ? 'Today' : `${daysSince}d ago`}</span>}
                      {totalReps > 0 && <span style={{ fontSize: 11, color: T2 }}>{totalReps} reps</span>}
                    </div>
                  </div>
                  {/* Progress bar */}
                  {!locked && (
                    <div style={{ height: 4, background: CARD2, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress_pct}%`, background: LEVEL_COLORS[level - 1] || ACCENT, borderRadius: 2, transition: 'width 0.4s' }} />
                    </div>
                  )}
                  {/* Difficulty dots */}
                  <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < tech.difficulty ? ACCENT : CARD2 }} />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <QuickLogModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        technique={selectedTech}
        mode="single"
        onLogComplete={handleLogComplete}
      />
    </div>
  );
}

function isLocked(tech: Technique, progress: Record<string, TechniqueProgress>): boolean {
  if (!tech.unlock_requirements) return false;
  try {
    const reqs = typeof tech.unlock_requirements === 'string'
      ? JSON.parse(tech.unlock_requirements)
      : tech.unlock_requirements;
    if (!Array.isArray(reqs) || reqs.length === 0) return false;
    return reqs.some((r: { technique_id: string; required_reps: number }) => {
      const p = progress[r.technique_id];
      return !p || (p.total_reps || 0) < r.required_reps;
    });
  } catch { return false; }
}
