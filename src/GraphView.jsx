import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { GraphManager } from './GraphManager.js';

/**
 * React wrapper for GraphManager.
 *
 * Access via ref:
 *   ref.current.addNodes(...)
 *   ref.current.cosmos.fitView()
 *   ref.current.cosmos.setConfig({...})
 */
const GraphView = forwardRef(function GraphView({ cosmosConfig, style }, ref) {
  const containerRef = useRef(null);
  const managerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    managerRef.current = new GraphManager(containerRef.current, cosmosConfig);
    return () => {
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    get manager()  { return managerRef.current; },
    get cosmos()   { return managerRef.current?.cosmos; },

    // Core operations (shortcuts)
    addNodes:       (...a) => managerRef.current?.addNodes(...a),
    addLinks:       (...a) => managerRef.current?.addLinks(...a),
    removeNodes:    (...a) => managerRef.current?.removeNodes(...a),
    updateNode:     (...a) => managerRef.current?.updateNode(...a),
    updateNodes:    (...a) => managerRef.current?.updateNodes(...a),
    updateLinks:    (...a) => managerRef.current?.updateLinks(...a),
    recolor:        (...a) => managerRef.current?.recolor(...a),
    registerImage:  (...a) => managerRef.current?.registerImage(...a),
    registerImages: (...a) => managerRef.current?.registerImages(...a),
    clear:          ()     => managerRef.current?.clear(),

    // Read
    getNode:      (id)  => managerRef.current?.getNode(id),
    getAllNodes:   ()    => managerRef.current?.getAllNodes() ?? [],
    getIndexById:  (id) => managerRef.current?.getIndexById(id),
    getIdByIndex: (idx) => managerRef.current?.getIdByIndex(idx),
    idsToIndices: (ids) => managerRef.current?.idsToIndices(ids) ?? [],
    getStats:     ()    => managerRef.current?.getStats() ?? { nodes: 0, links: 0 },
  }), []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', ...style }} />;
});

export default GraphView;