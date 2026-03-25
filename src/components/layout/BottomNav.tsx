import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, BarChart3, User } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/workout', icon: Dumbbell, label: 'Workout' },
  { path: '/progress', icon: BarChart3, label: 'Progress' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_6px_hsl(145_80%_42%_/_0.5)]' : ''}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
