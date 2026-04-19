import { useState, useEffect } from 'react';
import { Search, Dumbbell, Star, Plus, ChevronLeft, X, LayoutGrid } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { motion } from 'framer-motion';
import { searchExercises, createCustomExercise } from '@/services/workoutService';
import type { Exercise } from '@/services/workoutService';
import { useAuth } from '@/context/AuthContext';

const BODY_PARTS = [
  'all', 'back', 'chest', 'shoulders', 'upper arms', 'lower arms',
  'upper legs', 'lower legs', 'waist', 'cardio', 'neck',
];

const EQUIPMENT_OPTS = [
  'all', 'barbell', 'dumbbell', 'cable', 'machine', 'body weight',
  'kettlebell', 'band',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
};

export default function ExerciseLibrary() {
  const { user } = useAuth();
  const [exercises, setExercises]   = useState<Exercise[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [bodyFilter, setBodyFilter] = useState('all');
  const [favorites, setFavorites]   = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem('fitai-favorites');
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch { return new Set(); }
  });
  const [showCustomForm, setShowCustomForm]   = useState(false);
  const [customName, setCustomName]           = useState('');
  const [customBodyPart, setCustomBodyPart]   = useState('chest');
  const [customEquipment, setCustomEquipment] = useState('body weight');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const filters = bodyFilter !== 'all' ? { bodyPart: bodyFilter } : undefined;
    searchExercises(search, filters, 200)
      .then(data => { if (!cancelled) setExercises(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [search, bodyFilter]);

  useEffect(() => {
    localStorage.setItem('fitai-favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addCustomExercise = async () => {
    if (!customName.trim() || !user?.id) return;
    const created = await createCustomExercise(
      {
        name: customName.trim(),
        body_part: customBodyPart,
        equipment: customEquipment,
        target_muscle: customBodyPart,
        secondary_muscles: [],
        exercise_type: 'weight_reps',
        is_custom: true,
      },
      user.id
    );
    if (created) {
      setCustomName('');
      setShowCustomForm(false);
      setExercises(prev => [created, ...prev]);
    }
  };

  // Group by body_part
  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const key = ex.body_part;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {});

  // ── Detail screen ─────────────────────────────────────────────────────────────
  if (selectedExercise) {
    const ex = selectedExercise;
    return (
      <div className="min-h-screen bg-canvas pb-24 font-sans text-text-1">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => setSelectedExercise(null)} className="text-text-3 hover:text-text-1 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[18px] font-semibold text-text-1 tracking-tight">{ex.name}</h1>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="px-5 space-y-4">
          <div className="bg-surface-1 rounded-[20px] p-5 border border-border-subtle shadow-xl">
            <div className="flex items-center justify-between mb-4">
              {ex.gif_url ? (
                <img src={ex.gif_url} alt={ex.name} className="w-16 h-16 rounded-xl object-cover" loading="lazy" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-surface-3 flex items-center justify-center text-text-2 border border-border-subtle">
                  <Dumbbell className="w-6 h-6" />
                </div>
              )}
              <button onClick={() => toggleFavorite(ex.id)}>
                <Star className={`w-6 h-6 transition-all ${favorites.has(ex.id) ? 'text-primary-accent fill-primary-accent' : 'text-text-3'}`} />
              </button>
            </div>
            <h2 className="text-[22px] font-bold text-text-1 mb-1">{ex.name}</h2>
            <p className="text-[13px] text-text-2 capitalize mb-5">
              {ex.body_part} · {ex.equipment}
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-text-3 uppercase tracking-widest font-semibold mb-2">Primary Muscle</p>
                <span className="text-[12px] px-3 py-1.5 rounded-md bg-primary-accent/10 text-primary-accent capitalize border border-primary-accent/20">
                  {ex.target_muscle}
                </span>
              </div>
              {ex.secondary_muscles?.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-3 uppercase tracking-widest font-semibold mb-2">Secondary Muscles</p>
                  <div className="flex flex-wrap gap-2">
                    {ex.secondary_muscles.map(m => (
                      <span key={m} className="text-[12px] px-3 py-1.5 rounded-md bg-surface-3 text-text-2 capitalize border border-border-subtle">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {ex.instructions?.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-3 uppercase tracking-widest font-semibold mb-2">Instructions</p>
                  <ol className="space-y-2">
                    {ex.instructions.map((step, i) => (
                      <li key={i} className="flex gap-3 text-[13px] text-text-2">
                        <span className="text-primary-accent font-bold shrink-0">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  // ── Custom exercise form ──────────────────────────────────────────────────────
  if (showCustomForm) {
    return (
      <div className="min-h-screen bg-canvas pb-24 font-sans text-text-1">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => setShowCustomForm(false)} className="text-text-1"><ChevronLeft className="w-6 h-6" /></button>
          <h1 className="text-[18px] font-semibold tracking-tight">Create Exercise</h1>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-5 space-y-6">
          <div>
            <label className="text-[10px] text-text-2 uppercase tracking-widest font-semibold mb-2 block">EXERCISE NAME</label>
            <input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="e.g. Incline Bench Press"
              autoFocus
              className="w-full bg-surface-3 border border-border-subtle h-12 rounded-[14px] px-4 text-[14px] text-text-1 placeholder:text-text-3 outline-none focus:border-primary-accent"
            />
          </div>
          <div>
            <label className="text-[10px] text-text-2 uppercase tracking-widest font-semibold mb-2 block">BODY PART</label>
            <div className="flex flex-wrap gap-2">
              {BODY_PARTS.filter(m => m !== 'all').map(m => (
                <button key={m} onClick={() => setCustomBodyPart(m)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors capitalize ${customBodyPart === m ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-text-2 uppercase tracking-widest font-semibold mb-2 block">EQUIPMENT</label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTS.filter(e => e !== 'all').map(e => (
                <button key={e} onClick={() => setCustomEquipment(e)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors capitalize ${customEquipment === e ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="fixed bottom-24 left-5 right-5">
            <button onClick={addCustomExercise} disabled={!customName.trim()}
              className="w-full h-12 bg-primary-accent text-canvas font-semibold rounded-[14px] disabled:opacity-50 transition-opacity">
              Save Exercise
            </button>
          </div>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  // ── Main list ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas pb-[100px] font-sans selection:bg-primary-accent/20">
      <motion.div variants={containerVariants} initial="hidden" animate="visible"
        className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8">

        <motion.div variants={itemVariants} className="px-5 pt-14 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-text-1 tracking-tight">Library</h1>
              <p className="text-[13px] text-text-2 mt-0.5">{exercises.length} exercises</p>
            </div>
            <button className="text-[14px] font-semibold text-primary-accent flex items-center gap-1" onClick={() => setShowCustomForm(true)}>
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div variants={itemVariants} className="px-5 mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises…"
              className="w-full pl-11 pr-10 bg-surface-3 border border-transparent h-11 rounded-[14px] text-[14px] text-text-1 placeholder:text-text-3 outline-none focus:border-border-subtle"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Body part filters */}
        <motion.div variants={itemVariants} className="flex gap-2 px-5 mb-6 overflow-x-auto no-scrollbar relative -mx-4 px-5">
          {BODY_PARTS.map(m => (
            <button key={m} onClick={() => setBodyFilter(m)}
              className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all capitalize ${
                bodyFilter === m ? 'bg-primary-accent text-canvas' : 'bg-surface-1 text-text-2 border border-border-subtle'
              }`}>
              {m === 'all' ? 'All' : m}
            </button>
          ))}
        </motion.div>

        {/* Exercise list */}
        {loading ? (
          <div className="px-5 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-surface-1 rounded-[16px] p-4 h-[60px] border border-border-subtle flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-3 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-3 rounded animate-pulse w-1/3" />
                  <div className="h-2 bg-surface-3 rounded animate-pulse w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 space-y-6">
            {Object.entries(grouped).map(([bodyPart, exs]) => (
              <motion.div variants={itemVariants} key={bodyPart}>
                <h3 className="text-[11px] font-semibold text-text-2 mb-3 uppercase tracking-widest flex items-center gap-2">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  {bodyPart} <span className="opacity-50">({exs.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {exs.map(ex => (
                    <button key={ex.id} onClick={() => setSelectedExercise(ex)}
                      className="group flex items-center justify-between p-3 rounded-[16px] bg-transparent hover:bg-surface-2 transition-colors text-left border border-transparent hover:border-border-subtle h-[64px]">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {ex.gif_url ? (
                          <img src={ex.gif_url} alt="" loading="lazy"
                            className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-[36px] h-[36px] rounded-full bg-surface-2 group-hover:bg-surface-3 flex items-center justify-center shrink-0 border border-border-subtle">
                            <Dumbbell className="w-4 h-4 text-text-2 group-hover:text-text-1 transition-colors" />
                          </div>
                        )}
                        <div className="min-w-0 pr-2">
                          <p className="text-[14px] font-medium text-text-1 truncate">{ex.name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-text-3 mt-0.5">
                            <span className="capitalize">{ex.equipment}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); toggleFavorite(ex.id); }} className="p-1 shrink-0">
                        <Star className={`w-4 h-4 transition-all ${favorites.has(ex.id) ? 'text-primary-accent fill-primary-accent' : 'text-text-3'}`} />
                      </button>
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
            {exercises.length === 0 && (
              <div className="text-center py-16">
                <Dumbbell className="w-12 h-12 text-text-3 mx-auto mb-4" />
                <p className="text-text-2 text-[14px]">No exercises found</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
      <BottomNav />
    </div>
  );
}
