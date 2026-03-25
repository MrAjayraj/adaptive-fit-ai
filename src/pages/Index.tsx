import { useFitness } from '@/context/FitnessContext';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import Dashboard from '@/pages/Dashboard';

export default function Index() {
  const { profile } = useFitness();

  if (!profile?.onboardingComplete) {
    return <OnboardingFlow />;
  }

  return <Dashboard />;
}
