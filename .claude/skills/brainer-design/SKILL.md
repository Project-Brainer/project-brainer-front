---
name: brainer-design
description: Use this skill to generate well-branded interfaces and assets for Project-Brainer (product name: Brainer), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

- **Brand** — Brainer. Visual logic canvas for product builders. Tone is calm, technical, precise, Linear-adjacent. No emoji, no hype.
- **Core tokens** — `colors_and_type.css` (all colors, type, spacing, radii, shadows, motion).
- **Fonts** — Instrument Serif (display), Geist (UI sans), Geist Mono (mono). Loaded from Google Fonts via `fonts/fonts.css`.
- **Signal color** — electric indigo `#5B42E8`. Use sparingly — only for active nodes, connection arrows, focus rings, primary CTAs, and the logo mark.
- **Icons** — Lucide at 1.5px stroke, no fill. See README's "Iconography" section.
- **Logo** — `assets/logo.svg` (mark), `assets/logo-wordmark.svg` (mark + wordmark), `assets/logo-mono.svg` (currentColor).
- **UI kits** — `ui_kits/web_app/` (canvas editor) and `ui_kits/marketing/` (landing page). Lift components and patterns from these.

## Copy rules (don't break these)

- Sentence case everywhere. "Generate prompt", not "Generate Prompt".
- Second person. "You" not "I".
- No emoji in product UI.
- Headlines may use lowercase + italic emphasis ("design your app, *don't document it.*").
- Monospace for field types, paths, IDs, HTTP methods, counts in dense lists.
