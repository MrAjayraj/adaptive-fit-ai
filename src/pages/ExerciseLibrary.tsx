import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Dumbbell, Filter, Star, Plus, ChevronLeft, X, LayoutGrid } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { motion } from 'framer-motion';

interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string;
  secondary_muscles: string[];
  equipment: string;
  difficulty: string;
  is_compound: boolean;
  is_custom: boolean;
}

const MUSCLE_GROUPS = ['all', 'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'glutes'];
const EQUIPMENT = ['all', 'barbell', 'dumbbells', 'cable', 'machine', 'bodyweight'];
const DIFFICULTY = ['all', 'beginner', 'intermediate', 'advanced'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
};

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('fitai-favorites');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState('chest');
  const [customEquipment, setCustomEquipment] = useState('bodyweight');
  const [customDifficulty, setCustomDifficulty] = useState('beginner');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseRow | null>(null);

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    localStorage.setItem('fitai-favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('muscle_group')
      .order('name');
    if (!error && data) setExercises(data as ExerciseRow[]);
    setLoading(false);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustomExercise = async () => {
    if (!customName.trim()) return;
    const { error } = await supabase.from('exercises').insert({
      name: customName.trim(),
      muscle_group: customMuscle,
      equipment: customEquipment,
      difficulty: customDifficulty,
      is_custom: true,
      is_compound: false,
    });
    if (!error) {
      setCustomName('');
      setShowCustomForm(false);
      fetchExercises();
    }
  };

  const filtered = exercises.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase()) &&
        !ex.muscle_group.toLowerCase().includes(search.toLowerCase())) return false;
    if (muscleFilter !== 'all' && ex.muscle_group !== muscleFilter) return false;
    if (equipmentFilter !== 'all' && ex.equipment !== equipmentFilter) return false;
    if (difficultyFilter !== 'all' && ex.difficulty !== difficultyFilter) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, ExerciseRow[]>>((acc, ex) => {
    const key = ex.muscle_group;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {});

  if (selectedExercise) {
    return (
      <div className="min-h-screen bg-canvas pb-24 font-sans text-text-1">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => setSelectedExercise(null)} className="text-text-3 hover:text-text-1 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[18px] font-semibold text-text-1 tracking-tight">{selectedExercise.name}</h1>
        </div>

        <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="px-5 space-y-4">
          <div className="bg-surface-1 rounded-[20px] p-5 border border-border-subtle shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-full bg-surface-3 flex items-center justify-center text-text-2 border border-border-subtle">
                 <Dumbbell className="w-6 h-6" />
              </div>
              <button onClick={() => toggleFavorite(selectedExercise.id)}>
                <Star className={`w-6 h-6 transition-all ${favorites.has(selectedExercise.id) ? 'text-primary-accent fill-primary-accent' : 'text-text-3'}`} />
              </button>
            </div>
            <h2 className="text-[22px] font-bold text-text-1 mb-1">{selectedExercise.name}</h2>
            <p className="text-[13px] text-text-2 capitalize mb-5">
              {selectedExercise.muscle_group} · {selectedExercise.equipment} · {selectedExercise.difficulty}
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-text-3 uppercase tracking-widest font-semibold mb-2">Primary Muscle</p>
                <span className="text-[12px] px-3 py-1.5 rounded-md bg-primary-accent/10 text-primary-accent capitalize border border-primary-accent/20">
                  {selectedExercise.muscle_group}
                </span>
              </div>
              {selectedExercise.secondary_muscles?.length > 0 && (
                <div>
                  <p className="text-[10px] text-text-3 uppercase tracking-widest font-semibold mb-2">Secondary Muscles</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.secondary_muscles.map(m => (
                      <span key={m} className="text-[12px] px-3 py-1.5 rounded-md bg-surface-3 text-text-2 capitalize border border-border-subtle">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] text-text-3 uppercase tracking-widest font-semibold mb-2">Type</p>
                <span className="text-[14px] text-text-1 font-medium">{selectedExercise.is_compound ? 'Compound' : 'Isolation'}</span>
              </div>
            </div>
          </div>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  if (showCustomForm) {
    return (
      <div className="min-h-screen bg-canvas pb-24 font-sans text-text-1">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => setShowCustomForm(false)} className="text-text-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[18px] font-semibold tracking-tight">Create Exercise</h1>
        </div>
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="px-5 space-y-6">
          <div>
            <label className="text-[10px] text-text-2 uppercase tracking-widest font-semibold mb-2 block">EXERCISE NAME</label>
            <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Incline Bench Press" 
              className="bg-surface-3 border-border-subtle h-12 rounded-[14px] text-[14px] text-text-1 placeholder:text-text-3 focus:border-primary-accent focus:ring-0" autoFocus />
          </div>
          <div>
            <label className="text-[10px] text-text-2 uppercase tracking-widest font-semibold mb-2 block">PRIMARY MUSCLE</label>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.filter(m => m !== 'all').map(m => (
                <button key={m} onClick={() => setCustomMuscle(m)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors capitalize ${
                    customMuscle === m ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-text-2 uppercase tracking-widest font-semibold mb-2 block">EQUIPMENT REQUIRED</label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.filter(e => e !== 'all').map(e => (
                <button key={e} onClick={() => setCustomEquipment(e)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors capitalize ${
                    customEquipment === e ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'
                  }`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-text-2 uppercase tracking-widest font-semibold mb-2 block">DIFFICULTY</label>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY.filter(d => d !== 'all').map(d => (
                <button key={d} onClick={() => setCustomDifficulty(d)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors capitalize ${
                    customDifficulty === d ? 'bg-primary-accent text-canvas' : 'bg-surface-2 text-text-2'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="fixed bottom-24 left-5 right-5">
            <button onClick={addCustomExercise} disabled={!customName.trim()} 
              className="w-full h-12 bg-primary-accent text-canvas font-semibold rounded-[14px] disabled:opacity-50 transition-opacity flex items-center justify-center">
              Save Exercise
            </button>
          </div>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-[100px] font-sans selection:bg-primary-accent/20">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full max-w-lg md:max-w-[1080px] mx-auto md:pl-[104px] md:pr-8">
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..." 
              className="pl-11 pr-10 bg-surface-3 border-transparent h-11 rounded-[14px] text-[14px] text-text-1 placeholder:text-text-3 focus:border-border-subtle" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={itemVariants} className="flex gap-2 px-5 mb-6 overflow-x-auto no-scrollbar relative -mx-4 px-5">
          {MUSCLE_GROUPS.map(m => (
            <button key={m} onClick={() => setMuscleFilter(m)}
              className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all capitalize ${
                muscleFilter === m ? 'bg-primary-accent text-canvas shadow-volt' : 'bg-surface-1 text-text-2 border border-border-subtle hover:border-primary-accent/30'
              }`}>
              {m === 'all' ? 'All' : m}
            </button>
          ))}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-canvas to-transparent pointer-events-none" />
        </motion.div>

        {/* Exercise list */}
        {loading ? (
          <div className="px-5 space-y-3">
            {[1,2,3,4,5].map(i => (
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
            {Object.entries(grouped).map(([muscle, exs]) => (
              <motion.div variants={itemVariants} key={muscle}>
                <h3 className="text-[11px] font-semibold text-text-2 mb-3 uppercase tracking-widest flex items-center gap-2">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  {muscle} <span className="opacity-50">({exs.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {exs.map(ex => (
                    <button key={ex.id} onClick={() => setSelectedExercise(ex)}
                      className="group flex items-center justify-between p-3 rounded-[16px] bg-transparent hover:bg-surface-2 transition-colors text-left border border-transparent hover:border-border-subtle h-[64px]">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-[36px] h-[36px] rounded-full bg-surface-2 group-hover:bg-surface-3 flex items-center justify-center shrink-0 border border-border-subtle">
                          <Dumbbell className="w-4 h-4 text-text-2 group-hover:text-text-1 transition-colors" />
                        </div>
                        <div className="min-w-0 pr-2">
                          <p className="text-[14px] font-medium text-text-1 truncate">{ex.name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-text-3 mt-0.5">
                            <span className="capitalize">{ex.equipment}</span>
                            <span>·</span>
                            <span className="capitalize">{ex.difficulty}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {ex.is_compound && (
                          <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-primary-accent/10 text-primary-accent">
                            Compound
                          </span>
                        )}
                        <button onClick={e => { e.stopPropagation(); toggleFavorite(ex.id); }} className="p-1">
                          <Star className={`w-4 h-4 transition-all ${favorites.has(ex.id) ? 'text-primary-accent fill-primary-accent drop-shadow-[0_0_8px_rgba(245,197,24,0.6)]' : 'text-text-3'}`} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
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
