import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FitnessProvider } from "@/context/FitnessContext";
import Index from "./pages/Index.tsx";
import WorkoutLogger from "./pages/WorkoutLogger.tsx";
import Progress from "./pages/Progress.tsx";
import Profile from "./pages/Profile.tsx";
import WorkoutBuilder from "./pages/WorkoutBuilder.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FitnessProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/workout" element={<WorkoutLogger />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/builder" element={<WorkoutBuilder />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </FitnessProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
