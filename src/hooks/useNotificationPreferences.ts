/**
 * useNotificationPreferences.ts
 *
 * Hook to read & update the current user's email notification preferences.
 * The underlying table is `notification_preferences` (created by migration).
 *
 * @example
 * ```tsx
 * function NotificationSettings() {
 *   const { prefs, loading, savePrefs } = useNotificationPreferences();
 *
 *   return (
 *     <label>
 *       DM emails
 *       <input
 *         type="checkbox"
 *         checked={prefs?.email_dm_notify ?? true}
 *         onChange={(e) => savePrefs({ email_dm_notify: e.target.checked })}
 *       />
 *     </label>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  user_id:            string;
  email_dm_notify:    boolean;
  email_group_notify: boolean;
  quiet_from:         number | null;
  quiet_to:           number | null;
  digest_mode:        boolean;
  updated_at:         string;
}

export type NotificationPrefsUpdate = Partial<
  Omit<NotificationPreferences, 'user_id' | 'updated_at'>
>;

// ─── Hook ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as never) as any;

export function useNotificationPreferences() {
  const { user } = useAuth();

  const [prefs, setPrefs]     = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // ── Fetch (or create with defaults) ─────────────────────────────────────────
  const fetchPrefs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchErr } = await db('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }

    if (data) {
      setPrefs(data as NotificationPreferences);
    } else {
      // First visit — insert default row
      const defaults: Omit<NotificationPreferences, 'updated_at'> = {
        user_id:            user.id,
        email_dm_notify:    true,
        email_group_notify: true,
        quiet_from:         null,
        quiet_to:           null,
        digest_mode:        false,
      };
      const { data: inserted, error: insertErr } = await db('notification_preferences')
        .insert(defaults)
        .select('*')
        .single();

      if (insertErr) {
        setError(insertErr.message);
      } else {
        setPrefs(inserted as NotificationPreferences);
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  // ── Save partial update ──────────────────────────────────────────────────────
  const savePrefs = useCallback(async (updates: NotificationPrefsUpdate) => {
    if (!user) return;
    setSaving(true);
    setError(null);

    // Optimistic update
    setPrefs((prev) => prev ? { ...prev, ...updates } : null);

    const { data, error: updateErr } = await db('notification_preferences')
      .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() })
      .select('*')
      .single();

    if (updateErr) {
      setError(updateErr.message);
      // Roll back
      fetchPrefs();
    } else {
      setPrefs(data as NotificationPreferences);
    }

    setSaving(false);
  }, [user, fetchPrefs]);

  return { prefs, loading, saving, error, savePrefs, refetch: fetchPrefs };
}
