import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           {/* Animated glowing spinner */}
           <div className="relative flex items-center justify-center w-12 h-12">
             <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary w-full h-full animate-spin" />
             <div className="absolute inset-0 rounded-full blur-[8px] bg-primary/20 w-full h-full animate-pulse" />
           </div>
        </div>
      </div>
    );
  }

  // If not authenticated and not a guest, kick back to login
  if (!session && !isGuest) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
