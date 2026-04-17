import { useState } from 'react';
import { Users, MoreVertical, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Group } from '@/types/social';

const ACCENT = '#0CFF9C';
const SURFACE = '#141A1F';
const SURFACE_UP = '#1C2429';
const T1 = '#EAEEF2';
const T2 = '#8899AA';
const T3 = '#4A5568';

interface SquadCardProps {
  group: Group;
  onMessage: (group: Group) => void;
  onLeave?: (group: Group) => void;
  onSettings?: (group: Group) => void;
  workoutsThisWeek?: number;
  rankPosition?: number;
}

export default function SquadCard({
  group,
  onMessage,
  onLeave,
  onSettings,
  workoutsThisWeek,
  rankPosition,
}: SquadCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      style={{
        background: SURFACE,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
      }}
    >
      {/* Three-dots menu button */}
      <div style={{ position: 'absolute', top: 12, right: 12 }}>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          aria-label="Squad options"
        >
          <MoreVertical size={16} color={T2} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: SURFACE_UP,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                zIndex: 10,
                minWidth: 140,
                overflow: 'hidden',
              }}
            >
              {onLeave && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLeave(group);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: 13,
                    color: T1,
                  }}
                >
                  Leave Group
                </button>
              )}
              {onSettings && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onSettings(group);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: 13,
                    color: T1,
                  }}
                >
                  Settings
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Row layout */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Left: group avatar */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: SURFACE_UP,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {group.avatar_url ? (
            <img
              src={group.avatar_url}
              alt={group.name}
              style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }}
            />
          ) : (
            <Users size={24} color={T2} />
          )}
        </div>

        {/* Right: info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: T1,
              marginBottom: 2,
              margin: '0 0 2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              // Reserve space for the three-dots button on the right
              paddingRight: 32,
            }}
          >
            {group.name}
          </p>

          <p style={{ fontSize: 12, color: T3, margin: 0 }}>
            {group.member_count ?? '?'} Members
          </p>

          {/* Pill row */}
          {((workoutsThisWeek ?? 0) > 0 || rankPosition) && (
            <div
              style={{
                marginTop: 6,
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              {(workoutsThisWeek ?? 0) > 0 && (
                <span
                  style={{
                    background: 'rgba(12,255,156,0.1)',
                    color: ACCENT,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '3px 8px',
                    borderRadius: 20,
                    fontWeight: 600,
                  }}
                >
                  {workoutsThisWeek} Workouts This Week
                </span>
              )}
              {rankPosition && (
                <span
                  style={{
                    background: 'rgba(12,255,156,0.1)',
                    color: ACCENT,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '3px 8px',
                    borderRadius: 20,
                    fontWeight: 600,
                  }}
                >
                  Rank #{rankPosition}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message button */}
      <button
        onClick={() => onMessage(group)}
        style={{
          marginTop: 12,
          width: '100%',
          height: 36,
          borderRadius: 10,
          border: '1px solid rgba(12,255,156,0.25)',
          color: ACCENT,
          background: 'transparent',
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <MessageCircle size={14} />
        Message
      </button>
    </div>
  );
}
