import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Flame } from 'lucide-react';
import type { TechniqueProgress, UserFighterProfile, Technique } from '@/types/mma';
import { getMasteryLevels, SPORT_ICONS } from '@/services/mmaService';

const BG     = '#0d0d0d';
const CARD   = '#161616';
const CARD2  = '#1e1e1e';
const ACCENT = '#1ed760';
const T1     = '#ffffff';
const T2     = '#aaaaaa';
const T3     = '#444444';
const BORDER = 'rgba(255,255,255,0.08)';

const LEVEL_COLORS = ['','#555','#3B82F6','#14B8A6','#22C55E','#F59E0B','#EF4444'];
const LEVEL_NAMES  = ['','Raw','Building','Developing','Reliable','Sharp','Elite'];

interface Props {
  onBack: () => void;
  progress: Record<string, TechniqueProgress>;
  catalog: any[];
  profile: UserFighterProfile;
  weekStats: { sessions: number; reps: number; sportsCount: number };
}

export function MmaAnalyticsScreen({ onBack, progress, catalog, profile, weekStats }: Props) {
  // Technique mastery map: sport → category → techniques
  const masteryMap = useMemo(() => {
    return catalog.map(sport => ({
      ...sport,
      technique_categories: (sport.technique_categories || []).map((cat: any) => ({
        ...cat,
        techniques: (cat.techniques || []).map((t: Technique) => ({
          ...t,
          prog: progress[t.id] || null,
          level: progress[t.id]?.mastery_level || 1,
          hasData: (progress[t.id]?.total_reps || 0) > 0,
        })),
      })),
    }));
  }, [catalog, progress]);

  // Volume per sport
  const sportVolume = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sport of catalog) {
      let total = 0;
      for (const cat of (sport.technique_categories || [])) {
        for (const t of (cat.techniques || [])) {
          total += progress[t.id]?.total_reps || 0;
        }
      }
      map[sport.slug] = total;
    }
    return map;
  }, [catalog, progress]);

  const totalReps = Object.values(sportVolume).reduce((a, b) => a + b, 0);

  // Techniques close to leveling up
  const almostThere = useMemo(() => {
    const results: Array<{ name: string; level: number; pct: number; sportSlug: string }> = [];
    for (const sport of catalog) {
      for (const cat of (sport.technique_categories || [])) {
        for (const t of (cat.techniques || [])) {
          const p = progress[t.id];
          if (!p) continue;
          const levels = getMasteryLevels(sport.slug, profile.experience_level);
          const next = levels.find(l => l.level === (p.mastery_level || 1) + 1);
          if (!next) continue;
          const pct = (p.total_reps / next.reps) * 100;
          if (pct >= 60) results.push({ name: t.name, level: p.mastery_level || 1, pct: Math.round(pct), sportSlug: sport.slug });
        }
      }
    }
    return results.sort((a, b) => b.pct - a.pct).slice(0, 6);
  }, [catalog, progress, profile.experience_level]);

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(20px)', padding: 'max(16px,env(safe-area-inset-top)) 16px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: T1, cursor: 'pointer', display: 'flex' }}>
          <ChevronLeft size={28} />
        </button>
        <span style={{ fontSize: 20, fontWeight: 900, color: T1 }}>Analytics</span>
      </div>

      <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Section 1 — Sport Distribution */}
        <Section title="Sport Distribution">
          {Object.entries(sportVolume)
            .filter(([, reps]) => reps > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([slug, reps]) => {
              const pct = totalReps > 0 ? Math.round((reps / totalReps) * 100) : 0;
              const sport = catalog.find(s => s.slug === slug);
              return (
                <div key={slug} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 14, color: T1, fontWeight: 600 }}>{SPORT_ICONS[slug]} {sport?.name || slug}</span>
                    <span style={{ fontSize: 13, color: T2 }}>{reps.toLocaleString()} reps · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: CARD2, borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', background: ACCENT, borderRadius: 3 }}
                    />
                  </div>
                </div>
              );
            })}
          {totalReps === 0 && <EmptyState text="Start logging sessions to see your sport distribution." />}
        </Section>

        {/* Section 2 — Close to Level Up */}
        <Section title="Almost at Next Level">
          {almostThere.length === 0
            ? <EmptyState text="Log more reps to see which techniques are close to leveling up." />
            : almostThere.map(item => (
              <div key={item.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: T1, fontWeight: 600 }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: LEVEL_COLORS[item.level] || '#555', background: `${LEVEL_COLORS[item.level] || '#555'}22`, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>
                      Lv.{item.level}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: item.pct >= 80 ? ACCENT : T2, fontWeight: item.pct >= 80 ? 700 : 400 }}>{item.pct}%</span>
                </div>
                <div style={{ height: 5, background: CARD2, borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${item.pct}%`, background: item.pct >= 80 ? ACCENT : LEVEL_COLORS[item.level] || '#555', borderRadius: 3 }} />
                </div>
              </div>
            ))
          }
        </Section>

        {/* Section 3 — Technique Mastery Map */}
        <Section title="Technique Mastery Map">
          {masteryMap.map(sport => {
            const anyData = (sport.technique_categories || []).some((cat: any) =>
              (cat.techniques || []).some((t: any) => t.hasData)
            );
            if (!anyData) return null;
            return (
              <div key={sport.id} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {SPORT_ICONS[sport.slug]} {sport.name}
                </div>
                {(sport.technique_categories || []).map((cat: any) => (
                  <div key={cat.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: T3, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>{cat.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(cat.techniques || []).map((t: any) => {
                        const color = LEVEL_COLORS[t.level] || '#333';
                        return (
                          <div key={t.id}
                            title={`${t.name} — Level ${t.level}`}
                            style={{ padding: '5px 11px', borderRadius: 10, background: t.hasData ? `${color}22` : CARD2, border: `1px solid ${t.hasData ? color : BORDER}`, fontSize: 12, color: t.hasData ? color : T3, fontWeight: 600 }}
                          >
                            {t.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {totalReps === 0 && <EmptyState text="Your skill map will populate as you log techniques." />}
        </Section>

        {/* Section 4 — Streak Stats */}
        <Section title="Training Consistency">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatChip label="Current Streak" value={`${profile.streak_current || 0}d`} icon={<Flame size={16} color="#F59E0B" />} />
            <StatChip label="Longest Streak" value={`${profile.streak_longest || 0}d`} icon={<Flame size={16} color="#EF4444" />} />
            <StatChip label="This Week" value={`${weekStats.reps} reps`} icon={<span style={{ fontSize: 16 }}>📅</span>} />
            <StatChip label="Sessions" value={String(weekStats.sessions)} icon={<span style={{ fontSize: 16 }}>🎯</span>} />
          </div>
          {profile.streak_shields_available > 0 && (
            <div style={{ marginTop: 12, background: CARD2, borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 18 }}>🛡️</span>
              <div>
                <div style={{ fontSize: 13, color: T1, fontWeight: 700 }}>Streak Shield Available</div>
                <div style={{ fontSize: 12, color: T2 }}>Protects your streak if you miss one day. Recharges monthly.</div>
              </div>
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: CARD, borderRadius: 20, padding: 20, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: T1, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 14, color: T3 }}>{text}</div>
    </div>
  );
}

function StatChip({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: CARD2, borderRadius: 14, padding: '14px 14px', border: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>{icon}<span style={{ fontSize: 11, color: T2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span></div>
      <div style={{ fontSize: 20, fontWeight: 900, color: T1 }}>{value}</div>
    </div>
  );
}
