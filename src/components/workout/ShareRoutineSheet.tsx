// src/components/workout/ShareRoutineSheet.tsx
// Bottom sheet for sharing a routine to the community or a specific friend.

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, User, Check, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  shareRoutinePublic,
  shareRoutineToFriend,
} from '@/services/workoutService';
import type { RoutineExercise } from '@/services/workoutService';
import { fetchFriendships, fetchProfilesByIds } from '@/services/socialService';
import type { UserProfileSummary } from '@/types/social';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG      = '#0C1015';
const SURF    = '#141A1F';
const SURF2   = '#1C2429';
const ACCENT  = '#F5C518';
const T1      = '#EAEEF2';
const T2      = '#8899AA';
const T3      = '#4A5568';
const BORDER  = 'rgba(255,255,255,0.07)';

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ShareRoutineSheetProps {
  routine: {
    id: string;
    name: string;
    exercises: RoutineExercise[];
  };
  userId: string;
  userProfile?: { name?: string; avatar_url?: string | null } | null;
  onClose: () => void;
  onShared?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ShareRoutineSheet({
  routine,
  userId,
  userProfile,
  onClose,
  onShared,
}: ShareRoutineSheetProps) {
  const [tab, setTab]           = useState<'community' | 'friends'>('community');
  const [message, setMessage]   = useState('');
  const [sharing, setSharing]   = useState(false);
  const [done, setDone]         = useState(false);

  // Friends tab state
  const [friends, setFriends]           = useState<UserProfileSummary[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [query, setQuery]               = useState('');
  const [selected, setSelected]         = useState<Set<string>>(new Set());

  // Load friends when Friends tab opens
  useEffect(() => {
    if (tab !== 'friends' || friends.length > 0) return;
    setFriendsLoading(true);
    fetchFriendships(userId)
      .then(async (ships) => {
        const accepted = ships.filter(f => f.status === 'accepted');
        const ids = accepted.map(f =>
          f.requester_id === userId ? f.addressee_id : f.requester_id
        );
        if (ids.length === 0) { setFriends([]); return; }
        const map = await fetchProfilesByIds(ids);
        setFriends(Array.from(map.values()));
      })
      .catch(() => {})
      .finally(() => setFriendsLoading(false));
  }, [tab, userId, friends.length]);

  const filteredFriends = query.trim()
    ? friends.filter(f =>
        f.name?.toLowerCase().includes(query.toLowerCase()) ||
        f.username?.toLowerCase().includes(query.toLowerCase())
      )
    : friends;

  const toggleFriend = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Share handlers ──────────────────────────────────────────────────────────

  const handleShareCommunity = useCallback(async () => {
    setSharing(true);
    try {
      await shareRoutinePublic(routine.id, userId, {
        routineName:  routine.name,
        exercises:    routine.exercises,
        sharerName:   userProfile?.name,
        sharerAvatar: userProfile?.avatar_url ?? undefined,
        message:      message.trim() || undefined,
      });
      setDone(true);
      toast.success('Routine shared to community!');
      onShared?.();
      setTimeout(onClose, 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to share. Please try again.');
    } finally {
      setSharing(false);
    }
  }, [routine, userId, userProfile, message, onClose, onShared]);

  const handleShareFriends = useCallback(async () => {
    if (selected.size === 0) return;
    setSharing(true);
    try {
      await Promise.all(
        Array.from(selected).map(friendId =>
          shareRoutineToFriend(routine.id, userId, friendId, {
            routineName:  routine.name,
            exercises:    routine.exercises,
            sharerName:   userProfile?.name,
            sharerAvatar: userProfile?.avatar_url ?? undefined,
            message:      message.trim() || undefined,
          })
        )
      );
      setDone(true);
      toast.success(`Shared with ${selected.size} friend${selected.size > 1 ? 's' : ''}!`);
      onShared?.();
      setTimeout(onClose, 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to share. Please try again.');
    } finally {
      setSharing(false);
    }
  }, [routine, userId, userProfile, message, selected, onClose, onShared]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 60, backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61,
          background: BG,
          borderRadius: '22px 22px 0 0',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px 14px',
        }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: T1, margin: 0 }}>Share Routine</p>
            <p style={{ fontSize: 12, color: T3, margin: '2px 0 0' }}>{routine.name}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3, padding: 4, lineHeight: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 8, padding: '0 18px 16px',
        }}>
          {(['community', 'friends'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, height: 38, borderRadius: 10,
                background: tab === t ? `${ACCENT}18` : SURF,
                border: `1px solid ${tab === t ? `${ACCENT}50` : BORDER}`,
                color: tab === t ? ACCENT : T2,
                fontSize: 13, fontWeight: 700, textTransform: 'capitalize',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6, transition: 'all 0.15s',
              }}
            >
              {t === 'community' ? <Globe size={14} /> : <User size={14} />}
              {t === 'community' ? 'Community' : 'Friends'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px' }}>
          <AnimatePresence mode="wait">
            {tab === 'community' ? (
              <motion.div
                key="community"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
              >
                {/* Info card */}
                <div style={{
                  background: `${ACCENT}0D`,
                  border: `1px solid ${ACCENT}25`,
                  borderRadius: 14, padding: '14px 16px',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  marginBottom: 18,
                }}>
                  <Globe size={20} color={ACCENT} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: T1, margin: 0 }}>Share to Community</p>
                    <p style={{ fontSize: 12, color: T2, margin: '4px 0 0', lineHeight: 1.5 }}>
                      Anyone on FitPulse can discover, view, and add this routine to their program.
                    </p>
                  </div>
                </div>

                {/* Routine preview */}
                <div style={{
                  background: SURF, borderRadius: 12,
                  border: `1px solid ${BORDER}`,
                  padding: '12px 14px', marginBottom: 18,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${ACCENT}18`, border: `1px solid ${ACCENT}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 18 }}>💪</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: T1, margin: 0 }}>{routine.name}</p>
                    <p style={{ fontSize: 12, color: T3, margin: '2px 0 0' }}>
                      {routine.exercises.length} {routine.exercises.length === 1 ? 'exercise' : 'exercises'}
                    </p>
                  </div>
                </div>

                {/* Message */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tell others about this routine..."
                    rows={3}
                    style={{
                      width: '100%', marginTop: 8,
                      background: SURF, border: `1px solid ${BORDER}`,
                      borderRadius: 12, color: T1, fontSize: 14,
                      padding: '12px 14px', resize: 'none',
                      fontFamily: 'inherit', outline: 'none',
                      boxSizing: 'border-box', lineHeight: 1.5,
                    }}
                  />
                </div>

                {/* Share button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleShareCommunity}
                  disabled={sharing || done}
                  style={{
                    width: '100%', height: 52, borderRadius: 14,
                    background: done ? '#22C55E' : `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`,
                    border: 'none', color: '#0C1015',
                    fontSize: 15, fontWeight: 800,
                    cursor: sharing || done ? 'default' : 'pointer',
                    opacity: sharing ? 0.7 : 1,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                    transition: 'background 0.25s',
                  }}
                >
                  {done ? (
                    <><Check size={18} /> Shared!</>
                  ) : sharing ? (
                    'Sharing...'
                  ) : (
                    <><Globe size={16} /> Share to Community</>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="friends"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                {/* Search */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: SURF, border: `1px solid ${BORDER}`,
                  borderRadius: 12, padding: '10px 14px', marginBottom: 14,
                }}>
                  <Search size={16} color={T3} style={{ flexShrink: 0 }} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search friends..."
                    style={{
                      flex: 1, background: 'none', border: 'none',
                      color: T1, fontSize: 14, outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Friends list */}
                {friendsLoading ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: T3, fontSize: 13 }}>
                    Loading friends...
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <p style={{ fontSize: 24, marginBottom: 8 }}>👥</p>
                    <p style={{ fontSize: 14, color: T2, fontWeight: 600, margin: 0 }}>
                      {friends.length === 0 ? 'No friends yet' : 'No matches'}
                    </p>
                    <p style={{ fontSize: 12, color: T3, marginTop: 4 }}>
                      {friends.length === 0 ? 'Add friends from the Social tab' : 'Try a different search'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {filteredFriends.map(friend => {
                      const isSelected = selected.has(friend.user_id);
                      return (
                        <motion.button
                          key={friend.user_id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleFriend(friend.user_id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: isSelected ? `${ACCENT}10` : SURF,
                            border: `1px solid ${isSelected ? `${ACCENT}40` : BORDER}`,
                            borderRadius: 12, padding: '10px 14px',
                            cursor: 'pointer', textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                            background: SURF2, border: `1px solid ${BORDER}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                          }}>
                            {friend.avatar_url ? (
                              <img src={friend.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>
                                {friend.name?.charAt(0)?.toUpperCase() ?? '?'}
                              </span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: T1, margin: 0 }}>{friend.name}</p>
                            {friend.username && (
                              <p style={{ fontSize: 12, color: T3, margin: '2px 0 0' }}>@{friend.username}</p>
                            )}
                          </div>
                          {/* Checkmark */}
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                            background: isSelected ? ACCENT : 'transparent',
                            border: `2px solid ${isSelected ? ACCENT : 'rgba(255,255,255,0.2)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}>
                            {isSelected && <Check size={13} color="#0C1015" strokeWidth={3} />}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Message */}
                {selected.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{ marginBottom: 16 }}
                  >
                    <label style={{ fontSize: 12, color: T3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Message (optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder={`Send a note to ${selected.size > 1 ? 'them' : 'them'}...`}
                      rows={2}
                      style={{
                        width: '100%', marginTop: 8,
                        background: SURF, border: `1px solid ${BORDER}`,
                        borderRadius: 12, color: T1, fontSize: 14,
                        padding: '10px 14px', resize: 'none',
                        fontFamily: 'inherit', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </motion.div>
                )}

                {/* Send button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleShareFriends}
                  disabled={selected.size === 0 || sharing || done}
                  style={{
                    width: '100%', height: 52, borderRadius: 14,
                    background: done
                      ? '#22C55E'
                      : selected.size > 0
                        ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT}cc)`
                        : SURF2,
                    border: selected.size === 0 ? `1px solid ${BORDER}` : 'none',
                    color: selected.size > 0 ? '#0C1015' : T3,
                    fontSize: 15, fontWeight: 800,
                    cursor: selected.size === 0 || sharing || done ? 'default' : 'pointer',
                    opacity: sharing ? 0.7 : 1,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {done ? (
                    <><Check size={18} /> Sent!</>
                  ) : sharing ? (
                    'Sending...'
                  ) : selected.size > 0 ? (
                    <><Send size={15} /> Send to {selected.size} friend{selected.size > 1 ? 's' : ''}</>
                  ) : (
                    'Select friends above'
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
