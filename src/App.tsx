import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FitnessProvider } from "@/context/FitnessContext";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

import Landing from "./pages/Landing.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import OnboardingFlow from "./components/onboarding/OnboardingFlow.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import WorkoutLogger from "./pages/WorkoutLogger.tsx";
import Progress from "./pages/Progress.tsx";
import Profile from "./pages/Profile.tsx";
import WorkoutBuilder from "./pages/WorkoutBuilder.tsx";
import ExerciseLibrary from "./pages/ExerciseLibrary.tsx";
import Challenges from "./pages/Challenges.tsx";
import Achievements from "./pages/Achievements.tsx";
import Rank from "./pages/Rank.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <FitnessProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Special Protected Route for Onboarding */}
              <Route path="/onboarding" element={
                <ProtectedRoute>
                   <OnboardingFlow />
                </ProtectedRoute>
              } />

              {/* Standard Protected Routes */}
              <Route path="/home" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/workout" element={<ProtectedRoute><WorkoutLogger /></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
              <Route path="/builder" element={<ProtectedRoute><WorkoutBuilder /></ProtectedRoute>} />
              <Route path="/exercises" element={<ProtectedRoute><ExerciseLibrary /></ProtectedRoute>} />
              <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
              <Route path="/rank" element={<ProtectedRoute><Rank /></ProtectedRoute>} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </FitnessProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
