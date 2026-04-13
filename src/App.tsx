import { Component, ReactNode, lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FitnessProvider } from "@/context/FitnessContext";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import OfflineIndicator from "@/components/layout/OfflineIndicator";
import GuestBanner from "@/components/layout/GuestBanner";
import { initErrorLogger } from "@/lib/errorLogger";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#111113] flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-2xl font-bold text-[#FAFAFA] mb-2">Something went wrong</h1>
          <p className="text-sm text-[#9191A0] mb-6 max-w-sm">
            {this.state.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#F5C518] text-[#111113] font-bold rounded-full"
            >
              Reload
            </button>
            <button
              onClick={() => { this.setState({ hasError: false, message: '' }); window.location.href = '/'; }}
              className="px-6 py-3 bg-[#252529] border border-[#3C3C42] text-[#FAFAFA] font-semibold rounded-full"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Route-level code splitting ────────────────────────────────────────────────
// Each page loads only when the user navigates to it.
const Landing       = lazy(() => import('./pages/Landing'));
const AuthCallback  = lazy(() => import('./pages/AuthCallback'));
const OnboardingFlow = lazy(() => import('./components/onboarding/OnboardingFlow'));
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const WorkoutLogger = lazy(() => import('./pages/WorkoutLogger'));
const Progress      = lazy(() => import('./pages/Progress'));
const Profile       = lazy(() => import('./pages/Profile'));
const WorkoutBuilder = lazy(() => import('./pages/WorkoutBuilder'));
const ExerciseLibrary = lazy(() => import('./pages/ExerciseLibrary'));
const Challenges    = lazy(() => import('./pages/Challenges'));
const Achievements  = lazy(() => import('./pages/Achievements'));
const Rank          = lazy(() => import('./pages/Rank'));
const NotFound      = lazy(() => import('./pages/NotFound'));
const Social        = lazy(() => import('./pages/Social'));
const DebugPanel    = lazy(() => import('./pages/DebugPanel'));

// ── Suspense fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#111113] flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#F5C518] animate-spin" />
        <div className="absolute inset-0 rounded-full blur-[8px] bg-[#F5C518]/20 animate-pulse" />
      </div>
    </div>
  );
}

// ── App Initializer (side effects that need to run once) ─────────────────────
function AppInit() {
  useEffect(() => {
    initErrorLogger();
  }, []);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="bottom-center" />
        <Analytics />
        <SpeedInsights />
        <AuthProvider>
          <FitnessProvider>
            <BrowserRouter>
              <AppInit />
              <OfflineIndicator />
              <GuestBanner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  {/* Onboarding */}
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <OnboardingFlow />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected App Routes */}
                  <Route path="/home"         element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/workout"      element={<ProtectedRoute><WorkoutLogger /></ProtectedRoute>} />
                  <Route path="/progress"     element={<ProtectedRoute><Progress /></ProtectedRoute>} />
                  <Route path="/builder"      element={<ProtectedRoute><WorkoutBuilder /></ProtectedRoute>} />
                  <Route path="/exercises"    element={<ProtectedRoute><ExerciseLibrary /></ProtectedRoute>} />
                  <Route path="/challenges"   element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
                  <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
                  <Route path="/rank"         element={<ProtectedRoute><Rank /></ProtectedRoute>} />
                  <Route path="/social"       element={<ProtectedRoute><Social /></ProtectedRoute>} />
                  <Route path="/debug"        element={<ProtectedRoute><DebugPanel /></ProtectedRoute>} />

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </FitnessProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
