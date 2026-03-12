# Examples

Adapted usage examples for `reactjs-interactive-graph`. Each example shows the original cosmos.gl approach and its library equivalent.

---

## Quick Start

### Vanilla JS (without React)

```js
import { GraphManager } from 'reactjs-interactive-graph';

const div = document.createElement('div');
div.style.height = '100vh';
div.style.width = '100%';
document.body.appendChild(div);

const gm = new GraphManager(div, {
  spaceSize: 4096,
  backgroundColor: '#2d313a',
  pointDefaultColor: '#F069B4',
  scalePointsOnZoom: true,
  simulationFriction: 0.1,
  simulationGravity: 0,
  simulationRepulsion: 0.5,
  curvedLinks: true,
  fitViewDelay: 1000,
  fitViewPadding: 0.3,
  rescalePositions: true,
  enableDrag: true,

  onPointClick: (index, position) => {
    const id = gm.getIdByIndex(index);
    console.log('Clicked:', id, 'at', position);
  },
  onPointContextMenu: (index, position) => {
    console.log('Context menu:', gm.getIdByIndex(index), 'at', position);
  },
  onLinkClick: (linkIndex) => {
    console.log('Clicked link:', linkIndex);
  },
  onBackgroundClick: () => {
    console.log('Clicked background');
  },
});

// Adding a triangle — 3 nodes, 3 edges
gm.addNodes(
  [
    { id: 'p0', x: 0.0, y: 0.0 },
    { id: 'p1', x: 1.0, y: 0.0 },
    { id: 'p2', x: 0.5, y: 1.0 },
  ],
  [
    { source: 'p0', target: 'p1' },
    { source: 'p1', target: 'p2' },
    { source: 'p2', target: 'p0' },
  ],
);

// Cleanup
// gm.destroy();
```

### React

```jsx
import { useRef, useEffect } from 'react';
import { GraphView } from 'reactjs-interactive-graph';

function QuickStart() {
  const ref = useRef();

  useEffect(() => {
    ref.current.addNodes(
      [
        { id: 'p0', x: 0.0, y: 0.0, color: '#F069B4' },
        { id: 'p1', x: 1.0, y: 0.0, color: '#F069B4' },
        { id: 'p2', x: 0.5, y: 1.0, color: '#F069B4' },
      ],
      [
        { source: 'p0', target: 'p1' },
        { source: 'p1', target: 'p2' },
        { source: 'p2', target: 'p0' },
      ],
    );
  }, []);

  return (
    <GraphView
      ref={ref}
      cosmosConfig={{
        spaceSize: 4096,
        backgroundColor: '#2d313a',
        pointDefaultColor: '#F069B4',
        scalePointsOnZoom: true,
        simulationFriction: 0.1,
        simulationGravity: 0,
        simulationRepulsion: 0.5,
        curvedLinks: true,
        fitViewDelay: 1000,
        fitViewPadding: 0.3,
        rescalePositions: true,
        enableDrag: true,
        onPointClick: (index) => {
          const id = ref.current.getIdByIndex(index);
          console.log('Clicked:', id);
          ref.current.cosmos.selectPointByIndex(index);
        },
        onBackgroundClick: () => {
          ref.current.cosmos.unselectPoints();
        },
      }}
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
```

> **Difference from cosmos.gl directly:** instead of `new Float32Array([0, 0, 1, 0, 0.5, 1])` for positions and `new Float32Array([0, 1, 1, 2, 2, 0])` for links — we pass objects with `id`, `x`, `y` and `source`, `target`. The library converts to buffers automatically.

---

## Basic Setup — simulation, selection, zoom

A full example with simulation pause/resume, zoom to node, rectangle selection. The original cosmos.gl example generates 10,000 points as a 100×100 grid.

### React

```jsx
import { useRef, useState, useCallback, useEffect } from 'react';
import { GraphView } from 'reactjs-interactive-graph';

// ── Generate 100×100 grid ───────────────────────────────
function generateGrid(n = 100, m = 100) {
  const nodes = [];
  const links = [];

  for (let i = 0; i < n * m; i++) {
    nodes.push({
      id: `g${i}`,
      color: '#4B5BBF',
      size: 4,
      // All points near center — simulation will spread them out
      x: 4096 * (0.495 + Math.random() * 0.01),
      y: 4096 * (0.495 + Math.random() * 0.01),
    });

    const col = i % n;
    const row = Math.floor(i / n);

    // Horizontal edge
    if (col < n - 1) {
      links.push({ source: `g${i}`, target: `g${i + 1}`, directed: false });
    }
    // Vertical edge
    if (row < m - 1) {
      links.push({ source: `g${i}`, target: `g${i + n}`, directed: false });
    }
  }

  return { nodes, links };
}

export default function BasicSetup() {
  const ref = useRef();
  const [isPaused, setIsPaused] = useState(false);

  // ── Init ────────────────────────────────────────────────
  useEffect(() => {
    const { nodes, links } = generateGrid();
    ref.current.addNodes(nodes, links);
    ref.current.cosmos.zoom(0.9);
  }, []);

  // ── Simulation control ──────────────────────────────────
  const pause = useCallback(() => {
    ref.current.cosmos.pause();
    setIsPaused(true);
  }, []);

  const unpause = useCallback(() => {
    const cosmos = ref.current.cosmos;
    if (cosmos.progress === 1) cosmos.start();
    else cosmos.unpause();
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    isPaused ? unpause() : pause();
  }, [isPaused, pause, unpause]);

  // ── Actions ─────────────────────────────────────────────
  const fitView = useCallback(() => {
    ref.current.cosmos.fitView();
  }, []);

  const zoomToRandom = useCallback(() => {
    const nodes = ref.current.getAllNodes();
    const node = nodes[Math.floor(Math.random() * nodes.length)];
    const idx = ref.current.getIndexById(node.id);
    ref.current.cosmos.zoomToPointByIndex(idx);
    ref.current.cosmos.selectPointByIndex(idx);
    pause();
  }, [pause]);

  const selectRandom = useCallback(() => {
    const nodes = ref.current.getAllNodes();
    const node = nodes[Math.floor(Math.random() * nodes.length)];
    ref.current.cosmos.selectPointByIndex(ref.current.getIndexById(node.id));
    ref.current.cosmos.fitView();
    pause();
  }, [pause]);

  const selectArea = useCallback(() => {
    const rand = (min, max) => Math.random() * (max - min) + min;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const left = rand(w / 4, w / 2);
    const right = rand(left, (w * 3) / 4);
    const top = rand(h / 4, h / 2);
    const bottom = rand(top, (h * 3) / 4);
    pause();
    ref.current.cosmos.selectPointsInRect([[left, top], [right, bottom]]);
  }, [pause]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <GraphView
        ref={ref}
        cosmosConfig={{
          spaceSize: 4096,
          backgroundColor: '#2d313a',
          pointDefaultSize: 4,
          pointDefaultColor: '#4B5BBF',
          linkDefaultWidth: 0.6,
          linkDefaultColor: '#5F74C2',
          linkDefaultArrows: false,
          linkGreyoutOpacity: 0,
          scalePointsOnZoom: true,
          curvedLinks: true,
          renderHoveredPointRing: true,
          hoveredPointRingColor: '#4B5BBF',
          enableDrag: true,
          simulationLinkDistance: 1,
          simulationLinkSpring: 2,
          simulationRepulsion: 0.2,
          simulationGravity: 0.1,
          simulationDecay: 100000,
          onPointClick: (index) => {
            ref.current.cosmos.selectPointByIndex(index);
            ref.current.cosmos.zoomToPointByIndex(index);
          },
          onBackgroundClick: () => {
            ref.current.cosmos.unselectPoints();
          },
          onSimulationEnd: () => {
            ref.current.cosmos.pause();
            setIsPaused(true);
          },
        }}
      />

      {/* Actions panel */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        color: '#ccc', fontFamily: 'sans-serif', fontSize: '10pt',
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>Actions</div>
        <Action onClick={togglePause}>{isPaused ? 'Start' : 'Pause'}</Action>
        <Action onClick={fitView}>Fit View</Action>
        <Action onClick={zoomToRandom}>Zoom to a point</Action>
        <Action onClick={selectRandom}>Select a point</Action>
        <Action onClick={selectArea}>Select points in area</Action>
      </div>
    </div>
  );
}

function Action({ onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{ marginLeft: 2, textDecoration: 'underline', cursor: 'pointer', userSelect: 'none' }}
    >
      {children}
    </div>
  );
}
```

### Vanilla JS

```js
import { GraphManager } from 'reactjs-interactive-graph';

const div = document.getElementById('graph');
const gm = new GraphManager(div, {
  spaceSize: 4096,
  backgroundColor: '#2d313a',
  pointDefaultSize: 4,
  pointDefaultColor: '#4B5BBF',
  linkDefaultWidth: 0.6,
  linkDefaultColor: '#5F74C2',
  linkDefaultArrows: false,
  linkGreyoutOpacity: 0,
  scalePointsOnZoom: true,
  curvedLinks: true,
  renderHoveredPointRing: true,
  hoveredPointRingColor: '#4B5BBF',
  enableDrag: true,
  simulationLinkDistance: 1,
  simulationLinkSpring: 2,
  simulationRepulsion: 0.2,
  simulationGravity: 0.1,
  simulationDecay: 100000,

  onPointClick: (index) => {
    gm.cosmos.selectPointByIndex(index);
    gm.cosmos.zoomToPointByIndex(index);
    console.log('Clicked:', gm.getIdByIndex(index));
  },
  onBackgroundClick: () => {
    gm.cosmos.unselectPoints();
  },
  onSimulationEnd: () => {
    gm.cosmos.pause();
  },
});

// Generate 100×100 grid
const nodes = [];
const links = [];
const N = 100, M = 100;

for (let i = 0; i < N * M; i++) {
  nodes.push({
    id: `g${i}`,
    color: '#4B5BBF',
    size: 4,
    x: 4096 * (0.495 + Math.random() * 0.01),
    y: 4096 * (0.495 + Math.random() * 0.01),
  });

  if (i % N < N - 1) {
    links.push({ source: `g${i}`, target: `g${i + 1}`, directed: false });
  }
  if (Math.floor(i / N) < M - 1) {
    links.push({ source: `g${i}`, target: `g${i + N}`, directed: false });
  }
}

gm.addNodes(nodes, links);
gm.cosmos.zoom(0.9);

// ── Controls ──────────────────────────────────────────────

function togglePause() {
  if (gm.cosmos.isSimulationRunning) {
    gm.cosmos.pause();
  } else {
    if (gm.cosmos.progress === 1) gm.cosmos.start();
    else gm.cosmos.unpause();
  }
}

function zoomToRandom() {
  const idx = Math.floor(Math.random() * gm.nodes.length);
  gm.cosmos.zoomToPointByIndex(idx);
  gm.cosmos.selectPointByIndex(idx);
  gm.cosmos.pause();
}

function selectRandom() {
  const idx = Math.floor(Math.random() * gm.nodes.length);
  gm.cosmos.selectPointByIndex(idx);
  gm.cosmos.fitView();
}
```

> **What the library simplifies:** instead of `generateData()` returning `Float32Array` for positions and links — we create an array of objects with `id` and `source`/`target`. Grid generation becomes much more readable. All actions (zoom, select, pause) go through `gm.cosmos` directly — the library doesn't wrap what cosmos already does well.

---

## Point Labels — CSS labels on tracked nodes

A bipartite graph (theaters ↔ performances) with CSS labels that follow node positions in real time. Uses `@interacta/css-labels` for rendering and cosmos.gl tracking API through the library.

Data is loaded from a GitHub Gist — a list of 18th-century London theatrical performances.

### React

```jsx
import { useRef, useEffect, useCallback } from 'react';
import { GraphView } from 'reactjs-interactive-graph';
import { LabelRenderer } from '@interacta/css-labels';

// ── Theaters to show labels for ──────────────────────────
const LABELED_THEATERS = [
  'Drury Lane Theatre',
  "King's Theatre",
  "Lincoln's Inn Fields",
  "Goodman's Fields",
  'Haymarket Theatre',
  'Covent Garden',
  'Bartholomew Fair',
  'Southwark Fair',
  'Pantheon, Oxford Street',
];

// ── Data processing ──────────────────────────────────────
function processPerformances(performances) {
  const nodes = [];
  const links = [];
  const seen = new Set();

  for (const p of performances) {
    const perfId = `P:${p.performanceTitle}`;

    if (!seen.has(perfId)) {
      seen.add(perfId);
      nodes.push({
        id: perfId,
        color: '#4B5BBF',   // blue — performance
        size: 2,
      });
    }

    if (!seen.has(p.theaterName)) {
      seen.add(p.theaterName);
      const isLabeled = LABELED_THEATERS.includes(p.theaterName);
      nodes.push({
        id: p.theaterName,
        color: '#ED69B4',   // pink — theater
        size: isLabeled ? 8 : 2,
      });
    }

    links.push({
      source: p.theaterName,
      target: perfId,
      directed: false,
    });
  }

  return { nodes, links };
}

// ── Label updater ────────────────────────────────────────
class Labels {
  constructor(container) {
    this.renderer = new LabelRenderer(container, { pointerEvents: 'none' });
    this.labels = [];
  }

  update(graphRef) {
    const cosmos = graphRef.current?.cosmos;
    if (!cosmos) return;

    const tracked = cosmos.getTrackedPointPositionsMap();
    let i = 0;

    tracked.forEach((pos, pointIndex) => {
      if (!pos) return;
      const [sx, sy] = cosmos.spaceToScreenPosition(pos);
      const radius = cosmos.spaceToScreenRadius(
        cosmos.getPointRadiusByIndex(pointIndex)
      );

      const id = graphRef.current.getIdByIndex(pointIndex);

      this.labels[i++] = {
        id: `${pointIndex}`,
        text: id ?? '',
        x: sx,
        y: sy - (radius + 2),
        opacity: 1,
      };
    });

    this.labels.length = i;
    this.renderer.setLabels(this.labels);
    this.renderer.draw(true);
  }
}

// ── Component ────────────────────────────────────────────
export default function PointLabelsExample() {
  const ref = useRef();
  const labelsRef = useRef(null);
  const labelsDivRef = useRef(null);

  const updateLabels = useCallback(() => {
    labelsRef.current?.update(ref);
  }, []);

  useEffect(() => {
    labelsRef.current = new Labels(labelsDivRef.current);

    fetch('https://gist.githubusercontent.com/Stukova/e6c4c7777e0166431a983999213f10c8/raw/performances.json')
      .then(r => r.json())
      .then(performances => {
        const { nodes, links } = processPerformances(performances);
        ref.current.addNodes(nodes, links);

        ref.current.cosmos.setZoomLevel(0.6);

        // Track labeled theaters for label positions
        const theaterIds = LABELED_THEATERS.filter(name =>
          ref.current.getIndexById(name) !== undefined
        );
        ref.current.cosmos.trackPointPositionsByIndices(
          ref.current.idsToIndices(theaterIds)
        );
      });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', color: 'white' }}>
      {/* Label overlay — on top of the graph */}
      <div ref={labelsDivRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <GraphView
        ref={ref}
        cosmosConfig={{
          spaceSize: 4096,
          backgroundColor: '#2d313a',
          scalePointsOnZoom: true,
          linkDefaultWidth: 0.6,
          linkDefaultColor: '#5F74C2',
          linkDefaultArrows: false,
          fitViewOnInit: false,
          enableDrag: true,
          simulationGravity: 0.1,
          simulationLinkDistance: 1,
          simulationLinkSpring: 0.3,
          simulationRepulsion: 0.4,
          onSimulationTick: updateLabels,
          onZoom: updateLabels,
        }}
      />
    </div>
  );
}
```

### Vanilla JS

```js
import { GraphManager } from 'reactjs-interactive-graph';
import { LabelRenderer } from '@interacta/css-labels';

// ── Setup ────────────────────────────────────────────────
const container = document.getElementById('app');

const labelsDiv = document.createElement('div');
labelsDiv.style.cssText = 'position:absolute;inset:0;pointer-events:none';
container.appendChild(labelsDiv);

const graphDiv = document.createElement('div');
graphDiv.style.cssText = 'width:100%;height:100vh';
container.appendChild(graphDiv);

const labelRenderer = new LabelRenderer(labelsDiv, { pointerEvents: 'none' });
const labels = [];

function updateLabels() {
  const tracked = gm.cosmos.getTrackedPointPositionsMap();
  let i = 0;

  tracked.forEach((pos, pointIndex) => {
    if (!pos) return;
    const [sx, sy] = gm.cosmos.spaceToScreenPosition(pos);
    const radius = gm.cosmos.spaceToScreenRadius(
      gm.cosmos.getPointRadiusByIndex(pointIndex)
    );
    labels[i++] = {
      id: `${pointIndex}`,
      text: gm.getIdByIndex(pointIndex) ?? '',
      x: sx,
      y: sy - (radius + 2),
      opacity: 1,
    };
  });

  labels.length = i;
  labelRenderer.setLabels(labels);
  labelRenderer.draw(true);
}

const gm = new GraphManager(graphDiv, {
  spaceSize: 4096,
  backgroundColor: '#2d313a',
  scalePointsOnZoom: true,
  linkDefaultWidth: 0.6,
  linkDefaultColor: '#5F74C2',
  linkDefaultArrows: false,
  fitViewOnInit: false,
  enableDrag: true,
  simulationGravity: 0.1,
  simulationLinkDistance: 1,
  simulationLinkSpring: 0.3,
  simulationRepulsion: 0.4,
  onSimulationTick: updateLabels,
  onZoom: updateLabels,
});

// ── Labeled theaters ─────────────────────────────────────
const LABELED_THEATERS = [
  'Drury Lane Theatre', "King's Theatre", "Lincoln's Inn Fields",
  "Goodman's Fields", 'Haymarket Theatre', 'Covent Garden',
  'Bartholomew Fair', 'Southwark Fair', 'Pantheon, Oxford Street',
];

// ── Load & process data ──────────────────────────────────
const res = await fetch(
  'https://gist.githubusercontent.com/Stukova/e6c4c7777e0166431a983999213f10c8/raw/performances.json'
);
const performances = await res.json();

const nodes = [];
const links = [];
const seen = new Set();

for (const p of performances) {
  const perfId = `P:${p.performanceTitle}`;

  if (!seen.has(perfId)) {
    seen.add(perfId);
    nodes.push({ id: perfId, color: '#4B5BBF', size: 2 });
  }
  if (!seen.has(p.theaterName)) {
    seen.add(p.theaterName);
    nodes.push({
      id: p.theaterName,
      color: '#ED69B4',
      size: LABELED_THEATERS.includes(p.theaterName) ? 8 : 2,
    });
  }
  links.push({ source: p.theaterName, target: perfId, directed: false });
}

gm.addNodes(nodes, links);
gm.cosmos.setZoomLevel(0.6);

// Track labeled theaters
gm.cosmos.trackPointPositionsByIndices(
  gm.idsToIndices(LABELED_THEATERS.filter(n => gm.getIndexById(n) !== undefined))
);
```

> **What the library simplifies:** the original cosmos.gl requires manual `pointLabelToIndex` / `pointIndexToLabel` mapping, building `Float32Array` for positions, colors, and sizes, and converting indices for tracking. The library lets you work with IDs directly: `gm.getIdByIndex(pointIndex)` in the label renderer instead of a separate Map, `gm.idsToIndices(LABELED_THEATERS)` for tracking, and `addNodes([{id: 'Drury Lane Theatre', color: '#ED69B4'}])` instead of manually pushing RGBA components.
