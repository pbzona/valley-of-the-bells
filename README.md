# Valley of Bells

A 3D procedural mountain city builder inspired by premodern Japan. A small rice village grows into a pilgrimage town when you connect a mountain temple to the valley's trade roads.

## Run locally

```sh
npm ci
npm run dev
npm test
npm run build
```

Use Node 22.13+ (or current LTS). The Vite build produces a standalone `dist/index.html` with all assets included. Open it directly or serve `dist/` from any static host. No backend, accounts, or asset downloads are needed.

## Build a province

- Roads leading to the **South Gate** activate neighboring buildings. Drag roads along the ground or bridge straight across a river. On steep climbs, lay shorter runs and switchbacks.
- Houses grow the workforce, rice paddies feed it, workshops make timber, and markets sell surplus. The ledger shows the effect each day.
- Fill narrow gaps with 1×2 rowhouses, 1×1 market stalls, stone lanterns, and pocket maple gardens (**Z/X/C/V**). Rotate rowhouses with **R**. The two props do not need roads.
- Carve a terrace above the valley and raise a temple. A connected, staffed inn and at least 16 residents bring the first pilgrims. The early objective is 32 residents and 20 pilgrims per day.
- **1–0** selects construction, **R** rotates, **Esc** cancels, **Space** plays/pauses, **N** toggles dusk, and **H** hides the interface. Right drag orbits; hold WASD or the arrow keys to pan, or drag with middle mouse or Shift + right mouse. On touch, drag to pan or draw the selected road/bridge and pinch to zoom.
- Save data stays in the browser. Settings has JSON import/export and seed selection.

## Source layout

- `src/sim.ts`: terrain, placement validation, road connectivity, and economy.
- `src/art.ts`: batched terrain, foliage, architecture, roads and water.
- `src/main.ts`: Three.js scene, input, UI, and persistence. `?test` starts a paused fresh valley and exposes deterministic browser test hooks.

This first slice is about road access and the village-to-pilgrimage loop. It has direct building placement, not autonomous zoning, and workers are modeled in aggregate rather than as individual households or logistics agents.
