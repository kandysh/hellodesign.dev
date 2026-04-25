---
name: Technical Precision
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#bcc9c6'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#879391'
  outline-variant: '#3d4947'
  surface-tint: '#6bd8cb'
  primary: '#6bd8cb'
  on-primary: '#003732'
  primary-container: '#29a195'
  on-primary-container: '#00302b'
  inverse-primary: '#006a61'
  secondary: '#bec6e0'
  on-secondary: '#283044'
  secondary-container: '#3f465c'
  on-secondary-container: '#adb4ce'
  tertiary: '#7bd0ff'
  on-tertiary: '#00354a'
  tertiary-container: '#009bd1'
  on-tertiary-container: '#002d40'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0.01em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.08em
  code:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.6'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  sidebar-width: 280px
  toolbar-height: 56px
---

## Brand & Style

This design system is built for the rigorous, high-stakes environment of technical system design. The brand personality is **architectural, precise, and empowering**. It targets software engineers and architects who require a workspace that minimizes cognitive load while providing high-fidelity feedback.

The aesthetic follows a **Corporate / Modern** approach with a heavy emphasis on **Minimalism**. It prioritizes structural clarity over decorative elements. The UI should evoke a sense of professional mastery—a digital drafting table where complex diagrams and deep technical specs can breathe. High-quality whitespace, a restrained color palette, and razor-sharp alignment are the primary drivers of the visual language.

## Colors

The design system utilizes a **sophisticated dark theme** optimized for long-duration technical work. The palette is rooted in deep midnight blues and slates to reduce eye strain, while the primary accent—an energetic **Teal**—provides a focal point for actions and progress.

- **Primary (Teal):** Used for primary actions, success states, and active navigation nodes.
- **Secondary (Slate):** Used for surface backgrounds and container-level separation.
- **Tertiary (Sky Blue):** Used sparingly for information highlights, links, and system-level hints.
- **Neutral (Cool Gray):** Used for secondary text, icons, and non-interactive metadata.

The contrast ratios are strictly maintained to ensure that technical diagrams and code snippets remain legible against the dark background.

## Typography

Typography is used to establish a clear information hierarchy. **Manrope** provides a modern, refined look for headlines, while **Inter** ensures maximum readability for dense technical body copy. For technical metadata and "system feel" labels, **Space Grotesk** adds a geometric, cutting-edge touch.

- **Headlines:** Use tight letter spacing and heavier weights to anchor sections.
- **Body:** Standardized on Inter for its neutral, systematic utility.
- **Labels:** Space Grotesk is used for UI labels, badges, and status indicators to provide a distinct "technical" character.
- **Code:** Essential for a system design platform, mono-spaced fonts should be used for all configuration snippets and architectural parameters.

## Layout & Spacing

The design system employs a **Fluid Grid** for workspace areas and a **Fixed Sidebar** for navigation. The layout is based on an 8-pixel rhythm (with 4px increments for micro-adjustments).

- **Workspace:** The main canvas (system design board) should maximize screen real estate, utilizing a fluid container with 24px internal padding.
- **Sidebars:** Fixed-width sidebars (280px) house navigation and property inspectors, using a 16px gutter between interior elements.
- **Density:** Provide "Comfortable" (16px) and "Compact" (8px) spacing modes for users managing complex architectures.

## Elevation & Depth

Elevation is achieved through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows. This maintains the clean, "blueprint" feel of a technical tool.

1.  **Level 0 (Base):** The main application background.
2.  **Level 1 (Surfaces):** Sidebars and cards use a slightly lighter slate shade with a 1px border.
3.  **Level 2 (Popovers):** Modals and dropdowns use a subtle 8% white overlay and a soft 12px ambient shadow to separate from the background.
4.  **Interaction:** Hover states are indicated by brightening the 1px border or increasing the surface luminance, rather than adding shadow depth.

## Shapes

The shape language is **Soft (0.25rem/4px)**. This choice strikes a balance between the clinical sharpness of a technical tool and the modern friendliness of a SaaS platform.

- **Buttons & Inputs:** 4px radius.
- **Cards & Modals:** 8px (rounded-lg) for larger containers to soften the overall structure.
- **Chips/Badges:** Fully rounded (pill) to distinguish them from interactive input fields.
- **Diagram Nodes:** 4px radius to maintain a consistent architectural look.

## Components

Components are designed for high-fidelity interaction and clear state communication.

- **Buttons:** Primary buttons use a solid Teal background with white text. Secondary buttons use a ghost style (1px slate border) with teal text on hover.
- **Inputs:** Dark backgrounds (`#0F172A`) with a subtle `#1E293B` border. On focus, the border transitions to Teal with a 2px outer glow.
- **Cards:** Used for grouping system components. Cards feature a 1px border and a header section with a `label-sm` typography style for metadata.
- **Chips:** Used for tags (e.g., "Load Balancer," "Database"). These should have low-saturation backgrounds with high-contrast text.
- **Property Panels:** Use a condensed layout with `body-sm` typography and `label-sm` headers to allow for high data density.
- **Diagram Nodes:** Distinct from standard cards; nodes should have a high-contrast border and specific icon slots to represent different cloud services or architectural components.
- **Breadcrumbs:** Minimalist text links separated by a chevron, using `body-sm` to maintain focus on the main workspace.