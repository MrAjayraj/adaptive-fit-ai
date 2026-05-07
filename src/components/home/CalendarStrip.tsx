// src/components/home/CalendarStrip.tsx
// Horizontal 15-day calendar strip with activity dots.
// 7 past days + today + 7 future days; auto-scrolls so today is centred.

import { useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ACCENT      = '#E2FF31';
const DAY_NAMES   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CELL_W  = 52;  // px
const CELL_GAP = 6;  // px
const CELL_STRIDE = CELL_W + CELL_GAP;
const TODAY_IDX   = 7;      // index of today in the 15-day window
const TOTAL_DAYS  = 15;

export interface DayActivity {
  hasWorkout:  boolean;
  hasPlannedWorkout?: boolean;
}

interface Props {
  selectedDate: string;                       // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  activities?: Record<string, DayActivity>;  // keyed by YYYY-MM-DD
}

/** Build the 15-day array centred on today */
function buildDays(): string[] {
  return Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - TODAY_IDX + i);
    return d.toISOString().split('T')[0];
  });
}

export function CalendarStrip({ selectedDate, onSelectDate, activities = {} }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const days  = useMemo(() => buildDays(), []);

  // Scroll so today is centred on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const containerW  = el.clientWidth;
    const todayOffset = 16 + TODAY_IDX * CELL_STRIDE; // 16px left padding
    const scrollLeft  = todayOffset - containerW / 2 + CELL_W / 2;
    el.scrollLeft = Math.max(0, scrollLeft);
  }, []);

  // Also scroll to the selected date if it drifts out of view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = days.indexOf(selectedDate);
    if (idx < 0) return;
    const offset  = 16 + idx * CELL_STRIDE;
    const visible = el.scrollLeft + el.clientWidth;
    if (offset < el.scrollLeft + CELL_STRIDE || offset + CELL_W > visible - CELL_STRIDE) {
      el.scrollTo({ left: offset - el.clientWidth / 2 + CELL_W / 2, behavior: 'smooth' });
    }
  }, [selectedDate, days]);

  const selDate   = new Date(selectedDate + 'T00:00:00');
  const monthLabel = `${MONTH_NAMES[selDate.getMonth()]} ${selDate.getFullYear()}`;

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* ── Month header ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '0 16px',
        marginBottom: 8,
      }}>
        <button
          onClick={() => {
            const prev = new Date(selectedDate + 'T00:00:00');
            prev.setDate(prev.getDate() - 1);
            onSelectDate(prev.toISOString().split('T')[0]);
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <ChevronLeft style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
        </button>

        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.06em',
          minWidth: 110,
          textAlign: 'center',
        }}>
          {monthLabel}
        </span>

        <button
          onClick={() => {
            const next = new Date(selectedDate + 'T00:00:00');
            next.setDate(next.getDate() + 1);
            onSelectDate(next.toISOString().split('T')[0]);
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
        >
          <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
        </button>
      </div>

      {/* ── Scrollable day strip ──────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: CELL_GAP,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          padding: '4px 16px 6px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {days.map((date) => {
          const d        = new Date(date + 'T00:00:00');
          const dayName  = DAY_NAMES[d.getDay()];
          const dateNum  = d.getDate();
          const isToday  = date === today;
          const isSel    = date === selectedDate;
          const isPast   = date < today;
          const isFuture = date > today;
          const act      = activities[date];

          /* colour helpers */
          const textMuted   = isSel ? 'rgba(0,0,0,0.55)' : isFuture ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.35)';
          const textPrimary = isSel ? '#000'               : isToday ? ACCENT : isFuture ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.88)';

          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              style={{
                flexShrink:    0,
                width:         CELL_W,
                height:        70,
                borderRadius:  16,
                border:        isSel    ? 'none'
                             : isToday ? `1.5px solid ${ACCENT}`
                             :           '1px solid rgba(255,255,255,0.06)',
                background:    isSel    ? ACCENT
                             : isToday ? 'rgba(226,255,49,0.07)'
                             :           'rgba(255,255,255,0.025)',
                cursor:        'pointer',
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                justifyContent:'center',
                gap:           2,
                transition:    'transform 0.12s ease, background 0.12s ease',
                outline:       'none',
              }}
            >
              {/* Day name */}
              <span style={{
                fontSize:      9,
                fontWeight:    800,
                color:         textMuted,
                letterSpacing: '0.09em',
                lineHeight:    1,
              }}>
                {dayName}
              </span>

              {/* Date number */}
              <span style={{
                fontSize:   19,
                fontWeight: 900,
                color:      textPrimary,
                lineHeight: 1,
              }}>
                {dateNum}
              </span>

              {/* Activity dots */}
              <div style={{ display: 'flex', gap: 3, height: 6, alignItems: 'center', marginTop: 1 }}>
                {act?.hasWorkout && (
                  <span style={{
                    display: 'block',
                    width: 5, height: 5,
                    borderRadius: '50%',
                    background: isSel ? 'rgba(0,0,0,0.5)' : '#0CFF9C',
                  }} />
                )}
                {act?.hasPlannedWorkout && !act?.hasWorkout && (
                  <span style={{
                    display: 'block',
                    width: 5, height: 5,
                    borderRadius: '50%',
                    border: `1.5px solid ${isSel ? 'rgba(0,0,0,0.5)' : '#0CFF9C'}`,
                    background: 'transparent',
                  }} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
