import { useLocation, useNavigate } from 'react-router-dom';
import { Home, AlarmClock, Star, BarChart2, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { path: '/',           icon: Home,       label: 'Home'     },
  { path: '/exercises',  icon: AlarmClock, label: 'Library'  },
  { path: '/workout',    icon: Star,       label: 'Workout'  },
  { path: '/progress',   icon: BarChart2,  label: 'Progress' },
  { path: '/profile',    icon: User,       label: 'Profile'  },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isGuest } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:right-auto md:w-[72px] z-40 flex justify-center md:justify-start pb-4 md:pb-0 safe-bottom pointer-events-none md:pointer-events-auto">
      <div
        className="pointer-events-auto flex md:flex-col md:justify-center items-center gap-1 md:gap-4 px-3 md:px-0 py-2.5 md:py-8 mx-4 md:mx-0 w-full max-w-sm md:max-w-none md:h-full nav-glass md:bg-surface-1 md:border-r md:border-border-subtle md:backdrop-blur-none rounded-[32px] md:rounded-none shadow-card-lg md:shadow-none"
      >
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive =
            path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);

          return (
            <button
              key={path}
              id={`nav-${label.toLowerCase()}`}
              onClick={() => navigate(path)}
              className="relative flex-1 md:flex-none md:w-[54px] flex flex-col items-center justify-center h-[54px] rounded-[24px] transition-all duration-300 group"
            >
              {/* Active background circle */}
              {isActive && (
                <motion.div
                  layoutId="volt-nav-bg"
                  className="absolute inset-0 rounded-[24px]"
                  style={{ backgroundColor: '#F5C518' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <div className="relative flex flex-col items-center justify-center">
                <Icon
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={`w-[22px] h-[22px] relative z-10 transition-colors duration-300 ${
                    isActive ? 'text-[#111113]' : 'text-[#555560] group-hover:text-text-2'
                  }`}
                />
                {label === 'Profile' && isGuest && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-accent rounded-full border border-surface-1 md:border-surface-2 z-20" />
                )}
              </div>
              <span className={`text-[9px] font-bold relative z-10 mt-0.5 tracking-wide uppercase transition-all duration-300 ${isActive ? 'text-[#111113] opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden md:group-hover:opacity-100 md:group-hover:text-text-2 md:h-0'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
