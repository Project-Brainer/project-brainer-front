# Project-Brainer Design System

> A visual logic builder for software products. Users replace written technical documentation with a canvas of nodes and connections — screens, UI elements, data models, API endpoints, roles — then simulate, iterate, and generate a development prompt from the graph.

This is a **greenfield** design system built from a product brief only (no prior codebase, Figma, or brand assets were provided). Every decision below is a starting proposal, not a ratified standard. Expect to iterate.

## Product context

**Project-Brainer** (product surface name: **Brainer**) sits between a whiteboard, a spec document, and a low-code builder. The canvas *is* the product: most of the time, the user is looking at a graph. The rest of the UI is a quiet frame around that canvas.

### Target audience
- Developers transitioning to AI-driven development
- Startup founders
- Product managers
- Technical freelancers

They're replacing long written specs with a visual system that's **faster to build**, **clearer to read**, and **directly generatable** into an AI prompt.

### Core surfaces
- **Web app** — the canvas editor + simulation runner. The primary surface.
- **Marketing site** — landing page, positioning, sign-up.

### What it is not
Not a design tool (no pixel-pushing, no Figma). Not a full low-code platform (the output is a prompt, not a shipped app). Not a whiteboard (nodes have strict types and schemas).

## Sources

No sources were provided. This system is **invented from the product brief**. Key interpretive decisions:

- **Name**: Product is **Brainer**; project/org is **Project-Brainer**.
- **Visual anchor**: the product's DNA is a graph, so the brand leans into graph/node motifs — nodes, edges, dotted grids, precise geometric lines.
- **Polish target**: Linear + Notion + Figma. Minimal, dense, technical-but-warm.
- **Point of difference**: an *editorial serif display face* (Instrument Serif) paired with a precise sans (Geist) + mono (Geist Mono). Most dev-tools brands are all-sans; the serif gives Brainer craft and warmth without sacrificing technical legibility.

---

## Index

Files in this system:

| Path | What it is |
|---|---|
| `README.md` | This file. Context, content rules, visual foundations, iconography. |
| `SKILL.md` | Agent Skills manifest. Makes this system usable as a Claude Code skill. |
| `colors_and_type.css` | All design tokens: colors, type, spacing, radii, shadows, motion. |
| `fonts/fonts.css` | Webfont imports (Google Fonts). |
| `assets/` | Logos + brand marks (SVG). |
| `preview/` | Design-system preview cards (Type, Colors, Spacing, Components, Brand). |
| `ui_kits/web_app/` | The canvas editor UI kit — nodes, panels, topbar, simulation mode. |
| `ui_kits/marketing/` | The landing-page UI kit — hero, feature sections, CTA. |

---

## Content fundamentals

The voice is **Linear-adjacent**: precise, calm, confident, never hype-y. The product's job is clarity, so the copy is clear.

### Tone
- **Direct over clever.** "Connect screens with arrows." not "Let your ideas flow."
- **Technical but not jargon-heavy.** "Define a data model" — yes. "Materialize your schema entity graph" — no.
- **Assume intelligence.** The audience are builders. Don't over-explain.
- **Calm.** No urgency, no exclamation points outside real errors.

### Person
- **"You"** for the user. Second person. ("Your canvas", "You can connect…")
- **"We"** is used sparingly for Brainer-as-maker voice (marketing only, rarely).
- Never **"I"**.

### Casing
- **Sentence case everywhere**: buttons, menu items, section headings, dialog titles. ("Generate prompt", not "Generate Prompt".)
- **Proper nouns capitalized**: Brainer, Project-Brainer, product features only when formally named.
- **Headlines can go lowercase** in marketing for an editorial feel (e.g. *"design your app, don't document it."*).

### Examples

| ✅ | ❌ |
|---|---|
| Connect two screens | Seamlessly link your screens together |
| Generate prompt | Generate AI Prompt |
| Add a data model | Add new data model entity |
| Empty. Drop a screen to begin. | Oops! Looks like there's nothing here yet 👀 |
| Simulation running | Simulating Your Awesome App... |

### Emoji
**No emoji** in product UI. Not in empty states, not in toasts, not in tooltips. The brand's warmth comes from the serif headline face and soft shadows — not emoji.

### Numbers & data
- Use the mono face (Geist Mono) for IDs, paths, field types, counts in dense lists, durations. Anything a developer would expect to be monospaced.
- Format field types as `string`, `number`, `date`, `boolean`, `file`, `enum` — lowercase, mono.
- HTTP methods in node headers are `GET`, `POST`, `PATCH`, `DELETE` — uppercase, mono, with a method-color pill.

### Vibe in one paragraph
> *Brainer is for people who think in systems. The tone is the tone of a well-organized senior engineer's notebook — no emoji, no exclamation points, no motivational copy. Just well-chosen words, a monospace number here and there, and a lot of white space.*

---

## Visual foundations

### Colors
- **Base palette is warm near-neutral.** Backgrounds are a slight cream (`#FDFDFC`), not pure white. Text is a slight warm black (`#111110`), not `#000`. Borders have a faint green-gray cast. This prevents the sterile-tech-dashboard feeling.
- **One signal color**: electric indigo (`#5B42E8`). Used only for: the logo mark dot, active/selected nodes, connection arrows in simulation mode, focus rings, primary CTAs. Never as a background fill on large surfaces.
- **Semantic node-type tints**: each node type (Screen, UI Element, API, Data Model, Role) has a soft background tint + deep foreground, used as *accents on the node's header chip* — not the node's full fill. The node itself is always white.
- **Status**: success (forest green), warning (amber), danger (brick red). All subdued.

### Typography
- **Display**: Instrument Serif — headlines, empty-state hero text, marketing H1/H2. Brings editorial warmth.
- **UI**: Geist — every piece of product copy, buttons, labels, node titles, body.
- **Mono**: Geist Mono — field types, paths, IDs, eyebrow labels in caps, code.
- **Tight UI scale**: 13px is the product default (dense, Linear-like). 11–12px for labels. Marketing scales up sharply (44–88px headlines).

### Spacing
- 4px base grid. Most UI uses 8/12/16/24 increments. Canvas nodes use 12/16.
- Density: product UI is *dense* — more like Linear than Notion. Marketing breathes much more (96px+ section rhythms).

### Backgrounds
- **Canvas**: warm off-white with a **subtle dotted grid** (16px spacing, dots `#E5E5E1` at ~25% opacity). Never full-bleed images or gradients.
- **Panels**: solid `#FFFFFF` with a 1px `#E5E5E1` hairline.
- **No repeating textures. No hand illustrations. No marketing gradients.** Imagery, when present on marketing, is a literal product screenshot or a stylized node-graph motif in SVG.

### Animation
- **Purposeful, fast, cubic-bezier ease-out.** Base duration 180ms. Never bouncy for utility UI (only a gentle spring for node *drop* moments).
- **Simulation mode uses animated transitions between screens**: slide + fade, 260ms. This is the only place motion is "featured".
- No parallax, no scroll-jack, no marquee.

### Interactive states
- **Hover**: background shifts to `--bg-hover` (`#EFEFEC`) on buttons/rows. Nodes get a 1.5px signal-colored outline at 40% opacity. No size change.
- **Press/active**: background shifts darker to `--bg-active`. No scale-down.
- **Focus**: 3px soft indigo ring (`rgba(91,66,232,0.22)`) — never removed, always visible on keyboard focus.
- **Selected**: full signal-colored outline (1.5px solid) + subtle indigo glow shadow.

### Borders & shadows
- **Hairlines everywhere**. 1px borders in `#E5E5E1` separate panels, rows, nodes.
- **Shadows are soft, warm, and layered** — they combine a faint hairline-as-shadow (`0 0 0 1px rgba(17,17,16,0.04)`) with a diffuse ambient (`0 4px 12px -2px rgba(17,17,16,0.06)`). Never colored shadows except on selected nodes (indigo glow).
- **Cards**: white, 1px border, 12–16px radius, `--shadow-md`. Toolbars use `--shadow-sm`. Floating menus use `--shadow-lg`.

### Transparency & blur
- **Rare.** Used for: the simulation mode overlay frame (`rgba(10,10,9,0.4)` backdrop with 8px backdrop-blur), and the connection-type picker popover (`rgba(255,255,255,0.85)` with blur). Never decorative.

### Corner radii
- **Large but not circular.** Cards = 12px. Buttons = 8px. Pills/tags = 999px. Nodes = 10–12px. Input fields = 8px.

### Layout rules
- The canvas fills the viewport behind everything. Sidebars and panels are **fixed**, canvas is **scrollable/zoomable**.
- Topbar is always 48px. Left sidebar 240px. Right panel 320px.
- Marketing is **center-contained** (max-width 1200px) with generous gutters.

### Imagery mood
Cool-neutral, never warm-photographic. If photos appear (rare — marketing only), they're **black and white**, grainy, of screens/desks. Product screenshots are the hero — always sharp, always with the dotted-grid canvas visible.

---

## Iconography

### System: Lucide (via CDN)
We use **Lucide Icons** (the successor to Feather) at **1.5px stroke**, **size 16–20px** in product UI, **24px** in marketing.

- CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.js`
- Or import individual SVGs from `https://lucide.dev`

**Why Lucide**: precise, minimal, consistent 1.5px stroke, massive coverage (1000+), MIT-licensed. Matches the brand's calm/technical feel.

### Rules
- **Stroke width**: `1.5` everywhere. Never `2` (too heavy) or `1` (too thin).
- **Color**: inherit from `currentColor`. In toolbars and sidebar items, `--fg-3`; on hover, `--fg-1`; on active, `--accent`.
- **Size**: 16px in dense UI (sidebar items, node chips), 18px in medium UI (topbar, buttons), 20px for primary actions, 24px in marketing.
- **Do not fill**. Lucide is stroke-only; keep it that way. No colored/filled icons.
- **Do not mix icon systems.** Pair only with the brand logo SVG (which is custom).

### When icons appear
- Sidebar: one per category (Screens, API Endpoints, Data Models, Roles) + a "+" to add.
- Node headers: one per node type (`layout` for Screen, `database` for Model, `zap` for API, `user` for Role, `square-mouse-pointer` for UI element).
- Topbar: `zap` (Generate), `play`/`pencil` (mode switch), `more-horizontal`.
- Connection labels: small type glyph in the pill.

### Emoji
**Not used.** Ever. If you're reaching for an emoji, reach for a Lucide icon.

### Unicode
Used sparingly for pure typography: `→` (arrow in copy), `·` (separator), `—` (em dash). Not as decorative glyphs.

### Custom marks
- `assets/logo.svg` — the 32px node-graph mark.
- `assets/logo-wordmark.svg` — mark + "Brainer" wordmark.
- `assets/logo-mono.svg` — mark in `currentColor` for light/dark contexts.

---

## Font substitutions — flagged

None of the three families have been delivered by you; I've chosen **Google Fonts** equivalents that fit the voice. If you have preferred families (or licensed webfonts), tell me and I'll swap them:

| Role | Used | Notes |
|---|---|---|
| Display | **Instrument Serif** | Editorial warmth. Alt: Fraunces (heavier), Pitch Serif (if you license). |
| UI sans | **Geist** | Vercel's geometric sans, free via Google Fonts. Alt: Inter (more neutral, more common). |
| Mono | **Geist Mono** | Matches Geist. Alt: JetBrains Mono, IBM Plex Mono. |

**Ask me to swap any of these and I'll update every token + preview card.**
