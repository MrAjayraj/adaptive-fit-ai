/**
 * NotificationSettings.tsx
 * Settings panel for email notification preferences.
 *
 * @example
 * ```tsx
 * // In your Settings page:
 * import NotificationSettings from '@/components/settings/NotificationSettings';
 * <NotificationSettings />
 * ```
 */

import React, { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Users, Moon, Loader2, CheckCircle } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       '#131318',
  surface:  '#1F1F24',
  surfaceHi:'#2A292F',
  primary:  '#FF6B35',
  green:    '#4AE176',
  textPri:  '#E4E1E9',
  textSec:  '#E1BFB5',
  textMuted:'#A98A80',
  outline:  'rgba(89,65,57,0.22)',
} as const;

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      whileTap={{ scale: 0.92 }}
      style={{
        width: 48, height: 27, borderRadius: 14,
        backgroundColor: checked ? C.primary : C.surfaceHi,
        border: `1px solid ${checked ? C.primary : C.outline}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        transition: 'background 0.2s, border-color 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <motion.div
        animate={{ x: checked ? 23 : 3 }}
        transition={{ type: 'spring', damping: 18, stiffness: 260 }}
        style={{
          position: 'absolute', top: 3,
          width: 19, height: 19, borderRadius: 10,
          backgroundColor: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }}
      />
    </motion.button>
  );
}

// ─── Setting row component ────────────────────────────────────────────────────
function SettingRow({ icon, label, description, checked, onChange, disabled }: {
  icon:        React.ReactNode;
  label:       string;
  description: string;
  checked:     boolean;
  onChange:    (v: boolean) => void;
  disabled?:   boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '16px 0',
      borderBottom: `1px solid ${C.outline}`,
    }}>
      {/* Icon badge */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        backgroundColor: C.surfaceHi,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.primary,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.textPri }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textMuted, lineHeight: '16px' }}>{description}</p>
      </div>

      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─── Quiet hours select ───────────────────────────────────────────────────────
function HourSelect({ value, onChange, placeholder }: {
  value:       number | null;
  onChange:    (v: number | null) => void;
  placeholder: string;
}) {
  const selectStyle: CSSProperties = {
    backgroundColor: C.surfaceHi,
    color: C.textPri,
    border: `1px solid ${C.outline}`,
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'inherit',
    width: 110,
  };

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      style={selectStyle}
    >
      <option value="">{placeholder}</option>
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {h.toString().padStart(2, '0')}:00
        </option>
      ))}
    </select>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════
const NotificationSettings: React.FC = () => {
  const { prefs, loading, saving, error, savePrefs } = useNotificationPreferences();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: C.textMuted }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: 10, fontSize: 14 }}>Loading preferences…</span>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: C.surface,
      borderRadius: 20,
      padding: '24px 28px',
      border: `1px solid ${C.outline}`,
      fontFamily: "'Inter','Manrope',sans-serif",
      maxWidth: 560,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `linear-gradient(135deg, ${C.primary}, #FF9A35)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Mail size={18} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.textPri }}>
            Email Notifications
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>
            Receive emails when you have new messages
          </p>
        </div>

        {/* Save indicator */}
        {saving && (
          <Loader2 size={16} color={C.textMuted}
            style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite' }} />
        )}
        {!saving && prefs && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: C.green, fontSize: 12, fontWeight: 600 }}>
            <CheckCircle size={14} />
            Saved
          </div>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '10px 14px',
          marginBottom: 16, fontSize: 13, color: '#F87171',
        }}>
          {error}
        </div>
      )}

      {/* Toggles */}
      <SettingRow
        icon={<MessageSquare size={20} />}
        label="Direct Messages"
        description="Get an email when a friend sends you a DM (max 1 per 15 min per chat)"
        checked={prefs?.email_dm_notify ?? true}
        onChange={(v) => savePrefs({ email_dm_notify: v })}
        disabled={saving}
      />
      <SettingRow
        icon={<Users size={20} />}
        label="Group Messages"
        description="Get an email when someone posts in a group you belong to"
        checked={prefs?.email_group_notify ?? true}
        onChange={(v) => savePrefs({ email_group_notify: v })}
        disabled={saving}
      />

      {/* Quiet hours */}
      <div style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Moon size={16} color={C.primary} />
          <span style={{ fontSize: 15, fontWeight: 600, color: C.textPri }}>Quiet Hours</span>
          <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>
            (no emails between these times)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <HourSelect
            value={prefs?.quiet_from ?? null}
            onChange={(v) => savePrefs({ quiet_from: v })}
            placeholder="From"
          />
          <span style={{ color: C.textMuted, fontSize: 14 }}>to</span>
          <HourSelect
            value={prefs?.quiet_to ?? null}
            onChange={(v) => savePrefs({ quiet_to: v })}
            placeholder="To"
          />
          {(prefs?.quiet_from != null || prefs?.quiet_to != null) && (
            <button
              onClick={() => savePrefs({ quiet_from: null, quiet_to: null })}
              style={{
                background: 'none', border: 'none',
                color: C.textMuted, fontSize: 12, cursor: 'pointer',
                textDecoration: 'underline', fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
          )}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: C.textMuted }}>
          Uses your local timezone. Leave blank to receive emails at any time.
        </p>
      </div>

      {/* Inline styles for the loader animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default NotificationSettings;
