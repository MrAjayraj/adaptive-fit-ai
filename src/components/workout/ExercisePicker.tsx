// src/components/workout/ExercisePicker.tsx
// Full-screen exercise picker — used by CreateRoutine and ActiveWorkout.
// Inline styles only (no Tailwind).

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, ChevronDown, Check, Plus, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchExercises, getPopularExercises } from '@/services/workoutService';
import type { Exercise } from '@/services/workoutService';

export type { Exercise } from '@/services/workoutService';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG         = '#0C1015';
const SURFACE    = '#141A1F';
const SURFACE_UP = '#1C2429';
const ACCENT     = '#F5C518';
const T1         = '#EAEEF2';
const T2         = '#8899AA';
const T3         = '#4A5568';
const BORDER     = 'rgba(255,255,255,0.07)';

// ─── Filter options ───────────────────────────────────────────────────────────
const BODY_PART_OPTIONS = [
  'all', 'chest', 'back', 'shoulders', 'upper arms',
  'upper legs', 'lower legs', 'waist', 'cardio',
];

const EQUIPMENT_OPTIONS = [
  'all', 'barbell', 'dumbbell', 'cable', 'machine',
  'body weight', 'kettlebell', 'band',
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface ExercisePickerProps {
  onAdd: (exercise: Exercise) => void;
  onClose: () => void;
  multiSelect?: boolean;
  alreadyAdded?: string[];
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        height: 72,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      {/* Avatar placeholder */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: SURFACE_UP,
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <ShimmerOverlay />
      </div>

      {/* Text placeholders */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            height: 14,
            borderRadius: 7,
            background: SURFACE_UP,
            width: '60%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <ShimmerOverlay />
        </div>
        <div
          style={{
            height: 11,
            borderRadius: 5,
            background: SURFACE_UP,
            width: '40%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <ShimmerOverlay />
        </div>
      </div>
    </div>
  );
}

function ShimmerOverlay() {
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
      }}
      animate={{ x: ['-100%', '100%'] }}
      transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
    />
  );
}

// ─── Dropdown sheet ───────────────────────────────────────────────────────────
interface DropdownProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

function FilterDropdown({ options, selected, onSelect, onClose }: DropdownProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(0,0,0,0.5)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 300,
          background: SURFACE,
          borderRadius: 16,
          border: `1px solid ${BORDER}`,
          minWidth: 240,
          maxHeight: '60dvh',
          overflowY: 'auto',
          padding: '8px 0',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {options.map((opt) => {
          const isSelected = opt === selected;
          const label = opt === 'all'
            ? 'All'
            : opt.replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <button
              key={opt}
              onClick={() => { onSelect(opt); onClose(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '13px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isSelected ? ACCENT : T1,
                fontSize: 15,
                fontWeight: isSelected ? 600 : 400,
                textAlign: 'left',
              }}
            >
              <span>{label}</span>
              {isSelected && <Check size={16} color={ACCENT} />}
            </button>
          );
        })}
      </motion.div>
    </>
  );
}

// ─── Exercise row ─────────────────────────────────────────────────────────────
interface ExerciseRowProps {
  exercise: Exercise;
  onAdd: (exercise: Exercise) => void;
  multiSelect: boolean;
  isSelected: boolean;
  isAlreadyAdded: boolean;
  onToggle: (id: string) => void;
}

function ExerciseRow({
  exercise,
  onAdd,
  multiSelect,
  isSelected,
  isAlreadyAdded,
  onToggle,
}: ExerciseRowProps) {
  const nameCapitalized = exercise.name;

  const bodyPartLabel = exercise.body_part
    ? exercise.body_part.charAt(0).toUpperCase() + exercise.body_part.slice(1)
    : '';

  const equipmentLabel = exercise.equipment
    ? exercise.equipment.charAt(0).toUpperCase() + exercise.equipment.slice(1)
    : '';

  const subtitle = [bodyPartLabel, equipmentLabel].filter(Boolean).join(' · ');

  function handleRowClick() {
    if (isAlreadyAdded) return;
    if (multiSelect) {
      onToggle(exercise.id);
    } else {
      onAdd(exercise);
    }
  }

  return (
    <div
      onClick={handleRowClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        height: 72,
        borderBottom: `1px solid ${BORDER}`,
        cursor: isAlreadyAdded ? 'default' : 'pointer',
        background: 'transparent',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => {
        if (!isAlreadyAdded) {
          (e.currentTarget as HTMLDivElement).style.background = SURFACE_UP;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {/* Avatar: GIF or initial letter */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: SURFACE_UP,
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {exercise.gif_url ? (
          <img
            src={exercise.gif_url}
            alt={exercise.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: 22, fontWeight: 700, color: ACCENT }}>
            {exercise.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: T1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {nameCapitalized}
        </div>
        <div
          style={{
            fontSize: 13,
            color: T2,
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <span>{subtitle}</span>
          {exercise.is_custom && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: T2,
                background: T3,
                borderRadius: 10,
                padding: '1px 7px',
              }}
            >
              Custom
            </span>
          )}
        </div>
      </div>

      {/* Right action */}
      <div style={{ flexShrink: 0, marginLeft: 4 }}>
        {isAlreadyAdded ? (
          <Check size={20} color="#34D399" />
        ) : multiSelect ? (
          /* Checkbox */
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: `2px solid ${isSelected ? ACCENT : T3}`,
              background: isSelected ? ACCENT : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.12s',
            }}
          >
            {isSelected && <Check size={13} color={BG} strokeWidth={3} />}
          </div>
        ) : (
          /* Plus button */
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(245,197,24,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={18} color={ACCENT} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        padding: '12px 16px 6px',
        fontSize: 13,
        fontWeight: 600,
        color: T2,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: BG,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {title}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ExercisePicker({
  onAdd,
  onClose,
  multiSelect = false,
  alreadyAdded = [],
}: ExercisePickerProps) {
  const [query, setQuery]                     = useState('');
  const [popularExercises, setPopularExercises] = useState<Exercise[]>([]);
  const [searchResults, setSearchResults]     = useState<Exercise[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [searching, setSearching]             = useState(false);
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set());

  // Filter state
  const [bodyPart, setBodyPart]               = useState('all');
  const [equipment, setEquipment]             = useState('all');
  const [openDropdown, setOpenDropdown]       = useState<'bodyPart' | 'equipment' | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load popular exercises on mount
  useEffect(() => {
    setLoading(true);
    getPopularExercises()
      .then((data) => setPopularExercises(data))
      .catch(() => setPopularExercises([]))
      .finally(() => setLoading(false));
  }, []);

  // Re-run search when filters change (and a query exists)
  useEffect(() => {
    if (query.trim()) {
      runSearch(query);
    }
    // When there's no query, re-fetch popular with filters
    if (!query.trim() && (bodyPart !== 'all' || equipment !== 'all')) {
      setLoading(true);
      searchExercises('', {
        bodyPart: bodyPart !== 'all' ? bodyPart : undefined,
        equipment: equipment !== 'all' ? equipment : undefined,
      })
        .then((data) => setPopularExercises(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (!query.trim()) {
      // No query, no filters — reload popular
      setLoading(true);
      getPopularExercises()
        .then((data) => setPopularExercises(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyPart, equipment]);

  const runSearch = useCallback(
    (q: string) => {
      setSearching(true);
      searchExercises(q, {
        bodyPart: bodyPart !== 'all' ? bodyPart : undefined,
        equipment: equipment !== 'all' ? equipment : undefined,
      })
        .then((data) => setSearchResults(data))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    },
    [bodyPart, equipment]
  );

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      runSearch(val);
    }, 300);
  }

  function handleClearQuery() {
    setQuery('');
    setSearchResults([]);
    inputRef.current?.focus();
  }

  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleAddSelected() {
    const list = query.trim() ? searchResults : popularExercises;
    for (const ex of list) {
      if (selectedIds.has(ex.id)) {
        onAdd(ex);
      }
    }
    onClose();
  }

  const showSearch = query.trim().length > 0;
  const displayList = showSearch ? searchResults : popularExercises;
  const isLoadingList = showSearch ? searching : loading;
  const sectionTitle = showSearch
    ? `Results for "${query}"`
    : (bodyPart !== 'all' || equipment !== 'all')
    ? 'Filtered Exercises'
    : 'Popular Exercises';

  const bodyPartLabel =
    bodyPart === 'all'
      ? 'All Body Parts'
      : bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1);

  const equipmentLabel =
    equipment === 'all'
      ? 'All Equipment'
      : equipment.charAt(0).toUpperCase() + equipment.slice(1);

  const selectedCount = selectedIds.size;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${BORDER}`,
          background: SURFACE,
          flexShrink: 0,
        }}
      >
        {/* Left: Cancel */}
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: T2,
            fontSize: 15,
            padding: '4px 0',
          }}
        >
          <ArrowLeft size={18} color={T2} />
          <span>Cancel</span>
        </button>

        {/* Center: Title */}
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: T1,
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          Add Exercise
        </span>

        {/* Right: Create */}
        <button
          onClick={() => console.log('[ExercisePicker] Navigate to /exercise/create')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: ACCENT,
            fontSize: 15,
            fontWeight: 600,
            padding: '4px 0',
          }}
        >
          Create
        </button>
      </div>

      {/* ── Search bar ── */}
      <div
        style={{
          padding: '10px 16px',
          background: BG,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: SURFACE_UP,
            borderRadius: 14,
            padding: '0 12px',
            gap: 8,
          }}
        >
          <Search size={16} color={T3} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={handleQueryChange}
            placeholder="Search exercise"
            autoComplete="off"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: T1,
              fontSize: 15,
              padding: '11px 0',
              caretColor: ACCENT,
            }}
          />
          {query.length > 0 && (
            <button
              onClick={handleClearQuery}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0,
                flexShrink: 0,
              }}
            >
              <X size={16} color={T3} />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter row ── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '4px 16px 10px',
          background: BG,
          flexShrink: 0,
        }}
      >
        {/* Body Part pill */}
        <button
          onClick={() => setOpenDropdown(openDropdown === 'bodyPart' ? null : 'bodyPart')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: bodyPart !== 'all' ? 'rgba(245,197,24,0.14)' : SURFACE_UP,
            border: `1px solid ${bodyPart !== 'all' ? ACCENT : BORDER}`,
            borderRadius: 20,
            padding: '7px 12px',
            cursor: 'pointer',
            color: bodyPart !== 'all' ? ACCENT : T2,
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          <span>{bodyPartLabel}</span>
          <ChevronDown size={13} />
        </button>

        {/* Equipment pill */}
        <button
          onClick={() => setOpenDropdown(openDropdown === 'equipment' ? null : 'equipment')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: equipment !== 'all' ? 'rgba(245,197,24,0.14)' : SURFACE_UP,
            border: `1px solid ${equipment !== 'all' ? ACCENT : BORDER}`,
            borderRadius: 20,
            padding: '7px 12px',
            cursor: 'pointer',
            color: equipment !== 'all' ? ACCENT : T2,
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          <span>{equipmentLabel}</span>
          <ChevronDown size={13} />
        </button>
      </div>

      {/* ── Dropdown portals ── */}
      <AnimatePresence>
        {openDropdown === 'bodyPart' && (
          <FilterDropdown
            options={BODY_PART_OPTIONS}
            selected={bodyPart}
            onSelect={setBodyPart}
            onClose={() => setOpenDropdown(null)}
          />
        )}
        {openDropdown === 'equipment' && (
          <FilterDropdown
            options={EQUIPMENT_OPTIONS}
            selected={equipment}
            onSelect={setEquipment}
            onClose={() => setOpenDropdown(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Exercise list ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: 'calc(100dvh - 160px)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {isLoadingList ? (
          <>
            <SectionHeader title={sectionTitle} />
            {Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)}
          </>
        ) : displayList.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 32px',
              gap: 12,
            }}
          >
            <Search size={36} color={T3} />
            <p style={{ color: T2, fontSize: 15, margin: 0, textAlign: 'center' }}>
              {showSearch
                ? `No exercises found for "${query}"`
                : 'No exercises available'}
            </p>
            {showSearch && (
              <p style={{ color: T3, fontSize: 13, margin: 0, textAlign: 'center' }}>
                Try a different name or clear the filters
              </p>
            )}
          </div>
        ) : (
          <>
            <SectionHeader title={sectionTitle} />
            {displayList.map((ex) => (
              <ExerciseRow
                key={ex.id}
                exercise={ex}
                onAdd={onAdd}
                multiSelect={multiSelect}
                isSelected={selectedIds.has(ex.id)}
                isAlreadyAdded={alreadyAdded.includes(ex.id)}
                onToggle={handleToggle}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Multi-select confirm bar ── */}
      <AnimatePresence>
        {multiSelect && selectedCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 16px',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              background: SURFACE,
              borderTop: `1px solid ${BORDER}`,
              zIndex: 50,
            }}
          >
            <button
              onClick={handleAddSelected}
              style={{
                width: '100%',
                padding: '15px',
                background: ACCENT,
                border: 'none',
                borderRadius: 14,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
                color: BG,
                letterSpacing: '0.01em',
              }}
            >
              Add {selectedCount} Exercise{selectedCount !== 1 ? 's' : ''}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
