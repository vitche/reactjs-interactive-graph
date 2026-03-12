import { Graph } from '@cosmos.gl/graph';
import { hexToRgba } from './utils.js';

/**
 * Thin wrapper around cosmos.gl v2 Graph that provides:
 *  - Node ID ↔ cosmos point-index mapping
 *  - Incremental add/remove/update of nodes and links
 *  - Color/size management with Float32Array buffers
 *  - Direct access to cosmos via `manager.cosmos`
 */
export class GraphManager {
  /** @type {Array<{id: string|number, x?: number, y?: number, color?: string, size?: number, image?: string, imageSize?: number}>} */
  nodes = [];
  /** @type {Map<string|number, number>} id → cosmos point index */
  nodeIndex = new Map();

  /** @type {Array<{source: string|number, target: string|number, color?: string, width?: number, weight?: number, directed?: boolean}>} */
  links = [];
  /** @type {Set<string>} "source→target" dedup keys. Directed: A→B and B→A are separate. */
  _edgeKeys = new Set();

  /** @type {Graph} cosmos.gl instance — use directly for camera, selection, simulation, etc. */
  cosmos = null;

  /** @type {Map<string, {imageData: ImageData, cosmosIndex: number}>} registered images */
  _images = new Map();
  /** @type {ImageData[]} ordered array for cosmos.setImageData */
  _imageList = [];

  _spaceSize = 4096;
  _destroyed = false;

  constructor(container, config = {}) {
    this._spaceSize = config.spaceSize ?? 4096;

    this.cosmos = new Graph(container, {
      backgroundColor: '#080a0f',
      spaceSize: this._spaceSize,
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
      ...config,
    });
  }

  // ── Images ───────────────────────────────────────────

  /**
   * Register an image by key. Load from URL, HTMLImageElement, or raw ImageData.
   * Nodes can reference it via `{ image: key }`.
   * @param {string} key - unique name (e.g. 'ethereum', 'user-avatar')
   * @param {string|HTMLImageElement|ImageData} source - URL, <img>, or ImageData
   * @param {number} [size=64] - render size (width & height for rasterization)
   * @returns {Promise<boolean>} true on success, false on failure
   */
  async registerImage(key, source, size = 64) {
    if (this._destroyed) return false;
    let imageData;
    try {
      imageData = await this._toImageData(source, size);
    } catch (e) {
      console.warn(`[GraphManager] registerImage('${key}') failed:`, e.message);
      return false;
    }
    if (this._destroyed) return false;

    const existing = this._images.get(key);
    if (existing) {
      existing.imageData = imageData;
      this._imageList[existing.cosmosIndex] = imageData;
    } else {
      const cosmosIndex = this._imageList.length;
      this._imageList.push(imageData);
      this._images.set(key, { imageData, cosmosIndex });
    }
    this.cosmos.setImageData(this._imageList);
    if (this.nodes.length > 0) {
      this._flushImages();
      this.cosmos.render();
    }
    return true;
  }

  /**
   * Register multiple images at once.
   * @param {Record<string, string|HTMLImageElement|ImageData>} entries - { key: source, ... }
   * @param {number} [size=64]
   * @returns {Promise<void>}
   */
  async registerImages(entries, size = 64) {
    await Promise.all(
      Object.entries(entries).map(([key, src]) => this.registerImage(key, src, size)),
    );
  }

  // ── Add ────────────────────────────────────────────────

  /**
   * Add nodes and links incrementally. Duplicates are skipped.
   * New nodes spawn near parentId if provided, otherwise near center.
   * Triggers a soft simulation restart (alpha 0.3) if new nodes were added.
   */
  addNodes(newNodes, newLinks = [], { parentId } = {}) {
    if (this._destroyed) return;
    const oldCount = this.nodes.length;
    const parentPos = this._getParentPos(parentId);

    for (let i = 0; i < newNodes.length; i++) {
      const n = newNodes[i];
      if (this.nodeIndex.has(n.id)) continue;
      const node = { ...n };
      this._initPosition(node, parentPos, i, newNodes.length);
      this.nodes.push(node);
      this.nodeIndex.set(node.id, this.nodes.length - 1);
    }

    this._insertLinks(newLinks);
    this._flush(oldCount);

    if (this.nodes.length > oldCount) {
      this.cosmos.start(0.3);
    }
  }

  /**
   * Add links only (nodes must already exist). Duplicates are skipped.
   */
  addLinks(newLinks) {
    if (this._destroyed) return;
    const before = this.links.length;
    this._insertLinks(newLinks);
    if (this.links.length > before) {
      this._flushLinks();
      this.cosmos.render();
    }
  }

  // ── Remove ─────────────────────────────────────────────

  /**
   * Remove nodes by IDs. Associated links are removed automatically.
   */
  removeNodes(ids) {
    if (this._destroyed) return;
    const removing = new Set(ids.filter(id => this.nodeIndex.has(id)));
    if (removing.size === 0) return;

    const oldPositions = this.cosmos.getPointPositions();
    const oldCount = this.nodes.length;
    const removedIndices = new Set([...removing].map(id => this.nodeIndex.get(id)));

    // Filter links
    this._edgeKeys.clear();
    this.links = this.links.filter(l => {
      if (removing.has(l.source) || removing.has(l.target)) return false;
      this._edgeKeys.add(`${l.source}→${l.target}`);
      return true;
    });

    // Filter nodes & rebuild index
    this.nodes = this.nodes.filter(n => !removing.has(n.id));
    this._rebuildIndex();

    // Rebuild positions preserving surviving nodes
    const n = this.nodes.length;
    const positions = new Float32Array(n * 2);
    let dst = 0;
    for (let src = 0; src < oldCount; src++) {
      if (removedIndices.has(src)) continue;
      if (oldPositions && src * 2 + 1 < oldPositions.length) {
        positions[dst * 2] = oldPositions[src * 2];
        positions[dst * 2 + 1] = oldPositions[src * 2 + 1];
      }
      dst++;
    }

    this._pushAll(positions);
    this.cosmos.render();
  }

  /**
   * Remove links by source→target pairs. Nodes are not affected.
   * @param {Array<{source: string|number, target: string|number}>} linkIds
   */
  removeLinks(linkIds) {
    if (this._destroyed) return;
    const toRemove = new Set(linkIds.map(l => `${l.source}→${l.target}`));
    const before = this.links.length;

    this.links = this.links.filter(l => {
      const key = `${l.source}→${l.target}`;
      if (toRemove.has(key)) {
        this._edgeKeys.delete(key);
        return false;
      }
      return true;
    });

    if (this.links.length < before) {
      this._flushLinks();
      this.cosmos.render();
    }
  }

  // ── Update ─────────────────────────────────────────────

  /**
   * Update a single node's color and/or size.
   */
  updateNode(id, { color, size } = {}) {
    if (this._destroyed) return;
    const idx = this.nodeIndex.get(id);
    if (idx === undefined) return;
    const node = this.nodes[idx];
    if (color !== undefined) node.color = color;
    if (size !== undefined) node.size = size;
    this._flushNodeBuffers();
    this.cosmos.render();
  }

  /**
   * Batch update multiple nodes.
   * @param {Array<{id, color?, size?}>} patches
   */
  updateNodes(patches) {
    if (this._destroyed) return;
    for (const { id, color, size } of patches) {
      const idx = this.nodeIndex.get(id);
      if (idx === undefined) continue;
      const node = this.nodes[idx];
      if (color !== undefined) node.color = color;
      if (size !== undefined) node.size = size;
    }
    this._flushNodeBuffers();
    this.cosmos.render();
  }

  /**
   * Batch update link colors/widths.
   * @param {Array<{source, target, color?, width?}>} patches
   */
  updateLinks(patches) {
    if (this._destroyed) return;
    const patchMap = new Map(
      patches.map(p => [`${p.source}→${p.target}`, p]),
    );
    for (const link of this.links) {
      const patch = patchMap.get(`${link.source}→${link.target}`);
      if (!patch) continue;
      if (patch.color !== undefined) link.color = patch.color;
      if (patch.width !== undefined) link.width = patch.width;
    }
    this._flushLinks();
    this.cosmos.render();
  }

  /**
   * Recolor the entire graph at once.
   * Pass maps: id→color for nodes, "src→tgt"→color for links.
   * Nodes/links not in the map keep their current color.
   */
  recolor(nodeColorMap = new Map(), linkColorMap = new Map()) {
    if (this._destroyed) return;
    for (const node of this.nodes) {
      const c = nodeColorMap.get(node.id);
      if (c !== undefined) node.color = c;
    }
    for (const link of this.links) {
      const c = linkColorMap.get(`${link.source}→${link.target}`);
      if (c !== undefined) link.color = c;
    }
    this._flushNodeBuffers();
    this._flushLinks();
    this.cosmos.render();
  }

  // ── Read ───────────────────────────────────────────────

  getNode(id) {
    const i = this.nodeIndex.get(id);
    return i !== undefined ? this.nodes[i] : null;
  }

  getAllNodes()       { return [...this.nodes]; }
  getIndexById(id)   { return this.nodeIndex.get(id); }
  getIdByIndex(idx)  { return this.nodes[idx]?.id; }

  /** Convert array of node IDs to cosmos point indices. */
  idsToIndices(ids) {
    const result = [];
    for (const id of ids) {
      const idx = this.nodeIndex.get(id);
      if (idx !== undefined) result.push(idx);
    }
    return result;
  }

  getStats() {
    return { nodes: this.nodes.length, links: this.links.length };
  }

  // ── Clear / Destroy ────────────────────────────────────

  clear() {
    if (this._destroyed) return;
    this.nodes = [];
    this.nodeIndex.clear();
    this.links = [];
    this._edgeKeys.clear();

    const empty = new Float32Array(0);
    this.cosmos.setPointPositions(empty);
    this.cosmos.setPointColors(empty);
    this.cosmos.setPointSizes(empty);
    this.cosmos.setLinks(empty);
    this.cosmos.setLinkWidths(empty);
    this.cosmos.setLinkColors(empty);
    this.cosmos.setLinkArrows(empty);
    this.cosmos.setLinkStrength(empty);
    if (this._images.size > 0) {
      this.cosmos.setPointImageIndices(empty);
      this.cosmos.setPointImageSizes(empty);
    }
    this.cosmos.render();
  }

  destroy() {
    this._destroyed = true;
    this.nodes = [];
    this.nodeIndex.clear();
    this.links = [];
    this._edgeKeys.clear();
    this._images.clear();
    this._imageList = [];
    this.cosmos.destroy();
  }

  // ── Internal ───────────────────────────────────────────

  _getParentPos(parentId) {
    if (parentId === undefined) return null;
    const idx = this.nodeIndex.get(parentId);
    if (idx === undefined) return null;
    const pos = this.cosmos.getPointPositions();
    if (!pos || pos.length < idx * 2 + 2) return null;
    return { x: pos[idx * 2], y: pos[idx * 2 + 1] };
  }

  _initPosition(node, parentPos, i, total) {
    if (node.x !== undefined && node.y !== undefined) return;

    const center = this._spaceSize / 2;
    if (parentPos) {
      const angle = (2 * Math.PI * i) / Math.max(total, 1);
      const r = this._spaceSize * 0.02 + Math.random() * this._spaceSize * 0.015;
      node.x = parentPos.x + Math.cos(angle) * r;
      node.y = parentPos.y + Math.sin(angle) * r;
    } else {
      const jitter = this._spaceSize * 0.05;
      node.x = center + (Math.random() - 0.5) * jitter;
      node.y = center + (Math.random() - 0.5) * jitter;
    }
  }

  _insertLinks(newLinks) {
    for (const l of newLinks) {
      if (!this.nodeIndex.has(l.source) || !this.nodeIndex.has(l.target)) continue;
      const key = `${l.source}→${l.target}`;
      if (this._edgeKeys.has(key)) continue;
      this._edgeKeys.add(key);
      this.links.push({ ...l });
    }
  }

  /** Rebuild positions (keep old, append new), then push everything. */
  _flush(oldCount) {
    const n = this.nodes.length;
    const center = this._spaceSize / 2;

    const positions = new Float32Array(n * 2);
    if (oldCount > 0) {
      const cur = this.cosmos.getPointPositions();
      if (cur) {
        const len = Math.min(oldCount * 2, cur.length);
        positions.set(cur.subarray ? cur.subarray(0, len) : cur.slice(0, len));
      }
    }
    for (let i = oldCount; i < n; i++) {
      positions[i * 2] = this.nodes[i].x ?? center;
      positions[i * 2 + 1] = this.nodes[i].y ?? center;
    }

    this._pushAll(positions);
    this.cosmos.render();
  }

  _pushAll(positions) {
    this.cosmos.setPointPositions(positions);
    this._flushNodeBuffers();
    this._flushLinks();
  }

  _flushNodeBuffers() {
    const n = this.nodes.length;
    const colors = new Float32Array(n * 4);
    const sizes = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      const [r, g, b, a] = hexToRgba(node.color ?? '#00d4ff');
      colors[i * 4] = r;
      colors[i * 4 + 1] = g;
      colors[i * 4 + 2] = b;
      colors[i * 4 + 3] = a;
      sizes[i] = node.size ?? 8;
    }

    this.cosmos.setPointColors(colors);
    this.cosmos.setPointSizes(sizes);
    this._flushImages();
  }

  _flushLinks() {
    const len = this.links.length;
    const indices   = new Float32Array(len * 2);
    const widths    = new Float32Array(len);
    const colors    = new Float32Array(len * 4);
    const arrows    = new Float32Array(len);
    const strengths = new Float32Array(len);

    let wi = 0;
    for (let i = 0; i < len; i++) {
      const l = this.links[i];
      const srcIdx = this.nodeIndex.get(l.source);
      const tgtIdx = this.nodeIndex.get(l.target);
      if (srcIdx === undefined || tgtIdx === undefined) continue;

      indices[wi * 2]     = srcIdx;
      indices[wi * 2 + 1] = tgtIdx;
      widths[wi] = this._linkWidth(l);

      const [r, g, b, a] = hexToRgba(l.color ?? '#2a3a4a');
      colors[wi * 4]     = r;
      colors[wi * 4 + 1] = g;
      colors[wi * 4 + 2] = b;
      colors[wi * 4 + 3] = a;

      arrows[wi] = l.directed !== false ? 1 : 0;
      strengths[wi] = l.weight !== undefined
        ? Math.min(Math.log2((l.weight || 1) + 1) / 6, 1)
        : 1.0;

      wi++;
    }

    this.cosmos.setLinks(indices.subarray(0, wi * 2));
    this.cosmos.setLinkWidths(widths.subarray(0, wi));
    this.cosmos.setLinkColors(colors.subarray(0, wi * 4));
    this.cosmos.setLinkArrows(arrows.subarray(0, wi));
    this.cosmos.setLinkStrength(strengths.subarray(0, wi));
  }

  _linkWidth(link) {
    if (link.width !== undefined) return Math.min(Math.max(link.width, 0.5), 20);
    if (link.weight !== undefined) return Math.min(Math.max(Math.log10(link.weight + 1) * 2, 0.5), 20);
    return 1;
  }

  _flushImages() {
    if (this._images.size === 0) return;

    const n = this.nodes.length;
    let hasAny = false;
    const indices = new Float32Array(n);
    const sizes = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const img = this._images.get(this.nodes[i].image);
      if (img) {
        indices[i] = img.cosmosIndex;
        sizes[i] = this.nodes[i].imageSize ?? this.nodes[i].size ?? 32;
        hasAny = true;
      } else {
        indices[i] = 65535;
        sizes[i] = 0;
      }
    }

    if (hasAny) {
      this.cosmos.setPointImageIndices(indices);
      this.cosmos.setPointImageSizes(sizes);
    }
  }

  /** @returns {Promise<ImageData>} */
  async _toImageData(source, size) {
    if (source instanceof ImageData) return source;

    if (source instanceof HTMLImageElement) {
      await this._awaitImgLoad(source);
      return this._imgToImageData(source, size);
    }

    if (typeof source === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = source;
      await this._awaitImgLoad(img);
      return this._imgToImageData(img, size);
    }

    throw new Error(`registerImage: unsupported source type: ${typeof source}`);
  }

  _awaitImgLoad(img) {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
    });
  }

  _imgToImageData(img, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size);
  }

  _rebuildIndex() {
    this.nodeIndex.clear();
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodeIndex.set(this.nodes[i].id, i);
    }
  }
}