# Fit Pulse Design System

## Colors
Canvas: #06090D (true OLED black, cold blue micro-tint)
Surface-1: #0E1318 (card backgrounds)
Surface-2: #151C24 (elevated cards, active states, inputs)
Surface-3: #1E2732 (wells, inset areas, input fields)
Accent: #00E676 (electric green — MAX 10% of any screen, only CTAs + active indicators + key stats)
Accent-Alt: #00BFA5 (teal — charts, secondary highlights)
Accent-Glow: rgba(0,230,118,0.08) (subtle background glow behind accent elements)
Text-1: #EAEEF2 (primary text, never pure white)
Text-2: #7B8A99 (labels, captions, secondary)
Text-3: #4A5568 (disabled, hints, timestamps)
Border: rgba(255,255,255,0.04) (cards feel almost borderless)
Danger: #EF4444
Gold: #F59E0B
Silver: #94A3B8
Bronze: #B45309
Rare: #3B82F6
Epic: #8B5CF6
Legendary: #EAB308

## Typography
Font: "Plus Jakarta Sans" from Google Fonts
Fallback: "Inter", system-ui, sans-serif
Hero numbers (stats, weights): 700, 32-40px, -0.03em tracking, tabular-nums
Headings: 600, 20-26px, -0.02em tracking
Body: 400, 14px
Labels: 500, 10-11px, UPPERCASE, 0.12em tracking, Text-2 color
The GAP between big numbers and tiny labels is what creates visual drama.

## Cards
Background: Surface-1
Border: 1px solid rgba(255,255,255,0.04) — nearly invisible
Radius: 20px
Shadow: 0 4px 24px rgba(0,0,0,0.4)
NEVER thick colored borders. NEVER neon glow. NEVER identical treatment on every card.
Feature cards (like workout CTA): subtle radial gradient at one corner — radial-gradient(circle at top right, rgba(0,230,118,0.06), transparent 60%)
Cards must VARY in height, density, internal layout.

## Buttons
Primary: #00E676 bg, #06090D text, 600 weight, 14px radius, 48px height, NOT pill-shaped
Secondary: transparent bg, 1px border rgba(255,255,255,0.12), Text-1, 14px radius
Ghost: no bg, no border, Accent text
Destructive: rgba(239,68,68,0.12) bg, #EF4444 text

## Icons
Lucide React icons — 1.5px stroke, 24px default. ZERO emojis in UI.
Default color: Text-2. Active: Accent.
Exception: streak flame can be a custom SVG gradient icon (#F59E0B to #EF4444)

## Bottom Nav
5 tabs: Home, Library, Workout (center, larger 28px icon in 48px Surface-2 circle), Compete, Progress
NO text labels on tabs — only icons
Active: icon #00E676 + tiny 4px dot indicator below
Inactive: icon #4A5568
Active dot slides between tabs with framer-motion layoutId animation
Background: Canvas with 1px top border rgba(255,255,255,0.04)

## Animations (framer-motion)
Page mount: staggered children — staggerChildren: 0.04, each child: opacity 0→1, y: 12→0, duration: 0.4s, ease: [0.16, 1, 0.3, 1]
Button press: whileTap={{ scale: 0.96 }}
Number stats: count-up animation on mount, 800ms
Progress rings: strokeDashoffset animated on mount, 1200ms ease-out
Charts: lines draw left-to-right on mount, 800ms
Tab switch: content cross-fade 250ms, dot indicator slides via layoutId
Streak flame: CSS keyframe — scale(0.95)↔scale(1.05) + rotate(-3deg)↔rotate(3deg), 2s infinite alternate
Level-up: full overlay, confetti burst (canvas-confetti), level number scales from 0, bounce settle
Achievement unlock: rarity-colored glow ring pulse 200ms then settle
Skeleton loading: pulse opacity 0.4↔0.7, 1.5s infinite, on Surface-1 cards matching real content shapes
