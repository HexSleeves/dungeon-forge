// Core domain types for Dungeon Forge

export type NodeType =
  // Structural nodes
  | "start"
  | "output"
  | "subgraph"
  // Room/Space nodes
  | "room"
  | "room_chain"
  | "branch"
  | "merge"
  // Content nodes
  | "spawn_point"
  | "loot_drop"
  | "encounter"
  | "prop"
  // Logic nodes
  | "random_select"
  | "sequence"
  | "condition"
  | "loop"
  // Distribution nodes
  | "distribution"
  | "curve"
  | "table";

export type GeneratorType = "dungeon" | "loot" | "encounter" | "custom";

export type ConstraintType =
  | "distance"
  | "count"
  | "density"
  | "progression"
  | "required"
  | "forbidden"
  | "connected"
  | "custom";

export type ConstraintSeverity = "error" | "warning";

export interface Size {
  w: number;
  h: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Port {
  id: string;
  type: "input" | "output";
  dataType: string;
  label?: string;
}

export interface PortRef {
  nodeId: string;
  portId: string;
}

export interface EdgeMetadata {
  label?: string;
  animated?: boolean;
}

export interface Edge {
  id: string;
  source: PortRef;
  target: PortRef;
  metadata?: EdgeMetadata;
}

export interface NodeData {
  label: string;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
  inputs: Port[];
  outputs: Port[];
}

export interface NodeGroup {
  id: string;
  name: string;
  nodeIds: string[];
  color?: string;
}

export interface NodeGraph {
  nodes: GraphNode[];
  edges: Edge[];
  groups: NodeGroup[];
}

export interface Constraint {
  id: string;
  type: ConstraintType;
  parameters: Record<string, unknown>;
  errorMessage: string;
  severity: ConstraintSeverity;
}

export interface Parameter {
  name: string;
  type: "string" | "number" | "boolean" | "select";
  default: unknown;
  min?: number;
  max?: number;
  options?: string[];
  description?: string;
}

export interface OutputSchema {
  type: string;
  fields: Record<string, string>;
}

export interface Generator {
  id: string;
  name: string;
  description: string;
  type: GeneratorType;
  graph: NodeGraph;
  constraints: Constraint[];
  parameters: Parameter[];
  outputSchema?: OutputSchema;
}

export interface ExportConfig {
  defaultTarget: "json" | "typescript" | "rust" | "csharp" | "gdscript";
  outputDir: string;
  includeRuntime: boolean;
}

export interface Project {
  id: string;
  name: string;
  version: string;
  created: string;
  modified: string;
  generators: Generator[];
  sharedAssets: Asset[];
  exportConfig: ExportConfig;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  data: unknown;
}

// Generation result types
export interface PlacedEntity {
  id: string;
  type: string;
  position: Position;
  metadata?: Record<string, unknown>;
}

export interface GeneratedRoom {
  id: string;
  type: string;
  bounds: Rectangle;
  tiles?: number[][];
  entities: PlacedEntity[];
  metadata: Record<string, unknown>;
}

export interface RoomConnection {
  fromRoomId: string;
  toRoomId: string;
  fromDoor: Position;
  toDoor: Position;
}

export interface SpawnPoint {
  id: string;
  type: string;
  position: Position;
  roomId: string;
}

export interface DungeonLayout {
  rooms: GeneratedRoom[];
  connections: RoomConnection[];
  spawnPoints: SpawnPoint[];
  playerStart: Position;
  exits: Position[];
}

export interface ConstraintResult {
  constraintId: string;
  passed: boolean;
  message?: string;
}

export interface GenerationMetadata {
  nodeExecutions: number;
  retryCount: number;
}

export interface GenerationResult {
  seed: number;
  timestamp: number;
  success: boolean;
  data?: DungeonLayout;
  constraintResults: ConstraintResult[];
  metadata: GenerationMetadata;
  errors: string[];
  durationMs: number;
}

export interface GenerationRequest {
  generatorId: string;
  seed: number;
  parameters?: Record<string, unknown>;
  generator?: Generator;
}

// Simulation types
export interface SimulationConfig {
  generatorId: string;
  runCount: number;
  seedStart?: number;
  parameters?: Record<string, unknown>;
}

export interface DistributionStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  percentiles: {
    p5: number;
    p25: number;
    p75: number;
    p95: number;
  };
  histogram: { bucket: number; count: number }[];
}

export interface SimulationResults {
  config: SimulationConfig;
  runs: number;
  successRate: number;
  durationMs: number;
  statistics: {
    roomCount: DistributionStats;
    pathLength: DistributionStats;
    enemyCount: DistributionStats;
    itemCount: DistributionStats;
  };
  constraintResults: Record<string, { passRate: number; violations: number }>;
  warnings: string[];
}

// Recent project for quick access
export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
}
