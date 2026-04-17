import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '@/components/shared/Avatar';
import { WorkoutShareCard, WorkoutMetadata } from './WorkoutShareCard';
import {
  MessageReactions,
  MessageReactionItem,
  Reaction,
  ReactionPicker,
} from './MessageReactions';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT     = '#0CFF9C';
const SURFACE_UP = '#1C2429';
const T1         = '#EAEEF2';
const T2         = '#8899AA';
const T3         = '#4A5568';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BubbleMessage {
  id: string;
  content: string;
  message_type: 'text' | 'workout_share' | 'calorie_share' | 'system';
  metadata: Record<string, unknown>;
  created_at: string;
  is_read?: boolean;
  sender_id: string;
  sender_profile?: {
    user_id: string;
    name: string;
    avatar_url: string | null;
  };
  reply_message?: { id: string; content: string; sender_id: string } | null;
  reactions?: MessageReactionItem[];
}

interface ChatBubbleProps {
  msg: BubbleMessage;
  isMine: boolean;
  isFirst: boolean;
  isLast: boolean;
  showSenderName?: boolean;
  onLongPress?: (msg: BubbleMessage, rect: DOMRect) => void;
  onReaction?: (msgId: string, reaction: Reaction) => void;
  onReplyTo?: (msg: BubbleMessage) => void;
  replyToProfile?: { name: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function buildBorderRadius(isMine: boolean, isFirst: boolean, isLast: boolean): string {
  // Base radius is 18px on all corners; then adjust the sender-side corners
  // based on sequence position.
  if (isMine) {
    const topRight    = isFirst ? 18 : 6;
    const bottomRight = isLast  ? 4  : 6;
    return `18px ${topRight}px ${bottomRight}px 18px`;
  } else {
    const topLeft    = isFirst ? 18 : 6;
    const bottomLeft = isLast  ? 4  : 6;
    return `${topLeft}px 18px 18px ${bottomLeft}px`;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
const ChatBubble: React.FC<ChatBubbleProps> = ({
  msg,
  isMine,
  isFirst,
  isLast,
  showSenderName = false,
  onLongPress,
  onReaction,
  onReplyTo,
  replyToProfile,
}) => {
  const bubbleRef   = useRef<HTMLDivElement>(null);
  const pressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  // ── Long-press handlers ────────────────────────────────────────────────────
  const handlePointerDown = () => {
    didLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (onLongPress && bubbleRef.current) {
        onLongPress(msg, bubbleRef.current.getBoundingClientRect());
      }
    }, 400);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // ── Derived styles ─────────────────────────────────────────────────────────
  const isGroupSender = showSenderName && !isMine;

  const rowStyle: React.CSSProperties = {
    display:        'flex',
    flexDirection:  isMine ? 'row-reverse' : 'row',
    alignItems:     'flex-end',
    gap:            6,
    marginBottom:   isLast ? 12 : 2,
    marginTop:      isFirst ? 4 : 0,
  };

  const bubbleBackground = isMine
    ? 'rgba(12,255,156,0.12)'
    : SURFACE_UP;

  const bubbleBorder = isMine
    ? '1px solid rgba(12,255,156,0.2)'
    : '1px solid rgba(255,255,255,0.06)';

  const bubbleStyle: React.CSSProperties = {
    maxWidth:        '100%',
    background:      bubbleBackground,
    border:          bubbleBorder,
    borderRadius:    buildBorderRadius(isMine, isFirst, isLast),
    padding:         msg.message_type === 'workout_share' ? '6px' : '10px 12px',
    color:           T1,
    fontSize:        14,
    lineHeight:      1.45,
    cursor:          'pointer',
    userSelect:      'none',
    WebkitUserSelect:'none',
    position:        'relative',
    overflowWrap:    'break-word',
    wordBreak:       'normal',
  };

  const columnStyle: React.CSSProperties = {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    isMine ? 'flex-end' : 'flex-start',
    maxWidth:      '70%',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      style={rowStyle}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {/* Avatar column (group chats, theirs only) */}
      {isGroupSender && (
        <div style={{ width: 24, flexShrink: 0, alignSelf: 'flex-end' }}>
          {isLast && msg.sender_profile ? (
            <Avatar
              src={msg.sender_profile.avatar_url ?? undefined}
              name={msg.sender_profile.name}
              size={24}
            />
          ) : (
            /* placeholder to keep alignment */
            <div style={{ width: 24 }} />
          )}
        </div>
      )}

      {/* Bubble column */}
      <div style={columnStyle}>
        {/* Sender name (group, theirs, first in sequence) */}
        {isGroupSender && isFirst && msg.sender_profile && (
          <span
            style={{
              fontSize:    11,
              color:       ACCENT,
              marginBottom: 2,
              fontWeight:  600,
            }}
          >
            {msg.sender_profile.name}
          </span>
        )}

        {/* Bubble */}
        <div
          ref={bubbleRef}
          style={bubbleStyle}
          onPointerDown={handlePointerDown}
          onPointerUp={cancelPress}
          onPointerMove={cancelPress}
          onPointerCancel={cancelPress}
        >
          {/* Reply preview */}
          {msg.reply_message && (
            <div
              style={{
                borderLeft:   `2px solid ${ACCENT}`,
                background:   'rgba(255,255,255,0.04)',
                borderRadius: 6,
                padding:      '6px 8px',
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 10, color: T3, marginBottom: 2 }}>
                {replyToProfile ? `Replying to ${replyToProfile.name}` : 'Replying to...'}
              </div>
              <div
                style={{
                  fontSize:     11,
                  color:        T2,
                  overflow:     'hidden',
                  whiteSpace:   'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {msg.reply_message.content}
              </div>
            </div>
          )}

          {/* Message content */}
          {msg.message_type === 'workout_share' ? (
            <WorkoutShareCard
              metadata={msg.metadata as unknown as WorkoutMetadata}
              compact
            />
          ) : (
            <span>{msg.content}</span>
          )}

          {/* Timestamp + read receipt */}
          {isLast && (
            <div
              style={{
                display:        'flex',
                justifyContent: 'flex-end',
                alignItems:     'center',
                gap:            3,
                marginTop:      4,
              }}
            >
              <span style={{ fontSize: 10, color: T3 }}>
                {formatTime(msg.created_at)}
              </span>
              {isMine && (
                <span
                  style={{
                    fontSize:   11,
                    color:      msg.is_read ? ACCENT : T3,
                    lineHeight: 1,
                  }}
                >
                  {msg.is_read ? '✓✓' : '✓'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reactions (outside the bubble) */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div style={{ marginTop: 2 }}>
            <MessageReactions
              reactions={msg.reactions}
              onReaction={
                onReaction ? (reaction) => onReaction(msg.id, reaction) : undefined
              }
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatBubble;
