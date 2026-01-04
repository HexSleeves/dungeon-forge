import { create } from "zustand";
import type { NodeType } from "../types";

// Global drag state for Tauri compatibility
// (dataTransfer doesn't always work reliably in webviews)
let draggedNodeType: NodeType | null = null;

export function setDraggedNodeType(type: NodeType | null) {
  console.log("[editorStore] setDraggedNodeType:", type);
  draggedNodeType = type;
}

export function getDraggedNodeType(): NodeType | null {
  console.log("[editorStore] getDraggedNodeType called, returning:", draggedNodeType);
  return draggedNodeType;
}

interface EditorState {
  // Selection
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  // Viewport
  zoom: number;
  pan: { x: number; y: number };

  // UI state
  activeTool: "select" | "pan" | "connect";
  propertiesPanelOpen: boolean;
  constraintsPanelOpen: boolean;
  previewPanelOpen: boolean;

  // Actions
  selectNodes: (ids: string[], append?: boolean) => void;
  selectEdges: (ids: string[], append?: boolean) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setActiveTool: (tool: EditorState["activeTool"]) => void;
  togglePropertiesPanel: () => void;
  toggleConstraintsPanel: () => void;
  togglePreviewPanel: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  selectedNodeIds: [],
  selectedEdgeIds: [],
  zoom: 1,
  pan: { x: 0, y: 0 },
  activeTool: "select",
  propertiesPanelOpen: true,
  constraintsPanelOpen: false,
  previewPanelOpen: true,

  selectNodes: (ids, append = false) => {
    set((state) => ({
      selectedNodeIds: append
        ? [...new Set([...state.selectedNodeIds, ...ids])]
        : ids,
      selectedEdgeIds: append ? state.selectedEdgeIds : [],
    }));
  },

  selectEdges: (ids, append = false) => {
    set((state) => ({
      selectedEdgeIds: append
        ? [...new Set([...state.selectedEdgeIds, ...ids])]
        : ids,
      selectedNodeIds: append ? state.selectedNodeIds : [],
    }));
  },

  clearSelection: () => {
    set({ selectedNodeIds: [], selectedEdgeIds: [] });
  },

  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(2, zoom)) });
  },

  setPan: (pan) => {
    set({ pan });
  },

  setActiveTool: (tool) => {
    set({ activeTool: tool });
  },

  togglePropertiesPanel: () => {
    set((state) => ({ propertiesPanelOpen: !state.propertiesPanelOpen }));
  },

  toggleConstraintsPanel: () => {
    set((state) => ({ constraintsPanelOpen: !state.constraintsPanelOpen }));
  },

  togglePreviewPanel: () => {
    set((state) => ({ previewPanelOpen: !state.previewPanelOpen }));
  },
}));
