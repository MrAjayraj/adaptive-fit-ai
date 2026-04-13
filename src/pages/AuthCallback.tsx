import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AUTH_TIMEOUT_MS = 10_000;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();
  const timedOut = useRef(false);

  // Failsafe: if auth never resolves, redirect after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        timedOut.current = true;
        toast.error('Authentication timed out. Please try again.');
        navigate('/');
      }
    }, AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (timedOut.current) return;
    // If still loading auth state, wait
    if (isLoading) return;

    // If no session after load, maybe it failed
    if (!session) {
      toast.error('Authentication failed. Please try again.');
      navigate('/');
      return;
    }

    const checkProfileAndRedirect = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('id, onboarding_complete')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
          toast.error('Something went wrong checking your profile.');
          navigate('/');
          return;
        }

        // Redirect based on DB profile only — never trust localStorage for this decision.
        // Old guest localStorage data (fitai-state) must not bypass onboarding for a new auth user.
        if (profile?.onboarding_complete) {
          // Returning user — leave localStorage intact so workout history survives
          // Only strip the stale guest profile key so FitnessContext fetches fresh from DB
          try {
            const raw = localStorage.getItem('fitai-state');
            if (raw) {
              const parsed = JSON.parse(raw);
              // Keep workouts / gamification / progressHistory — only reset stale profile
              delete parsed.profile;
              localStorage.setItem('fitai-state', JSON.stringify(parsed));
            }
          } catch { /* ignore parse errors */ }
          toast.success(`Welcome back!`);
          navigate('/home');
        } else {
          // New user — strip only the guest profile fragment, keep nothing else to wipe
          try {
            const raw = localStorage.getItem('fitai-state');
            if (raw) {
              const parsed = JSON.parse(raw);
              delete parsed.profile;
              localStorage.setItem('fitai-state', JSON.stringify(parsed));
            }
          } catch { /* ignore */ }
          navigate('/onboarding');
        }
      } catch (err) {
        console.error('AuthCallback exception:', err);
        navigate('/');
      }
    };

    checkProfileAndRedirect();
  }, [session, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold flex items-center gap-1">
          <span className="text-text-1">Fit</span>
          <span className="text-primary">Pulse</span>
        </h1>
        
        <div className="relative flex items-center justify-center w-12 h-12">
           {/* Animated glowing spinner mimicking the pulse color */}
           <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary w-full h-full animate-spin" />
           <div className="absolute inset-0 rounded-full blur-[8px] bg-primary/20 w-full h-full animate-pulse" />
        </div>
        
        <p className="text-sm font-medium text-text-2 tracking-wide animate-pulse">
          Setting up your profile...
        </p>
      </div>
    </div>
  );
}
