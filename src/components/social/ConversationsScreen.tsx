// src/components/social/ConversationsScreen.tsx
// Messages inbox — list of all DM conversations with unread badges.

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Users } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import type { ConversationPreview } from '@/services/chatService';
import BottomNav from '@/components/layout/BottomNav';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className="rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center flex-shrink-0"
    >
      {initials}
    </div>
  );
}

// ─── Conversation Row ─────────────────────────────────────────────────────────

function ConversationRow({ conv, onClick }: { conv: ConversationPreview; onClick: () => void }) {
  const name = conv.friend_profile?.name ?? 'Unknown';
  const hasUnread = conv.unread_count > 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors text-left"
    >
      <div className="relative flex-shrink-0">
        <Avatar src={conv.friend_profile?.avatar_url ?? null} name={name} size={48} />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-[#06090D]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[15px] truncate ${hasUnread ? 'font-bold text-text-1' : 'font-medium text-text-1'}`}>
            {name}
          </p>
          <span className="text-[11px] text-text-3 flex-shrink-0">
            {formatRelativeTime(conv.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-[13px] truncate ${hasUnread ? 'text-text-2 font-medium' : 'text-text-3'}`}>
            {conv.last_message}
          </p>
          {hasUnread && conv.unread_count > 1 && (
            <span className="flex-shrink-0 text-[10px] font-bold bg-primary text-[#06090D] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {conv.unread_count > 99 ? '99+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConversationsScreen() {
  const navigate = useNavigate();
  const { conversations, isLoading, error } = useConversations();

  return (
    <div className="min-h-screen bg-[#06090D] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#06090D]/95 backdrop-blur border-b border-[#1E2330] px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/social')}
          className="p-2 -ml-2 rounded-full text-text-2 hover:text-text-1 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[20px] font-bold text-text-1 flex-1">Messages</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-28">
        {isLoading && conversations.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-16 px-6 text-center gap-3">
            <p className="text-[15px] font-semibold text-text-1">Messages Unavailable</p>
            <p className="text-[13px] text-text-3 max-w-xs">{error}</p>
            <p className="text-[12px] text-text-3 mt-2 max-w-xs">
              Make sure you've run the direct_messages SQL migration in your Supabase project.
            </p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-surface-2 flex items-center justify-center">
              <MessageCircle size={36} className="text-text-3" />
            </div>
            <div>
              <p className="text-[17px] font-bold text-text-1">No messages yet</p>
              <p className="text-[13px] text-text-3 mt-1 max-w-[220px]">
                Go to Friends and tap the message icon to start a conversation.
              </p>
            </div>
            <button
              onClick={() => navigate('/social')}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-primary/15 text-primary font-semibold text-[14px] hover:bg-primary/25 transition-colors"
            >
              <Users size={16} />
              View Friends
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle/30">
            {conversations.map((conv) => (
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
