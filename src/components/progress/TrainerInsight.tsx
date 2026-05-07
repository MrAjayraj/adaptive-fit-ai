import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface Insight {
  headline: string;
  body: string;
}

export function TrainerInsight() {
  const { user } = useAuth();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchInsight() {
      // Check cache first (in localStorage)
      const cached = localStorage.getItem('trainerInsight');
      if (cached) {
        const parsed = JSON.parse(cached);
        const ageHrs = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
        if (ageHrs < 6) {
          setInsight(parsed.data);
          setLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        // Call the edge function, passing user id context implicitly via auth
        const { data, error } = await supabase.functions.invoke('trainer-insight', {
          method: 'POST',
          body: { userId: user!.id }
        });

        if (error) throw error;
        
        if (data && data.insight) {
          setInsight(data.insight);
          localStorage.setItem('trainerInsight', JSON.stringify({
            timestamp: Date.now(),
            data: data.insight
          }));
        } else {
          // Fallback if the function returns empty
          setInsight({ headline: "Consistency is key!", body: "Keep logging your workouts to get personalized AI insights on your progress." });
        }
      } catch (err) {
        console.error("Failed to fetch trainer insight:", err);
        // Fallback message
        setInsight({ 
          headline: "Keep up the great work!", 
          body: "Your progress is tracking well. Keep pushing those limits this week." 
        });
      } finally {
        setLoading(false);
      }
    }

    fetchInsight();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] p-4 rounded-xl shadow-lg border border-white/5 mb-6 animate-pulse">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/10" />
          <div className="h-4 bg-white/10 rounded w-1/3" />
        </div>
        <div className="h-3 bg-white/10 rounded w-full mb-2" />
        <div className="h-3 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  if (!insight) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-[#0C1015] p-5 rounded-xl shadow-lg border border-[#0CFF9C]/20 mb-6 group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Activity size={64} className="text-[#0CFF9C]" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-[#0CFF9C]" />
          <h3 className="font-bold text-white text-lg tracking-tight">{insight.headline}</h3>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed pr-8">
          {insight.body}
        </p>
      </div>
    </motion.div>
  );
}
