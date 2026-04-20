// src/components/home/TodoList.tsx
// Daily personal to-do list with add / complete / delete.
// Add-task sheet slides up from the bottom.

import { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, MoreHorizontal, Trash2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Todo, TodoCategory, AddTodoOptions } from '@/services/todoService';

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT   = '#E2FF31';
const SURFACE  = 'rgba(255,255,255,0.04)';
const BORDER   = 'rgba(255,255,255,0.08)';
const T1       = 'rgba(255,255,255,0.88)';
const T2       = 'rgba(255,255,255,0.50)';
const T3       = 'rgba(255,255,255,0.28)';
const BG_SHEET = '#141A1F';

// ── Category meta ─────────────────────────────────────────────────────────────
const CATEGORY_META: Record<TodoCategory, { label: string; color: string }> = {
  general:    { label: 'General',    color: '#8899AA' },
  nutrition:  { label: 'Nutrition',  color: '#F97316' },
  hydration:  { label: 'Hydration',  color: '#3B82F6' },
  sleep:      { label: 'Sleep',      color: '#A855F7' },
  supplement: { label: 'Supplement', color: '#10B981' },
  habit:      { label: 'Habit',      color: '#14B8A6' },
  workout:    { label: 'Workout',    color: '#E2FF31' },
};

const CATEGORY_ORDER: TodoCategory[] = [
  'general','nutrition','hydration','sleep','supplement','habit','workout',
];

// ── Individual todo row ───────────────────────────────────────────────────────

function TodoRow({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cat = CATEGORY_META[todo.category] ?? CATEGORY_META.general;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           12,
        padding:       '11px 0',
        borderBottom:  `1px solid ${BORDER}`,
        opacity:        todo.is_completed ? 0.55 : 1,
        transition:    'opacity 0.2s ease',
      }}
    >
      {/* Circular checkbox */}
      <button
        onClick={onToggle}
        style={{
          flexShrink:     0,
          width:          24,
          height:         24,
          borderRadius:   '50%',
          border:         todo.is_completed
            ? 'none'
            : `1.5px solid rgba(255,255,255,0.25)`,
          background:     todo.is_completed ? ACCENT : 'transparent',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          transition:     'all 0.15s ease',
        }}
      >
        {todo.is_completed && (
          <Check style={{ width: 12, height: 12, color: '#000', strokeWidth: 3 }} />
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
        }}>
          <span style={{ fontSize: 14 }}>{todo.icon}</span>
          <span style={{
            fontSize:       13,
            fontWeight:     600,
            color:          T1,
            textDecoration: todo.is_completed ? 'line-through' : 'none',
            overflow:       'hidden',
            textOverflow:   'ellipsis',
            whiteSpace:     'nowrap',
          }}>
            {todo.title}
          </span>
          {todo.is_recurring && (
            <RefreshCw style={{ width: 9, height: 9, color: T3, flexShrink: 0 }} />
          )}
        </div>
        <span style={{
          fontSize:     10,
          fontWeight:   600,
          color:        cat.color,
          opacity:      0.7,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {cat.label}
        </span>
      </div>

      {/* Context menu */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, display: 'flex', alignItems: 'center',
          }}
        >
          <MoreHorizontal style={{ width: 16, height: 16, color: T3 }} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.1 }}
              style={{
                position:  'absolute',
                top:       28,
                right:     0,
                background: '#1C2429',
                border:    '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                overflow:  'hidden',
                zIndex:    50,
                minWidth:  120,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <button
                onClick={() => { setMenuOpen(false); onDelete(); }}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         8,
                  padding:     '10px 14px',
                  width:       '100%',
                  border:      'none',
                  background:  'transparent',
                  cursor:      'pointer',
                  fontSize:    13,
                  fontWeight:  600,
                  color:       '#ef4444',
                }}
              >
                <Trash2 style={{ width: 13, height: 13 }} />
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Add-task bottom sheet ─────────────────────────────────────────────────────

interface AddSheetProps {
  onAdd:   (title: string, opts: AddTodoOptions) => void;
  onClose: () => void;
}

function AddSheet({ onAdd, onClose }: AddSheetProps) {
  const [title,      setTitle]     = useState('');
  const [category,   setCategory]  = useState<TodoCategory>('general');
  const [isRecurring, setRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<string>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]); // 1=Mon…7=Sun
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const DOW_LABELS = ['M','T','W','T','F','S','S'];

  const handleSubmit = () => {
    if (!title.trim()) return;
    const opts: AddTodoOptions = {
      category,
      isRecurring,
      recurrenceType: isRecurring ? recurrence : undefined,
      recurrenceDays: recurrence === 'custom' ? customDays : [],
    };
    onAdd(title, opts);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 100,
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        style={{
          position:     'fixed',
          bottom:       0, left: 0, right: 0,
          background:   BG_SHEET,
          borderRadius: '20px 20px 0 0',
          padding:      '20px 20px calc(env(safe-area-inset-bottom) + 24px)',
          zIndex:       101,
          boxShadow:    '0 -8px 40px rgba(0,0,0,0.5)',
          maxHeight:    '85vh',
          overflowY:    'auto',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.15)',
          margin: '0 auto 20px',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: T1 }}>New Task</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: 18, height: 18, color: T2 }} />
          </button>
        </div>

        {/* Title input */}
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="What do you need to do?"
          maxLength={200}
          style={{
            width:        '100%',
            background:   SURFACE,
            border:       `1px solid ${BORDER}`,
            borderRadius: 12,
            padding:      '12px 14px',
            fontSize:     14,
            color:        T1,
            outline:      'none',
            marginBottom: 16,
            boxSizing:    'border-box',
          }}
        />

        {/* Category chips */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Category
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORY_ORDER.map(cat => {
              const meta = CATEGORY_META[cat];
              const active = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding:      '5px 12px',
                    borderRadius: 20,
                    fontSize:     11,
                    fontWeight:   700,
                    cursor:       'pointer',
                    border:       active ? 'none' : `1px solid ${BORDER}`,
                    background:   active ? meta.color : SURFACE,
                    color:        active ? '#000' : T2,
                    transition:   'all 0.12s ease',
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recurring toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isRecurring ? 12 : 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T1 }}>Repeat daily</div>
            <div style={{ fontSize: 11, color: T3, marginTop: 2 }}>Show this task every day</div>
          </div>
          <button
            onClick={() => setRecurring(v => !v)}
            style={{
              width:         44,
              height:        24,
              borderRadius:  12,
              border:        'none',
              background:    isRecurring ? ACCENT : 'rgba(255,255,255,0.12)',
              cursor:        'pointer',
              position:      'relative',
              transition:    'background 0.2s ease',
              flexShrink:    0,
            }}
          >
            <div style={{
              position:   'absolute',
              top:         2,
              left:        isRecurring ? 22 : 2,
              width:       20,
              height:      20,
              borderRadius: '50%',
              background:  isRecurring ? '#000' : 'rgba(255,255,255,0.7)',
              transition:  'left 0.2s ease',
            }} />
          </button>
        </div>

        {/* Recurrence options */}
        <AnimatePresence>
          {isRecurring && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden', marginBottom: 20 }}
            >
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: recurrence === 'custom' ? 12 : 0 }}>
                {(['daily','weekdays','weekends','weekly','custom'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setRecurrence(opt)}
                    style={{
                      padding:      '5px 12px',
                      borderRadius: 20,
                      fontSize:     11,
                      fontWeight:   700,
                      cursor:       'pointer',
                      border:       recurrence === opt ? 'none' : `1px solid ${BORDER}`,
                      background:   recurrence === opt ? ACCENT : SURFACE,
                      color:        recurrence === opt ? '#000' : T2,
                      textTransform: 'capitalize',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Custom day-of-week picker */}
              {recurrence === 'custom' && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', paddingTop: 8 }}>
                  {DOW_LABELS.map((label, i) => {
                    const day = i + 1; // 1=Mon…7=Sun
                    const active = customDays.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => setCustomDays(prev =>
                          active ? prev.filter(d => d !== day) : [...prev, day]
                        )}
                        style={{
                          width:        34,
                          height:       34,
                          borderRadius: '50%',
                          border:       active ? 'none' : `1px solid ${BORDER}`,
                          background:   active ? ACCENT : SURFACE,
                          color:        active ? '#000' : T2,
                          fontSize:     12,
                          fontWeight:   700,
                          cursor:       'pointer',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          style={{
            width:        '100%',
            background:   title.trim() ? ACCENT : 'rgba(255,255,255,0.08)',
            color:        title.trim() ? '#000' : T3,
            border:       'none',
            borderRadius: 14,
            height:       50,
            fontSize:     15,
            fontWeight:   800,
            cursor:       title.trim() ? 'pointer' : 'not-allowed',
            transition:   'all 0.15s ease',
          }}
        >
          Add Task
        </button>
      </motion.div>
    </>
  );
}

// ── Main TodoList component ────────────────────────────────────────────────────

interface TodoListProps {
  todos:    Todo[];
  isLoading: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd:    (title: string, opts: AddTodoOptions) => void;
}

export function TodoList({ todos, isLoading, onToggle, onDelete, onAdd }: TodoListProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const incomplete = todos.filter(t => !t.is_completed);
  const complete   = todos.filter(t =>  t.is_completed);
  const doneCount  = complete.length;
  const totalCount = todos.length;

  return (
    <>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingLeft: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: T3, textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            My Tasks
          </span>
          {totalCount > 0 && (
            <span style={{
              fontSize:   11,
              fontWeight: 700,
              color:      doneCount === totalCount ? '#0CFF9C' : ACCENT,
              background: doneCount === totalCount ? 'rgba(12,255,156,0.1)' : 'rgba(226,255,49,0.1)',
              borderRadius: 20,
              padding:    '1px 7px',
            }}>
              {doneCount}/{totalCount}
            </span>
          )}
        </div>

        <button
          onClick={() => setSheetOpen(true)}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          4,
            background:   'none',
            border:       'none',
            cursor:       'pointer',
            fontSize:     13,
            fontWeight:   700,
            color:        ACCENT,
            padding:      '4px 2px',
          }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Add
        </button>
      </div>

      {/* List card */}
      <div style={{
        background:   SURFACE,
        border:       `1px solid ${BORDER}`,
        borderRadius: 16,
        padding:      '0 16px',
        marginBottom: 24,
      }}>
        {isLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: T3, fontSize: 13 }}>
            Loading tasks…
          </div>
        ) : todos.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 13, color: T2, fontWeight: 600, marginBottom: 4 }}>
              No tasks yet
            </div>
            <div style={{ fontSize: 11, color: T3 }}>
              Tap "+ Add" to create your first task
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {/* Incomplete tasks */}
            {incomplete.map(todo => (
              <TodoRow
                key={todo.id}
                todo={todo}
                onToggle={() => onToggle(todo.id)}
                onDelete={() => onDelete(todo.id)}
              />
            ))}

            {/* Completed tasks (dimmed) */}
            {complete.map(todo => (
              <TodoRow
                key={todo.id}
                todo={todo}
                onToggle={() => onToggle(todo.id)}
                onDelete={() => onDelete(todo.id)}
              />
            ))}
          </AnimatePresence>
        )}

        {/* + Add task ghost row */}
        {!isLoading && (
          <button
            onClick={() => setSheetOpen(true)}
            style={{
              display:     'flex',
              alignItems:  'center',
              gap:         8,
              width:       '100%',
              background:  'none',
              border:      'none',
              cursor:      'pointer',
              padding:     '13px 0',
              fontSize:    13,
              fontWeight:  600,
              color:       T3,
            }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Add task
          </button>
        )}
      </div>

      {/* Add task sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <AddSheet
            onAdd={onAdd}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
