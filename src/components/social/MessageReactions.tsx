import React from 'react';
import { motion } from 'framer-motion';
// framer-motion and lucide-react are both available; lucide used here for
// potential future icon additions. No lucide icons needed in this UI directly.

// ── Design tokens ─────────────────────────────────────────────────────────────
const SURFACE_UP = '#1C2429';

// ── Types ─────────────────────────────────────────────────────────────────────
export type Reaction = '💪' | '🔥' | '👏' | '❤️' | '😂';

export interface MessageReactionItem {
  reaction: Reaction;
  count: number;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  reactions: MessageReactionItem[];
  onToggle: (r: Reaction) => void;
  isMine: boolean;
}

// ── All available reactions (used by picker) ──────────────────────────────────
const ALL_REACTIONS: Reaction[] = ['💪', '🔥', '👏', '❤️', '😂'];

// ── MessageReactions ──────────────────────────────────────────────────────────
export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onToggle,
  isMine: _isMine, // available for future layout mirroring (e.g. align right)
}) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
      }}
    >
      {reactions.map((item) => (
        <motion.button
          key={item.reaction}
          whileTap={{ scale: 1.2 }}
          onClick={() => onToggle(item.reaction)}
          style={{
            background: item.hasReacted
              ? 'rgba(12,255,156,0.15)'
              : SURFACE_UP,
            border: item.hasReacted
              ? '1px solid rgba(12,255,156,0.35)'
              : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          aria-label={`${item.reaction} ${item.count}`}
          aria-pressed={item.hasReacted}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>{item.reaction}</span>
          <span
            style={{
              fontSize: 11,
              color: '#8899AA',
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            {item.count}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

// ── ReactionPicker ────────────────────────────────────────────────────────────
interface ReactionPickerProps {
  onPick: (r: Reaction) => void;
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onPick }) => (
  <div
    style={{
      display: 'flex',
      flexWrap: 'nowrap',
      gap: 4,
    }}
  >
    {ALL_REACTIONS.map((r) => (
      <motion.button
        key={r}
        whileTap={{ scale: 1.2 }}
        onClick={() => onPick(r)}
        style={{
          background: SURFACE_UP,
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20,
          padding: '3px 8px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'inherit',
        }}
        aria-label={`React with ${r}`}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{r}</span>
      </motion.button>
    ))}
  </div>
);

export default MessageReactions;
