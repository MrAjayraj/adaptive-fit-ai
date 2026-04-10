import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Shield, Target, LineChart, Activity, Heart } from 'lucide-react';

export default function Landing() {
  const { session, isGuest, signInWithGoogle, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // If already authenticated or guest, redirect to home
  useEffect(() => {
    if (session || isGuest) {
      navigate('/home', { replace: true });
    }
  }, [session, isGuest, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      setIsSigningIn(false);
    }
  };

  const handleGuestSignIn = () => {
    continueAsGuest();
    navigate('/home');
  };

  // Staggered pill items
  const pills = [
    { icon: <Shield size={12} />, text: 'Seasonal Ranks' },
    { icon: <Target size={12} />, text: 'Daily Missions' },
    { icon: <LineChart size={12} />, text: 'Smart Tracking' },
  ];

  const sentence = "Track. Compete. Level Up.".split(" ");

  return (
    <div className="relative min-h-screen bg-canvas overflow-hidden flex flex-col justify-between pt-safe pb-8 px-6 selection:bg-primary/20">
      
      {/* Background ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#00E676]/[0.04] blur-[80px]" 
        />
        <motion.div 
          animate={{ x: [0, -30, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-[#00BFA5]/[0.03] blur-[100px]" 
        />
      </div>

      {/* TOP SECTION (60%) */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full mt-10">
        
        {/* LOGO */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl font-bold flex items-center justify-center gap-1"
        >
          <span className="text-text-1">Fit</span>
          <span className="text-primary">Pulse</span>
        </motion.h1>

        {/* PULSE SVG DYNAMIC LINE */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 w-[200px] h-8 relative text-primary flex items-center justify-center"
        >
          <svg viewBox="0 0 200 40" className="absolute w-full h-full overflow-visible">
            <motion.path
              d="M0 20 L60 20 L75 5 L85 35 L100 20 L140 20 L155 10 L165 30 L180 20 L200 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.6, duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
            />
          </svg>
        </motion.div>

        {/* TAGLINE */}
        <div className="mt-8 flex gap-1.5 text-lg font-medium text-text-1">
          {sentence.map((word, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + idx * 0.3, duration: 0.5 }}
            >
              {word}
            </motion.span>
          ))}
        </div>

        {/* FEATURE PILLS */}
        <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-[300px]">
          {pills.map((pill, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + idx * 0.1, duration: 0.4 }}
              className="flex items-center gap-1.5 bg-surface-2 px-3 h-7 rounded-lg text-[10px] text-text-2 font-medium"
            >
              <span className="text-primary">{pill.icon}</span>
              {pill.text}
            </motion.div>
          ))}
        </div>
      </div>

      {/* BOTTOM SECTION (40%) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex shrink-0 flex-col items-center z-10 max-w-sm mx-auto"
      >
        {/* GOOGLE BUTTON */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
          className="w-full relative h-[52px] bg-white text-[#1A1A1A] font-medium text-[15px] rounded-[14px] flex items-center justify-center gap-3 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all disabled:opacity-70"
        >
          {isSigningIn ? (
             <Activity className="w-5 h-5 animate-spin text-text-3" />
          ) : (
            <>
              {/* Google G Logo SVG */}
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </motion.button>

        {/* DIVIDER */}
        <div className="w-full flex items-center my-4 opacity-60">
          <div className="flex-1 h-[1px] bg-border" />
          <span className="px-3 text-[12px] text-text-3 font-medium uppercase tracking-wider">or</span>
          <div className="flex-1 h-[1px] bg-border" />
        </div>

        {/* GUEST BUTTON */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleGuestSignIn}
          className="w-full h-[48px] bg-transparent border border-white/10 text-text-2 font-medium rounded-[14px] flex items-center justify-center transition-colors hover:bg-white/5 hover:text-text-1"
        >
          Continue as Guest
        </motion.button>
        <p className="mt-2 text-[11px] text-text-3 text-center">
          Sign in anytime to save your progress
        </p>

        {/* FOOTER */}
        <div className="mt-8 flex flex-col items-center gap-3 w-full">
          <p className="text-[10px] text-text-3 text-center px-4">
            By continuing, you agree to our{' '}
            <a href="#" className="underline hover:text-text-2 transition-colors">Terms</a> and{' '}
            <a href="#" className="underline hover:text-text-2 transition-colors">Privacy Policy</a>
          </p>

          <p className="flex items-center gap-1.5 text-[9px] text-text-3 tracking-wider uppercase mt-4">
            Made with <Heart className="w-3 h-3 text-primary fill-primary" /> for athletes
          </p>
        </div>
      </motion.div>

    </div>
  );
}
