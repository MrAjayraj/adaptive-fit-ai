import { getLevelTier } from '@/lib/gamification';

interface Props {
  level: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function LevelBadge({ level, size = 'md' }: Props) {
  const tier = getLevelTier(level);
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-14 h-14 text-2xl',
  };

  const borderClasses = {
    bronze: 'border-amber-600/50 shadow-[0_0_10px_hsl(25_70%_45%_/_0.2)]',
    silver: 'border-gray-300/50 shadow-[0_0_10px_hsl(0_0%_75%_/_0.2)]',
    gold: 'border-yellow-400/50 shadow-[0_0_10px_hsl(50_90%_50%_/_0.2)]',
    diamond: 'border-cyan-400/50 shadow-[0_0_10px_hsl(185_80%_50%_/_0.2)]',
    platinum: 'border-purple-400/50 shadow-[0_0_10px_hsl(270_70%_60%_/_0.2)]',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full border-2 ${borderClasses[tier.tier]} bg-card flex items-center justify-center`}>
      <span>{tier.icon}</span>
    </div>
  );
}
