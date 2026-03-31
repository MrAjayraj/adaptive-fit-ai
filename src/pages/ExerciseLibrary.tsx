import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Dumbbell, Filter, Star, Plus, ChevronLeft, X } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';

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

const MUSCLE_ICONS: Record<string, string> = {
  chest: '🫁', back: '🔙', shoulders: '💪', arms: '💪',
  legs: '🦵', core: '🎯', glutes: '🍑',
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

  // Group by muscle
  const grouped = filtered.reduce<Record<string, ExerciseRow[]>>((acc, ex) => {
    const key = ex.muscle_group;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {});

  // Exercise detail view
  if (selectedExercise) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => setSelectedExercise(null)} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">{selectedExercise.name}</h1>
        </div>

        <div className="px-5 space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                {MUSCLE_ICONS[selectedExercise.muscle_group] || '💪'}
              </div>
              <button onClick={() => toggleFavorite(selectedExercise.id)}>
                <Star className={`w-6 h-6 transition-all ${favorites.has(selectedExercise.id) ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
              </button>
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-1">{selectedExercise.name}</h2>
            <p className="text-sm text-muted-foreground capitalize mb-4">
              {selectedExercise.muscle_group} · {selectedExercise.equipment} · {selectedExercise.difficulty}
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Primary Muscle</p>
                <span className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary capitalize">{selectedExercise.muscle_group}</span>
              </div>
              {selectedExercise.secondary_muscles?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Secondary Muscles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExercise.secondary_muscles.map(m => (
                      <span key={m} className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent capitalize">{m}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Type</p>
                <span className="text-sm text-foreground">{selectedExercise.is_compound ? 'Compound' : 'Isolation'}</span>
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Custom exercise form
  if (showCustomForm) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => setShowCustomForm(false)} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">Create Custom Exercise</h1>
        </div>
        <div className="px-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Name</label>
            <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Exercise name" className="bg-card border-border" autoFocus />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Muscle Group</label>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.filter(m => m !== 'all').map(m => (
                <button key={m} onClick={() => setCustomMuscle(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${customMuscle === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Equipment</label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT.filter(e => e !== 'all').map(e => (
                <button key={e} onClick={() => setCustomEquipment(e)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${customEquipment === e ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Difficulty</label>
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTY.filter(d => d !== 'all').map(d => (
                <button key={d} onClick={() => setCustomDifficulty(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${customDifficulty === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={addCustomExercise} disabled={!customName.trim()} className="w-full bg-gradient-primary hover:opacity-90">
            Save Exercise
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Exercise Library</h1>
            <p className="text-sm text-muted-foreground">{exercises.length} exercises</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCustomForm(true)}>
            <Plus className="w-4 h-4" />
            Custom
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..." className="pl-10 pr-10 bg-card border-border" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Muscle group pills */}
      <div className="flex gap-1.5 px-5 mb-3 overflow-x-auto no-scrollbar">
        {MUSCLE_GROUPS.map(m => (
          <button key={m} onClick={() => setMuscleFilter(m)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
              muscleFilter === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}>
            {m === 'all' ? '🔥 All' : `${MUSCLE_ICONS[m] || ''} ${m}`}
          </button>
        ))}
      </div>

      {/* Filter toggle */}
      <div className="px-5 mb-3">
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Filter className="w-3.5 h-3.5" />
          {showFilters ? 'Hide filters' : 'More filters'}
        </button>
        {showFilters && (
          <div className="mt-2 space-y-2 animate-fade-in">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Equipment</p>
              <div className="flex flex-wrap gap-1">
                {EQUIPMENT.map(e => (
                  <button key={e} onClick={() => setEquipmentFilter(e)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all capitalize ${
                      equipmentFilter === e ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                    }`}>{e}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Difficulty</p>
              <div className="flex flex-wrap gap-1">
                {DIFFICULTY.map(d => (
                  <button key={d} onClick={() => setDifficultyFilter(d)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all capitalize ${
                      difficultyFilter === d ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                    }`}>{d}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exercise list */}
      {loading ? (
        <div className="px-5 space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 space-y-5">
          {Object.entries(grouped).map(([muscle, exs]) => (
            <div key={muscle}>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <span>{MUSCLE_ICONS[muscle] || '💪'}</span> {muscle}
                <span className="text-[10px] text-muted-foreground/50">({exs.length})</span>
              </h3>
              <div className="flex flex-col gap-1.5">
                {exs.map(ex => (
                  <button key={ex.id} onClick={() => setSelectedExercise(ex)}
                    className="glass-card-hover flex items-center justify-between p-3 text-left">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ex.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="capitalize">{ex.equipment}</span>
                          <span>·</span>
                          <span className="capitalize">{ex.difficulty}</span>
                          {ex.is_compound && <><span>·</span><span className="text-primary">Compound</span></>}
                        </div>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleFavorite(ex.id); }} className="p-1.5">
                      <Star className={`w-4 h-4 transition-all ${favorites.has(ex.id) ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`} />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No exercises found</p>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
