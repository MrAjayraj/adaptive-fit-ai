import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Dumbbell } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-4 max-w-sm"
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-[28px] bg-surface-2 border border-border-subtle flex items-center justify-center">
          <Dumbbell className="w-9 h-9 text-text-3" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold text-text-1 tabular-nums">404</h1>
          <p className="text-[18px] font-bold text-text-1">Page not found</p>
          <p className="text-[14px] text-text-3 leading-relaxed">
            Looks like this route skipped leg day. It doesn't exist.
          </p>
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/')}
          className="mt-2 flex items-center gap-2 px-6 py-3 rounded-full bg-primary-accent text-canvas font-bold text-[15px] shadow-volt"
        >
          <Home className="w-4 h-4" />
          Go Home
        </motion.button>
      </motion.div>
    </div>
  );
}
