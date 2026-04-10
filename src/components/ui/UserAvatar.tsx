import { useState } from 'react';

interface UserAvatarProps {
  /** Custom uploaded URL (highest priority) */
  src?: string | null;
  /** Google OAuth picture URL (second priority) */
  googleSrc?: string | null;
  /** Display name — used to derive initials fallback */
  name?: string | null;
  size?: number;
  className?: string;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'A';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const PALETTE = [
  '#F5C518', '#3B82F6', '#8B5CF6', '#10B981',
  '#F59E0B', '#EF4444', '#EC4899', '#14B8A6',
];

/**
 * UserAvatar
 * Priority: custom src → Google OAuth picture → colored initials.
 * Falls back gracefully at each step if the image fails to load.
 */
export default function UserAvatar({
  src,
  googleSrc,
  name,
  size = 40,
  className = '',
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const effectiveSrc = !imgError ? (src || googleSrc || null) : null;
  const initials = getInitials(name);
  const bgColor = PALETTE[initials.charCodeAt(0) % PALETTE.length];

  return (
    <div
      className={`relative shrink-0 rounded-full border-2 border-primary-accent/40 overflow-hidden ${className}`}
      style={{ width: size, height: size, minWidth: size }}
    >
      {effectiveSrc ? (
        <img
          src={effectiveSrc}
          alt={name || 'avatar'}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.36,
            fontWeight: 800,
            color: '#111113',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
