import { Dumbbell } from 'lucide-react';
import Avatar from '@/components/shared/Avatar';

const ACCENT = '#0CFF9C';
const BG = '#0C1015';
const SURFACE_UP = '#1C2429';
const T2 = '#8899AA';
const T3 = '#4A5568';

export interface ActiveFriend {
  user_id: string;
  name: string;
  avatar_url: string | null;
  activity?: string;
  is_training?: boolean;
}

interface ActiveNowStripProps {
  friends: ActiveFriend[];
}

export default function ActiveNowStrip({ friends }: ActiveNowStripProps) {
  if (friends.length === 0) return null;

  return (
    <div>
      <p
        style={{
          fontSize: 11,
          color: T3,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          padding: '12px 16px 8px',
          margin: 0,
          fontWeight: 600,
        }}
      >
        Active Now
      </p>

      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: 16,
          padding: '0 16px 12px',
          scrollbarWidth: 'none',
          // @ts-ignore
          WebkitScrollbar: { display: 'none' },
        }}
      >
        {friends.map((friend) => (
          <div
            key={friend.user_id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 56,
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            {/* Avatar container */}
            <div style={{ position: 'relative', width: 52, height: 52 }}>
              {/* Avatar */}
              <div style={{ position: 'absolute', top: 2, left: 2 }}>
                <Avatar
                  src={friend.avatar_url ?? undefined}
                  name={friend.name}
                  size={48}
                />
              </div>

              {/* Green ring */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: `2px solid ${ACCENT}`,
                  boxShadow: '0 0 8px rgba(12,255,156,0.4)',
                  pointerEvents: 'none',
                }}
              />

              {/* Green dot indicator */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: ACCENT,
                  border: `2px solid ${BG}`,
                }}
              />

              {/* Dumbbell overlay if training */}
              {friend.is_training && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: SURFACE_UP,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Dumbbell size={10} color={ACCENT} />
                </div>
              )}
            </div>

            {/* Name */}
            <p
              style={{
                fontSize: 11,
                color: T2,
                marginTop: 6,
                textAlign: 'center',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                margin: '6px 0 0',
                lineHeight: 1.3,
                wordBreak: 'break-word',
              }}
            >
              {friend.name}
            </p>

            {/* Activity text */}
            {friend.activity && (
              <p
                style={{
                  fontSize: 10,
                  color: T3,
                  textAlign: 'center',
                  margin: '2px 0 0',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  width: '100%',
                }}
              >
                {friend.activity}
              </p>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .active-now-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
