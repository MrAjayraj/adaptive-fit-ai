import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, UserPlus, Trophy, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriends } from '@/hooks/useFriends';
import { useFitness } from '@/context/FitnessContext';
import { useConversations } from '@/hooks/useConversations';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/context/AuthContext';
import FriendsList from '@/components/social/FriendsList';
import ActivityFeedView from '@/components/social/ActivityFeedView';
import ActiveNowStrip from '@/components/social/ActiveNowStrip';
import SquadCard from '@/components/social/SquadCard';
import GroupsView from '@/components/social/GroupsView';
import BottomNav from '@/components/layout/BottomNav';
import Avatar from '@/components/shared/Avatar';
import GroupChatView from '@/components/social/GroupChatView';
import type { ActiveFriend } from '@/components/social/ActiveNowStrip';
import type { Group } from '@/types/social';
import { supabase } from '@/integrations/supabase/client';

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT = '#0CFF9C';
const BG = '#0C1015';
const SURFACE = '#141A1F';
const SURFACE_UP = '#1C2429';
const T1 = '#EAEEF2';
const T2 = '#8899AA';
const T3 = '#4A5568';
const GREEN_GLOW = 'rgba(12,255,156,0.1)';
const GREEN_BORDER = 'rgba(12,255,156,0.15)';

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = 'FRIENDS' | 'GROUPS' | 'FEED';
const TABS: Tab[] = ['FRIENDS', 'GROUPS', 'FEED'];

// ── Slide variants ────────────────────────────────────────────────────────────
function slideVariants(direction: 1 | -1) {
  return {
    initial: { x: direction * 36, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -direction * 36, opacity: 0 },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Social() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('FRIENDS');
  const [prevTabIndex, setPrevTabIndex] = useState(0);
  const [activeFriends, setActiveFriends] = useState<ActiveFriend[]>([]);
  const [openGroupChat, setOpenGroupChat] = useState<Group | null>(null);

  const { friends, pendingIncoming } = useFriends();
  const { profile } = useFitness();
  const { totalUnread } = useConversations();
  const { myGroups } = useGroups();
  const { user } = useAuth();

  const activeIndex = TABS.indexOf(activeTab);
  const direction: 1 | -1 = activeIndex >= prevTabIndex ? 1 : -1;

  function handleTabChange(tab: Tab) {
    setPrevTabIndex(activeIndex);
    setActiveTab(tab);
  }

  // Fetch active friends (last_active_at within the last 5 minutes)
  useEffect(() => {
    if (!user || friends.length === 0) return;
    const friendIds = friends
      .map(f => f.friend_profile?.user_id)
      .filter(Boolean) as string[];
    if (friendIds.length === 0) return;
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    (supabase.from('user_profiles' as never) as any)
      .select('user_id,name,avatar_url,last_active_at')
      .in('user_id', friendIds)
      .gte('last_active_at', fiveMinAgo)
      .then(({ data }: { data: any[] | null }) => {
        if (data) {
          setActiveFriends(
            data.map(p => ({
              user_id: p.user_id,
              name: p.name,
              avatar_url: p.avatar_url,
              activity: undefined,
              is_training: false,
            }))
          );
        }
      });
  }, [user, friends]);

  // ── Claim identity gate ────────────────────────────────────────────────────
  if (!profile?.username) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: BG,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 32px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: GREEN_GLOW,
              border: `1px solid ${GREEN_BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Users size={32} color={ACCENT} />
          </div>
          <p
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: T1,
              margin: '0 0 8px',
              letterSpacing: '0.02em',
            }}
          >
            Claim Your Identity
          </p>
          <p
            style={{
              fontSize: 14,
              color: T2,
              margin: '0 0 28px',
              lineHeight: 1.5,
              maxWidth: 260,
            }}
          >
            Set a username to use social features, connect with friends, and join groups.
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/profile')}
            style={{
              background: '#F5C518',
              color: '#111113',
              border: 'none',
              borderRadius: 12,
              padding: '14px 32px',
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Set Username
          </motion.button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: BG,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(12,16,21,0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: 'max(16px, env(safe-area-inset-top)) 16px 0',
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          {/* Left: user avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: GREEN_GLOW,
                border: `1px solid ${GREEN_BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {profile?.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt="avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: T1,
                letterSpacing: '0.04em',
              }}
            >
              {profile?.name || 'User'}
            </span>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Notification bell */}
            <button
              style={{
                position: 'relative',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Notifications"
            >
              <Bell size={20} color={T2} />
              {pendingIncoming.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#FF4B2B',
                  }}
                />
              )}
            </button>

            {/* Settings */}
            <button
              onClick={() => navigate('/profile')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Settings"
            >
              <Settings size={20} color={T2} />
            </button>
          </div>
        </div>

        {/* ── TAB BAR ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            paddingLeft: 0,
          }}
        >
          {TABS.map(tab => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 0 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: isActive ? ACCENT : T2,
                  transition: 'color 0.2s ease',
                  position: 'relative',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 100,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            variants={slideVariants(direction)}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* ── SOCIAL TAB ─────────────────────────────────────────────── */}
            {activeTab === 'FRIENDS' && (
              <div>
                {/* Active now strip */}
                <ActiveNowStrip friends={activeFriends} />

                {/* Quick action row */}
                <div
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    gap: 12,
                  }}
                >
                  {/* INVITE */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate('/profile')}
                    style={{
                      flex: 1,
                      background: SURFACE,
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14,
                      height: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <UserPlus size={22} color="#F5C518" />
                    <span
                      style={{
                        fontSize: 10,
                        color: T3,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontWeight: 700,
                      }}
                    >
                      INVITE
                    </span>
                  </motion.button>

                  {/* CHALLENGE */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate('/challenges')}
                    style={{
                      flex: 1,
                      background: SURFACE,
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14,
                      height: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <Trophy size={22} color="#F5C518" />
                    <span
                      style={{
                        fontSize: 10,
                        color: T3,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontWeight: 700,
                      }}
                    >
                      CHALLENGE
                    </span>
                  </motion.button>
                </div>

                {/* YOUR SQUADS section */}
                <div style={{ padding: '0 16px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: T1,
                      }}
                    >
                      Your Squads
                    </span>
                    <button
                      onClick={() => handleTabChange('GROUPS')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: ACCENT,
                        padding: 0,
                      }}
                    >
                      See all →
                    </button>
                  </div>

                  {myGroups.length === 0 ? (
                    <p
                      style={{
                        fontSize: 13,
                        color: T3,
                        textAlign: 'center',
                        padding: '20px 0',
                        margin: 0,
                      }}
                    >
                      Join a squad to see them here
                    </p>
                  ) : (
                    myGroups.slice(0, 3).map(group => (
                      <SquadCard
                        key={group.id}
                        group={group}
                        onMessage={g => setOpenGroupChat(g)}
                        onLeave={undefined}
                        onSettings={undefined}
                      />
                    ))
                  )}
                </div>

                {/* FRIENDS section */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  style={{ padding: '24px 16px 0' }}
                >
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: T1,
                      marginBottom: 10,
                    }}
                  >
                    Friends
                  </p>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 20,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                  }}>
                    <FriendsList />
                  </div>
                </motion.div>

                {/* RECENT ACTIVITY section */}
                <div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: T1,
                      padding: '12px 16px 8px',
                      margin: 0,
                    }}
                  >
                    Recent Activity
                  </p>
                  <ActivityFeedView />
                </div>
              </div>
            )}

            {/* ── GROUPS TAB ─────────────────────────────────────────────── */}
            {activeTab === 'GROUPS' && <GroupsView />}

            {/* ── FEED TAB ───────────────────────────────────────────────── */}
            {activeTab === 'FEED' && <ActivityFeedView />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────────────────── */}
      <BottomNav />

      {/* ── GROUP CHAT OVERLAY ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {openGroupChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
            }}
          >
            <GroupChatView
              group={openGroupChat}
              onClose={() => setOpenGroupChat(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
