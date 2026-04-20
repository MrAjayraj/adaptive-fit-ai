// src/hooks/useTodos.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getTodosForDate, addTodo, toggleTodo, deleteTodo,
  createDefaultTodos, hasTodos,
  type Todo, type AddTodoOptions,
} from '@/services/todoService';

interface UseTodosReturn {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
  add: (title: string, opts?: AddTodoOptions) => Promise<void>;
  toggle: (todoId: string) => Promise<void>;
  remove: (todoId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useTodos(date: string): UseTodosReturn {
  const { user } = useAuth();
  const [todos, setTodos]     = useState<Todo[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

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

  // Initial load; also seed defaults for first-time users
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Seed defaults if user has never created a todo
        const hasAny = await hasTodos(user.id);
        if (!hasAny) await createDefaultTodos(user.id);

        const data = await getTodosForDate(user.id, date);
        if (!cancelled) setTodos(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, date]);

  const add = useCallback(async (title: string, opts?: AddTodoOptions) => {
    if (!user?.id) return;
    const todo = await addTodo(user.id, title, { ...opts, todoDate: date });
    setTodos(prev => {
      const merged = [...prev, todo];
      return merged.sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        return a.sort_order - b.sort_order;
      });
    });
  }, [user?.id, date]);

  const toggle = useCallback(async (todoId: string) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    // Optimistic update
    setTodos(prev =>
      prev
        .map(t => t.id === todoId ? { ...t, is_completed: !t.is_completed } : t)
        .sort((a, b) => {
          if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
          return a.sort_order - b.sort_order;
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
    }
  }, [todos, date]);

  const remove = useCallback(async (todoId: string) => {
    setTodos(prev => prev.filter(t => t.id !== todoId));
    try {
      await deleteTodo(todoId);
    } catch (err) {
      console.error('[useTodos] delete failed:', err);
      await reload();
    }
  }, [reload]);

  return { todos, isLoading, error, add, toggle, remove, reload };
}
