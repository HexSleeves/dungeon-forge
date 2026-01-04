import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type OnConnect,
  BackgroundVariant,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { NodeContextMenu } from "./NodeContextMenu";
import { useProjectStore } from "../../stores/projectStore";
import {
  useEditorStore,
  getDraggedNodeType,
  setDraggedNodeType,
} from "../../stores/editorStore";
import type { NodeType, GraphNode } from "../../types";

// Convert our GraphNode to ReactFlow Node
function toReactFlowNode(node: GraphNode): Node {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      nodeType: node.type,
      inputs: node.inputs,
      outputs: node.outputs,
    },
  };
}

// Convert our Edge to ReactFlow Edge
function toReactFlowEdge(edge: import("../../types").Edge): Edge {
  return {
    id: edge.id,
    source: edge.source.nodeId,
    sourceHandle: edge.source.portId,
    target: edge.target.nodeId,
    targetHandle: edge.target.portId,
    animated: edge.metadata?.animated,
    label: edge.metadata?.label,
  };
}

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

export function NodeEditor(): React.ReactElement {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const activeGeneratorId = useProjectStore((state) => state.activeGeneratorId);
  const project = useProjectStore((state) => state.project);
  const addNode = useProjectStore((state) => state.addNode);
  const moveNode = useProjectStore((state) => state.moveNode);
  const deleteNode = useProjectStore((state) => state.deleteNode);
  const addProjectEdge = useProjectStore((state) => state.addEdge);
  const deleteEdge = useProjectStore((state) => state.deleteEdge);

  const activeGenerator = project?.generators.find(
    (g) => g.id === activeGeneratorId,
  );

  const selectNodes = useEditorStore((state) => state.selectNodes);
  const selectEdges = useEditorStore((state) => state.selectEdges);

  // Convert project graph to ReactFlow format
  const initialNodes = useMemo(
    () => activeGenerator?.graph.nodes.map(toReactFlowNode) ?? [],
    [activeGenerator?.graph.nodes],
  );

  const initialEdges = useMemo(
    () => activeGenerator?.graph.edges.map(toReactFlowEdge) ?? [],
    [activeGenerator?.graph.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync ReactFlow state with project state when it changes
  React.useEffect(() => {
    setNodes(activeGenerator?.graph.nodes.map(toReactFlowNode) ?? []);
  }, [activeGenerator?.graph.nodes, setNodes]);

  React.useEffect(() => {
    setEdges(activeGenerator?.graph.edges.map(toReactFlowEdge) ?? []);
  }, [activeGenerator?.graph.edges, setEdges]);

  // Handle node changes (position, selection)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      changes.forEach((change) => {
        if (
          change.type === "position" &&
          change.position &&
          change.dragging === false
        ) {
          moveNode(change.id, change.position);
        }
        if (change.type === "remove") {
          deleteNode(change.id);
        }
      });
    },
    [onNodesChange, moveNode, deleteNode],
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);

      changes.forEach((change) => {
        if (change.type === "remove") {
          deleteEdge(change.id);
        }
      });
    },
    [onEdgesChange, deleteEdge],
  );

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addProjectEdge(
          {
            nodeId: connection.source,
            portId: connection.sourceHandle ?? "out",
          },
          {
            nodeId: connection.target,
            portId: connection.targetHandle ?? "in",
          },
        );
      }
    },
    [addProjectEdge],
  );

  // Handle drag and drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Try to get type from dataTransfer first, fall back to global state
      let type = event.dataTransfer.getData(
        "application/dungeon-forge-node",
      ) as NodeType;

      // Fallback for Tauri webview where dataTransfer may not work
      if (!type) {
        type = getDraggedNodeType() as NodeType;
      }

      if (!type || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };

      addNode(type, position);

      // Clear the global drag state
      setDraggedNodeType(null);
    },
    [addNode],
  );

  // Handle selection
  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      selectNodes(nodes.map((n) => n.id));
      selectEdges(edges.map((e) => e.id));
    },
    [selectNodes, selectEdges],
  );

  // Handle node click for single selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNodes([node.id]);
      setContextMenu(null); // Close context menu on click
    },
    [selectNodes],
  );

  // Handle node context menu (right-click)
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      selectNodes([node.id]);
      setContextMenu({
        nodeId: node.id,
        x: event.clientX,
        y: event.clientY,
      });
    },
    [selectNodes],
  );

  // Handle pane click to close context menu
  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  if (!activeGenerator) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center text-text-muted">
          <p className="text-lg mb-2">No generator selected</p>
          <p className="text-sm">
            Create or select a generator to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSelectionChange={onSelectionChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { strokeWidth: 2, stroke: "#3b82f6" },
          animated: true,
        }}
        connectionLineStyle={{ strokeWidth: 2, stroke: "#60a5fa" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="#334155"
        />
        <Controls
          className="!bg-bg-secondary !border-slate-700 !rounded-lg"
          showZoom={false}
          showFitView={true}
          showInteractive={false}
        />
        <MiniMap
          className="!bg-bg-secondary !border-slate-700 !rounded-lg"
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              start: "#22c55e",
              output: "#ef4444",
              room: "#3b82f6",
              room_chain: "#3b82f6",
              branch: "#8b5cf6",
              merge: "#8b5cf6",
              spawn_point: "#f59e0b",
              loot_drop: "#f59e0b",
            };
            return colors[node.type ?? ""] ?? "#64748b";
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
        />
      </ReactFlow>

      {/* Context Menu */}
      {contextMenu && (
        <NodeContextMenu
          nodeId={contextMenu.nodeId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
