import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Flame, BarChart2, Zap, Target, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getFighterProfile, getTechniqueCatalog, getUserProgress,
  getRecentTechniques, getWeeklyStats, getFighterTitle, getMasteryLevels, SPORT_ICONS
} from '@/services/mmaService';
import type { UserFighterProfile, TechniqueProgress, Technique } from '@/types/mma';
import { MmaOnboarding } from '@/components/mma/MmaOnboarding';
import { QuickLogModal } from '@/components/mma/QuickLogModal';
import { SportDetailScreen } from '@/components/mma/SportDetailScreen';
import { TechniqueDetailScreen } from '@/components/mma/TechniqueDetailScreen';
import type { QuickLogResult } from '@/components/mma/QuickLogModal';
import { MmaAnalyticsScreen } from '@/components/mma/MmaAnalyticsScreen';

const BG     = '#0d0d0d';
const CARD   = '#161616';
const CARD2  = '#1e1e1e';
const ACCENT = '#1ed760';
const T1     = '#ffffff';
const T2     = '#aaaaaa';
const T3     = '#555555';
const BORDER = 'rgba(255,255,255,0.08)';
const AMBER  = '#F59E0B';

const LEVEL_COLORS = ['#555','#3B82F6','#14B8A6','#22C55E','#F59E0B','#EF4444'];

type View =
  | { type: 'dashboard' }
  | { type: 'sport'; sport: any }
  | { type: 'technique'; technique: Technique; sportSlug: string }
  | { type: 'analytics' };

export default function MmaDashboard() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [view,     setView]     = useState<View>({ type: 'dashboard' });
  const [profile,  setProfile]  = useState<UserFighterProfile | null>(null);
  const [catalog,  setCatalog]  = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, TechniqueProgress>>({});
  const [recentIds,setRecentIds]= useState<string[]>([]);
  const [weekStats,setWeekStats]= useState({ sessions: 0, reps: 0, sportsCount: 0 });
  const [loading,  setLoading]  = useState(true);

  // Log modal state
  const [isLogOpen,     setIsLogOpen]     = useState(false);
  const [logTechnique,  setLogTechnique]  = useState<Technique | null>(null);
  const [logMode,       setLogMode]       = useState<'single'|'full'>('single');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [p, cat, prog, recent, stats] = await Promise.all([
      getFighterProfile(user.id),
      getTechniqueCatalog(),
      getUserProgress(user.id),
      getRecentTechniques(user.id, 7),
      getWeeklyStats(user.id),
    ]);
    setProfile(p);
    setCatalog(cat);
    setProgress(prog);
    setRecentIds(recent);
    setWeekStats(stats);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const openLog = (tech: Technique | null, mode: 'single' | 'full' = 'single') => {
    setLogTechnique(tech);
    setLogMode(mode);
    setIsLogOpen(true);
  };

  const handleOnboardingComplete = (openQuickLog?: boolean) => {
    loadData().then(() => {
      if (openQuickLog) {
        // Open log for the first beginner technique in their primary sport
        setIsLogOpen(true);
        setLogTechnique(null);
        setLogMode('single');
      }
    });
  };

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
    if (!recentIds.includes(result.techniqueId)) {
      setRecentIds(prev => [result.techniqueId, ...prev].slice(0, 5));
    }
  };

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T3, fontSize: 14 }}>Loading your arsenal...</div>
      </div>
    );
  }

  if (!profile || !profile.onboarding_complete) {
    return <MmaOnboarding onComplete={handleOnboardingComplete} />;
  }

  // ── Sub-views ──────────────────────────────────────────────────────────────
  if (view.type === 'analytics') {
    return <MmaAnalyticsScreen onBack={() => setView({ type: 'dashboard' })} progress={progress} catalog={catalog} profile={profile} weekStats={weekStats} />;
  }

  if (view.type === 'sport') {
    return (
      <SportDetailScreen
        sport={view.sport}
        onBack={() => setView({ type: 'dashboard' })}
        experienceLevel={profile.experience_level}
      />
    );
  }

  if (view.type === 'technique') {
    return (
      <TechniqueDetailScreen
        technique={view.technique}
        sportSlug={view.sportSlug}
        experienceLevel={profile.experience_level}
        onBack={() => setView({ type: 'dashboard' })}
      />
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const totalLifetimeReps = Object.values(progress).reduce((sum, p) => sum + (p.total_reps || 0), 0);
  const fighterTitle      = getFighterTitle(totalLifetimeReps);

  // Find primary sport first
  const sortedCatalog = [...catalog].sort((a, b) => {
    if (a.slug === profile.primary_sport_slug) return -1;
    if (b.slug === profile.primary_sport_slug) return 1;
    return 0;
  });

  // Recent technique chips
  const recentTechniques: Technique[] = recentIds
    .map(id => {
      for (const sport of catalog) {
        for (const cat of (sport.technique_categories || [])) {
          const t = (cat.techniques || []).find((t: Technique) => t.id === id);
          if (t) return { ...t, _sportSlug: sport.slug };
        }
      }
      return null;
    })
    .filter(Boolean) as any[];

  // Most recently logged technique for "Continue Training"
  const lastLogged = recentTechniques[0] || null;

  // Recommended technique
  const recommended = getRecommended(catalog, progress, profile.experience_level);

  // AI coach insight (static if no API, dynamic placeholder)
  const aiInsight = getLocalInsight(progress, catalog, weekStats);

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: 'max(16px,env(safe-area-inset-top)) 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: T1, display: 'flex', cursor: 'pointer', padding: 0 }}>
            <ChevronLeft size={28} />
          </button>
          <span style={{ fontSize: 20, fontWeight: 900, color: T1 }}>MMA Skills</span>
        </div>
        <button onClick={() => setView({ type: 'analytics' })}
          style={{ width: 36, height: 36, borderRadius: 10, background: CARD2, border: `1px solid ${BORDER}`, color: T1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        ><BarChart2 size={16} /></button>
      </div>

      <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Fighter Identity Card */}
        <div style={{ background: `linear-gradient(135deg, ${CARD} 0%, rgba(30,215,96,0.05) 100%)`, borderRadius: 20, padding: 20, border: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: T1 }}>{user?.user_metadata?.username || user?.email?.split('@')[0] || 'Fighter'}</div>
              <div style={{ fontSize: 14, color: ACCENT, fontWeight: 700, marginTop: 2 }}>{fighterTitle}</div>
              <div style={{ fontSize: 12, color: T3, marginTop: 4 }}>{totalLifetimeReps.toLocaleString()} lifetime reps</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${AMBER}15`, padding: '6px 12px', borderRadius: 20, border: `1px solid ${AMBER}33` }}>
                <Flame size={16} color={AMBER} fill={AMBER} />
                <span style={{ fontSize: 18, fontWeight: 900, color: AMBER }}>{profile.streak_current || 0}</span>
                <span style={{ fontSize: 12, color: AMBER, fontWeight: 700 }}>day streak</span>
              </div>
              {profile.streak_shields_available > 0 && (
                <div style={{ fontSize: 11, color: T3, marginTop: 4, textAlign: 'right' }}>🛡️ shield ready</div>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Snapshot */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: 'Sessions', value: String(weekStats.sessions) },
            { label: 'Reps', value: weekStats.reps > 999 ? `${(weekStats.reps / 1000).toFixed(1)}k` : String(weekStats.reps) },
            { label: 'Sports', value: String(weekStats.sportsCount || '--') },
            { label: 'Streak', value: `${profile.streak_current || 0}d` },
          ].map(s => (
            <div key={s.label} style={{ background: CARD2, borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: T1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: T3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Continue Training — Most Prominent */}
        <div>
          <button
            onClick={() => openLog(lastLogged, 'full')}
            style={{ width: '100%', height: 60, borderRadius: 18, background: ACCENT, color: '#000', fontSize: 17, fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: `0 8px 32px -8px ${ACCENT}88`, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <Clock size={20} />
            {lastLogged ? `Continue — ${lastLogged.name}` : 'Start Training Session'}
          </button>

          {/* Recent technique chips */}
          {recentTechniques.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
              {recentTechniques.slice(0, 4).map(tech => {
                const prog = progress[tech.id];
                const level = prog?.mastery_level || 1;
                return (
                  <button key={tech.id}
                    onClick={() => openLog(tech, 'single')}
                    style={{ padding: '8px 14px', borderRadius: 20, background: CARD2, border: `1.5px solid ${LEVEL_COLORS[level - 1] || BORDER}`, color: T1, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {tech.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's Recommended Technique */}
        {recommended && (
          <div style={{ background: `linear-gradient(135deg, ${CARD} 0%, rgba(30,215,96,0.04) 100%)`, borderRadius: 20, padding: 18, border: `1px solid ${ACCENT}33` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Target size={14} color={ACCENT} />
              <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1 }}>
                {recommended.tag}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: T1, marginBottom: 4 }}>{recommended.technique.name}</div>
            <div style={{ fontSize: 12, color: T2, marginBottom: 14 }}>{recommended.reason}</div>
            <button onClick={() => openLog(recommended.technique, 'single')}
              style={{ width: '100%', height: 44, borderRadius: 12, background: ACCENT, color: '#000', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              Train this now
            </button>
          </div>
        )}

        {/* Sport Cards — Horizontal Scroll */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T1, marginBottom: 12 }}>My Arsenal</div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            {sortedCatalog.map(sport => {
              const allTechs: Technique[] = (sport.technique_categories || []).flatMap((c: any) => c.techniques || []);
              const loggedTechs = allTechs.filter(t => (progress[t.id]?.total_reps || 0) > 0);
              const weeklyReps = Object.entries(progress)
                .filter(([id]) => allTechs.find(t => t.id === id))
                .reduce((sum, [, p]) => sum + (p.total_reps || 0), 0); // simplified
              const masteryAvg = loggedTechs.length > 0
                ? Math.round(loggedTechs.reduce((sum, t) => sum + (progress[t.id]?.mastery_level || 1), 0) / loggedTechs.length * 20)
                : null;

              const isPrimary = sport.slug === profile.primary_sport_slug;

              return (
                <motion.div key={sport.id} whileTap={{ scale: 0.96 }}
                  onClick={() => setView({ type: 'sport', sport })}
                  style={{ flexShrink: 0, width: 140, background: isPrimary ? `linear-gradient(135deg, ${CARD2}, rgba(30,215,96,0.06))` : CARD, border: `1.5px solid ${isPrimary ? `${ACCENT}55` : BORDER}`, borderRadius: 20, padding: 16, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{SPORT_ICONS[sport.slug] || '🥋'}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T1, marginBottom: 4 }}>{sport.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: masteryAvg !== null ? ACCENT : T3 }}>
                    {masteryAvg !== null ? `${masteryAvg}%` : '--'}
                  </div>
                  <div style={{ fontSize: 10, color: T3, marginTop: 2 }}>mastery avg</div>
                  {isPrimary && <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, marginTop: 6 }}>PRIMARY</div>}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* AI Coach Insight */}
        {aiInsight && (
          <div style={{ background: CARD, borderRadius: 20, padding: 18, border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Zap size={16} color={ACCENT} />
              <span style={{ fontSize: 13, fontWeight: 800, color: T1 }}>Coach's Insight</span>
              <span style={{ fontSize: 10, color: T3, marginLeft: 'auto' }}>Based on your logs</span>
            </div>
            <p style={{ fontSize: 14, color: T2, lineHeight: 1.6, margin: 0 }}>{aiInsight}</p>
          </div>
        )}

      </div>

      {/* Quick Log Modal */}
      <QuickLogModal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        technique={logTechnique}
        mode={logMode}
        onLogComplete={handleLogComplete}
      />
    </div>
  );
}

// ─── Recommendation Logic ─────────────────────────────────────────────────────
function getRecommended(catalog: any[], progress: Record<string, TechniqueProgress>, experienceLevel?: string | null) {
  const all: Array<{ technique: Technique; sportSlug: string }> = [];
  for (const sport of catalog) {
    for (const cat of (sport.technique_categories || [])) {
      for (const t of (cat.techniques || [])) {
        all.push({ technique: t, sportSlug: sport.slug });
      }
    }
  }

  // 1. Almost there — within 20% of next level
  for (const { technique, sportSlug } of all) {
    const prog = progress[technique.id];
    if (!prog) continue;
    const levels = getMasteryLevels(sportSlug, experienceLevel);
    const level  = prog.mastery_level || 1;
    const next   = levels.find(l => l.level === level + 1);
    if (!next) continue;
    const pct = (prog.total_reps || 0) / next.reps;
    const daysSince = prog.last_logged_at
      ? Math.floor((Date.now() - new Date(prog.last_logged_at).getTime()) / 86400000)
      : 999;
    if (pct >= 0.8 && daysSince >= 3) {
      return { technique, tag: 'Almost There', reason: `${Math.round(pct * 100)}% to ${levels[level]?.name || 'next level'}. Close!` };
    }
  }

  // 2. Needs work — not logged in 14+ days
  let oldest: { technique: Technique; days: number; sportSlug: string } | null = null;
  for (const { technique, sportSlug } of all) {
    const prog = progress[technique.id];
    if (!prog?.last_logged_at) continue;
    const days = Math.floor((Date.now() - new Date(prog.last_logged_at).getTime()) / 86400000);
    if (days >= 14 && (!oldest || days > oldest.days)) {
      oldest = { technique, days, sportSlug };
    }
  }
  if (oldest) {
    return { technique: oldest.technique, tag: 'Needs Work', reason: `Haven't logged ${oldest.technique.name} in ${oldest.days} days.` };
  }

  // 3. Try something new — beginner technique not yet logged
  for (const { technique, sportSlug } of all) {
    if (!progress[technique.id] && technique.difficulty <= 2 && !technique.unlock_requirements) {
      return { technique, tag: 'Try Something New', reason: `You haven't started ${technique.name} yet. Difficulty: ${technique.difficulty}/5.` };
    }
  }

  return null;
}

// ─── Local AI Insight (no API) ────────────────────────────────────────────────
function getLocalInsight(progress: Record<string, TechniqueProgress>, catalog: any[], weekStats: { sessions: number; reps: number }): string | null {
  const logged = Object.values(progress).filter(p => (p.total_reps || 0) > 0);
  if (logged.length === 0) return null;

  const max = logged.reduce((best, p) => p.total_reps > best.total_reps ? p : best, logged[0]);

  // Find the technique name
  let maxName = 'your most trained technique';
  for (const sport of catalog) {
    for (const cat of (sport.technique_categories || [])) {
      const t = (cat.techniques || []).find((t: Technique) => t.id === max.technique_id);
      if (t) { maxName = t.name; break; }
    }
  }

  if (weekStats.sessions === 0) {
    return `You haven't logged a session this week. Log at least 1 set today to keep your streak alive.`;
  }

  return `You've focused heavily on ${maxName} (${max.total_reps} reps). Consider drilling a defensive or footwork technique to balance your development.`;
}
