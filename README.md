# React.js Interactive Chart

Interactive graph/chart component for React, built on top of **CosmoGraph**.

This repository provides a reusable React wrapper and demo application for rendering large graph datasets with rich interactivity: node selection, hover states, filtering, zooming, highlighting, custom styling, and event-driven integration with the rest of your UI.

---

## Overview

`reacts-interactive-chart` is intended for projects that need more than a static graph visualization. It extends the CosmoGraph rendering model with interactive capabilities suitable for dashboards, analytics tools, relationship explorers, knowledge graphs, security visualizations, and social/network maps.

The goal is to combine:

- **high-performance graph rendering**
- **React-friendly state management**
- **interactive exploration**
- **custom business logic hooks**

---

## Features

- Render large node-link graphs with **CosmoGraph**
- React component API for easy integration
- **Node hover** and **node click** interactions
- **Edge highlighting** for connected nodes
- **Node selection** and active state tracking
- **Search and filtering** support
- **Dynamic styling** based on data attributes
- **Zoom / pan / focus** controls
- **External control hooks** for side panels, inspectors, and toolbars
- Optional support for:
  - clusters / groups
  - contextual tooltips
  - graph legends
  - selection synchronization with external components
  - graph updates from live data streams

---

## Use Cases

This project is useful for:

- social graph exploration
- blockchain transaction relationship graphs
- security event correlation maps
- dependency and service topology diagrams
- knowledge graph UIs
- recommendation network visualization
- entity relationship analysis tools

---

## Why this project

CosmoGraph is excellent for performant graph rendering, but many real-world applications also need a layer of application interactivity around it.  
This repository focuses on that layer.

Examples of interactive behavior supported by the project:

- click a node to open a details sidebar
- hover a node to highlight its immediate neighbors
- filter the graph by category, weight, or label
- synchronize selected nodes with URL params or app state
- drive visual emphasis from external controls
- react to graph events inside your React app

---

## Planned Component API

Example idea:

```tsx
<InteractiveChart
  nodes={nodes}
  links={links}
  selectedNodeId={selectedNodeId}
  onNodeClick={handleNodeClick}
  onNodeHover={handleNodeHover}
  onSelectionChange={handleSelectionChange}
  filters={filters}
  config={{
    nodeSize: "score",
    nodeColor: "group",
    linkWidth: "weight",
  }}
/>
