// src/components/social/GroupCard.tsx
import React, { useState } from 'react';
import { Users, Copy, Check, LogOut, Settings, Globe, Lock } from 'lucide-react';
import type { Group } from '@/types/social';

interface GroupCardProps {
  group: Group;
  isOwner?: boolean;
  onJoin?: (groupId: string) => void;
  onLeave?: (groupId: string) => void;
  onEdit?: (groupId: string) => void;
}

export default function GroupCard({ group, isOwner = false, onJoin, onLeave, onEdit }: GroupCardProps) {
  const [copied, setCopied] = useState(false);

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  return (
    <div className="bg-surface-1 border border-border rounded-[20px] p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Group avatar / icon */}
        {group.avatar_url ? (
          <img
            src={group.avatar_url}
            alt={group.name}
            className="w-12 h-12 rounded-[12px] object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-[12px] bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users size={22} className="text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-text-1 truncate">{group.name}</p>
            {group.is_public ? (
              <Globe size={12} className="text-text-3 flex-shrink-0" />
            ) : (
              <Lock size={12} className="text-text-3 flex-shrink-0" />
            )}
          </div>
          {group.description && (
            <p className="text-[13px] text-text-2 mt-0.5 line-clamp-2">{group.description}</p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <Users size={11} className="text-text-3" />
            <span className="text-[11px] text-text-3">
              {group.member_count ?? 0} / {group.max_members} members
            </span>
          </div>
        </div>
      </div>

      {/* Invite code row */}
      <div className="flex items-center gap-2 bg-surface-2 rounded-[12px] px-3 py-2">
        <span className="text-[11px] text-text-3 uppercase tracking-widest font-medium">Invite</span>
        <span className="flex-1 text-[13px] font-mono font-bold text-text-1 tracking-wider">
          {group.invite_code}
        </span>
        <button
          onClick={copyInviteCode}
          className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-[12px] font-medium transition-colors text-text-2 hover:text-primary hover:bg-primary/10"
        >
          {copied ? (
            <>
              <Check size={13} className="text-primary" />
              <span className="text-primary">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        {isOwner ? (
          <>
            <button
              onClick={() => onEdit?.(group.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[12px] border border-border text-text-2 text-[13px] font-medium hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Settings size={14} />
              Edit Group
            </button>
            <button
              onClick={() => onLeave?.(group.id)}
              className="px-3 py-2 rounded-[12px] border border-red-500/20 text-red-400 text-[13px] hover:bg-red-400/10 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </>
        ) : group.is_member ? (
          <button
            onClick={() => onLeave?.(group.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[12px] border border-red-500/20 text-red-400 text-[13px] font-medium hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={14} />
            Leave Group
          </button>
        ) : (
          <button
            onClick={() => onJoin?.(group.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[12px] bg-primary/15 text-primary text-[13px] font-semibold hover:bg-primary/25 transition-colors"
          >
            <Users size={14} />
            Join Group
          </button>
        )}
      </div>
    </div>
  );
}
