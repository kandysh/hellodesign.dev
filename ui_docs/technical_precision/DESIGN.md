---
name: Technical Precision
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00885d'
  on-tertiary-container: '#000703'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-base:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0em
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  code-inline:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  container-max: 1440px
---

## Brand & Style
The design system is engineered for high-performance environments where clarity and technical rigor are paramount. It targets power users, developers, and data analysts who require a high-density UI that remains legible and energetic over long sessions. 

The aesthetic is a fusion of **Corporate Modern** and **High-Contrast Technical**. It utilizes a deep, architectural foundation of slate and navy to ground the experience, while the electric indigo accent provides a "live wire" energy that directs focus to critical actions and data states. The interface should feel like a high-end terminal: precise, responsive, and uncompromising.

## Colors
The palette is built on a "Dark Mode First" philosophy. The base is a deep Slate/Navy stack that provides better depth perception than pure black.

- **Primary (Electric Indigo):** `#6366F1`. Used for primary actions, active states, and high-priority indicators. It should feel luminous against the dark backgrounds.
- **Secondary (Muted Slate):** `#94A3B8`. Used for secondary text, icons, and non-interactive decorative elements.
- **Tertiary (Success Green):** `#10B981`. Reserved for "System Go" indicators and positive data trends.
- **Surface Scale:**
    - Base: `#0F172A` (Deepest)
    - Surface: `#1E293B` (Cards/Modals)
    - Overlay: `#334155` (Hover states/Table headers)

## Typography
This design system uses **Manrope** across all functional tiers to maintain a refined, geometric clarity. 

- **Headlines:** Use Bold and ExtraBold weights with slight negative letter-spacing to create a "locked-in" technical feel.
- **Body:** Standardized on a 16px base for readability, utilizing the 400 weight.
- **Labels:** Meta-data and table headers should use the `label-caps` style (all caps with tracking) to differentiate from content.
- **Technical Data:** While the system is Manrope-based, use a monospaced alternative for code blocks or purely numerical data arrays to ensure vertical alignment.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid Grid**. Content is housed in a 12-column grid with a 1440px max-width, but sidebars and utility panels use fixed pixel widths (240px or 320px) to maintain predictable density for technical tools.

A 4px baseline grid governs all internal padding. Use tighter spacing (8px, 12px) for related data groups and wider spacing (24px, 32px) for structural section breaks. This high-density approach allows for maximum information display without clutter.

## Elevation & Depth
Depth is achieved through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows. 

- **Layers:** Objects "rise" by becoming lighter in color. The background is `#0F172A`, cards are `#1E293B`, and floating menus are `#334155`.
- **Borders:** Every container must have a 1px solid border using a slightly lighter shade than its background (e.g., `#334155` border on a `#1E293B` card).
- **Glow:** The only "soft" element allowed is a subtle 8px blur glow using the Primary Electric Indigo color, reserved exclusively for active states or "On" status indicators.

## Shapes
Following the "rounded-sm" requirement, the system utilizes a **Soft** geometry. 

Standard components (buttons, inputs, cards) use a **4px (0.25rem)** corner radius. This is sharp enough to feel technical and precise, but the slight rounding prevents the UI from feeling aggressive or dated. Large containers like main content areas may scale up to **8px (0.5rem)** to soften the overall viewport, but never higher.

## Components
- **Buttons:** 
    - *Primary:* Solid Electric Indigo with white text. 
    - *Secondary:* Ghost style with 1px indigo border and indigo text. 
    - *Interaction:* High-energy transitions (subtle scale down on click, 150ms duration).
- **Inputs:** Darker than the surface background (`#0F172A`). On focus, the 1px border transitions to Electric Indigo with a 2px outer glow.
- **Chips/Badges:** Small, 4px rounded shapes. Use Indigo for "active," Slate for "inactive," and Green for "validated."
- **Data Tables:** Zebra striping is discouraged. Use 1px bottom borders in `#334155`. Headers should be `label-caps` style with a subtle background tint.
- **Status Indicators:** Use "Pulse" animations for live data feeds, utilizing the primary indigo or tertiary green to signal activity.
- **Cards:** No shadows. Use the tonal background shift and a 1px border to define boundaries.