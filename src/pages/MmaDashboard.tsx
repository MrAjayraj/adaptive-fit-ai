import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Flame, Trophy, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getFighterProfile, getTechniqueCatalog } from '@/services/mmaService';
import { supabase } from '@/lib/supabase';
import type { UserFighterProfile, TechniqueProgress, Technique } from '@/types/mma';
import { MmaOnboarding } from '@/components/mma/MmaOnboarding';
import { QuickLogModal } from '@/components/mma/QuickLogModal';

const BG      = '#0d0d0d';
const CARD    = '#161616';
const CARD2   = '#1e1e1e';
const ACCENT  = '#1ed760';
const T1      = '#ffffff';
const T2      = '#aaaaaa';
const BORDER  = 'rgba(255,255,255,0.08)';

export default function MmaDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserFighterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, TechniqueProgress>>({});
  
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [isLogOpen, setIsLogOpen] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Load profile
    const p = await getFighterProfile(user.id);
    setProfile(p);
    
    // Load catalog
    const cat = await getTechniqueCatalog();
    setCatalog(cat);
    
    // Load progress
    const { data: prog } = await supabase
      .from('technique_progress')
      .select('*')
      .eq('user_id', user.id);
      
    if (prog) {
      const progMap: Record<string, TechniqueProgress> = {};
      prog.forEach(item => {
        progMap[item.technique_id] = item;
      });
      setProgress(progMap);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleTechniqueClick = (tech: Technique) => {
    setSelectedTechnique(tech);
    setIsLogOpen(true);
  };

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#555' }}>Loading...</div>
      </div>
    );
  }

  if (!profile || !profile.onboarding_complete) {
    return <MmaOnboarding onComplete={loadData} />;
  }

  // Filter catalog based on primary sport
  let activeSport = catalog.find(s => s.slug === profile.primary_sport_slug);
  if (!activeSport && catalog.length > 0) activeSport = catalog[0];

  const categories = activeSport?.technique_categories || [];

  return (
    <div style={{ background: BG, minHeight: '100dvh', paddingBottom: 108 }}>
      {/* Header */}
      <div style={{ position:'sticky', top:0, zIndex:30, background:'rgba(13,13,13,0.95)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        padding:'max(16px,env(safe-area-inset-top)) 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: T1, padding: 0, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft style={{ width: 28, height: 28 }} />
        </button>
        <span style={{ fontSize: 20, fontWeight: 800, color: T1 }}>MMA Skills</span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Fighter Identity Card */}
        <div style={{ background: CARD, borderRadius: 20, padding: 20, border: `1px solid ${BORDER}`, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T1, marginBottom: 4 }}>{user?.user_metadata?.username || 'Fighter'}</div>
              <div style={{ fontSize: 14, color: ACCENT, fontWeight: 600, textTransform: 'capitalize' }}>
                {profile.primary_sport_slug?.replace('_', ' ')} • {profile.experience_level}
              </div>
            </div>
            <div style={{ background: `${ACCENT}15`, padding: '6px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${ACCENT}33` }}>
              <Flame style={{ width: 16, height: 16, color: ACCENT }} fill={ACCENT} />
              <span style={{ color: ACCENT, fontWeight: 700, fontSize: 14 }}>{profile.streak_current || 0} Day</span>
            </div>
          </div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T2, marginBottom: 8, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Trophy style={{ width: 14, height: 14 }} /> Novice Belt</span>
              <span>Level 1</span>
            </div>
            <div style={{ height: 8, background: CARD2, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '30%', background: ACCENT, borderRadius: 4 }} />
            </div>
          </div>
        </div>

        {/* AI Coach Insights */}
        {Object.keys(progress).length > 0 && (
          <div style={{ background: `linear-gradient(135deg, ${CARD} 0%, rgba(30,215,96,0.05) 100%)`, borderRadius: 20, padding: 20, border: `1px solid ${BORDER}`, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Zap style={{ width: 18, height: 18, color: ACCENT }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: T1, margin: 0 }}>Coach's Insight</h3>
            </div>
            <p style={{ color: T2, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              You've been heavily focusing on your Jab ({Object.values(progress).find(p => p.total_reps > 0)?.total_reps || 0} reps). Consider mixing in some footwork drills to maintain balance, or start tracking defensive slips.
            </p>
          </div>
        )}

        {/* My Arsenal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: T1 }}>My Arsenal</h2>
        </div>

        {categories.map((cat: any) => (
          <div key={cat.id} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: T2, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{cat.name}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {cat.techniques?.map((tech: Technique) => {
                const prog = progress[tech.id];
                const level = prog?.mastery_level || 1;
                
                // Mastery styling logic
                let bg = 'transparent';
                let border = `1px solid ${BORDER}`;
                let color = T2;
                let shadow = 'none';

                if (level === 2) {
                  bg = CARD2;
                  color = T1;
                } else if (level === 3) {
                  bg = `${ACCENT}33`;
                  border = `1px solid ${ACCENT}`;
                  color = ACCENT;
                } else if (level >= 4) {
                  bg = ACCENT;
                  color = '#000';
                  shadow = `0 0 12px ${ACCENT}66`;
                }

                return (
                  <button
                    key={tech.id}
                    onClick={() => handleTechniqueClick(tech)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 20,
                      background: bg,
                      border: border,
                      color: color,
                      fontSize: 14,
                      fontWeight: level >= 4 ? 800 : 600,
                      cursor: 'pointer',
                      boxShadow: shadow,
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {tech.name}
                    {prog?.total_reps > 0 && <span style={{ fontSize: 11, opacity: 0.7 }}>{prog.total_reps}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      </div>

      {/* Floating Action Button for Mode B */}
      <div style={{ position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 40 }}>
        <button 
          onClick={() => {
            setSelectedTechnique(null);
            setIsLogOpen(true);
          }}
          style={{ width: '100%', height: 56, borderRadius: 16, background: ACCENT, color: '#000', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: `0 8px 24px -8px ${ACCENT}` }}
        >
          Start Training Session
        </button>
      </div>

      <QuickLogModal 
        isOpen={isLogOpen} 
        onClose={() => setIsLogOpen(false)} 
        technique={selectedTechnique} 
        mode={selectedTechnique ? "single" : "full"}
        onLogComplete={(techId, reps) => {
          // Optimistically update progress
          setProgress(prev => {
            const existing = prev[techId];
            return {
              ...prev,
              [techId]: {
                ...existing,
                total_reps: (existing?.total_reps || 0) + reps,
                mastery_level: existing?.mastery_level || 1 // Simple fallback, real logic on server
              }
            }
          });
          // Also optimistically update streak if needed
          setProfile(p => p ? { ...p, streak_current: p.streak_current ? p.streak_current + 1 : 1 } : p);
        }}
      />
    </div>
  );
}
