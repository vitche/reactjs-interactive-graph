# reactjs-interactive-graph

A lightweight React wrapper around [cosmos.gl](https://cosmograph.app/) v2 for building interactive graph visualizations.

cosmos.gl is a high-performance WebGL graph renderer, but its API is entirely index-based — you work with `Float32Array` buffers, point indices, and manual RGBA color values. This library adds a thin layer on top that lets you think in terms of nodes with IDs, hex colors, and incremental graph building, while keeping full access to cosmos.gl underneath.

## Why

The main problem this solves: **incrementally growing a graph without restarting the simulation**. Most cosmos.gl wrappers (including Cosmograph) restart the entire layout when you add new data. This library preserves existing node positions and gently integrates new nodes with a soft simulation restart.

It's built for use cases like network explorers, blockchain transaction graphs, social graphs, and knowledge graphs — where you expand the graph step by step as the user navigates.

## What it gives you

- **ID-based API** — `{ id: 'alice', color: '#ff3366' }` instead of Float32Array indices
- **Incremental add/remove** — add nodes and links without full graph restart
- **Color and size management** — hex strings, automatic RGBA conversion
- **Image support** — register icons/logos once, reference them by key on nodes
- **Direct cosmos access** — `ref.current.cosmos.fitView()`, `ref.current.cosmos.pause()`, etc.

Everything the library doesn't cover (camera, selection, simulation tuning, shapes, clustering, pinning, tracking, drag) is available directly through the cosmos.gl instance.

## Installation

```bash
npm install git+https://github.com/vitche/reactjs-interactive-graph.git
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

  const load = () => {
    ref.current.addNodes(
      [
        { id: 'alice', color: '#ff3366', size: 12 },
        { id: 'bob',   color: '#00d4ff' },
        { id: 'carol', color: '#22c55e' },
      ],
      [
        { source: 'alice', target: 'bob' },
        { source: 'alice', target: 'carol' },
      ],
    );
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <button onClick={load}>Load</button>
      <GraphView ref={ref} cosmosConfig={{ enableDrag: true }} />
    </div>
  );
}
```

Works without React too:

```js
import { GraphManager } from 'reactjs-interactive-graph';

const gm = new GraphManager(document.getElementById('graph'));
gm.addNodes([{ id: 'a' }, { id: 'b' }], [{ source: 'a', target: 'b' }]);
gm.cosmos.fitView();
```

## Documentation

- **[Library API](docs/reactjs-interactive-graph.md)** — full reference for GraphManager and GraphView
- **[cosmos.gl Reference](docs/cosmos-gl-reference.md)** — cosmos.gl v2 API adapted for use with this library
- **[Examples](docs/examples.md)** — Quick Start, 100×100 Grid, Point Labels with CSS overlays

## Development

```bash
npm install
npm run build
```
