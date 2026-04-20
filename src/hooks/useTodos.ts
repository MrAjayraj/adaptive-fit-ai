// src/hooks/useTodos.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  getTodosForDate, addTodo, toggleTodo, deleteTodo,
  createDefaultTodos, hasTodos,
  type Todo, type AddTodoOptions,
} from '@/services/todoService';

interface UseTodosReturn {
  todos:     Todo[];
  isLoading: boolean;
  error:     string | null;
  add:       (title: string, opts?: AddTodoOptions) => Promise<void>;
  toggle:    (todoId: string) => Promise<void>;
  remove:    (todoId: string) => Promise<void>;
  reload:    () => Promise<void>;
}

export function useTodos(date: string): UseTodosReturn {
  const { user } = useAuth();
  const [todos,     setTodos]   = useState<Todo[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error,     setError]   = useState<string | null>(null);

  // ── One-time seed: only runs when userId becomes available, NOT on every date change ──
  const seededRef = useRef(false);
  useEffect(() => {
    if (!user?.id || seededRef.current) return;
    seededRef.current = true;
    (async () => {
      try {
        const has = await hasTodos(user.id);
        if (!has) await createDefaultTodos(user.id);
      } catch {
        // table may not exist yet — silently ignore, load will handle it
      }
    })();
  }, [user?.id]);

  // ── Reload whenever userId or date changes ──
  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTodosForDate(user.id, date);
      setTodos(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(msg);
      console.error('[useTodos] reload:', msg);
    } finally {
      setLoading(false);
    }
  }, [user?.id, date]);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── Add ──────────────────────────────────────────────────────────────────────
  const add = useCallback(async (title: string, opts?: AddTodoOptions) => {
    if (!user?.id) {
      toast.error('Please sign in to add tasks.');
      return;
    }
    try {
      const todo = await addTodo(user.id, title, { ...opts, todoDate: date });
      setTodos(prev => {
        const merged = [...prev, todo];
        return merged.sort((a, b) => {
          if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useTodos] add failed:', msg);
      toast.error('Failed to add task — ' + msg);
      throw err; // re-throw so the sheet stays open
    }
  }, [user?.id, date]);

  // ── Toggle ───────────────────────────────────────────────────────────────────
  const toggle = useCallback(async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    // Optimistic update
    setTodos(prev =>
      prev
        .map(t => t.id === todoId ? { ...t, is_completed: !t.is_completed } : t)
        .sort((a, b) => {
          if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        })
    );

    try {
      await toggleTodo(todoId, date, todo.is_recurring, todo.is_completed);
    } catch (err) {
      // Revert on failure
      setTodos(prev =>
        prev.map(t => t.id === todoId ? { ...t, is_completed: todo.is_completed } : t)
      );
      console.error('[useTodos] toggle failed:', err);
      toast.error('Could not update task. Try again.');
    }
  }, [todos, date]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  const remove = useCallback(async (todoId: string) => {
    setTodos(prev => prev.filter(t => t.id !== todoId));
    try {
      await deleteTodo(todoId);
    } catch (err) {
      console.error('[useTodos] delete failed:', err);
      toast.error('Could not delete task.');
      await reload();
    }
  }, [reload]);

  return { todos, isLoading, error, add, toggle, remove, reload };
}
