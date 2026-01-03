import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Project, Generator, GraphNode, Edge, NodeType, Position, Constraint } from '../types';
import { invoke } from '../lib/invoke';

// History entry for undo/redo
interface HistoryEntry {
  project: Project;
  description: string;
}

interface ProjectState {
  // Data
  project: Project | null;
  filePath: string | null;
  isDirty: boolean;

  // Current selection
  activeGeneratorId: string | null;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Computed
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  newProject: (name: string) => void;
  openProject: (path: string) => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: (path: string) => Promise<void>;
  closeProject: () => void;

  // Generator actions
  addGenerator: (name: string, type: Generator['type']) => void;
  removeGenerator: (id: string) => void;
  setActiveGenerator: (id: string | null) => void;
  updateGenerator: (id: string, updates: Partial<Generator>) => void;

  // Graph mutations
  addNode: (type: NodeType, position: Position) => void;
  updateNode: (id: string, data: Partial<GraphNode['data']>) => void;
  deleteNode: (id: string) => void;
  moveNode: (id: string, position: Position) => void;
  addEdge: (source: { nodeId: string; portId: string }, target: { nodeId: string; portId: string }) => void;
  deleteEdge: (id: string) => void;

  // Constraint actions
  addConstraint: (constraint: Omit<Constraint, 'id'>) => void;
  updateConstraint: (id: string, updates: Partial<Constraint>) => void;
  deleteConstraint: (id: string) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;

  // Internal
  _pushHistory: (description: string) => void;
  _markDirty: () => void;
}

const createDefaultProject = (name: string): Project => ({
  id: crypto.randomUUID(),
  name,
  version: '1.0.0',
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  generators: [],
  sharedAssets: [],
  exportConfig: {
    defaultTarget: 'typescript',
    outputDir: './generated',
    includeRuntime: true,
  },
});

const createDefaultGenerator = (name: string, type: Generator['type']): Generator => ({
  id: crypto.randomUUID(),
  name,
  description: '',
  type,
  graph: {
    nodes: [],
    edges: [],
    groups: [],
  },
  constraints: [],
  parameters: [],
});

const getDefaultPorts = (type: NodeType): { inputs: GraphNode['inputs']; outputs: GraphNode['outputs'] } => {
  switch (type) {
    case 'start':
      return {
        inputs: [],
        outputs: [{ id: 'out', type: 'output', dataType: 'room', label: 'Out' }],
      };
    case 'output':
      return {
        inputs: [{ id: 'in', type: 'input', dataType: 'room', label: 'In' }],
        outputs: [],
      };
    case 'room':
    case 'room_chain':
      return {
        inputs: [{ id: 'in', type: 'input', dataType: 'room', label: 'In' }],
        outputs: [{ id: 'out', type: 'output', dataType: 'room', label: 'Out' }],
      };
    case 'branch':
      return {
        inputs: [{ id: 'in', type: 'input', dataType: 'room', label: 'In' }],
        outputs: [
          { id: 'out1', type: 'output', dataType: 'room', label: 'Path 1' },
          { id: 'out2', type: 'output', dataType: 'room', label: 'Path 2' },
        ],
      };
    case 'merge':
      return {
        inputs: [
          { id: 'in1', type: 'input', dataType: 'room', label: 'Path 1' },
          { id: 'in2', type: 'input', dataType: 'room', label: 'Path 2' },
        ],
        outputs: [{ id: 'out', type: 'output', dataType: 'room', label: 'Out' }],
      };
    case 'spawn_point':
    case 'loot_drop':
    case 'encounter':
    case 'prop':
      return {
        inputs: [{ id: 'room', type: 'input', dataType: 'room', label: 'Room' }],
        outputs: [],
      };
    default:
      return {
        inputs: [{ id: 'in', type: 'input', dataType: 'any', label: 'In' }],
        outputs: [{ id: 'out', type: 'output', dataType: 'any', label: 'Out' }],
      };
  }
};

const getDefaultNodeData = (type: NodeType): GraphNode['data'] => {
  const base = { label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };

  switch (type) {
    case 'room':
      return {
        ...base,
        sizeRange: { min: { w: 5, h: 5 }, max: { w: 10, h: 10 } },
        shape: 'rectangular',
        doorCount: { min: 1, max: 4 },
        tags: [],
      };
    case 'room_chain':
      return {
        ...base,
        countRange: { min: 3, max: 5 },
        roomSize: { min: { w: 5, h: 5 }, max: { w: 8, h: 8 } },
        connectionStyle: 'linear',
      };
    case 'branch':
      return {
        ...base,
        weights: [0.5, 0.5],
      };
    case 'merge':
      return {
        ...base,
        strategy: 'all',
      };
    case 'spawn_point':
      return {
        ...base,
        entityType: 'enemy',
        countRange: { min: 1, max: 3 },
        spawnRadius: 2,
      };
    case 'loot_drop':
      return {
        ...base,
        lootTable: 'default',
        dropChance: 1.0,
        itemCount: { min: 1, max: 3 },
      };
    case 'encounter':
      return {
        ...base,
        encounterType: 'combat',
        difficulty: 'medium',
        enemyCount: { min: 1, max: 4 },
        rewardOnComplete: true,
      };
    case 'start':
      return {
        ...base,
        spawnArea: 'center',
      };
    case 'output':
      return {
        ...base,
        exitType: 'stairs',
        requiresKey: false,
      };
    default:
      return base;
  }
};

export const useProjectStore = create<ProjectState>()(
  immer((set, get) => ({
    project: null,
    filePath: null,
    isDirty: false,
    activeGeneratorId: null,
    history: [],
    historyIndex: -1,
    canUndo: false,
    canRedo: false,

    newProject: (name: string) => {
      const project = createDefaultProject(name);
      set((state) => {
        state.project = project;
        state.filePath = null;
        state.isDirty = false;
        state.activeGeneratorId = null;
        state.history = [{ project: JSON.parse(JSON.stringify(project)), description: 'Initial' }];
        state.historyIndex = 0;
        state.canUndo = false;
        state.canRedo = false;
      });
    },

    openProject: async (path: string) => {
      try {
        const project = await invoke<Project>('open_project', { path });
        set((state) => {
          state.project = project;
          state.filePath = path;
          state.isDirty = false;
          state.activeGeneratorId = project.generators[0]?.id ?? null;
          state.history = [{ project: JSON.parse(JSON.stringify(project)), description: 'Opened' }];
          state.historyIndex = 0;
          state.canUndo = false;
          state.canRedo = false;
        });
      } catch (error) {
        console.error('Failed to open project:', error);
        throw error;
      }
    },

    saveProject: async () => {
      const { project, filePath } = get();
      if (!project) return;

      if (filePath) {
        await invoke('save_project', { project, path: filePath });
        set((state) => {
          state.isDirty = false;
          if (state.project) {
            state.project.modified = new Date().toISOString();
          }
        });
      } else {
        // Need to prompt for path - this would be handled by the UI
        throw new Error('No file path set. Use saveProjectAs instead.');
      }
    },

    saveProjectAs: async (path: string) => {
      const { project } = get();
      if (!project) return;

      await invoke('save_project', { project, path });
      set((state) => {
        state.filePath = path;
        state.isDirty = false;
        if (state.project) {
          state.project.modified = new Date().toISOString();
        }
      });
    },

    closeProject: () => {
      set((state) => {
        state.project = null;
        state.filePath = null;
        state.isDirty = false;
        state.activeGeneratorId = null;
        state.history = [];
        state.historyIndex = -1;
        state.canUndo = false;
        state.canRedo = false;
      });
    },

    addGenerator: (name: string, type: Generator['type']) => {
      const generator = createDefaultGenerator(name, type);
      get()._pushHistory(`Add generator: ${name}`);
      set((state) => {
        if (state.project) {
          state.project.generators.push(generator);
          state.activeGeneratorId = generator.id;
        }
      });
      get()._markDirty();
    },

    removeGenerator: (id: string) => {
      get()._pushHistory(`Remove generator`);
      set((state) => {
        if (state.project) {
          state.project.generators = state.project.generators.filter(g => g.id !== id);
          if (state.activeGeneratorId === id) {
            state.activeGeneratorId = state.project.generators[0]?.id ?? null;
          }
        }
      });
      get()._markDirty();
    },

    setActiveGenerator: (id: string | null) => {
      set((state) => {
        state.activeGeneratorId = id;
      });
    },

    updateGenerator: (id: string, updates: Partial<Generator>) => {
      get()._pushHistory(`Update generator`);
      set((state) => {
        if (state.project) {
          const generator = state.project.generators.find(g => g.id === id);
          if (generator) {
            Object.assign(generator, updates);
          }
        }
      });
      get()._markDirty();
    },

    addNode: (type: NodeType, position: Position) => {
      const { project, activeGeneratorId } = get();
      if (!project || !activeGeneratorId) return;

      get()._pushHistory(`Add node: ${type}`);

      const ports = getDefaultPorts(type);
      const node: GraphNode = {
        id: crypto.randomUUID(),
        type,
        position,
        data: getDefaultNodeData(type),
        ...ports,
      };

      set((state) => {
        const generator = state.project?.generators.find(g => g.id === activeGeneratorId);
        if (generator) {
          generator.graph.nodes.push(node);
        }
      });
      get()._markDirty();
    },

    updateNode: (id: string, data: Partial<GraphNode['data']>) => {
      get()._pushHistory(`Update node`);
      set((state) => {
        const generator = state.project?.generators.find(g => g.id === state.activeGeneratorId);
        const node = generator?.graph.nodes.find(n => n.id === id);
        if (node) {
          Object.assign(node.data, data);
        }
      });
      get()._markDirty();
    },

    deleteNode: (id: string) => {
      get()._pushHistory(`Delete node`);
      set((state) => {
        const generator = state.project?.generators.find(g => g.id === state.activeGeneratorId);
        if (generator) {
          generator.graph.nodes = generator.graph.nodes.filter(n => n.id !== id);
          generator.graph.edges = generator.graph.edges.filter(
            e => e.source.nodeId !== id && e.target.nodeId !== id
          );
        }
      });
      get()._markDirty();
    },

    moveNode: (id: string, position: Position) => {
      set((state) => {
        const generator = state.project?.generators.find(g => g.id === state.activeGeneratorId);
        const node = generator?.graph.nodes.find(n => n.id === id);
        if (node) {
          node.position = position;
        }
      });
      get()._markDirty();
    },

    addEdge: (source, target) => {
      const { project, activeGeneratorId } = get();
      if (!project || !activeGeneratorId) return;

      get()._pushHistory(`Add connection`);

      const edge: Edge = {
        id: crypto.randomUUID(),
        source,
        target,
      };

      set((state) => {
        const generator = state.project?.generators.find(g => g.id === activeGeneratorId);
        if (generator) {
          generator.graph.edges.push(edge);
        }
      });
      get()._markDirty();
    },

    deleteEdge: (id: string) => {
      get()._pushHistory(`Delete connection`);
      set((state) => {
        const generator = state.project?.generators.find(g => g.id === state.activeGeneratorId);
        if (generator) {
          generator.graph.edges = generator.graph.edges.filter(e => e.id !== id);
        }
      });
      get()._markDirty();
    },

    addConstraint: (constraint) => {
      get()._pushHistory(`Add constraint`);
      set((state) => {
        const generator = state.project?.generators.find(g => g.id === state.activeGeneratorId);
        if (generator) {
          generator.constraints.push({
            ...constraint,
            id: crypto.randomUUID(),
          });
        }
      });
      get()._markDirty();
    },

    updateConstraint: (id, updates) => {
      get()._pushHistory(`Update constraint`);
      set((state) => {
        const generator = state.project?.generators.find(g => g.id === state.activeGeneratorId);
        const constraint = generator?.constraints.find(c => c.id === id);
        if (constraint) {
          Object.assign(constraint, updates);
        }
      });
      get()._markDirty();
    },

    deleteConstraint: (id) => {
      get()._pushHistory(`Delete constraint`);
      set((state) => {
        const generator = state.project?.generators.find(g => g.id === state.activeGeneratorId);
        if (generator) {
          generator.constraints = generator.constraints.filter(c => c.id !== id);
        }
      });
      get()._markDirty();
    },

    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        set((state) => {
          state.project = JSON.parse(JSON.stringify(history[newIndex].project));
          state.historyIndex = newIndex;
          state.canUndo = newIndex > 0;
          state.canRedo = true;
        });
        get()._markDirty();
      }
    },

    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        set((state) => {
          state.project = JSON.parse(JSON.stringify(history[newIndex].project));
          state.historyIndex = newIndex;
          state.canUndo = true;
          state.canRedo = newIndex < history.length - 1;
        });
        get()._markDirty();
      }
    },

    _pushHistory: (description: string) => {
      const { project, historyIndex, history } = get();
      if (!project) return;

      // Truncate any redo history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({
        project: JSON.parse(JSON.stringify(project)),
        description,
      });

      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
      }

      set((state) => {
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
        state.canUndo = newHistory.length > 1;
        state.canRedo = false;
      });
    },

    _markDirty: () => {
      set((state) => {
        state.isDirty = true;
      });
    },
  }))
);
