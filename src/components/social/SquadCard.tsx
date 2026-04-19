import { useState } from 'react';
import { Users, MoreVertical, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Group } from '@/types/social';

const ACCENT    = '#0CFF9C';
const SURFACE   = '#141A1F';
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
  const count = group.member_count ?? 0;

  return (
    <motion.div
      whileHover={{ scale: 0.98, translateY: -2 }}
      style={{
        background: SURFACE,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        position: 'relative',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Three-dots menu button */}
      <div style={{ position: 'absolute', top: 12, right: 12 }}>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            transition: 'background-color 0.2s',
          }}
          aria-label="Squad options"
        >
          <MoreVertical size={16} color={T2} />
        </motion.button>

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
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                zIndex: 10,
                minWidth: 140,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
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
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#FF6B6B',
                  }}
                >
                  Leave Squad
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
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 13,
                    fontWeight: 500,
                    color: T1,
                  }}
                >
                  Squad Settings
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Row layout */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {/* Left: group avatar */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
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
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Users size={20} color={T2} />
          )}
        </div>

        {/* Right: info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 16,
              fontWeight: 600, // Semi-bold per specs
              color: T1,
              marginBottom: 4,
              margin: '0 0 4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              paddingRight: 32,
            }}
          >
            {group.name}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex' }}>
              {/* Decorative small avatars preview (requested by user) */}
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#333', border: '1px solid #1A1A1A' }} />
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#444', border: '1px solid #1A1A1A', marginLeft: -6 }} />
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#555', border: '1px solid #1A1A1A', marginLeft: -6 }} />
            </div>
            <p style={{ fontSize: 13, color: T3, margin: 0, fontWeight: 500 }}>
              {count} {count === 1 ? 'member' : 'members'} <span style={{ opacity: 0.5, marginLeft: 4 }}>• Active recently</span>
            </p>
          </div>

          {/* Pill row */}
          {((workoutsThisWeek ?? 0) > 0 || rankPosition) && (
            <div
              style={{
                marginTop: 8,
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
                  {workoutsThisWeek} Workouts
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

      {/* Message button (Primary CTA) */}
      <motion.button
        whileHover={{ filter: 'brightness(1.1)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onMessage(group)}
        style={{
          marginTop: 16,
          width: '100%',
          height: 48,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.12)',
          color: T1,
          background: 'rgba(255,255,255,0.04)',
          boxShadow: 'none',
          fontSize: 13,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <MessageCircle size={16} strokeWidth={2.5} color={T2} />
        Chat With Squad
      </motion.button>
    </motion.div>
  );
}
