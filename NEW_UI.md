# NEW UI PLAN: "The Vibe Shift"

## 🎯 Objective
Transform "Foodie CRM Tracker" from a functional utility into a **Young, Sexy, Fun, and Interactive** lifestyle app. The goal is to maximize engagement ("stay inside") through heavy interactivity, bold aesthetics, and a "dopamine-inducing" user experience.

## 🎨 Aesthetic Direction: "Midnight Snack" / "Social Heat"
We will move away from the "Burnt Ember" (clinical/standard) palette to a high-energy, immersive vibe.

### 1. Color Palette: "Electric & Intimate"
Instead of standard reds and grays, we use:
- **Backgrounds**: Deep, rich darks (Zinc-950) with subtle noise textures for depth.
- **Glass**: High-quality glassmorphism (backdrop-blur-xl, white/10 opacity) for cards and overlays.
- **Accents**:
  - **Primary**: `Hot Coral` (#FF4D4D) or `Electric Rose` (#FF0055) - sexy, urgent.
  - **Secondary**: `Acid Lime` (#DFFF00) or `Cyber Blue` (#00F0FF) - for "fresh" / "new" tags.
  - **Happy Hour**: `Sunset Gold` gradients (amber-400 to rose-500).

### 2. Typography
- **Headings**: `Outfit` or `Space Grotesk` - geometric, modern, slightly quirky.
- **Body**: `Plus Jakarta Sans` or `Manrope` - clean but friendly.
- **Vibe Text**: Use an accent font like `Nothing You Could Do` or `Permanent Marker` for "stamps" (e.g., "SMASHED IT", "GOATED").

### 3. Visual Language
- **Roundness**: Extreme rounded corners (XL to 2XL) for a "bubbly/friendly" feel.
- **Depth**: Soft colored shadows (glows) instead of black shadows.
- **Motion**: Everything must move.
  - Staggered entrances for list items.
  - Scale on hover/tap.
  - "Rubber band" effect on scrolling.

## 🛠️ Implementation Plan

### Phase 1: Foundation & Theming
- [ ] **Install Fonts**: Add `Outfit` and `Plus Jakarta Sans`.
- [x] **Tailwind Config**: Define the new "Neon/Glass" palette and border radius tokens.
- [x] **Global CSS**: Add `noise` texture overlays and global animations (`float`, `pulse-glow`).

### Phase 2: Component Overhaul

#### 1. Navigation (The "Dock")
- Replace standard headers with a **Floating Glass Dock** at the bottom (Mobile-first).
- Icons: Haptic feedback style (scale up + wiggle on hover).

#### 2. Restaurant Cards ("The Trading Cards")
- **Style**: Glass cards with a subtle gradient border.
- **Interaction**:
  - **Swipe Actions**: Swipe right to "Book", Swipe left to "Archive".
  - **Long Press**: Quick peek/preview.
- **Status Pills**: Neumorphic or "Glowing" badges for "HH Active" or "Visited".

#### 3. Map Experience ("The Radar")
- **Custom Map Style**: "Midnight Commander" style (dark muted basemap) so colorful markers POP.
- **Markers**: Pulsing circles with emoji/icons.
- **Popups**: Glass floating islands, not standard Google bubbles.

#### 4. "Fun" Features (Gamification)
- **Confetti**: Explode confetti when marking a restaurant as "Visited".
- **Sound Effects (Optional)**: Subtle pop sounds on interaction (can be muted).
- **Empty States**: No more boring text. Use 3D assets or funny unique illustrations.

### Phase 3: "Sexy" Transitions
- Use `framer-motion` for page transitions.
- **Hero Mode**: When clicking a restaurant, the image expands from the card to fill the screen (Shared Layout Animation).

## 🚀 Execution Steps
1.  **Setup Design System**: Update `tailwind.config.ts` and `globals.css` first.
2.  **Create Atomic Components**: Build `GlassCard`, `NeonButton`, `AnimatedBadge`.
3.  **Refactor Main Views**:
    - `RestaurantList.tsx` -> Staggered Grid with Glass Cards.
    - `RestaurantMap.tsx` -> Dark mode map with pulsing markers.
4.  **Polish**: Add the "juice" (animations, sounds, textures).

---
*Reference: `lib/skills/frontend/SKILL.md` - "Avoid generic AI aesthetics. Commit to a BOLD direction."*

## 🧬 Technical DNA (Agent Instructions)

### 1. The "Perfect Glass" Recipe
To achieve the high-quality glassmorphism mentioned in the objective, avoid generic presets. Use this specific Tailwind composition:

**Base Glass Class:**
```css
/* The holy grail of dark mode glass */
.glass-panel {
  @apply backdrop-blur-xl bg-white/10 dark:bg-zinc-900/40;
  @apply border border-white/20 dark:border-white/10;
  @apply shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]; /* Deep, rich shadow */
  @apply ring-1 ring-white/5; /* Subtle inner highlight */
}
```

**Interactive Glass (Hover):**
```css
.glass-panel-interactive {
  @apply transition-all duration-300 ease-out;
  @apply hover:bg-white/20 dark:hover:bg-zinc-800/50;
  @apply hover:scale-[1.02] hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.37)];
  @apply hover:border-white/30;
}
```

### 2. Solving Stacking Context (Z-Index War)
Glassmorphism relies on `backdrop-filter`, which creates a new stacking context. This often breaks `z-index` layering (e.g., dropdowns hiding behind blurred cards).

**The Fix:**
- Use `isolation-isolate` on container elements if they have complex layering.
- If a child element needs to pop out (like a select menu), render it in a **Portal** (use `radix-ui` primitives or `createPortal`) to attach it to the body, bypassing the parent's glass filter stacking context.
- **Rule**: Never nest two heavy `backdrop-blur` elements directly on top of each other. It kills performance and looks muddy.

### 3. Gradient Borders (The "Glow" Effect)
To make cards pop without heavy borders, use a mask or a pseudo-element gradient border:

```tsx
<div className="relative p-[1px] rounded-2xl bg-gradient-to-br from-white/20 via-white/5 to-transparent">
  <div className="bg-zinc-950/90 backdrop-blur-xl rounded-2xl h-full w-full">
     {/* Content */}
  </div>
</div>
```

### 4. Text Readability on Glass
Glass backgrounds can make text hard to read.
- **Always** use `text-shadow-sm` or slight `drop-shadow` on white text over glass.
- **Headers**: `text-white drop-shadow-md`.
- **Subtext**: `text-zinc-200` (Never usage pure gray-500 on glass, it looks washed out).
