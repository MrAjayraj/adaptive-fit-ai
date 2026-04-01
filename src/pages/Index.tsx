import { useFitness } from '@/context/FitnessContext';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import Dashboard from '@/pages/Dashboard';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { profile, isLoading } = useFitness();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  if (!profile?.onboardingComplete) {
    return <OnboardingFlow />;
  }

  return <Dashboard />;
}
