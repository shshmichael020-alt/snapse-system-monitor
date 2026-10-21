---
name: Fluent Precision Desktop
colors:
  surface: '#0d131f'
  surface-dim: '#0d131f'
  surface-bright: '#333946'
  surface-container-lowest: '#080e1a'
  surface-container-low: '#161c28'
  surface-container: '#1a202c'
  surface-container-high: '#242a37'
  surface-container-highest: '#2f3542'
  on-surface: '#dde2f4'
  on-surface-variant: '#bbc9cf'
  inverse-surface: '#dde2f4'
  inverse-on-surface: '#2a303d'
  outline: '#859399'
  outline-variant: '#3c494e'
  surface-tint: '#47d6ff'
  primary: '#a5e7ff'
  on-primary: '#003543'
  primary-container: '#00d2ff'
  on-primary-container: '#00566a'
  inverse-primary: '#00677f'
  secondary: '#a3c9ff'
  on-secondary: '#00315c'
  secondary-container: '#3b93f1'
  on-secondary-container: '#002a51'
  tertiary: '#edd4ff'
  on-tertiary: '#490080'
  tertiary-container: '#dab1ff'
  on-tertiary-container: '#730dc2'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#b6ebff'
  primary-fixed-dim: '#47d6ff'
  on-primary-fixed: '#001f28'
  on-primary-fixed-variant: '#004e60'
  secondary-fixed: '#d3e3ff'
  secondary-fixed-dim: '#a3c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004883'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb7ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#6900b3'
  background: '#0d131f'
  on-background: '#dde2f4'
  surface-variant: '#2f3542'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.1875rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
  label-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1.125rem
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.02em
  code-telemetry:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: -0.01em
  code-metric-lg:
    fontFamily: JetBrains Mono
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.375rem
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-compact: 0.375rem
  margin: 0.75rem
  margin-dense: 0.5rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system targets power users, software engineers, DevOps practitioners, and hardware enthusiasts demanding a high-fidelity diagnostic utility for modern Windows desktop environments. It delivers instantaneous tactical awareness, absolute control over system processes, and low cognitive overhead during critical performance bottlenecks.

The aesthetic philosophy synthesizes **Fluent 2 Desktop Modernism** with the dense, functional ethos of mission-control telemetry dashboards. The visual execution avoids frivolous decoration in favor of structural clarity, precise spatial packaging, and responsive feedback. Micro-interactions are snappy and mechanical (60–120ms transitions), prioritizing rapid scans across thousands of concurrent execution threads. Visual hierarchy is established through meticulous contrast boundaries, surface luminance stepping, and intentional accent illumination rather than exaggerated depth or spatial separation.

## Colors

The palette is engineered exclusively around dark-mode operational conditions to prevent ocular fatigue during sustained debugging or diagnostic sessions.

- **Canvas & Background Surfaces**:
  - Base Shell Canvas: `#0D1117` (Deep Obsidian / Charcoal)
  - Primary Structural Workspace: `#101622` (Subtle Navy Tinted Black)
  - Card & Container Level 1: `#161F30` (Muted Indigo Slate)
  - Card & Container Level 2 / Hover Row: `#1C2638` (Active Elevated Surface)
  - Popover / Floating Menu / Inspector Drawer: `#1E2B40`

- **Borders & Separators**:
  - Base Subtle Structural Border: `#243247`
  - High-Contrast Element Border / Focus Outline: `#2B3A52`
  - Active Glow / Selection Stroke: `rgba(0, 210, 255, 0.45)`

- **Accent & Metric Roles**:
  - Primary Brand & Dynamic Telemetry: `#00D2FF` (Electric Cyan for primary metrics, active states, and real-time CPU spikes)
  - Secondary Action & Infrastructure: `#0078D4` (Windows Core Blue for action triggers, system-level badges, and base link handles)
  - Tertiary / Thread Allocation: `#A855F7` (Muted Violet for virtual memory, GPU compute engines, and dedicated threads)
  - Auxiliary / I/O Pipeline: `#14B8A6` (Teal for disk read/write throughput, network packet transfers, and steady-state sensors)
  - Warning / Pressure State: `#F59E0B` (Amber for throttle thresholds, thermal warnings, and elevated disk queues)
  - Destructive / Termination State: `#EF4444` (Precision Crimson for process termination, thread kill commands, and unhandled faults)

- **Foreground & Text**:
  - Primary Label / Dense Telemetry: `#F3F4F6` (High-contrast pure readability)
  - Secondary Descriptive / Metadata: `#94A3B8` (Balanced mid-tone)
  - Tertiary Muted / Unit Affixes: `#64748B` (Subordinate metric indicators such as `MB/s`, `PID`, `%`)

## Typography

Typography balances geometric modern desktop legibility with strict mechanical alignment. 

- **Primary Stack**: Inter serves as the foundational interface typeface, providing exceptional clarity at 11px to 13px rendered sizes.
- **Monospace Stack**: JetBrains Mono handles all telemetry readouts, memory addresses, PID identifiers, network throughput counters, and stack-trace logs.
- **Tabular Numerics Rule**: All numeric values across tables, telemetry charts, sparklines, and status badges must enforce `font-variant-numeric: tabular-nums lining-nums` or `font-feature-settings: "tnum" 1, "lnum" 1`. This prevents visual jitter when system values refresh at 500ms intervals.
- **Hierarchy Treatment**: Text hierarchy relies heavily on weight and color contrast stepping (`#F3F4F6` down to `#64748B`) rather than sweeping scale differentials, keeping the vertical footprint ultra-compact.

## Layout & Spacing

The layout is architected for continuous desktop utility spanning single-window operations, multi-monitor setups, and tiled window splits.

- **Layout Structure**: 
  - **Window Title Chrome**: 36px fixed height with integrated caption controls, command breadcrumbs, and live telemetry pill.
  - **Primary Navigation Rail**: Fixed 48px width when collapsed (icon-only mode showing CPU/RAM mini-gauges) expanding to 200px on trigger or wide monitor profiles.
  - **Workspace Split**: Resizable primary master view (process grid or telemetry timelines) with an optional 340px right-docked Process Inspector Drawer.
- **Density Philosophy**:
  - Space is treated as compute real estate. Padding defaults to ultra-dense 4px (`space-xs`) and 6px (`space-sm`) for tabular controls.
  - Rows across the process grid are constrained to a strict 28px height (compact density) or 34px height (standard density).
- **Responsive Adaptations**:
  - Below 900px window width: Right-hand inspector collapses into a modal overlay; navigation rail forces icon-only compact state.
  - Window Snap States: Grid system transitions from a dynamic multi-pane dashboard into a single focused execution stream with tabbed metric views.

## Elevation & Depth

This design system rejects deep drop shadows in favor of **Mica-inspired tonal stratification** and **ambient luminous edges**.

- **Surface Tiers**:
  - **Base Canvas (`#0D1117`)**: Global application background and inactive titlebar surface.
  - **Layer 1 Surface (`#161F30`)**: Standard data card container, process table background, and graph containers.
  - **Layer 2 Surface (`#1C2638`)**: Active row selections, hovered table rows, search bars, and button backgrounds.
  - **Layer 3 Surface (`#1E2B40`)**: Flyouts, context menus, right-click actions, and telemetry tooltips.

- **Outlines and Strokes**:
  - Every card and surface tier is bound by a crisp 1px structural stroke (`#243247`).
  - Active, focused, or inspected elements gain an illuminated border accent (`#2B3A52` or `rgba(0, 210, 255, 0.5)`).

- **Depth & Shadows**:
  - In-window elements rely purely on border contrast and surface stepping.
  - Flyout menus, process context actions, and the floating telemetry inspector utilize a restrained, cool-tinted shadow: `0 8px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25)`.
  - Windows Acrylic Effect: Flyouts apply `backdrop-filter: blur(12px) saturate(140%)` backed by `#1E2B40E6` (90% opacity).

## Shapes

The design system adheres to Fluent 2 desktop geometric constraints:

- **Radius Scale**:
  - Standard interactive controls (buttons, input fields, checkboxes, badges): `4px` (`0.25rem`).
  - Cards, panels, modal dialogs, and flyout surfaces: `6px` (`0.375rem`).
  - Status indicators, sparkline dots, and circular gauge caps: `9999px` (Pill/Circular).
- **Form Cohesion**: Rectilinear discipline maintains maximum pixel density for data presentation. Sharp, precise corners on data columns ensure rows align smoothly against scrollbars without extraneous visual clipping.

## Components

### Title Bar & Window Chrome
- **Height**: 36px fixed. Native drag region enabled with Webkit app-region properties.
- **Caption Controls**: Minimize, Maximize/Restore, and Close buttons anchored top-right. Standard buttons transition to `#1C2638` on hover; the Close button utilizes `#E81123` with a white glyph on hover.
- **Telemetry Pill**: Center-aligned compact metric capsule showing live `CPU [XX]%` and `RAM [XX]%` rendered with JetBrains Mono at 11px.

### Navigation Rail
- **Width**: Collapsed at 48px, expanded at 200px.
- **Items**: 36px height with 16px central icons. Active state renders a vertical 3px electric cyan indicator (`#00D2FF`) on the left edge with a subtle background fill of `rgba(0, 210, 255, 0.08)`.

### High-Density Process Tables
- **Header**: 28px height, uppercase 10px JetBrains Mono labels, persistent sort arrows, and interactive column resizers.
- **Rows**: Alternating subtle fills (`#101622` and `#131B29`), height 28px. Row hover transitions to `#1C2638` in 50ms.
- **PID Columns**: Left-aligned, monospace font, muted text (`#64748B`).
- **Telemetry Sparklines**: Micro inline SVGs (60px width × 16px height) displaying historical 30-second load profiles with a 1px stroke (`#00D2FF` for CPU, `#A855F7` for RAM, `#14B8A6` for Disk).

### Status Badges & Chips
- **Geometry**: 18px height, 4px corner radius, horizontal padding of 6px.
- **States**:
  - Normal/Running: Background `rgba(20, 184, 166, 0.15)`, text `#14B8A6`, border `1px solid rgba(20, 184, 166, 0.3)`.
  - Suspended/Idle: Background `rgba(148, 163, 184, 0.1)`, text `#94A3B8`, border `1px solid rgba(148, 163, 184, 0.2)`.
  - High Pressure/Throttled: Background `rgba(245, 158, 11, 0.15)`, text `#F59E0B`, border `1px solid rgba(245, 158, 11, 0.3)`.
  - Critical/Zombie: Background `rgba(239, 68, 68, 0.15)`, text `#EF4444`, border `1px solid rgba(239, 68, 68, 0.3)`.

### Hardware Performance Graphs
- **Canvas**: Rendered on `#161F30` background framed by a `#243247` border.
- **Gridlines**: Subtle dashed lines (`#1F2B3E`, 1px stroke, 4px dash gap) spaced at 25%, 50%, and 75% load thresholds.
- **Telemetry Area Fill**: Continuous linear gradient transitioning from `rgba(0, 210, 255, 0.25)` at the peak down to `rgba(0, 210, 255, 0.0)` at the base baseline.

### Inputs & Global Search
- **Search Bar**: 32px height, `#161F30` background, 1px `#243247` border, keyboard shortcut badge (`Ctrl + K` or `/`) right-aligned. Focus state shifts border to `#00D2FF` with an inner 1px glow.
- **Toggles (Startup Apps)**: 16px height × 32px width track. Active track `#0078D4`, inactive track `#243247`. The handle is a 12px white circle with 2px inset margins.

### Process Inspector Drawer & Termination Modal
- **Drawer**: Slips in from the right edge over the grid with a 120ms ease-out curve. Displays parent process hierarchy, thread count, DLL dependencies, handle allocation, and socket connections.
- **Termination Modal**: Centered dialog (`#161F30`, 1px `#EF4444` top accent stripe). Destructive CTA button rendered in `#EF4444` with a hover shift to `#DC2626` and active keybind confirmation (`Enter` to confirm, `Esc` to cancel).