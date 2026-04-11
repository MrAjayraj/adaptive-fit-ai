import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function GuestBanner() {
  const { isGuest, signInWithGoogle, exitGuestMode } = useAuth();
  const navigate = useNavigate();

  if (!isGuest) return null;

  const handleExit = () => {
    if (exitGuestMode) {
      exitGuestMode();
    }
  };

  return (
    <div className="w-full bg-[#151C24] text-[#9191A0] text-[13px] py-1.5 px-3 flex items-center justify-between z-50 relative border-b border-border-subtle">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={handleExit} 
              className="p-1 hover:bg-surface-2 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5 text-text-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-[11px] bg-surface-2 border-border border">
            <p>Exit to login page</p>
          </TooltipContent>
        </Tooltip>
        <span className="font-medium">You're browsing as a guest</span>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={signInWithGoogle}
          className="text-[12px] font-bold text-primary-accent hover:text-primary-accent/80 transition-colors"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
