// src/components/workout/ExercisePicker.tsx
// Full-screen exercise picker — tapping a row opens a detail sheet with full data.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, ChevronDown, Check, Plus, ArrowLeft, Dumbbell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchExercises, getPopularExercises } from '@/services/workoutService';
import type { Exercise } from '@/services/workoutService';

export type { Exercise } from '@/services/workoutService';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG         = '#0d0d0d';
const SURFACE    = '#161616';
const SURFACE_UP = '#1e1e1e';
const ACCENT     = '#1ed760';
const T1         = '#ffffff';
const T2         = '#aaaaaa';
const T3         = '#555555';
const BORDER     = 'rgba(255,255,255,0.08)';

// ─── Filter options ────────────────────────────────────────────────────────────
const BODY_PART_OPTIONS = [
  'all','chest','back','shoulders','upper arms',
  'upper legs','lower legs','waist','cardio',
];
const EQUIPMENT_OPTIONS = [
  'all','barbell','dumbbell','cable','machine',
  'body weight','kettlebell','band',
];

// ─── Props ─────────────────────────────────────────────────────────────────────
interface ExercisePickerProps {
  onAdd: (exercise: Exercise) => void;
  onClose: () => void;
  multiSelect?: boolean;
  alreadyAdded?: string[];
  defaultFilters?: {
    bodyPart?: string;
    equipment?: string;
  };
}

// ─── Shimmer ───────────────────────────────────────────────────────────────────
function ShimmerOverlay() {
  return (
    <motion.div
      style={{ position:'absolute', inset:0,
        background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)' }}
      animate={{ x:['-100%','100%'] }}
      transition={{ repeat:Infinity, duration:1.4, ease:'linear' }}
    />
  );
}

// ─── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
      height:74, borderBottom:`1px solid ${BORDER}` }}>
      <div style={{ width:56, height:56, borderRadius:12, background:SURFACE_UP,
        flexShrink:0, position:'relative', overflow:'hidden' }}>
        <ShimmerOverlay />
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ height:13, borderRadius:6, background:SURFACE_UP, width:'58%',
          position:'relative', overflow:'hidden' }}><ShimmerOverlay /></div>
        <div style={{ height:11, borderRadius:5, background:SURFACE_UP, width:'38%',
          position:'relative', overflow:'hidden' }}><ShimmerOverlay /></div>
      </div>
    </div>
  );
}

// ─── Filter dropdown ───────────────────────────────────────────────────────────
function FilterDropdown({ options, selected, onSelect, onClose }:
  { options:string[]; selected:string; onSelect:(v:string)=>void; onClose:()=>void }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.55)' }} />
      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
        exit={{ opacity:0, y:8 }} transition={{ duration:0.14 }}
        style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          zIndex:300, background:SURFACE, borderRadius:16, border:`1px solid ${BORDER}`,
          minWidth:240, maxHeight:'60dvh', overflowY:'auto', padding:'8px 0',
          boxShadow:'0 24px 64px rgba(0,0,0,0.7)' }}>
        {options.map(opt => {
          const sel = opt === selected;
          const label = opt === 'all' ? 'All' : opt.replace(/\b\w/g, c => c.toUpperCase());
          return (
            <button key={opt} onClick={() => { onSelect(opt); onClose(); }}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                width:'100%', padding:'13px 20px', background:'none', border:'none',
                cursor:'pointer', color: sel ? ACCENT : T1,
                fontSize:15, fontWeight: sel ? 600 : 400, textAlign:'left' }}>
              <span>{label}</span>
              {sel && <Check size={16} color={ACCENT} />}
            </button>
          );
        })}
      </motion.div>
    </>
  );
}

// ─── Exercise Detail Sheet ─────────────────────────────────────────────────────
function ExerciseDetailSheet({ exercise, isAlreadyAdded, onAdd, onClose }:
  { exercise: Exercise; isAlreadyAdded: boolean; onAdd: () => void; onClose: () => void }) {

  const secondary: string[] = Array.isArray((exercise as any).secondary_muscles)
    ? (exercise as any).secondary_muscles : [];
  const instructions: string[] = Array.isArray((exercise as any).instructions)
    ? (exercise as any).instructions : [];

  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

  return (
    <>
      {/* Backdrop */}
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.7)' }} />

      {/* Sheet */}
      <motion.div
        initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
        transition={{ type:'spring', stiffness:320, damping:32 }}
        style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:160,
          background:SURFACE, borderRadius:'20px 20px 0 0',
          maxHeight:'88dvh', display:'flex', flexDirection:'column',
          paddingBottom:'max(20px,env(safe-area-inset-bottom))' }}>

        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:T3 }} />
        </div>

        {/* Close button */}
        <button onClick={onClose}
          style={{ position:'absolute', top:14, right:16, width:32, height:32,
            borderRadius:'50%', background:SURFACE_UP, border:`1px solid ${BORDER}`,
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <X size={16} color={T2} />
        </button>

        {/* Scrollable content */}
        <div style={{ overflowY:'auto', flex:1, padding:'0 16px 16px' }}>

          {/* GIF / image */}
          <div style={{ width:'100%', height:220, borderRadius:16, background:SURFACE_UP,
            marginBottom:16, overflow:'hidden', display:'flex',
            alignItems:'center', justifyContent:'center', border:`1px solid ${BORDER}` }}>
            {exercise.gif_url ? (
              <img src={exercise.gif_url} alt={exercise.name}
                style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            ) : (exercise as any).image_url ? (
              <img src={(exercise as any).image_url} alt={exercise.name}
                style={{ width:'100%', height:'100%', objectFit:'contain' }} />
            ) : (
              <Dumbbell style={{ width:48, height:48, color:T3 }} />
            )}
          </div>

          {/* Name */}
          <h2 style={{ fontSize:20, fontWeight:800, color:T1, margin:'0 0 4px',
            textTransform:'capitalize' }}>
            {exercise.name}
          </h2>

          {/* Chips row */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:18 }}>
            {exercise.body_part && (
              <Chip label={cap(exercise.body_part)} color="#60a5fa" />
            )}
            {exercise.target_muscle && (
              <Chip label={cap(exercise.target_muscle)} color={ACCENT} />
            )}
            {exercise.equipment && (
              <Chip label={cap(exercise.equipment)} color="#f472b6" />
            )}
            {(exercise as any).exercise_type && (
              <Chip label={cap((exercise as any).exercise_type)} color="#a78bfa" />
            )}
          </div>

          {/* Secondary muscles */}
          {secondary.length > 0 && (
            <Section title="Secondary Muscles">
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {secondary.map((m: string, i: number) => (
                  <span key={i} style={{ fontSize:13, color:T2, background:SURFACE_UP,
                    borderRadius:20, padding:'4px 12px', border:`1px solid ${BORDER}`,
                    textTransform:'capitalize' }}>
                    {m}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <Section title="Instructions">
              <ol style={{ margin:0, paddingLeft:20, display:'flex', flexDirection:'column', gap:10 }}>
                {instructions.map((step: string, i: number) => (
                  <li key={i} style={{ fontSize:14, color:T2, lineHeight:1.6 }}>{step}</li>
                ))}
              </ol>
            </Section>
          )}

          {/* Custom badge */}
          {exercise.is_custom && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8 }}>
              <span style={{ fontSize:12, fontWeight:600, color:ACCENT, background:`${ACCENT}18`,
                borderRadius:20, padding:'3px 10px', border:`1px solid ${ACCENT}44` }}>
                ✦ Custom Exercise
              </span>
            </div>
          )}
        </div>

        {/* Add button */}
        <div style={{ padding:'12px 16px 0' }}>
          <motion.button whileTap={{ scale:0.97 }}
            onClick={() => { if (!isAlreadyAdded) { onAdd(); onClose(); } }}
            style={{ width:'100%', height:52, borderRadius:14, border:'none', cursor:'pointer',
              background: isAlreadyAdded ? SURFACE_UP : ACCENT,
              color: isAlreadyAdded ? T3 : '#000',
              fontSize:16, fontWeight:700, display:'flex', alignItems:'center',
              justifyContent:'center', gap:8 }}>
            {isAlreadyAdded
              ? <><Check size={18} /> Already Added</>
              : <><Plus size={18} /> Add to Workout</>}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize:12, fontWeight:600, color, background:`${color}18`,
      borderRadius:20, padding:'4px 12px', border:`1px solid ${color}33` }}>
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <p style={{ fontSize:12, fontWeight:700, color:T3, letterSpacing:'0.07em',
        textTransform:'uppercase', margin:'0 0 10px' }}>{title}</p>
      {children}
    </div>
  );
}

// ─── Muscle group colors ──────────────────────────────────────────────────────
const MUSCLE_COLORS: Record<string, string> = {
  chest:        '#f472b6',
  back:         '#60a5fa',
  shoulders:    '#a78bfa',
  'upper arms': '#fb923c',
  biceps:       '#fb923c',
  triceps:      '#f97316',
  'upper legs': '#34d399',
  quads:        '#34d399',
  hamstrings:   '#10b981',
  glutes:       '#06d6a0',
  'lower legs': '#22d3ee',
  calves:       '#22d3ee',
  waist:        '#facc15',
  abs:          '#facc15',
  core:         '#facc15',
  cardio:       '#f87171',
  delts:        '#a78bfa',
  lats:         '#60a5fa',
  traps:        '#818cf8',
  forearms:     '#fb923c',
};

function muscleColor(muscle: string): string {
  const m = (muscle || '').toLowerCase();
  for (const [key, color] of Object.entries(MUSCLE_COLORS)) {
    if (m.includes(key)) return color;
  }
  return ACCENT;
}

function muscleEmoji(bodyPart: string): string {
  const b = (bodyPart || '').toLowerCase();
  if (b.includes('chest'))       return '🫁';
  if (b.includes('back') || b.includes('lat')) return '🔙';
  if (b.includes('shoulder'))    return '💪';
  if (b.includes('upper arm'))   return '💪';
  if (b.includes('upper leg'))   return '🦵';
  if (b.includes('lower leg'))   return '🦵';
  if (b.includes('waist') || b.includes('abs')) return '⚡';
  if (b.includes('cardio'))      return '❤️';
  return '🏋️';
}

// ─── Exercise row ──────────────────────────────────────────────────────────────
function ExerciseRow({ exercise, multiSelect, isSelected, isAlreadyAdded, onRowClick, onToggle }:
  { exercise:Exercise; multiSelect:boolean; isSelected:boolean; isAlreadyAdded:boolean;
    onRowClick:()=>void; onToggle:(id:string)=>void }) {

  const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const mColor = muscleColor(exercise.target_muscle || exercise.body_part || '');
  const hasGif = !!(exercise.gif_url || (exercise as any).image_url);
  const instrCount = Array.isArray((exercise as any).instructions) ? (exercise as any).instructions.length : 0;
  const subtitle = [
    exercise.equipment && cap(exercise.equipment),
    instrCount > 0 && `${instrCount} steps`,
  ].filter(Boolean).join(' · ');

  return (
    <div
      onClick={onRowClick}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
        minHeight:74, borderBottom:`1px solid ${BORDER}`, cursor:'pointer',
        background:'transparent', WebkitTapHighlightColor:'transparent', transition:'background 0.1s' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = SURFACE_UP}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>

      {/* Avatar: GIF, image, or colored muscle placeholder */}
      <div style={{ width:52, height:52, borderRadius:12, background:SURFACE_UP,
        flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
        border:`1px solid ${hasGif ? 'transparent' : mColor + '33'}` }}>
        {exercise.gif_url ? (
          <img src={exercise.gif_url} alt={exercise.name} loading="lazy"
            style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (exercise as any).image_url ? (
          <img src={(exercise as any).image_url} alt={exercise.name} loading="lazy"
            style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <span style={{ fontSize:22 }}>{muscleEmoji(exercise.body_part || '')}</span>
          </div>
        )}
      </div>

      {/* Text */}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:15, fontWeight:600, color: isAlreadyAdded ? T3 : T1,
          margin:'0 0 2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          textTransform:'capitalize' }}>
          {exercise.name}
        </p>
        {/* Target muscle colored badge */}
        {(exercise.target_muscle || exercise.body_part) && (
          <span style={{ fontSize:11, fontWeight:600, color: mColor,
            background:`${mColor}18`, borderRadius:10, padding:'1px 8px',
            display:'inline-block', marginBottom:2, textTransform:'capitalize' }}>
            {exercise.target_muscle || exercise.body_part}
          </span>
        )}
        <p style={{ fontSize:11, color:T3, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {subtitle || 'Tap to view details'}
        </p>
        {exercise.is_custom && (
          <span style={{ fontSize:10, fontWeight:600, color:ACCENT, background:`${ACCENT}18`,
            borderRadius:10, padding:'1px 7px', display:'inline-block', marginTop:2 }}>Custom</span>
        )}
      </div>

      {/* Right action */}
      <div style={{ flexShrink:0, marginLeft:4 }}>
        {isAlreadyAdded ? (
          <Check size={20} color="#34d399" />
        ) : multiSelect ? (
          <div onClick={e => { e.stopPropagation(); onToggle(exercise.id); }}
            style={{ width:22, height:22, borderRadius:6,
              border:`2px solid ${isSelected ? ACCENT : T3}`,
              background: isSelected ? ACCENT : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.12s' }}>
            {isSelected && <Check size={13} color="#000" strokeWidth={3} />}
          </div>
        ) : (
          <div style={{ width:30, height:30, borderRadius:'50%', background:`${ACCENT}18`,
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Plus size={16} color={ACCENT} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ padding:'12px 16px 6px', fontSize:11, fontWeight:700, color:T3,
      letterSpacing:'0.07em', textTransform:'uppercase', background:BG,
      position:'sticky', top:0, zIndex:10 }}>
      {title}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function ExercisePicker({
  onAdd, onClose, multiSelect = false, alreadyAdded = [], defaultFilters,
}: ExercisePickerProps) {
  const [query, setQuery]                       = useState('');
  const [popularExercises, setPopularExercises] = useState<Exercise[]>([]);
  const [searchResults, setSearchResults]       = useState<Exercise[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [searching, setSearching]               = useState(false);
  const [selectedIds, setSelectedIds]           = useState<Set<string>>(new Set());
  const [detailEx, setDetailEx]                 = useState<Exercise | null>(null);

  const [bodyPart, setBodyPart]     = useState(defaultFilters?.bodyPart || 'all');
  const [equipment, setEquipment]   = useState(defaultFilters?.equipment || 'all');
  const [openDropdown, setOpenDropdown] = useState<'bodyPart'|'equipment'|null>(null);

  const navigate      = useNavigate();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef      = useRef<HTMLInputElement>(null);



  useEffect(() => {
    if (query.trim()) { runSearch(query); return; }
    setLoading(true);
    const opts = {
      bodyPart: bodyPart !== 'all' ? bodyPart : undefined,
      equipment: equipment !== 'all' ? equipment : undefined,
    };
    if (bodyPart !== 'all' || equipment !== 'all') {
      searchExercises('', opts).then(setPopularExercises).catch(() => {}).finally(() => setLoading(false));
    } else {
      getPopularExercises().then(setPopularExercises).catch(() => {}).finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyPart, equipment]);

  const runSearch = useCallback((q: string) => {
    setSearching(true);
    searchExercises(q, {
      bodyPart: bodyPart !== 'all' ? bodyPart : undefined,
      equipment: equipment !== 'all' ? equipment : undefined,
    }).then(setSearchResults).catch(() => setSearchResults([])).finally(() => setSearching(false));
  }, [bodyPart, equipment]);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!val.trim()) { setSearchResults([]); return; }
    debounceTimer.current = setTimeout(() => runSearch(val), 300);
  }

  function handleClearQuery() { setQuery(''); setSearchResults([]); inputRef.current?.focus(); }

  function handleToggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAddSelected() {
    const list = query.trim() ? searchResults : popularExercises;
    for (const ex of list) { if (selectedIds.has(ex.id)) onAdd(ex); }
    onClose();
  }

  // When a row is tapped: in multiSelect mode toggle directly; otherwise open detail sheet
  function handleRowClick(ex: Exercise) {
    if (alreadyAdded.includes(ex.id)) return;
    if (multiSelect) {
      handleToggle(ex.id);
    } else {
      setDetailEx(ex);
    }
  }

  const showSearch   = query.trim().length > 0;
  const displayList  = showSearch ? searchResults : popularExercises;
  const isLoadingList = showSearch ? searching : loading;
  const sectionTitle = showSearch
    ? `Results for "${query}"`
    : (bodyPart !== 'all' || equipment !== 'all') ? 'Filtered Exercises' : 'Popular Exercises';

  const bodyPartLabel  = bodyPart === 'all' ? 'Body Part' : bodyPart.replace(/\b\w/g, c => c.toUpperCase());
  const equipmentLabel = equipment === 'all' ? 'Equipment' : equipment.replace(/\b\w/g, c => c.toUpperCase());
  const selectedCount  = selectedIds.size;

  return (
    <motion.div
      initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:24 }} transition={{ duration:0.22 }}
      style={{ position:'fixed', inset:0, zIndex:100, background:BG,
        display:'flex', flexDirection:'column', overflow:'hidden',
        fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 16px', borderBottom:`1px solid ${BORDER}`,
        background:SURFACE, flexShrink:0, position:'relative' }}>
        <button onClick={onClose}
          style={{ display:'flex', alignItems:'center', gap:4, background:'none',
            border:'none', cursor:'pointer', color:T2, fontSize:15, padding:'4px 0' }}>
          <ArrowLeft size={18} color={T2} /><span>Cancel</span>
        </button>
        <span style={{ fontSize:17, fontWeight:700, color:T1,
          position:'absolute', left:'50%', transform:'translateX(-50%)' }}>
          Add Exercise
        </span>
        <button onClick={() => { onClose(); navigate('/exercise/create'); }}
          style={{ background:'none', border:'none', cursor:'pointer',
            color:ACCENT, fontSize:15, fontWeight:600, padding:'4px 0' }}>
          Create
        </button>
      </div>

      {/* ── Search bar ── */}
      <div style={{ padding:'10px 16px', background:BG, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', background:SURFACE_UP,
          borderRadius:14, padding:'0 12px', gap:8 }}>
          <Search size={16} color={T3} style={{ flexShrink:0 }} />
          <input ref={inputRef} value={query} onChange={handleQueryChange}
            placeholder="Search exercises…" autoComplete="off"
            style={{ flex:1, background:'none', border:'none', outline:'none',
              color:T1, fontSize:15, padding:'11px 0', caretColor:ACCENT }} />
          {query.length > 0 && (
            <button onClick={handleClearQuery}
              style={{ background:'none', border:'none', cursor:'pointer',
                display:'flex', alignItems:'center', padding:0, flexShrink:0 }}>
              <X size={16} color={T3} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter row ── */}
      <div style={{ display:'flex', gap:8, padding:'4px 16px 10px', background:BG, flexShrink:0 }}>
        {[
          { key:'bodyPart' as const, label:bodyPartLabel, active: bodyPart !== 'all' },
          { key:'equipment' as const, label:equipmentLabel, active: equipment !== 'all' },
        ].map(({ key, label, active }) => (
          <button key={key}
            onClick={() => setOpenDropdown(openDropdown === key ? null : key)}
            style={{ display:'flex', alignItems:'center', gap:5,
              background: active ? `${ACCENT}18` : SURFACE_UP,
              border: `1px solid ${active ? `${ACCENT}55` : BORDER}`,
              borderRadius:20, padding:'7px 14px', cursor:'pointer',
              color: active ? ACCENT : T2, fontSize:13, fontWeight:500, whiteSpace:'nowrap' }}>
            <span>{label}</span><ChevronDown size={13} />
          </button>
        ))}
      </div>

      {/* ── Dropdown portals ── */}
      <AnimatePresence>
        {openDropdown === 'bodyPart' && (
          <FilterDropdown options={BODY_PART_OPTIONS} selected={bodyPart}
            onSelect={setBodyPart} onClose={() => setOpenDropdown(null)} />
        )}
        {openDropdown === 'equipment' && (
          <FilterDropdown options={EQUIPMENT_OPTIONS} selected={equipment}
            onSelect={setEquipment} onClose={() => setOpenDropdown(null)} />
        )}
      </AnimatePresence>

      {/* ── Exercise list ── */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
        {isLoadingList ? (
          <>
            <SectionHeader title={sectionTitle} />
            {Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)}
          </>
        ) : displayList.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', padding:'60px 32px', gap:12 }}>
            <Search size={36} color={T3} />
            <p style={{ color:T2, fontSize:15, margin:0, textAlign:'center' }}>
              {showSearch ? `No exercises found for "${query}"` : 'No exercises available'}
            </p>
          </div>
        ) : (
          <>
            <SectionHeader title={sectionTitle} />
            {displayList.map(ex => (
              <ExerciseRow key={ex.id} exercise={ex}
                multiSelect={multiSelect}
                isSelected={selectedIds.has(ex.id)}
                isAlreadyAdded={alreadyAdded.includes(ex.id)}
                onRowClick={() => handleRowClick(ex)}
                onToggle={handleToggle}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Multi-select confirm bar ── */}
      <AnimatePresence>
        {multiSelect && selectedCount > 0 && (
          <motion.div initial={{ y:80, opacity:0 }} animate={{ y:0, opacity:1 }}
            exit={{ y:80, opacity:0 }} transition={{ type:'spring', stiffness:340, damping:30 }}
            style={{ position:'fixed', bottom:0, left:0, right:0,
              padding:'12px 16px', paddingBottom:'max(12px,env(safe-area-inset-bottom))',
              background:SURFACE, borderTop:`1px solid ${BORDER}`, zIndex:50 }}>
            <button onClick={handleAddSelected}
              style={{ width:'100%', padding:'15px', background:ACCENT, border:'none',
                borderRadius:14, cursor:'pointer', fontSize:16, fontWeight:700, color:'#000' }}>
              Add {selectedCount} Exercise{selectedCount !== 1 ? 's' : ''}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Exercise detail bottom sheet ── */}
      <AnimatePresence>
        {detailEx && (
          <ExerciseDetailSheet
            exercise={detailEx}
            isAlreadyAdded={alreadyAdded.includes(detailEx.id)}
            onAdd={() => onAdd(detailEx)}
            onClose={() => setDetailEx(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
