// src/components/shared/Avatar.tsx
// Single source of truth for all avatars in the app.
// Renders Google avatar or gradient-initial fallback.

import React, { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  /** Optional: extra ring styles, e.g. 'ring-2 ring-[#00E676]' */
  ring?: string;
}

// Deterministic gradient from name
function nameToGradient(name: string): string {
  const gradients = [
    ['#D4A843', '#B8860B'],
    ['#00E676', '#00BCD4'],
    ['#A78BFA', '#EC4899'],
    ['#38BDF8', '#6366F1'],
    ['#F97316', '#EF4444'],
    ['#34D399', '#06B6D4'],
    ['#FB923C', '#F43F5E'],
  ];
  const idx = Math.abs((name.codePointAt(0) ?? 65) - 65) % gradients.length;
  const [a, b] = gradients[idx];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export default function Avatar({ src, name, size = 40, className = '', ring = '' }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initial = (name || '?')[0].toUpperCase();
  const fontSize = Math.round(size * 0.38);

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: '50%',
  };

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        style={baseStyle}
        className={`object-cover ${ring} ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        background: nameToGradient(name),
        fontSize,
        fontWeight: 700,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
      className={`${ring} ${className}`}
    >
      {initial}
    </div>
  );
}
