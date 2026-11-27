# Valley of Bells

A 3D procedural mountain city builder inspired by premodern Japan. A small rice village grows into a pilgrimage town when you connect a mountain temple to the valley's trade roads. Visitors choose an approach based on distance and slope; changing that approach changes where pilgrims shop and stay.

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
- Carve a terrace above the valley and raise a temple. Day pilgrims arrive at 16 residents. Staffed inns on the chosen approach have more effective lodging capacity, and staffed markets and stalls earn extra from passing visitors. Press **T** to show routes; click a road or business to inspect its traffic.
- Watch pilgrim parties stop at shops, inns and temples. Vendors keep a small display for locals and put out an extra awning and stock for passing pilgrims. Productive streets can grow paper-lantern strings between neighboring houses; these are procedural details, not buildable objects.
- **F** or the style button cycles each building’s appearance while placing it. Connected homes near staffed shops can add a storey as demand rises. Stalls with steady customers turn into permanent shops. Select a building for its progress and requirements; upgrades use timber above a protected reserve.
- In **Housing**, use **Grow plot** (**B**) to reserve tiles. Households look for road frontage and a two-tile-deep footprint; traders look for passing pilgrims. Unreserve with Erase.
- **Temple & land** also has stone courts (drag a rectangle), roofed gates, covered walks, and bell shelters. Gates and walks can stand over a walkable road or court without breaking it. Only the main temple participates in the pilgrimage economy.
- Roads and walkers share a single deck profile: level landings at junctions, graded paving on modest climbs, and closed stair flights on steeper links. Ground cuts stay local to the paving. Terrace retaining walls meet both the flattened pad and the original slope, including along uphill cuts. Sloped homes sit on masonry or ground-following posts.
- **Settings → Load route trial** starts a paused scenario on seed 1748. Try building the marked cutoff, then adapt the town or keep the original market approach. Export your existing save before replacing it.
- **1–0** selects construction, **R** rotates, **Esc** cancels, **Space** plays/pauses, **N** toggles dusk, and **H** hides the interface. Right drag orbits; hold WASD or the arrow keys to pan, or drag with middle mouse or Shift + right mouse. On touch, drag to pan or draw the selected road/bridge and pinch to zoom.
- Save data stays in the browser. Settings has JSON import/export and seed selection.

## Competing goals (experimental)

- **Temple renown** rises toward a target set by how calm the temple's sacred approach is. That approach runs from the last temple gate on a route, or covers the final eight tiles. Lanterns, gardens, temple pieces, courts, and open land calm it. Shops, workshops, farms, inns, carts, and crowds disturb it. Renown has five ranks; each unlocks temple pieces and larger crowds.
- **Three pilgrim types** each choose their own route. Pilgrims take the easiest walk and shop. Patrons arrive once the temple is known, avoid stairs and carts, and only stay at a cart-free inn on their road; they pay inn fees and spend well. Ascetics come for a calm approach, climb anything, avoid trade, and count double toward renown.
- **Freight:** staffed farms and workshops send handcarts to the nearest market or stall. Carts cannot use stairs. Sellers without deliveries sell half stock, and pilgrim crowds on cart roads slow deliveries. Carts cost nearby inns beds and keep patrons away.
- **Seasons:** the Bell Festival (spring) and Lantern Festival (autumn) double ordinary pilgrims for five days. In winter, patrons stay home and ascetics come for retreats.
- Press **T** for the route view: each visitor type and freight has its own color, and calm markers show how quiet each tile of the approach is.

## Source layout

- `src/sim.ts`: terrain, placement validation, road connectivity, and economy.
- `src/art.ts`: batched terrain, foliage, architecture, roads and water.
- `src/main.ts`: Three.js scene, input, UI, and persistence. `?test` starts a paused fresh valley and exposes deterministic browser test hooks.

Direct building placement and opt-in growth plots coexist. Daily labor and resource stocks are still modeled in aggregate; visible pilgrims follow actual routes, but other walkers are illustrative.
