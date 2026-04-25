# Web App UI Kit — Brainer

The canvas editor. The primary surface of Project-Brainer.

## What's here

- `index.html` — mounts the full editor (topbar + sidebar + canvas + inspector).
- `App.jsx` — all components: `Topbar`, `Sidebar`, `Node`, `Edges`, `Canvas`, `Inspector`, `Simulation`.
- `styles.css` — all layout, panels, node chrome, connection SVG, simulation frame.

## Interactions demonstrated

- **Mode switch** — toggle between **Edit** and **Simulation**.
- **Edit**: click any node to populate the right-hand inspector; edges redraw with labels like "opens →", "calls API →", "reads data →".
- **Simulation**: a mobile device mock runs a clickable flow (Login → Cart → Checkout → Confirm), mock data panel on the right, network log bottom-right.

## Node types

Each has a color-tinted header chip + type icon. Bodies are type-specific:

- **Screen** — title + route + list of UI-element chips.
- **API** — method pill + path (monospace).
- **Data Model** — entity name + typed field list.
- **Role** — role name + member count.
- **UI Element** — (embedded inside a Screen, not standalone).

## Connections

Bezier curves, 1.5px neutral stroke with arrowheads. The **active edge** uses the signal-indigo color and a bolder stroke. A small rounded-rect label sits on the midpoint with the connection type.

## Intentionally cosmetic

- Nodes aren't truly draggable — positions are authored in `SAMPLE`.
- Panning/zooming is represented by the toolbar, not wired to a real transform.
- "Generate prompt" alerts a mock message.
- The sample graph is a four-screen e-commerce checkout — simplest shape that exercises every node type and every connection type.
