import { useState } from 'react';
import { useFitness } from '@/context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { EXERCISE_DATABASE, MuscleGroup } from '@/types/fitness';
import { WorkoutTemplate, TemplateExercise } from '@/types/workout-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { v4 } from '@/lib/id';
import { ChevronLeft, Plus, Trash2, GripVertical, Dumbbell, Search } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';

const DEFAULT_TEMPLATES: { name: string; muscles: MuscleGroup[] }[] = [
  { name: 'Push Day', muscles: ['chest', 'shoulders', 'triceps'] },
  { name: 'Pull Day', muscles: ['back', 'biceps'] },
  { name: 'Leg Day', muscles: ['legs', 'glutes', 'core'] },
  { name: 'Upper Body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  { name: 'Full Body', muscles: ['chest', 'back', 'legs', 'shoulders', 'core'] },
];

export default function WorkoutBuilder() {
  const { templates, saveTemplate, deleteTemplate, startCustomWorkout } = useFitness();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'list' | 'build'>('list');
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const startNew = (presetName?: string, muscles?: MuscleGroup[]) => {
    setName(presetName || '');
    if (muscles) {
      const presetExercises: TemplateExercise[] = [];
      for (const muscle of muscles) {
        const exs = EXERCISE_DATABASE.filter(e => e.muscleGroup === muscle).slice(0, 2);
        for (const ex of exs) {
          presetExercises.push({
            exerciseId: ex.id,
            exerciseName: ex.name,
            muscleGroup: ex.muscleGroup,
            sets: 3,
            reps: ex.isCompound ? 8 : 12,
            weight: ex.isCompound ? 40 : 10,
          });
        }
      }
      setExercises(presetExercises);
    } else {
      setExercises([]);
    }
    setEditingId(null);
    setMode('build');
  };

  const editTemplate = (t: WorkoutTemplate) => {
    setName(t.name);
    setExercises([...t.exercises]);
    setEditingId(t.id);
    setMode('build');
  };

  const addExercise = (ex: typeof EXERCISE_DATABASE[0]) => {
    setExercises(prev => [
      ...prev,
      {
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: ex.isCompound ? 4 : 3,
        reps: ex.isCompound ? 8 : 12,
        weight: ex.isCompound ? 40 : 10,
      },
    ]);
    setShowPicker(false);
    setSearch('');
  };

  const removeExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= exercises.length) return;
    const arr = [...exercises];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setExercises(arr);
  };

  const updateExercise = (idx: number, changes: Partial<TemplateExercise>) => {
    setExercises(prev => prev.map((e, i) => (i === idx ? { ...e, ...changes } : e)));
  };

  const handleSave = () => {
    if (!name.trim() || exercises.length === 0) return;
    const template: WorkoutTemplate = {
      id: editingId || v4(),
      name: name.trim(),
      exercises,
      createdAt: new Date().toISOString(),
    };
    saveTemplate(template);
    setMode('list');
  };

  const handleStart = (template: WorkoutTemplate) => {
    startCustomWorkout(template);
    navigate('/workout');
  };

  const filteredExercises = EXERCISE_DATABASE.filter(
    e => e.name.toLowerCase().includes(search.toLowerCase()) ||
         e.muscleGroup.toLowerCase().includes(search.toLowerCase())
  );

  // Exercise picker overlay
  if (showPicker) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => { setShowPicker(false); setSearch(''); }} className="text-muted-foreground">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">Add Exercise</h1>
        </div>
        <div className="px-5 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="pl-10 bg-card border-border"
              autoFocus
            />
          </div>
        </div>
        <div className="px-5 flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto">
          {filteredExercises.map(ex => (
            <button
              key={ex.id}
              onClick={() => addExercise(ex)}
              className="glass-card-hover flex items-center gap-3 p-3 text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{ex.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{ex.muscleGroup} · {ex.equipment}</p>
              </div>
            </button>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  // Build mode
  if (mode === 'build') {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => setMode('list')} className="text-muted-foreground">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-display font-bold text-foreground">
            {editingId ? 'Edit Workout' : 'Create Workout'}
          </h1>
        </div>

        <div className="px-5 mb-4">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Workout name..."
            className="bg-card border-border text-lg font-display font-bold"
            autoFocus
          />
        </div>

        {/* Exercise list */}
        <div className="px-5 flex flex-col gap-2 mb-4">
          {exercises.map((ex, idx) => (
            <div key={`${ex.exerciseId}-${idx}`} className="glass-card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveExercise(idx, -1)} className="text-muted-foreground hover:text-foreground">
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{ex.exerciseName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{ex.muscleGroup}</p>
                  </div>
                </div>
                <button onClick={() => removeExercise(idx)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Sets</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateExercise(idx, { sets: Math.max(1, ex.sets - 1) })}
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">−</button>
                    <span className="text-sm font-bold text-foreground w-6 text-center">{ex.sets}</span>
                    <button onClick={() => updateExercise(idx, { sets: ex.sets + 1 })}
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">+</button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Reps</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateExercise(idx, { reps: Math.max(1, ex.reps - 1) })}
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">−</button>
                    <span className="text-sm font-bold text-foreground w-6 text-center">{ex.reps}</span>
                    <button onClick={() => updateExercise(idx, { reps: ex.reps + 1 })}
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">+</button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Weight</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateExercise(idx, { weight: Math.max(0, ex.weight - 2.5) })}
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">−</button>
                    <span className="text-sm font-bold text-foreground w-8 text-center">{ex.weight}</span>
                    <button onClick={() => updateExercise(idx, { weight: ex.weight + 2.5 })}
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">+</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 flex flex-col gap-2">
          <Button variant="outline" onClick={() => setShowPicker(true)} className="w-full">
            <Plus className="w-4 h-4" />
            Add Exercise
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || exercises.length === 0}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {editingId ? 'Update Template' : 'Save Template'}
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // List mode
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Workouts</h1>
        <p className="text-sm text-muted-foreground">Create and start custom workouts</p>
      </div>

      {/* Quick create from presets */}
      <div className="px-5 mb-5">
        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Quick Start</h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {DEFAULT_TEMPLATES.map(t => (
            <button
              key={t.name}
              onClick={() => startNew(t.name, t.muscles)}
              className="shrink-0 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Saved templates */}
      <div className="px-5 mb-4">
        <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Your Templates</h3>
        {templates.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <Dumbbell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No saved templates yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create one using Quick Start or from scratch</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map(t => (
              <div key={t.id} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.exercises.length} exercises</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => editTemplate(t)}
                      className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground">
                      Edit
                    </button>
                    <button onClick={() => deleteTemplate(t.id)}
                      className="text-xs px-2.5 py-1 rounded-md bg-muted text-destructive hover:bg-destructive/10">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {[...new Set(t.exercises.map(e => e.muscleGroup))].map(mg => (
                    <span key={mg} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{mg}</span>
                  ))}
                </div>
                <Button onClick={() => handleStart(t)} size="sm" className="w-full bg-gradient-primary hover:opacity-90">
                  Start Workout
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5">
        <Button onClick={() => startNew()} variant="outline" className="w-full">
          <Plus className="w-4 h-4" />
          Create from Scratch
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
