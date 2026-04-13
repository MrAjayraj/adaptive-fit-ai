import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFriends } from '@/hooks/useFriends';
import FriendsList from '@/components/social/FriendsList';
import ActivityFeedView from '@/components/social/ActivityFeedView';
import GroupsView from '@/components/social/GroupsView';
import BottomNav from '@/components/layout/BottomNav';

// ── Tab definition ────────────────────────────────────────────────────────────
const TABS = ['Friends', 'Feed', 'Groups'] as const;
type Tab = typeof TABS[number];

// ── Framer slide variants ─────────────────────────────────────────────────────
function slideVariants(direction: 1 | -1) {
  return {
    initial: { x: direction * 40, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit:    { x: -direction * 40, opacity: 0 },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Social() {
  const [activeTab, setActiveTab] = useState<Tab>('Friends');
  const [prevTabIndex, setPrevTabIndex] = useState(0);

  const { friends, pendingIncoming } = useFriends();
  const friendCount = friends.length;
  const pendingCount = pendingIncoming.length;

  const activeIndex = TABS.indexOf(activeTab);
  const direction: 1 | -1 = activeIndex >= prevTabIndex ? 1 : -1;

  function handleTabChange(tab: Tab) {
    setPrevTabIndex(activeIndex);
    setActiveTab(tab);
  }

  return (
    <div className="min-h-screen bg-[#06090D] flex flex-col">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#06090D]/90 backdrop-blur border-b border-[#1E2330] px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-[#E5E7EB]">Social</h1>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
            <span className="text-sm text-[#6B7280]">
              {friendCount} friend{friendCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className="relative flex-1 pb-3 text-sm font-semibold transition-colors"
                style={{ color: isActive ? '#00E676' : '#6B7280' }}
              >
                {tab}
                {isActive && (
                  <motion.div
                    layoutId="social-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: '#00E676' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            variants={slideVariants(direction)}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {activeTab === 'Friends' && <FriendsList />}
            {activeTab === 'Feed' && <ActivityFeedView />}
            {activeTab === 'Groups' && <GroupsView />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom Nav ──────────────────────────────────────────────────────── */}
      <BottomNav />
    </div>
  );
}
