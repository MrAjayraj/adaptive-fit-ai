// src/services/todoService.ts
// CRUD for user_todos. Recurring todos use a completed_dates date[] column to
// track per-day completions without needing a separate completions table.

import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (name: string) => supabase.from(name as never) as any;

// ─── Types ───────────────────────────────────────────────────────────────────

export type TodoCategory =
  | 'general'
  | 'nutrition'
  | 'hydration'
  | 'sleep'
  | 'supplement'
  | 'habit'
  | 'workout';

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  todo_date: string;            // YYYY-MM-DD
  is_completed: boolean;        // for one-time: DB value; for recurring: derived
  completed_at: string | null;
  completed_dates: string[];    // dates this recurring todo was completed
  is_recurring: boolean;
  recurrence_type: string | null;
  recurrence_days: number[];    // 1=Mon … 7=Sun
  category: TodoCategory;
  icon: string;
  sort_order: number;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** ISO weekday: 1=Mon … 7=Sun (matches recurrence_days convention) */
function isoWeekday(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0=Sun
  return dow === 0 ? 7 : dow;
}

/** True if a recurring todo should appear on the given ISO date */
function recurringAppliesToDate(todo: Todo, dateStr: string): boolean {
  const wd = isoWeekday(dateStr);
  switch (todo.recurrence_type ?? 'daily') {
    case 'daily':    return true;
    case 'weekdays': return wd >= 1 && wd <= 5;
    case 'weekends': return wd === 6 || wd === 7;
    case 'weekly':
    case 'custom':   return todo.recurrence_days.includes(wd);
    default:         return true;
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/** Fetch all todos relevant to a specific date (one-time + applicable recurring). */
export async function getTodosForDate(userId: string, date: string): Promise<Todo[]> {
  // One-time todos for this date
  const { data: onetime, error: e1 } = await tbl('user_todos')
    .select('*')
    .eq('user_id', userId)
    .eq('todo_date', date)
    .eq('is_recurring', false)
    .order('sort_order', { ascending: true });

  if (e1) {
    console.error('[todoService] getTodosForDate (one-time):', e1.message);
    return [];
  }

  // All recurring todos for this user
  const { data: recurring, error: e2 } = await tbl('user_todos')
    .select('*')
    .eq('user_id', userId)
    .eq('is_recurring', true)
    .order('sort_order', { ascending: true });

  if (e2) {
    console.error('[todoService] getTodosForDate (recurring):', e2.message);
  }

  // Filter recurring to those that apply to this date, then inject per-date completion
  const applicableRecurring: Todo[] = ((recurring ?? []) as Todo[])
    .filter(t => recurringAppliesToDate(t, date))
    .map(t => ({
      ...t,
      is_completed: (t.completed_dates ?? []).includes(date),
      completed_at: (t.completed_dates ?? []).includes(date) ? date : null,
    }));

  const all: Todo[] = [...((onetime ?? []) as Todo[]), ...applicableRecurring];

  // Sort: incomplete first → sort_order → created_at
  return all.sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export interface AddTodoOptions {
  description?: string;
  category?: TodoCategory;
  icon?: string;
  isRecurring?: boolean;
  recurrenceType?: string;
  recurrenceDays?: number[];
  todoDate?: string;
}

export async function addTodo(
  userId: string,
  title: string,
  opts: AddTodoOptions = {}
): Promise<Todo> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await tbl('user_todos')
    .insert({
      user_id:         userId,
      title:           title.trim(),
      description:     opts.description ?? null,
      todo_date:       opts.todoDate ?? today,
      is_recurring:    opts.isRecurring ?? false,
      recurrence_type: opts.recurrenceType ?? (opts.isRecurring ? 'daily' : null),
      recurrence_days: opts.recurrenceDays ?? [],
      completed_dates: [],
      category:        opts.category ?? 'general',
      icon:            opts.icon ?? '✓',
      sort_order:      0,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as Todo;
}

/** Toggle completion for a todo on a specific date. */
export async function toggleTodo(
  todoId: string,
  date: string,
  isRecurring: boolean,
  currentlyCompleted: boolean
): Promise<void> {
  if (!isRecurring) {
    const { error } = await tbl('user_todos')
      .update({
        is_completed: !currentlyCompleted,
        completed_at: !currentlyCompleted ? new Date().toISOString() : null,
      })
      .eq('id', todoId);
    if (error) throw new Error(error.message);
  } else {
    // Fetch current completed_dates array
    const { data: row, error: fetchErr } = await tbl('user_todos')
      .select('completed_dates')
      .eq('id', todoId)
      .single();
    if (fetchErr || !row) throw new Error('Todo not found');

    const current: string[] = row.completed_dates ?? [];
    const updated = currentlyCompleted
      ? current.filter((d: string) => d !== date)
      : [...current, date];

    const { error } = await tbl('user_todos')
      .update({ completed_dates: updated })
      .eq('id', todoId);
    if (error) throw new Error(error.message);
  }
}

export async function deleteTodo(todoId: string): Promise<void> {
  const { error } = await tbl('user_todos').delete().eq('id', todoId);
  if (error) throw new Error(error.message);
}

export async function updateTodoTitle(todoId: string, title: string): Promise<void> {
  const { error } = await tbl('user_todos').update({ title: title.trim() }).eq('id', todoId);
  if (error) throw new Error(error.message);
}

// ─── Default seeding ─────────────────────────────────────────────────────────

export async function hasTodos(userId: string): Promise<boolean> {
  const { count } = await tbl('user_todos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

export async function createDefaultTodos(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const defaults = [
    { title: 'Drink 3L water',      category: 'hydration'   as TodoCategory, icon: '💧' },
    { title: 'Take supplements',    category: 'supplement'  as TodoCategory, icon: '💊' },
    { title: 'Sleep 8 hours',       category: 'sleep'       as TodoCategory, icon: '😴' },
    { title: 'Walk 10,000 steps',   category: 'habit'       as TodoCategory, icon: '🚶' },
    { title: 'Hit protein goal',    category: 'nutrition'   as TodoCategory, icon: '🥩' },
  ];

  const rows = defaults.map((d, i) => ({
    user_id:         userId,
    title:           d.title,
    category:        d.category,
    icon:            d.icon,
    todo_date:       today,
    is_recurring:    true,
    recurrence_type: 'daily',
    recurrence_days: [],
    completed_dates: [],
    sort_order:      i,
  }));

  const { error } = await tbl('user_todos').insert(rows);
  if (error) console.error('[todoService] createDefaultTodos:', error.message);
}
