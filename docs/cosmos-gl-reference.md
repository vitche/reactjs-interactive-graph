# cosmos.gl v2 — Reference

cosmos.gl v2 API reference for use with `reactjs-interactive-graph`.

Access the cosmos instance:

```js
// Via GraphView ref
const cosmos = ref.current.cosmos;

// Via GraphManager
const cosmos = gm.cosmos;
```

> **What the library covers vs. cosmos directly:**
>
> The library handles: adding/removing nodes and links, color/size management via hex strings, ID↔index mapping.
>
> Everything else — cosmos directly: camera, zoom, selection, simulation control, shapes, images, clustering, pinning, tracking, drag, callbacks.

---

## Configuration

Passed at creation via `cosmosConfig` (GraphView) or as the second constructor argument (GraphManager). Supports all cosmos.gl parameters.

Runtime changes:

```js
cosmos.setConfig({
  simulationRepulsion: 2.0,
  renderLinks: false,
  onSimulationEnd: () => console.log('done'),
});
```

> `enableSimulation`, `randomSeed`, `spaceSize` — initialization-only, ignored in `setConfig`.

---

### Rendering

| Property | Description | Default |
|----------|-------------|---------|
| `backgroundColor` | Canvas background color | `'#222222'` |
| `spaceSize` | Simulation space size | `4096` |
| `pixelRatio` | Pixel density | `devicePixelRatio` |
| `showFPSMonitor` | FPS monitor | `false` |
| `renderLinks` | Show links | `true` |
| `rescalePositions` | Auto-rescale positions | `undefined` |
| `attribution` | HTML string in bottom-right corner | `''` |

### Points

| Property | Description | Default |
|----------|-------------|---------|
| `pointDefaultColor` | Default color | `'#b3b3b3'` |
| `pointDefaultSize` | Default size | `4` |
| `pointOpacity` | Opacity multiplier for all points | `1.0` |
| `pointSizeScale` | Size multiplier | `1` |
| `pointGreyoutOpacity` | Opacity of unselected points during selection | `undefined` |
| `pointGreyoutColor` | Color of unselected points | `undefined` |
| `scalePointsOnZoom` | Scale points on zoom | `false` |
| `renderHoveredPointRing` | Show ring on hover | `false` |
| `hoveredPointRingColor` | Hover ring color | `'white'` |
| `hoveredPointCursor` | CSS cursor on hover | `'auto'` |
| `focusedPointIndex` | Focused point index | `undefined` |
| `focusedPointRingColor` | Focus ring color | `'white'` |
| `pointSamplingDistance` | Sampled points density (px) | `150` |

### Links

| Property | Description | Default |
|----------|-------------|---------|
| `linkDefaultColor` | Default color | `'#666666'` |
| `linkDefaultWidth` | Default width | `1` |
| `linkOpacity` | Opacity multiplier | `1.0` |
| `linkGreyoutOpacity` | Link opacity during selection | `0.1` |
| `linkWidthScale` | Width multiplier | `1` |
| `linkDefaultArrows` | Default arrow visibility | `false` |
| `linkArrowsSizeScale` | Arrow size multiplier | `1` |
| `scaleLinksOnZoom` | Scale links on zoom | `false` |
| `curvedLinks` | Curved links | `false` |
| `curvedLinkSegments` | Curve segment count | `19` |
| `curvedLinkWeight` | Curve shape | `0.8` |
| `curvedLinkControlPointDistance` | Control point distance | `0.5` |
| `hoveredLinkColor` | Link color on hover | `undefined` |
| `hoveredLinkWidthIncrease` | Extra pixels on hover | `5` |
| `hoveredLinkCursor` | CSS cursor on link hover | `'auto'` |
| `linkVisibilityDistanceRange` | `[min, max]` for transparency | `[50, 150]` |
| `linkVisibilityMinTransparency` | Min transparency for long links | `0.25` |

### Simulation

| Property | Description | Default |
|----------|-------------|---------|
| `enableSimulation` | Enable simulation (init-only) | `true` |
| `simulationDecay` | Cooling coefficient | `5000` |
| `simulationGravity` | Gravity | `0.25` |
| `simulationCenter` | Centering force | `0.0` |
| `simulationRepulsion` | Repulsion | `1.0` |
| `simulationRepulsionTheta` | Many-Body detail level | `1.15` |
| `simulationLinkSpring` | Link spring force | `1.0` |
| `simulationLinkDistance` | Min link distance | `10` |
| `simulationLinkDistRandomVariationRange` | Distance variation range | `[1.0, 1.2]` |
| `simulationRepulsionFromMouse` | Repulsion from cursor (right-click) | `2.0` |
| `enableRightClickRepulsion` | Enable right-click repulsion | `false` |
| `simulationFriction` | Friction (0 = high, 1 = none) | `0.85` |
| `simulationCluster` | Cluster force | `0.1` |
| `randomSeed` | Seed for reproducibility (init-only) | `undefined` |

### Interaction

| Property | Description | Default |
|----------|-------------|---------|
| `enableZoom` | Zoom and pan | `true` |
| `enableSimulationDuringZoom` | Keep simulation running during zoom | `false` |
| `enableDrag` | Point dragging | `false` |

### View & Camera

| Property | Description | Default |
|----------|-------------|---------|
| `initialZoomLevel` | Initial zoom (init-only) | `undefined` |
| `fitViewOnInit` | Auto-fit on start | `true` |
| `fitViewDelay` | Auto-fit delay (ms) | `250` |
| `fitViewPadding` | Fit padding (0–1) | `0.1` |
| `fitViewDuration` | Fit animation (ms) | `250` |

---

## Simulation Control

```js
// Restart with energy
cosmos.start();        // full energy
cosmos.start(0.3);     // soft restart

// Pause / Resume
cosmos.pause();
cosmos.unpause();      // without reheating

// Check state
cosmos.isSimulationRunning;  // boolean (getter, not a method!)
cosmos.progress;             // 0..1 (0 = just started, 1 = fully cooled down)

// Typical toggle:
if (cosmos.isSimulationRunning) {
  cosmos.pause();
} else {
  if (cosmos.progress === 1) cosmos.start();  // cooled down → restart
  else cosmos.unpause();                       // paused → resume
}
```

### `render()`

Initializes WebGL, uploads data to GPU, and starts the render loop. The library calls `render()` automatically after `addNodes`/`removeNodes`/`updateNode`/`recolor`. If you work with cosmos directly via `setPointPositions` etc. — call `render()` yourself.

---

## Camera & Viewport

```js
// Relative zoom
cosmos.zoom(0.9);           // zoom out
cosmos.zoom(2, 400);        // zoom in 2×, 400ms animation

// Absolute zoom
cosmos.setZoomLevel(1.0);
cosmos.setZoomLevel(3.0, 300);
cosmos.getZoomLevel();       // current level

// Fit view
cosmos.fitView();
cosmos.fitView(500);         // animated

// Fit to specific points
cosmos.fitViewByPointIndices([0, 5, 12], 400);

// Using library IDs:
cosmos.fitViewByPointIndices(gm.idsToIndices(['hub', 'child1']), 500);

// Zoom to a specific point
cosmos.zoomToPointByIndex(gm.getIndexById('hub'), 500, 5);
// (index, duration=700, scale=3)

// Coordinate conversion (for DOM overlays)
const [sx, sy] = cosmos.spaceToScreenPosition([simX, simY]);
const screenR = cosmos.spaceToScreenRadius(cosmos.getPointRadiusByIndex(idx));
```

---

## Selection

cosmos.gl has built-in selection with greying-out of unselected points.

```js
const idx = gm.getIndexById('hub');

// Select a single point
cosmos.selectPointByIndex(idx);
cosmos.selectPointByIndex(idx, true);  // + neighbors

// Select multiple
cosmos.selectPointsByIndices(gm.idsToIndices(['hub', 'child1', 'child2']));

// Select in rectangle (screen px)
cosmos.selectPointsInRect([[100, 100], [400, 400]]);

// Select by polygon (lasso)
cosmos.selectPointsByPolygon([[100, 50], [300, 200], [150, 350]]);

// Clear selection
cosmos.unselectPoints();

// Get selected indices
const selected = cosmos.getSelectedPoints();  // number[]
const selectedIds = selected.map(i => gm.getIdByIndex(i));
```

---

## Point Shapes & Images

### Shapes

```js
import { PointShape } from '@cosmos.gl/graph';

// Set shape per point
cosmos.setPointShapes(new Float32Array([
  PointShape.Circle,    // 0
  PointShape.Square,    // 1
  PointShape.Triangle,  // 2
  PointShape.Diamond,   // 3
  PointShape.Pentagon,  // 4
  PointShape.Hexagon,   // 5
  PointShape.Star,      // 6
  PointShape.Cross,     // 7
]));
```

### Images

> **Recommended:** use `gm.registerImage()` from the library instead of the manual cosmos API below. The library automatically synchronizes `ImageData`, `imageIndices`, `imageSizes` on every add/remove/update. See the "Images" section in `reactjs-interactive-graph.md`.

Low-level cosmos API for images (when direct control is needed):

```js
// 1. Register an array of ImageData
const img = new ImageData(/* ... */);
cosmos.setImageData([img]);

// 2. Assign each point an image index
cosmos.setPointImageIndices(new Float32Array([0, 0, 0]));  // image 0 for all

// 3. Optional — size per point
cosmos.setPointImageSizes(new Float32Array([32, 48, 16]));
```

Important: `imageIndices` and `imageSizes` arrays must have length equal to the number of points. After every `addNodes`/`removeNodes` they need to be rebuilt — which is why `gm.registerImage()` is more convenient.

---

## Clustering

```js
// Assign a cluster to each point
cosmos.setPointClusters(new Float32Array([0, 0, 1, 1, 2]));

// Set target positions for cluster centers
cosmos.setClusterPositions(new Float32Array([
  1024, 1024,  // cluster 0
  3072, 1024,  // cluster 1
  2048, 3072,  // cluster 2
]));

// Attraction strength toward cluster (per-point)
cosmos.setPointClusterStrength(new Float32Array([0.5, 0.5, 0.8, 0.8, 0.3]));
```

Activated via `simulationCluster` in the config.

---

## Pinning

Pins points in place — physics won't move them, but they still affect other points.

```js
// Pin by indices
cosmos.setPinnedPoints(gm.idsToIndices(['hub', 'anchor']));

// Unpin all
cosmos.setPinnedPoints(null);
cosmos.setPinnedPoints([]);
```

Pinned points can still be dragged if `enableDrag: true`.

---

## Point Tracking (for labels)

For CSS/DOM label overlays you need real-time screen positions of points.

```js
// Register points for tracking
cosmos.trackPointPositionsByIndices(gm.idsToIndices(['hub', 'child1']));

// Get positions (simulation space)
const tracked = cosmos.getTrackedPointPositionsMap();
// ReadonlyMap<number, [x, y] | undefined>

tracked.forEach((pos, pointIndex) => {
  if (!pos) return;
  const [sx, sy] = cosmos.spaceToScreenPosition(pos);
  const r = cosmos.spaceToScreenRadius(cosmos.getPointRadiusByIndex(pointIndex));
  // Position DOM label at (sx, sy - r)
});

// Alternative — flat Float32Array (faster for large sets)
const arr = cosmos.getTrackedPointPositionsArray();
```

Update positions on every tick and zoom:

```js
const gm = new GraphManager(container, {
  onSimulationTick: () => updateLabels(),
  onZoom: () => updateLabels(),
});
```

---

## Querying & Reading State

```js
// All point positions [x0, y0, x1, y1, ...]
cosmos.getPointPositions();

// Colors [r, g, b, a, ...] (0–1)
cosmos.getPointColors();
cosmos.getPointSizes();
cosmos.getLinkColors();
cosmos.getLinkWidths();

// Counts
cosmos.getPointCount();
cosmos.getLinkCount();

// Point radius in simulation space
cosmos.getPointRadiusByIndex(idx);

// Sampled positions (for non-overlapping label placement)
cosmos.getSampledPointPositionsMap(100);  // Map<index, [x, y]>
cosmos.getSampledPoints();  // { indices: number[], positions: Float32Array }

// Points in rectangle (screen px)
cosmos.getPointsInRect([[0, 0], [500, 500]]);  // number[]

// Point under cursor
cosmos.getPointIndexByPosition(mouseX, mouseY);  // number | undefined
```

---

## Event Callbacks

Set in the config at creation or via `setConfig`:

```js
const gm = new GraphManager(container, {
  onPointClick: (index, position) => {
    const id = gm.getIdByIndex(index);
    console.log('Clicked:', id, 'at', position);
  },
  onBackgroundClick: () => {
    console.log('Background click');
  },
  onSimulationEnd: () => {
    console.log('Simulation cooled down');
  },
});

// Or later:
cosmos.setConfig({
  onSimulationEnd: () => { /* ... */ },
});
```

### Full List

**Simulation:**

| Callback | Description |
|----------|-------------|
| `onSimulationStart` | Simulation started |
| `onSimulationTick` | Every tick (with alpha and hover info) |
| `onSimulationEnd` | Simulation stopped |
| `onSimulationPause` | Paused |
| `onSimulationUnpause` | Resumed |

**Click:**

| Callback | Description |
|----------|-------------|
| `onClick` | Any click on canvas |
| `onPointClick` | Click on point (index, position) |
| `onLinkClick` | Click on link (linkIndex) |
| `onBackgroundClick` | Click on background |

**Context menu (right-click):**

| Callback | Description |
|----------|-------------|
| `onContextMenu` | Right-click anywhere |
| `onPointContextMenu` | Right-click on point |
| `onLinkContextMenu` | Right-click on link |
| `onBackgroundContextMenu` | Right-click on background |

**Mouse:**

| Callback | Description |
|----------|-------------|
| `onMouseMove` | Mouse movement |
| `onPointMouseOver` | Cursor enters point |
| `onPointMouseOut` | Cursor leaves point |
| `onLinkMouseOver` | Cursor enters link |
| `onLinkMouseOut` | Cursor leaves link |

**Zoom & Drag:**

| Callback | Description |
|----------|-------------|
| `onZoomStart` | Zoom/pan started |
| `onZoom` | During zoom/pan |
| `onZoomEnd` | Zoom/pan ended |
| `onDragStart` | Point drag started |
| `onDrag` | During drag |
| `onDragEnd` | Point drag ended |

---

## Low-level Data (bypassing the library)

If you need to work with cosmos directly (without the library), all data is `Float32Array`:

```js
// Positions: [x0, y0, x1, y1, ...]
cosmos.setPointPositions(new Float32Array([100, 200, 300, 400]));

// Colors: [r, g, b, a, ...] (0–1)
cosmos.setPointColors(new Float32Array([1, 0, 0, 1,  0, 1, 0, 1]));

// Sizes
cosmos.setPointSizes(new Float32Array([8, 12]));

// Links: [src, tgt, src, tgt, ...]
cosmos.setLinks(new Float32Array([0, 1]));

// Link colors
cosmos.setLinkColors(new Float32Array([0.5, 0.5, 0.5, 0.8]));

// Link widths
cosmos.setLinkWidths(new Float32Array([2]));

// Arrows: 0 or 1 per link
cosmos.setLinkArrows(new Float32Array([1]));
cosmos.setLinkArrows(true);  // all

// Link strength (0–1)
cosmos.setLinkStrength(new Float32Array([0.5]));

// Required after changes:
cosmos.render();
```

> **Warning:** if you use `cosmos.setPointPositions()` directly alongside `gm.addNodes()`, the library and cosmos state may go out of sync. It's recommended to either work through the library or entirely through cosmos.

---

## Lifecycle

```js
// Destroy (required on unmount!)
cosmos.destroy();

// GraphView does this automatically on unmount.
// GraphManager — call gm.destroy() manually.
```