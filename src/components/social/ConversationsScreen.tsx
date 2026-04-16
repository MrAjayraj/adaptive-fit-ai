// src/components/social/ConversationsScreen.tsx
// FitPulse Messages inbox – Kinetic Obsidian design  (real Supabase data)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users, Edit3 } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import type { ConversationPreview } from '@/services/chatService';
import BottomNav from '@/components/layout/BottomNav';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#131318',
  surface:   '#1F1F24',
  surfaceHi: '#2A292F',
  highest:   '#35343A',
  primary:   '#FF6B35',
  green:     '#4AE176',
  textPri:   '#E4E1E9',
  textSec:   '#E1BFB5',
  textMuted: '#A98A80',
  outline:   'rgba(89,65,57,0.18)',
} as const;

type FilterTab = 'All' | 'Unread';
const TABS: FilterTab[] = ['All', 'Unread'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 7)  return `${d}d`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Initials avatar ─────────────────────────────────────────────────────────
function InboxAvatar({ src, name }: { src: string | null; name: string }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 0
    ? words.map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : (name.trim()[0]?.toUpperCase() ?? '?');
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: 56, height: 56, borderRadius: 28, flexShrink: 0,
      background: `${C.primary}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, fontWeight: 700, color: C.primary,
    }}>
      {initials}
    </div>
  );
}

// ─── Conversation row ─────────────────────────────────────────────────────────
function ConversationRow({ conv, onClick }: { conv: ConversationPreview; onClick: () => void }) {
  const name      = conv.friend_profile?.name ?? 'Unknown';
  const hasUnread = conv.unread_count > 0;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: 'calc(100% - 24px)', padding: '12px 14px',
        margin: '3px 12px',
        borderRadius: 16, border: 'none', cursor: 'pointer',
        background: hovered ? C.surfaceHi : C.surface,
        transition: 'background 0.15s',
        textAlign: 'left',
      }}
    >
      {/* Avatar + online indicator */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <InboxAvatar src={conv.friend_profile?.avatar_url ?? null} name={name} />
        {/* Unread dot on avatar */}
        {hasUnread && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            width: 14, height: 14, borderRadius: 7,
            backgroundColor: C.primary,
            border: `2px solid ${C.bg}`,
          }} />
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 16, fontWeight: hasUnread ? 700 : 600,
            color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </span>
          <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>
            {formatRelativeTime(conv.last_message_at)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={{
            margin: 0, fontSize: 14,
            color: hasUnread ? C.textSec : C.textMuted,
            fontWeight: hasUnread ? 500 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {conv.last_message}
          </p>
          {hasUnread && conv.unread_count > 1 && (
            <span style={{
              flexShrink: 0, fontSize: 11, fontWeight: 700,
              backgroundColor: C.primary, color: '#FFFFFF',
              padding: '2px 8px', borderRadius: 12, minWidth: 22, textAlign: 'center',
            }}>
              {conv.unread_count > 99 ? '99+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ConversationsScreen() {
  const navigate = useNavigate();
  const { conversations, isLoading, error } = useConversations();
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const filtered = conversations.filter((c) => {
    if (activeTab === 'Unread') return c.unread_count > 0;
    return true;
  });

  return (
    <div style={{
      minHeight: '100dvh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter','Manrope',sans-serif", color: C.textPri,
    }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(19,19,24,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.outline}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 0' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.textPri, letterSpacing: 0.3 }}>
            Messages
          </span>
          <button
            onClick={() => navigate('/social')}
            style={{
              width: 40, height: 40, borderRadius: 20,
              background: C.surfaceHi, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.textMuted,
            }}
            aria-label="Go to friends list"
          >
            <Edit3 size={17} />
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px' }}>
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 18px', borderRadius: 24,
                  background: active ? C.primary : 'transparent',
                  border: active ? `1px solid ${C.primary}` : `1px solid ${C.outline}`,
                  cursor: 'pointer',
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  color: active ? '#FFFFFF' : C.textMuted,
                  transition: 'all 0.15s',
                }}
              >
                {tab}
                {tab === 'Unread' && conversations.some((c) => c.unread_count > 0) && (
                  <span style={{
                    marginLeft: 6, fontSize: 11, fontWeight: 700,
                    background: active ? 'rgba(255,255,255,0.25)' : C.primary,
                    color: '#FFFFFF',
                    padding: '1px 6px', borderRadius: 8,
                  }}>
                    {conversations.filter((c) => c.unread_count > 0).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 112 }}>
        {isLoading && filtered.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 14,
              border: `2px solid ${C.primary}30`,
              borderTop: `2px solid ${C.primary}`,
            }} className="animate-spin" />
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', textAlign: 'center', gap: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.textPri, margin: 0 }}>Messages Unavailable</p>
            <p style={{ fontSize: 13, color: C.textMuted, maxWidth: 300, margin: 0 }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 16, textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 40,
              background: C.surface,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageCircle size={36} style={{ color: C.textMuted }} />
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: C.textPri, margin: '0 0 6px' }}>
                {activeTab === 'Unread' ? 'All caught up!' : 'No messages yet'}
              </p>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0, maxWidth: 220 }}>
                {activeTab === 'Unread'
                  ? 'You have no unread conversations.'
                  : 'Go to Friends and tap the message icon to start chatting.'}
              </p>
            </div>
            {activeTab === 'All' && (
              <button
                onClick={() => navigate('/social')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 14,
                  background: `${C.primary}18`, color: C.primary,
                  border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600,
                }}
              >
                <Users size={16} />
                View Friends
              </button>
            )}
          </div>
        ) : (
          <div style={{ paddingTop: 4 }}>
            {filtered.map((conv) => (
              <ConversationRow
                key={conv.conversation_id}
                conv={conv}
                onClick={() => navigate(`/chat/${conv.friend_id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
