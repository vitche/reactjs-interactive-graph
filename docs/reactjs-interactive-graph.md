# reactjs-interactive-graph

A wrapper around [cosmos.gl](https://cosmograph.app/) v2 for React that provides convenient graph manipulation through node IDs instead of low-level Float32Array indices.

**What it solves:**

- cosmos.gl operates on point indices and Float32Array buffers — this library provides a convenient ID-based API
- Incremental addition/removal of nodes without restarting the graph or simulation
- Automatic color, size, and position management via hex strings instead of RGBA float arrays
- Node images via `registerImage` + the `image` field — no manual ImageData buffer management
- Direct access to `cosmos` for everything else (camera, selection, simulation, shapes, etc.)

## Installation

```bash
npm install reactjs-interactive-graph
```

Peer dependencies:

```bash
npm install react @cosmos.gl/graph
```

## Quick Start

```jsx
import { useRef } from 'react';
import { GraphView } from 'reactjs-interactive-graph';

function App() {
  const ref = useRef();

  const handleLoad = () => {
    ref.current.addNodes(
      [
        { id: 'alice', color: '#ff3366', size: 12 },
        { id: 'bob',   color: '#00d4ff', size: 8 },
        { id: 'carol', color: '#22c55e', size: 8 },
      ],
      [
        { source: 'alice', target: 'bob' },
        { source: 'alice', target: 'carol' },
      ],
    );
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <button onClick={handleLoad}>Load</button>
      <GraphView ref={ref} cosmosConfig={{ backgroundColor: '#0a0a0a' }} />
    </div>
  );
}
```

---

## Architecture

The library consists of two parts:

**`GraphManager`** — the core. Creates a cosmos.gl `Graph`, maintains arrays of nodes/links, an ID→index map, and synchronizes everything with cosmos via Float32Array buffers. Can be used without React.

**`GraphView`** — a React component (forwardRef). Creates a `GraphManager` on mount, destroys it on unmount. Exposes shortcut methods and direct cosmos access via `ref`.

```
GraphView (ref)
  ├── .addNodes()      ─┐
  ├── .removeNodes()    │  shortcuts → GraphManager
  ├── .updateNode()     │
  ├── .recolor()       ─┘
  ├── .manager         → GraphManager instance
  └── .cosmos          → cosmos.gl Graph instance
```

Everything not covered by the library is available directly via `ref.current.cosmos.*`.

---

## API: GraphView

### Props

| Prop | Type | Description |
|------|------|-------------|
| `cosmosConfig` | `object` | cosmos.gl Graph config. Passed to the constructor as-is, merged with library defaults. Supports all cosmos.gl parameters: simulation, rendering, callbacks |
| `style` | `object` | CSS styles for the container. Default: `{ width: '100%', height: '100%' }` |

### Ref API

Access via `useRef()`:

```jsx
const ref = useRef();
// after mount:
ref.current.addNodes(...)
ref.current.cosmos.fitView()
```

**Shortcuts (delegate to GraphManager):**

| Method | Description |
|--------|-------------|
| `addNodes(nodes, links?, opts?)` | Add nodes and links |
| `addLinks(links)` | Add links between existing nodes |
| `removeNodes(ids)` | Remove nodes by ID |
| `updateNode(id, patch)` | Update color/size of a single node |
| `updateNodes(patches)` | Batch update nodes |
| `updateLinks(patches)` | Batch update links |
| `recolor(nodeMap, linkMap)` | Recolor the entire graph |
| `registerImage(key, source, size?)` | Register an image for nodes |
| `registerImages(entries, size?)` | Register multiple images |
| `clear()` | Clear the graph |

**Reading:**

| Method | Returns |
|--------|---------|
| `getNode(id)` | Node object or `null` |
| `getAllNodes()` | Copy of the nodes array |
| `getIndexById(id)` | Cosmos point index |
| `getIdByIndex(idx)` | Node ID |
| `idsToIndices(ids)` | `number[]` — cosmos indices |
| `getStats()` | `{ nodes: number, links: number }` |

**Direct access:**

| Field | Description |
|-------|-------------|
| `manager` | `GraphManager` instance |
| `cosmos` | `cosmos.gl Graph` instance |

---

## API: GraphManager

Can be used without React:

```js
import { GraphManager } from 'reactjs-interactive-graph';

const container = document.getElementById('graph');
const gm = new GraphManager(container, {
  backgroundColor: '#0a0a0a',
  onPointClick: (index) => console.log('clicked', gm.getIdByIndex(index)),
});

gm.addNodes(
  [{ id: 'a' }, { id: 'b' }],
  [{ source: 'a', target: 'b' }],
);

// Cosmos directly:
gm.cosmos.fitView(500);
```

### `constructor(container, config?)`

- `container` — HTML div element
- `config` — cosmos.gl configuration object. Merged with library defaults

**Default values:**

```js
{
  backgroundColor: '#080a0f',
  spaceSize: 4096,
  simulationGravity: 0.02,
  simulationRepulsion: 4.0,
  simulationLinkSpring: 1.5,
  simulationLinkDistance: 80,
  simulationFriction: 0.85,
  fitViewOnInit: true,
  fitViewDelay: 800,
  scalePointsOnZoom: true,
  scaleLinksOnZoom: true,
  linkArrowsSizeScale: 1,
}
```

Any value can be overridden via `config`.

### Public Fields

| Field | Type | Description |
|-------|------|-------------|
| `cosmos` | `Graph` | cosmos.gl instance. Use for camera, selection, simulation, shapes, tracking, etc. |
| `nodes` | `Array` | Array of nodes (treat as readonly) |
| `nodeIndex` | `Map` | Map of ID → cosmos point index |
| `links` | `Array` | Array of links |

---

### Adding

#### `addNodes(newNodes, newLinks?, opts?)`

Incrementally adds nodes and links to the existing graph. Duplicates (by `id` for nodes, by `source→target` for links) are skipped.

After adding new nodes, automatically triggers a soft simulation restart (alpha 0.3) so new nodes find their place without restarting the entire graph.

**Parameters:**

`newNodes` — array of objects:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string \| number` | yes | Unique identifier |
| `color` | `string` | no | Hex color, e.g. `'#ff3366'`. Default: `'#00d4ff'` |
| `size` | `number` | no | Point size. Default: `8` |
| `x`, `y` | `number` | no | Initial position. Auto-assigned if not provided |
| `image` | `string` | no | Key of a registered image (see `registerImage`) |
| `imageSize` | `number` | no | Image display size on the node. Default: `size` or `32` |

`newLinks` — array of objects:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | `string \| number` | yes | Source node ID |
| `target` | `string \| number` | yes | Target node ID |
| `color` | `string` | no | Hex color. Default: `'#2a3a4a'` |
| `width` | `number` | no | Width (0.5–20). Computed from `weight` if not set |
| `weight` | `number` | no | Edge weight. Affects width and simulation spring strength |
| `directed` | `boolean` | no | Show arrow. Default: `true` |

`opts.parentId` — ID of an existing node. New nodes will spawn around it in a circle.

```js
// Initial graph
gm.addNodes(
  [{ id: 'hub', color: '#ff3366', size: 14 }],
  [],
);

// Expand — new nodes around hub
gm.addNodes(
  [{ id: 'child1' }, { id: 'child2' }, { id: 'child3' }],
  [
    { source: 'hub', target: 'child1' },
    { source: 'hub', target: 'child2' },
    { source: 'hub', target: 'child3' },
  ],
  { parentId: 'hub' },
);
```

#### `addLinks(newLinks)`

Adds links between existing nodes. Nodes not present in the graph are ignored. Duplicates are skipped.

```js
gm.addLinks([
  { source: 'child1', target: 'child2', color: '#f7931a' },
  { source: 'child2', target: 'child3' },
]);
```

---

### Images

The library provides a declarative way to add images (icons, logos, avatars) to nodes. cosmos.gl requires manual work with `ImageData` objects and buffer synchronization on every graph change — the library handles this automatically.

#### `registerImage(key, source, size?)`

Registers an image under a unique key. Nodes reference it via the `image` field.

- `key` — string identifier (e.g. `'ethereum'`, `'user'`)
- `source` — one of:
  - `string` — image URL (CORS required for external URLs)
  - `HTMLImageElement` — an `<img>` element
  - `ImageData` — raw pixel data
- `size` — rasterization resolution (px). Default: `64`. Larger = sharper, but more memory

Returns `Promise<void>` — waits for the image to load.

```js
// From URL
await gm.registerImage('eth', '/icons/ethereum.png');
await gm.registerImage('btc', '/icons/bitcoin.png', 128);

// From HTML img element
const img = document.querySelector('#my-logo');
await gm.registerImage('logo', img);

// From ImageData directly
const raw = ctx.getImageData(0, 0, 64, 64);
await gm.registerImage('custom', raw);
```

#### `registerImages(entries, size?)`

Batch registration. Loads all images in parallel.

- `entries` — object `{ key: source, ... }`
- `size` — shared resolution. Default: `64`

```js
await gm.registerImages({
  eth:  '/icons/ethereum.png',
  btc:  '/icons/bitcoin.png',
  user: '/icons/user-default.png',
}, 64);
```

#### Usage with Nodes

After registration, simply add the `image` field to nodes:

```js
gm.addNodes([
  { id: 'tx1', image: 'eth', size: 12 },
  { id: 'tx2', image: 'btc', size: 16, imageSize: 48 },
  { id: 'tx3' },  // no image — regular point
]);
```

Images are automatically synchronized on `addNodes`, `removeNodes`, `updateNode`, `recolor`. Registered images persist across `clear()` — no need to re-register after clearing the graph.

You can re-register an image under the same key — it updates in-place on all nodes that use it.

---

### Removing

#### `removeNodes(ids)`

Removes nodes by an array of IDs. All associated links are removed automatically. Positions of remaining nodes are preserved.

```js
gm.removeNodes(['child2', 'child3']);
```

---

### Updating

#### `updateNode(id, { color?, size? })`

Updates the color and/or size of a single node.

```js
gm.updateNode('hub', { color: '#fbbf24', size: 20 });
```

#### `updateNodes(patches)`

Batch update. Single flush to cosmos for all changes.

```js
gm.updateNodes([
  { id: 'child1', color: '#22c55e' },
  { id: 'child2', size: 16 },
  { id: 'child3', color: '#a855f7', size: 12 },
]);
```

#### `updateLinks(patches)`

Batch update link colors/widths.

```js
gm.updateLinks([
  { source: 'hub', target: 'child1', color: '#00ff88', width: 3 },
]);
```

#### `recolor(nodeColorMap, linkColorMap)`

Recolor the entire graph in a single pass. Nodes/links not in the map keep their current color.

- `nodeColorMap` — `Map<id, hexColor>`
- `linkColorMap` — `Map<"source→target", hexColor>`

```js
// Highlight one node and its neighbors, dim everything else
const nodeColors = new Map();
const linkColors = new Map();

for (const node of gm.nodes) {
  nodeColors.set(node.id, '#1a2332'); // dim
}
nodeColors.set('hub', '#fbbf24'); // highlight

for (const link of gm.links) {
  const key = `${link.source}→${link.target}`;
  if (link.source === 'hub' || link.target === 'hub') {
    linkColors.set(key, '#00ccff');
  } else {
    linkColors.set(key, '#111822');
  }
}

gm.recolor(nodeColors, linkColors);
```

---

### Reading

| Method | Returns | Description |
|--------|---------|-------------|
| `getNode(id)` | `object \| null` | Node object `{id, color, size, x, y, ...}` |
| `getAllNodes()` | `Array` | Copy of the nodes array |
| `getIndexById(id)` | `number \| undefined` | Cosmos point index by ID |
| `getIdByIndex(idx)` | `string \| number \| undefined` | ID by cosmos index |
| `idsToIndices(ids)` | `number[]` | Array of cosmos indices (unknown IDs are skipped) |
| `getStats()` | `{ nodes, links }` | Node and link counts |

---

### Lifecycle

#### `clear()`

Fully clears the graph: nodes, links, buffers. Cosmos instance stays alive.

#### `destroy()`

Destroys the cosmos instance and clears all data. The manager is unusable after this call.

---

### Cosmos Directly

Everything not covered by the library is available via `gm.cosmos`:

```js
// Camera
gm.cosmos.fitView(500);
gm.cosmos.setZoomLevel(2.0, 300);
gm.cosmos.zoomToPointByIndex(gm.getIndexById('hub'), 500);

// Simulation
gm.cosmos.pause();
gm.cosmos.start(0.5);
gm.cosmos.unpause();
gm.cosmos.setConfig({ simulationRepulsion: 2.0 });

// Selection
gm.cosmos.selectPointByIndex(gm.getIndexById('hub'), true);
gm.cosmos.unselectPoints();
gm.cosmos.selectPointsByIndices(gm.idsToIndices(['child1', 'child2']));

// Shapes & Images
gm.cosmos.setPointShapes(new Float32Array([...]));
gm.cosmos.setImageData([imageData]);

// Tracking (for label overlays)
gm.cosmos.trackPointPositionsByIndices(gm.idsToIndices(['hub']));
const tracked = gm.cosmos.getTrackedPointPositionsMap();

// Pinning
gm.cosmos.setPinnedPoints(gm.idsToIndices(['hub']));

// Reading state
gm.cosmos.getPointPositions();
gm.cosmos.getPointCount();
gm.cosmos.isSimulationRunning;
gm.cosmos.progress;
```

For the full cosmos.gl API documentation, see `cosmos-gl-reference.md`.

---

## Utilities

#### `hexToRgba(hex, alpha?)`

Converts a hex color to an `[r, g, b, a]` array with values 0–1 (cosmos.gl format).

```js
import { hexToRgba } from 'reactjs-interactive-graph';

hexToRgba('#ff3366');        // [1, 0.2, 0.4, 1]
hexToRgba('#ff3366', 0.5);   // [1, 0.2, 0.4, 0.5]
hexToRgba('#f36');            // [1, 0.2, 0.4, 1] — shorthand
hexToRgba('#ff336680');       // [1, 0.2, 0.4, 0.5] — 8-digit hex
```

---

## Defaults & Conventions

**Colors** — hex strings (`'#ff3366'`). 3, 6, and 8-character formats are supported. The library converts to RGBA floats automatically.

**Node sizes** — numbers. Default: `8`. Cosmos scales on zoom if `scalePointsOnZoom: true`.

**Links** — directed by default (with arrow). Deduplicated by `"source→target"` key.

**Positioning** — new nodes without `x`/`y` appear near the center (`spaceSize / 2`) with slight jitter. With `parentId` — placed in a circle around the parent node.

**Link width** — if `width` is not set, computed from `weight`: `log10(weight + 1) * 2`, clamped 0.5–20. Without `weight` or `width` — `1`.

**Link simulation strength** — if `weight` is set, strength = `log2(weight + 1) / 6`, clamped 0–1. Without `weight` — `1.0`.

**Images** — registered once via `registerImage(key, source)`, then referenced in nodes via `image: key`. Supports URL, HTMLImageElement, ImageData. Persist across `clear()`, cleaned up on `destroy()`. External URLs require CORS (`crossOrigin: 'anonymous'` is set automatically).
