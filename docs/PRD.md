# Prompt Requirements Document: Roguelike Procedural Content Pipeline

## Document Metadata

```yaml
document_type: prompt_requirements_document
version: 1.0.0
created: 2026-01-02
project_codename: dungeon-forge
target_ai: claude-opus
human_author: jake
```

---

## Executive Summary

**Product Vision:** A standalone desktop application that enables indie game developers to visually design, test, simulate, and export procedural content generation systems for roguelike games without writing code.

**One-Line Pitch:** "Figma for dungeon generation" - a node-based visual editor that lets you design procedural content rules, preview them in real-time, run batch simulations for balance testing, and export production-ready code to multiple game engines.

**Target Users:** Solo indie developers and small teams (1-5 people) building roguelike, roguelite, or procedurally-generated games.

**Core Problem:** Procedural generation systems consume 30-50% of roguelike development time, are difficult to visualize until runtime, hard to balance without extensive playtesting, and tightly coupled to specific engines.

**Business Model:** One-time purchase ($39-59) distributed via itch.io and direct sales.

---

## Guidelines: Shared AI-Human Understanding

### Project Context

This is a **passion project** built by a senior engineer who is actively developing a roguelike game. The developer has:
- 20+ years of software engineering experience
- Strong TypeScript/React expertise
- Active Rust learning (using it for game development)
- Deep domain knowledge of roguelike mechanics and procedural generation

The project prioritizes:
1. **Developer experience** - The tool should feel delightful to use
2. **Correctness** - Generation results must be reproducible and deterministic
3. **Performance** - Batch simulations of 10,000+ runs should complete in seconds
4. **Portability** - Generated code should work across multiple engines/languages

### Technical Philosophy

```yaml
principles:
  - name: "Rust for compute, TypeScript for UI"
    rationale: "Leverage Rust's performance for generation engine and simulation, React's ecosystem for rich UI components"

  - name: "Local-first"
    rationale: "No cloud dependency, all processing happens on user's machine, projects are portable files"

  - name: "Deterministic by default"
    rationale: "Every generation must be reproducible given the same seed, enabling debugging and testing"

  - name: "Export-oriented"
    rationale: "The tool's value is in what it produces, not in locking users into a runtime"

  - name: "Progressive complexity"
    rationale: "Simple things should be simple, complex things should be possible"
```

### Domain Model

The core domain concepts that the AI must understand:

```typescript
/**
 * CORE DOMAIN ENTITIES
 * These are the fundamental building blocks of the procedural generation system
 */

// A Project contains multiple Generators
interface Project {
  id: string;
  name: string;
  version: string;
  generators: Generator[];
  sharedAssets: Asset[];
  exportConfig: ExportConfig;
}

// A Generator is a complete procedural generation pipeline
// Example: "Floor 1 Dungeon Generator", "Loot Table Generator", "Enemy Wave Generator"
interface Generator {
  id: string;
  name: string;
  description: string;
  type: GeneratorType; // 'dungeon' | 'loot' | 'encounter' | 'custom'
  graph: NodeGraph;
  constraints: Constraint[];
  parameters: Parameter[]; // Exposed for runtime configuration
  outputSchema: OutputSchema;
}

// The visual node graph that defines generation logic
interface NodeGraph {
  nodes: Node[];
  edges: Edge[];
  groups: NodeGroup[]; // For visual organization
}

// Individual node in the generation graph
interface Node {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData; // Type-specific configuration
  inputs: Port[];
  outputs: Port[];
}

// Types of nodes available in the editor
type NodeType =
  // Structural nodes
  | 'start'           // Entry point
  | 'output'          // Final output
  | 'subgraph'        // Reference to another generator

  // Room/Space nodes (for dungeon generation)
  | 'room'            // Single room definition
  | 'room_chain'      // Sequence of connected rooms
  | 'branch'          // Split into multiple paths
  | 'merge'           // Combine multiple paths

  // Content nodes
  | 'spawn_point'     // Entity spawn location
  | 'loot_drop'       // Item/reward placement
  | 'encounter'       // Enemy group definition
  | 'prop'            // Decorative object placement

  // Logic nodes
  | 'random_select'   // Weighted random choice
  | 'sequence'        // Ordered execution
  | 'condition'       // Conditional branching
  | 'loop'            // Repeat N times

  // Distribution nodes
  | 'distribution'    // Statistical distribution (uniform, normal, etc.)
  | 'curve'           // Custom probability curve
  | 'table'           // Lookup table with weights

// Connection between nodes
interface Edge {
  id: string;
  source: { nodeId: string; portId: string };
  target: { nodeId: string; portId: string };
  metadata?: EdgeMetadata;
}

// Constraints that must hold for valid generation
interface Constraint {
  id: string;
  type: ConstraintType;
  parameters: Record<string, unknown>;
  errorMessage: string;
  severity: 'error' | 'warning';
}

type ConstraintType =
  | 'distance'        // Min/max graph distance between nodes
  | 'count'           // Min/max occurrences of element
  | 'density'         // Elements per area/room
  | 'progression'     // Difficulty curve enforcement
  | 'required'        // Must include element before/after another
  | 'forbidden'       // Cannot have pattern
  | 'connected'       // All rooms must be reachable
  | 'custom'          // User-defined validation function

// Output of a generation run
interface GenerationResult {
  seed: number;
  timestamp: number;
  success: boolean;
  data: GeneratedContent;
  constraintResults: ConstraintResult[];
  metadata: GenerationMetadata;
}

// The actual generated content (varies by generator type)
type GeneratedContent =
  | DungeonLayout
  | LootTable
  | EncounterWave
  | CustomOutput;

interface DungeonLayout {
  rooms: GeneratedRoom[];
  connections: RoomConnection[];
  spawnPoints: SpawnPoint[];
  playerStart: Position;
  exits: Position[];
}

interface GeneratedRoom {
  id: string;
  type: string;
  bounds: Rectangle;
  tiles?: TileData[][]; // Optional detailed tile data
  entities: PlacedEntity[];
  metadata: Record<string, unknown>;
}
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              TAURI APP                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      FRONTEND (React + TypeScript)                 │  │
│  │                                                                    │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │  │
│  │  │   Node Editor   │  │  Preview Panel  │  │  Simulation      │  │  │
│  │  │   (ReactFlow)   │  │  (Canvas/WebGL) │  │  Dashboard       │  │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘  │  │
│  │           │                    │                     │            │  │
│  │  ┌────────┴────────────────────┴─────────────────────┴─────────┐  │  │
│  │  │                    State Management (Zustand)                │  │  │
│  │  └────────────────────────────┬────────────────────────────────┘  │  │
│  └───────────────────────────────┼────────────────────────────────────┘  │
│                                  │ IPC (Tauri Commands)                  │
│  ┌───────────────────────────────┼────────────────────────────────────┐  │
│  │                      BACKEND (Rust)                                │  │
│  │                                                                    │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │  │
│  │  │   Generation    │  │   Constraint    │  │   Export         │  │  │
│  │  │   Engine        │  │   Solver        │  │   Pipeline       │  │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬─────────┘  │  │
│  │           │                    │                     │            │  │
│  │  ┌────────┴────────────────────┴─────────────────────┴─────────┐  │  │
│  │  │              Simulation Engine (Rayon for parallelism)       │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼ File I/O
                    ┌───────────────────────────────────┐
                    │        PROJECT FILES (.dfg)        │
                    │  - JSON graph definition           │
                    │  - Binary cache for simulations    │
                    │  - Exported code artifacts         │
                    └───────────────────────────────────┘
```

### Technology Stack

```yaml
frontend:
  framework: "React 18+"
  language: "TypeScript 5.x (strict mode)"
  state_management: "Zustand"
  node_editor: "ReactFlow (@xyflow/react)"
  styling: "Tailwind CSS"
  charts: "Recharts or visx"
  icons: "Lucide React"

backend:
  framework: "Tauri 2.x"
  language: "Rust (stable, latest)"
  parallelism: "Rayon"
  serialization: "Serde (JSON + MessagePack)"
  rng: "rand + rand_chacha (for reproducibility)"

build:
  bundler: "Vite"
  package_manager: "pnpm"

testing:
  frontend: "Vitest + React Testing Library"
  backend: "Rust built-in tests + proptest"
  e2e: "Playwright (optional, later phase)"

quality:
  linting: "ESLint + Biome"
  formatting: "Prettier (frontend) + rustfmt (backend)"
  type_checking: "tsc --noEmit in CI"
```

---

## Guidance: Implementation Direction

### Project Structure

```
dungeon-forge/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri entry point
│   │   ├── lib.rs                # Library root
│   │   ├── commands/             # Tauri command handlers
│   │   │   ├── mod.rs
│   │   │   ├── project.rs        # Project CRUD operations
│   │   │   ├── generation.rs     # Single generation runs
│   │   │   ├── simulation.rs     # Batch simulation
│   │   │   └── export.rs         # Code export
│   │   ├── engine/               # Core generation engine
│   │   │   ├── mod.rs
│   │   │   ├── graph.rs          # Graph data structures
│   │   │   ├── nodes/            # Node type implementations
│   │   │   │   ├── mod.rs
│   │   │   │   ├── room.rs
│   │   │   │   ├── spawn.rs
│   │   │   │   ├── logic.rs
│   │   │   │   └── distribution.rs
│   │   │   ├── executor.rs       # Graph execution
│   │   │   └── rng.rs            # Seeded RNG wrapper
│   │   ├── constraints/          # Constraint system
│   │   │   ├── mod.rs
│   │   │   ├── types.rs
│   │   │   └── solver.rs
│   │   ├── simulation/           # Batch simulation
│   │   │   ├── mod.rs
│   │   │   ├── runner.rs
│   │   │   └── statistics.rs
│   │   ├── export/               # Code generation
│   │   │   ├── mod.rs
│   │   │   ├── json.rs
│   │   │   ├── typescript.rs
│   │   │   ├── rust.rs
│   │   │   ├── csharp.rs         # Unity
│   │   │   └── gdscript.rs       # Godot
│   │   └── models/               # Shared data types
│   │       ├── mod.rs
│   │       ├── project.rs
│   │       ├── generator.rs
│   │       └── result.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component
│   ├── components/
│   │   ├── layout/               # App shell components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── editor/               # Node editor components
│   │   │   ├── NodeEditor.tsx    # Main ReactFlow wrapper
│   │   │   ├── nodes/            # Custom node components
│   │   │   │   ├── index.ts
│   │   │   │   ├── RoomNode.tsx
│   │   │   │   ├── SpawnNode.tsx
│   │   │   │   ├── LogicNode.tsx
│   │   │   │   └── BaseNode.tsx
│   │   │   ├── edges/            # Custom edge components
│   │   │   ├── panels/           # Property panels
│   │   │   │   ├── NodeProperties.tsx
│   │   │   │   └── ConstraintPanel.tsx
│   │   │   └── controls/         # Editor controls
│   │   ├── preview/              # Preview panel components
│   │   │   ├── PreviewCanvas.tsx
│   │   │   ├── DungeonRenderer.tsx
│   │   │   └── PreviewControls.tsx
│   │   ├── simulation/           # Simulation UI
│   │   │   ├── SimulationPanel.tsx
│   │   │   ├── ResultsChart.tsx
│   │   │   └── StatisticsTable.tsx
│   │   ├── export/               # Export UI
│   │   │   └── ExportDialog.tsx
│   │   └── ui/                   # Shared UI primitives
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Dialog.tsx
│   │       └── Tooltip.tsx
│   ├── hooks/                    # Custom React hooks
│   │   ├── useProject.ts
│   │   ├── useGeneration.ts
│   │   ├── useSimulation.ts
│   │   └── useTauriCommand.ts
│   ├── stores/                   # Zustand stores
│   │   ├── projectStore.ts
│   │   ├── editorStore.ts
│   │   └── uiStore.ts
│   ├── lib/                      # Utilities
│   │   ├── tauri.ts              # Tauri IPC wrappers
│   │   ├── graph.ts              # Graph utilities
│   │   └── validation.ts
│   ├── types/                    # TypeScript types
│   │   ├── index.ts
│   │   ├── project.ts
│   │   ├── nodes.ts
│   │   └── generation.ts
│   └── styles/
│       └── globals.css           # Tailwind + custom styles
│
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── .eslintrc.cjs
├── .prettierrc
└── README.md
```

### Implementation Phases

#### Phase 1: Foundation (Weeks 1-2)

**Goal:** Working Tauri app with basic React UI shell and Rust backend communication.

**Deliverables:**
1. Tauri + React + TypeScript project scaffolded with Vite
2. Basic app layout (sidebar, main content area, toolbar)
3. Rust backend with simple "ping" command to verify IPC
4. Project data model defined in both Rust and TypeScript
5. File save/load for projects (JSON serialization)
6. Zustand store for project state

**Acceptance Criteria:**
- [ ] `pnpm tauri dev` launches app with hot reload
- [ ] Can create new project, save to disk, reload from disk
- [ ] Rust backend responds to TypeScript commands
- [ ] TypeScript types match Rust struct definitions

**Key Files to Create:**
```
src-tauri/src/main.rs
src-tauri/src/commands/project.rs
src-tauri/src/models/project.rs
src/App.tsx
src/stores/projectStore.ts
src/types/project.ts
```

#### Phase 2: Node Editor Core (Weeks 3-4)

**Goal:** Functional node editor with ReactFlow, basic node types, and graph persistence.

**Deliverables:**
1. ReactFlow integration with custom node components
2. Node palette (add nodes via drag-drop or context menu)
3. Basic node types: Start, Room, RoomChain, Branch, Output
4. Connection validation (only allow valid port connections)
5. Property panel for selected node
6. Graph serialization to project format

**Acceptance Criteria:**
- [ ] Can drag nodes from palette onto canvas
- [ ] Can connect nodes via drag from port to port
- [ ] Invalid connections are rejected with visual feedback
- [ ] Selected node shows editable properties in panel
- [ ] Graph state persists when saving project

**Key Node Properties:**
```typescript
// Room node properties
interface RoomNodeData {
  label: string;
  sizeRange: { min: Size; max: Size };
  shape: 'rectangular' | 'l-shaped' | 'circular' | 'irregular';
  doorCount: { min: number; max: number };
  tags: string[]; // e.g., ['treasure', 'boss', 'secret']
}

// RoomChain node properties
interface RoomChainNodeData {
  label: string;
  countRange: { min: number; max: number };
  roomTemplate: string; // Reference to a room config
  connectionStyle: 'linear' | 'branching';
}
```

#### Phase 3: Generation Engine (Weeks 5-6)

**Goal:** Rust-based generation engine that executes node graphs and produces dungeon layouts.

**Deliverables:**
1. Graph executor in Rust that traverses node graph
2. Node implementations for all Phase 2 node types
3. Seeded RNG system (ChaCha8) for reproducibility
4. Generation result data structure
5. IPC command to trigger generation and return result
6. Basic dungeon layout output format

**Acceptance Criteria:**
- [ ] Same seed always produces identical output
- [ ] Generation completes in <100ms for typical graphs
- [ ] Results include all rooms, connections, metadata
- [ ] Errors during generation are reported cleanly

**Core Rust Structures:**
```rust
use rand_chacha::ChaCha8Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationRequest {
    pub graph: NodeGraph,
    pub seed: u64,
    pub parameters: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationResult {
    pub seed: u64,
    pub success: bool,
    pub layout: Option<DungeonLayout>,
    pub errors: Vec<GenerationError>,
    pub duration_ms: u64,
}

pub struct GenerationContext {
    rng: ChaCha8Rng,
    parameters: HashMap<String, Value>,
    generated_rooms: Vec<GeneratedRoom>,
    current_path: Vec<NodeId>,
}

pub trait NodeExecutor: Send + Sync {
    fn execute(&self, ctx: &mut GenerationContext, data: &NodeData) -> Result<NodeOutput, GenerationError>;
}
```

#### Phase 4: Live Preview (Weeks 7-8)

**Goal:** Real-time visual preview of generated dungeons in the UI.

**Deliverables:**
1. Canvas-based dungeon renderer (2D top-down view)
2. Preview panel showing current generation result
3. Seed input with randomize button
4. Auto-regenerate on graph changes (debounced)
5. Preview controls (zoom, pan, fit-to-view)
6. Room highlighting and selection

**Acceptance Criteria:**
- [ ] Preview updates within 200ms of graph change
- [ ] Can click room in preview to see details
- [ ] Seed changes trigger new preview
- [ ] Valid generations show in blue/green, errors in red
- [ ] Can zoom/pan preview with mouse/trackpad

**Rendering Approach:**
```typescript
// Use HTML Canvas for simplicity, upgrade to WebGL if needed
interface DungeonRendererProps {
  layout: DungeonLayout | null;
  selectedRoomId: string | null;
  onRoomClick: (roomId: string) => void;
  zoom: number;
  offset: { x: number; y: number };
}

// Color scheme
const ROOM_COLORS = {
  default: '#3B82F6',    // blue
  start: '#22C55E',      // green
  boss: '#EF4444',       // red
  treasure: '#F59E0B',   // amber
  secret: '#8B5CF6',     // purple
  selected: '#FFFFFF',   // white outline
};
```

#### Phase 5: Constraints System (Weeks 9-10)

**Goal:** Define and validate constraints on generated content.

**Deliverables:**
1. Constraint definition UI in editor
2. Constraint types: distance, count, required, forbidden, connected
3. Constraint validation engine in Rust
4. Visual feedback for constraint violations in preview
5. Constraint result details in side panel
6. Re-generation attempts for soft constraint satisfaction

**Constraint Examples:**
```typescript
const exampleConstraints: Constraint[] = [
  {
    id: '1',
    type: 'distance',
    parameters: { from: 'start', to: 'boss', min: 5, max: 8 },
    errorMessage: 'Boss room must be 5-8 rooms from start',
    severity: 'error',
  },
  {
    id: '2',
    type: 'required',
    parameters: { room: 'shop', countMin: 1, before: 'boss' },
    errorMessage: 'At least one shop must appear before boss',
    severity: 'error',
  },
  {
    id: '3',
    type: 'density',
    parameters: { entity: 'enemy', perRoom: { min: 1, max: 4 } },
    errorMessage: 'Each room should have 1-4 enemies',
    severity: 'warning',
  },
  {
    id: '4',
    type: 'connected',
    parameters: {},
    errorMessage: 'All rooms must be reachable from start',
    severity: 'error',
  },
];
```

#### Phase 6: Batch Simulation (Weeks 11-12)

**Goal:** Run thousands of generations and analyze statistical properties.

**Deliverables:**
1. Simulation configuration panel (run count, seed range)
2. Parallel simulation execution in Rust (Rayon)
3. Progress reporting during long simulations
4. Statistical analysis (distributions, constraint failure rates)
5. Charts for visualizing results (histograms, box plots)
6. Export simulation results to CSV

**Simulation Output:**
```typescript
interface SimulationResults {
  config: SimulationConfig;
  runs: number;
  successRate: number;
  duration_ms: number;

  statistics: {
    roomCount: DistributionStats;
    pathLength: DistributionStats;
    enemyCount: DistributionStats;
    itemCount: DistributionStats;
  };

  constraintResults: {
    [constraintId: string]: {
      passRate: number;
      violations: number;
    };
  };

  warnings: string[];
}

interface DistributionStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  percentiles: { p5: number; p25: number; p75: number; p95: number };
  histogram: { bucket: number; count: number }[];
}
```

#### Phase 7: Export Pipeline (Weeks 13-14)

**Goal:** Generate production-ready code for multiple targets.

**Deliverables:**
1. Export configuration dialog
2. JSON schema export (universal)
3. TypeScript export with full types
4. Rust export with serde derives
5. C# export (Unity-compatible)
6. GDScript export (Godot-compatible)
7. Include both data definitions and runtime generator

**Export Structure (TypeScript example):**
```typescript
// Generated file: dungeon-generator.ts

// --- Data Types ---
export interface DungeonConfig {
  // ... generated from node graph
}

export interface GeneratedDungeon {
  seed: number;
  rooms: Room[];
  connections: Connection[];
  // ...
}

// --- Generator Runtime ---
export class DungeonGenerator {
  private rng: SeededRandom;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
  }

  generate(config?: Partial<DungeonConfig>): GeneratedDungeon {
    // ... generated logic from node graph
  }
}

// --- Usage ---
// const generator = new DungeonGenerator(12345);
// const dungeon = generator.generate();
```

#### Phase 8: Polish & Documentation (Weeks 15-16)

**Goal:** Production-ready application with documentation.

**Deliverables:**
1. Onboarding flow for new users
2. Example projects (starter dungeon, loot table)
3. Keyboard shortcuts throughout app
4. Undo/redo system
5. Auto-save and recovery
6. User documentation / help system
7. Performance optimization pass
8. Bug fixes from dogfooding

---

## Guardrails: Constraints and Boundaries

### Technical Constraints

```yaml
must_have:
  - Deterministic generation (same seed = same output, always)
  - All processing local (no network calls for core functionality)
  - Sub-second generation for typical graphs (<100 nodes)
  - Projects portable (single file, no external dependencies)
  - Cross-platform (Windows, macOS, Linux)

must_not_have:
  - Cloud sync or accounts (out of scope for MVP)
  - Runtime dependency on Dungeon Forge (exported code is standalone)
  - Node.js backend (use Rust only)
  - Electron (use Tauri)
  - Real-time collaboration features

performance_targets:
  - Single generation: <100ms for graphs with <100 nodes
  - Batch simulation: 10,000 runs in <30 seconds
  - UI responsiveness: <16ms frame time (60fps)
  - Memory usage: <500MB for typical projects
  - Binary size: <50MB (compressed)
```

### Code Quality Standards

```yaml
typescript:
  - Strict mode enabled (no any, no implicit any)
  - All functions have explicit return types
  - Props interfaces defined for all components
  - No console.log in production (use proper logging)
  - Prefer const over let, never use var
  - Use named exports (no default exports except pages)

rust:
  - No unwrap() in library code (use proper error handling)
  - All public functions documented with /// comments
  - Derive Debug, Clone, Serialize, Deserialize where applicable
  - Use thiserror for custom error types
  - Prefer &str over String in function parameters

react:
  - Functional components only (no class components)
  - Custom hooks extract reusable logic
  - Avoid prop drilling (use Zustand for shared state)
  - Memoize expensive computations (useMemo, useCallback)
  - Split large components (<300 lines per file)

testing:
  - Unit tests for all Rust engine logic
  - Integration tests for Tauri commands
  - Component tests for complex UI interactions
  - No snapshot tests (fragile)
```

### UI/UX Guidelines

```yaml
visual_design:
  - Dark theme primary (light theme optional later)
  - Color palette: Slate grays + Blue accents
  - Consistent 4px/8px spacing grid
  - Clear visual hierarchy (headers, body, captions)
  - Responsive layout (minimum 1280x720)

interaction_patterns:
  - Right-click context menus for common actions
  - Keyboard shortcuts for all frequent actions
  - Drag-and-drop where intuitive
  - Clear loading states for async operations
  - Undo/redo for all destructive actions
  - Confirmation dialogs only for truly destructive actions

accessibility:
  - Keyboard navigable
  - Focus indicators visible
  - Color not sole indicator of state
  - Tooltips for icon-only buttons

error_handling:
  - User-friendly error messages (no stack traces)
  - Suggestions for fixing common errors
  - Never lose user work on error
  - Graceful degradation when possible
```

### Security Considerations

```yaml
file_handling:
  - Validate all file inputs (project files, imports)
  - Sanitize paths to prevent directory traversal
  - Limit file sizes to prevent memory exhaustion

code_generation:
  - Generated code should not include arbitrary user input directly
  - Escape special characters in string literals
  - No eval() or equivalent in generated code

dependencies:
  - Pin exact versions in package.json and Cargo.toml
  - Regular dependency audits (npm audit, cargo audit)
  - Prefer well-maintained, widely-used libraries
```

---

## API Specifications

### Tauri IPC Commands

```typescript
// Define these in src/lib/tauri.ts and implement in src-tauri/src/commands/

// Project Commands
async function createProject(name: string): Promise<Project>;
async function openProject(path: string): Promise<Project>;
async function saveProject(project: Project): Promise<void>;
async function saveProjectAs(project: Project, path: string): Promise<string>;
async function getRecentProjects(): Promise<RecentProject[]>;

// Generation Commands
async function generateOnce(request: GenerationRequest): Promise<GenerationResult>;
async function validateGraph(graph: NodeGraph): Promise<ValidationResult>;

// Simulation Commands
async function runSimulation(config: SimulationConfig): Promise<SimulationResults>;
async function cancelSimulation(): Promise<void>;
// Uses Tauri events for progress: 'simulation-progress'

// Export Commands
async function exportProject(config: ExportConfig): Promise<ExportResult>;
async function previewExport(config: ExportConfig): Promise<string>; // Returns code preview

// System Commands
async function getAppVersion(): Promise<string>;
async function openExternalUrl(url: string): Promise<void>;
```

### Zustand Store Structure

```typescript
// src/stores/projectStore.ts
interface ProjectState {
  // Data
  project: Project | null;
  filePath: string | null;
  isDirty: boolean;

  // Actions
  newProject: () => void;
  openProject: (path: string) => Promise<void>;
  saveProject: () => Promise<void>;
  saveProjectAs: () => Promise<void>;
  closeProject: () => void;

  // Graph mutations
  addNode: (type: NodeType, position: Position) => void;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  addEdge: (source: PortRef, target: PortRef) => void;
  deleteEdge: (id: string) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// src/stores/editorStore.ts
interface EditorState {
  // Selection
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  // Viewport
  zoom: number;
  pan: { x: number; y: number };

  // UI state
  activeTool: 'select' | 'pan' | 'connect';
  propertiesPanelOpen: boolean;
  constraintsPanelOpen: boolean;

  // Actions
  selectNodes: (ids: string[]) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  fitToView: () => void;
}

// src/stores/generationStore.ts
interface GenerationState {
  // Current generation
  currentSeed: number;
  lastResult: GenerationResult | null;
  isGenerating: boolean;

  // Simulation
  simulationConfig: SimulationConfig | null;
  simulationResults: SimulationResults | null;
  simulationProgress: number;
  isSimulating: boolean;

  // Actions
  generate: (seed?: number) => Promise<void>;
  randomizeSeed: () => void;
  runSimulation: (config: SimulationConfig) => Promise<void>;
  cancelSimulation: () => void;
}
```

---

## File Formats

### Project File (.dfg)

```json
{
  "$schema": "https://dungeon-forge.dev/schema/project-v1.json",
  "version": "1.0.0",
  "name": "My Dungeon Generator",
  "created": "2026-01-02T10:00:00Z",
  "modified": "2026-01-02T12:30:00Z",
  "generators": [
    {
      "id": "gen-001",
      "name": "Floor 1",
      "type": "dungeon",
      "graph": {
        "nodes": [
          {
            "id": "node-start",
            "type": "start",
            "position": { "x": 100, "y": 200 },
            "data": {}
          },
          {
            "id": "node-room-1",
            "type": "room_chain",
            "position": { "x": 300, "y": 200 },
            "data": {
              "label": "Main Path",
              "countRange": { "min": 3, "max": 5 },
              "roomSize": { "min": { "w": 5, "h": 5 }, "max": { "w": 10, "h": 10 } }
            }
          }
        ],
        "edges": [
          {
            "id": "edge-1",
            "source": { "nodeId": "node-start", "portId": "out" },
            "target": { "nodeId": "node-room-1", "portId": "in" }
          }
        ]
      },
      "constraints": [
        {
          "id": "con-1",
          "type": "connected",
          "parameters": {},
          "severity": "error"
        }
      ],
      "parameters": [
        {
          "name": "difficulty",
          "type": "number",
          "default": 1.0,
          "min": 0.5,
          "max": 2.0
        }
      ]
    }
  ],
  "exportConfig": {
    "defaultTarget": "typescript",
    "outputDir": "./generated"
  }
}
```

---

## Example Workflows

### Workflow 1: Create Basic Dungeon Generator

1. Launch app → Click "New Project"
2. Name project "My Roguelike Dungeons"
3. Drag "Start" node onto canvas
4. Drag "Room Chain" node, connect to Start
5. Configure Room Chain: 4-6 rooms, medium size
6. Drag "Branch" node, connect to Room Chain
7. Add "Treasure Room" on one branch, "Boss Room" on other
8. Add constraint: "Boss must be at least 4 rooms from start"
9. Click "Generate" → See preview
10. Adjust seed → Observe variations
11. Run simulation (1000x) → Check constraint pass rate
12. Export to TypeScript → Copy to game project

### Workflow 2: Balance Testing

1. Open existing generator
2. Open Simulation panel
3. Configure: 10,000 runs
4. Click "Run Simulation"
5. Observe progress bar
6. Review results:
   - Path length distribution
   - Enemy count histogram
   - Constraint violation rate
7. Identify outliers (e.g., too many runs with 0 treasure)
8. Adjust node parameters
9. Re-run simulation
10. Compare before/after

---

## Success Metrics

```yaml
mvp_complete_when:
  - Can create, save, load projects
  - Can build dungeon generator with 5+ node types
  - Can define and validate 3+ constraint types
  - Can preview generated dungeons in real-time
  - Can run batch simulations (1000+ runs)
  - Can export to at least 2 targets (JSON + TypeScript)
  - No critical bugs in core workflows
  - Responsive UI (no perceivable lag in normal use)

user_success:
  - User can create first working generator in <30 minutes
  - User can export and integrate into game in <1 hour
  - User finds and fixes balance issues using simulation

technical_success:
  - Generation is deterministic (verified by tests)
  - 10,000 simulation runs complete in <30 seconds
  - Memory usage stays under 500MB
  - No data loss from crashes (auto-save)
```

---

## Appendix A: Node Type Reference

### Start Node
- **Purpose:** Entry point for generation
- **Inputs:** None
- **Outputs:** `next` (Room/RoomChain)
- **Properties:** Player spawn configuration

### Room Node
- **Purpose:** Single room definition
- **Inputs:** `in` (from previous room/chain)
- **Outputs:** `out` (to next room/chain), `doors[]` (multiple connections)
- **Properties:** Size range, shape, tags, spawn points

### Room Chain Node
- **Purpose:** Linear sequence of connected rooms
- **Inputs:** `in`
- **Outputs:** `out`
- **Properties:** Room count range, room template, connection style

### Branch Node
- **Purpose:** Split into multiple paths
- **Inputs:** `in`
- **Outputs:** `paths[]` (2-4 output ports)
- **Properties:** Branch probability weights

### Merge Node
- **Purpose:** Combine multiple paths
- **Inputs:** `paths[]` (multiple input ports)
- **Outputs:** `out`
- **Properties:** Merge style (hub room, corridor)

### Spawn Point Node
- **Purpose:** Define entity placement
- **Inputs:** `room` (attached to room)
- **Outputs:** None
- **Properties:** Entity type, count range, placement rules

### Output Node
- **Purpose:** Terminal node, marks end of path
- **Inputs:** `in`
- **Outputs:** None
- **Properties:** Exit type (stairs, portal, boss defeat)

### Random Select Node
- **Purpose:** Choose one of several options
- **Inputs:** `trigger`
- **Outputs:** `options[]` (weighted)
- **Properties:** Option weights, fallback

### Distribution Node
- **Purpose:** Sample from statistical distribution
- **Inputs:** None
- **Outputs:** `value` (number)
- **Properties:** Distribution type (uniform, normal, poisson), parameters

---

## Appendix B: Keyboard Shortcuts

```yaml
file:
  "Ctrl+N": New Project
  "Ctrl+O": Open Project
  "Ctrl+S": Save Project
  "Ctrl+Shift+S": Save As

edit:
  "Ctrl+Z": Undo
  "Ctrl+Y": Redo
  "Ctrl+X": Cut
  "Ctrl+C": Copy
  "Ctrl+V": Paste
  "Delete": Delete Selected
  "Ctrl+A": Select All
  "Escape": Clear Selection

view:
  "Ctrl+1": Fit to View
  "Ctrl++": Zoom In
  "Ctrl+-": Zoom Out
  "Space+Drag": Pan Canvas

generation:
  "Ctrl+G": Generate (current seed)
  "Ctrl+Shift+G": Generate (random seed)
  "Ctrl+R": Run Simulation
```

---

## Appendix C: Color Palette

```css
/* Dark theme base */
--bg-primary: #0f172a;      /* slate-900 */
--bg-secondary: #1e293b;    /* slate-800 */
--bg-tertiary: #334155;     /* slate-700 */

--text-primary: #f8fafc;    /* slate-50 */
--text-secondary: #94a3b8;  /* slate-400 */
--text-muted: #64748b;      /* slate-500 */

/* Accent colors */
--accent-primary: #3b82f6;  /* blue-500 */
--accent-hover: #2563eb;    /* blue-600 */
--accent-muted: #1e40af;    /* blue-800 */

/* Semantic colors */
--success: #22c55e;         /* green-500 */
--warning: #f59e0b;         /* amber-500 */
--error: #ef4444;           /* red-500 */
--info: #06b6d4;            /* cyan-500 */

/* Node colors (for visual distinction) */
--node-start: #22c55e;      /* green */
--node-room: #3b82f6;       /* blue */
--node-spawn: #f59e0b;      /* amber */
--node-logic: #8b5cf6;      /* purple */
--node-output: #ef4444;     /* red */
```

---

## Final Notes for AI Implementation

When scaffolding this project:

1. **Start with the Tauri + React template** using `pnpm create tauri-app`
2. **Set up the project structure first** before implementing features
3. **Implement Phase 1 completely** before moving to Phase 2
4. **Write tests alongside implementation**, especially for Rust engine code
5. **Use the exact dependency versions** specified to avoid compatibility issues
6. **Follow the naming conventions** in this document for consistency
7. **Commit frequently** with conventional commit messages

The PRD is your source of truth. When in doubt, refer back to this document.

---

*Document generated: 2026-01-02*
*For: Roguelike Procedural Content Pipeline ("Dungeon Forge")*
*Version: 1.0.0*
