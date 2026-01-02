// Mock Tauri backend for browser-only development
// This allows the UI to work without the Rust backend

import type {
  Project,
  GenerationResult,
  GenerationRequest,
  SimulationConfig,
  SimulationResults,
  DungeonLayout,
  GeneratedRoom,
  RoomConnection,
  SpawnPoint,
} from '../types';

// Simple seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

// Generate a procedural dungeon
function generateDungeon(seed: number): DungeonLayout {
  const rng = new SeededRandom(seed);
  const rooms: GeneratedRoom[] = [];
  const connections: RoomConnection[] = [];
  const spawnPoints: SpawnPoint[] = [];

  // Generate rooms
  const roomCount = rng.nextInt(5, 12);
  let lastX = 0;
  let lastY = 0;

  const roomTypes = ['entrance', 'hallway', 'chamber', 'treasure', 'boss'];

  for (let i = 0; i < roomCount; i++) {
    const width = rng.nextInt(6, 14);
    const height = rng.nextInt(6, 12);

    // Position relative to previous room with some offset
    const offsetX = rng.nextInt(-3, 8);
    const offsetY = rng.nextInt(-3, 8);
    const x = lastX + offsetX;
    const y = lastY + offsetY;

    const roomType = i === 0 ? 'entrance' : i === roomCount - 1 ? 'boss' : rng.pick(roomTypes.slice(1, 4));

    const room: GeneratedRoom = {
      id: `room-${i}`,
      type: roomType,
      bounds: { x, y, width, height },
      entities: [],
      metadata: {
        difficulty: i / roomCount,
        theme: rng.pick(['stone', 'moss', 'crystal', 'lava']),
      },
    };

    // Add entities to room
    if (roomType !== 'entrance') {
      const entityCount = rng.nextInt(0, 4);
      for (let e = 0; e < entityCount; e++) {
        room.entities.push({
          id: `entity-${i}-${e}`,
          type: rng.pick(['enemy', 'chest', 'trap', 'decoration']),
          position: {
            x: x + rng.nextInt(1, width - 2),
            y: y + rng.nextInt(1, height - 2),
          },
        });
      }
    }

    rooms.push(room);
    lastX = x + width;
    lastY = y + Math.floor(height / 2);
  }

  // Connect rooms sequentially
  for (let i = 0; i < rooms.length - 1; i++) {
    const from = rooms[i];
    const to = rooms[i + 1];

    connections.push({
      fromRoomId: from.id,
      toRoomId: to.id,
      fromDoor: {
        x: from.bounds.x + from.bounds.width,
        y: from.bounds.y + Math.floor(from.bounds.height / 2),
      },
      toDoor: {
        x: to.bounds.x,
        y: to.bounds.y + Math.floor(to.bounds.height / 2),
      },
    });
  }

  // Add some branching connections
  const branchCount = rng.nextInt(0, Math.floor(roomCount / 3));
  for (let i = 0; i < branchCount; i++) {
    const fromIdx = rng.nextInt(0, rooms.length - 3);
    const toIdx = rng.nextInt(fromIdx + 2, rooms.length - 1);
    const from = rooms[fromIdx];
    const to = rooms[toIdx];

    connections.push({
      fromRoomId: from.id,
      toRoomId: to.id,
      fromDoor: {
        x: from.bounds.x + Math.floor(from.bounds.width / 2),
        y: from.bounds.y + from.bounds.height,
      },
      toDoor: {
        x: to.bounds.x + Math.floor(to.bounds.width / 2),
        y: to.bounds.y,
      },
    });
  }

  // Add spawn points
  const spawnCount = rng.nextInt(3, 8);
  for (let i = 0; i < spawnCount; i++) {
    const room = rng.pick(rooms.slice(1)); // Don't spawn in entrance
    spawnPoints.push({
      id: `spawn-${i}`,
      type: rng.pick(['enemy', 'item', 'npc']),
      position: {
        x: room.bounds.x + rng.nextInt(1, room.bounds.width - 2),
        y: room.bounds.y + rng.nextInt(1, room.bounds.height - 2),
      },
      roomId: room.id,
    });
  }

  // Player start in first room
  const startRoom = rooms[0];
  const playerStart = {
    x: startRoom.bounds.x + Math.floor(startRoom.bounds.width / 2),
    y: startRoom.bounds.y + Math.floor(startRoom.bounds.height / 2),
  };

  // Exit in last room
  const exitRoom = rooms[rooms.length - 1];
  const exits = [
    {
      x: exitRoom.bounds.x + Math.floor(exitRoom.bounds.width / 2),
      y: exitRoom.bounds.y + Math.floor(exitRoom.bounds.height / 2),
    },
  ];

  return {
    rooms,
    connections,
    spawnPoints,
    playerStart,
    exits,
  };
}

// Mock Tauri invoke commands
const commands: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  async open_project({ path }: { path: string }): Promise<Project> {
    // Simulate loading from file
    console.log('Mock: open_project', path);
    throw new Error('File operations not available in browser mode');
  },

  async save_project({ project, path }: { project: Project; path: string }): Promise<void> {
    console.log('Mock: save_project', path, project);
    // In browser, we could save to localStorage
    localStorage.setItem(`dungeon-forge-project-${project.id}`, JSON.stringify(project));
  },

  async generate_once({ request }: { request: GenerationRequest }): Promise<GenerationResult> {
    const startTime = performance.now();

    // Simulate some async delay
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

    const dungeon = generateDungeon(request.seed);
    const endTime = performance.now();

    return {
      seed: request.seed,
      timestamp: Date.now(),
      success: true,
      data: dungeon,
      constraintResults: [
        { constraintId: 'min-rooms', passed: dungeon.rooms.length >= 5, message: `Room count: ${dungeon.rooms.length}` },
        { constraintId: 'connected', passed: true, message: 'All rooms connected' },
        { constraintId: 'has-exit', passed: dungeon.exits.length > 0, message: 'Exit exists' },
      ],
      metadata: {
        nodeExecutions: dungeon.rooms.length * 3,
        retryCount: 0,
      },
      errors: [],
      durationMs: Math.round(endTime - startTime),
    };
  },

  async run_simulation({ config }: { config: SimulationConfig }): Promise<SimulationResults> {
    const startTime = performance.now();
    const results: GenerationResult[] = [];

    for (let i = 0; i < config.runCount; i++) {
      const seed = (config.seedStart ?? 0) + i;
      const result = (await commands.generate_once({
        request: { generatorId: config.generatorId, seed },
      })) as GenerationResult;
      results.push(result);
    }

    const roomCounts = results.map((r) => r.data?.rooms.length ?? 0);
    const pathLengths = results.map((r) => r.data?.connections.length ?? 0);
    const enemyCounts = results.map(
      (r) => r.data?.rooms.reduce((sum, room) => sum + room.entities.filter((e) => e.type === 'enemy').length, 0) ?? 0
    );

    const calcStats = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;

      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean,
        median: sorted[Math.floor(sorted.length / 2)],
        stdDev: Math.sqrt(variance),
        percentiles: {
          p5: sorted[Math.floor(sorted.length * 0.05)],
          p25: sorted[Math.floor(sorted.length * 0.25)],
          p75: sorted[Math.floor(sorted.length * 0.75)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
        },
        histogram: [],
      };
    };

    return {
      config,
      runs: config.runCount,
      successRate: results.filter((r) => r.success).length / results.length,
      durationMs: Math.round(performance.now() - startTime),
      statistics: {
        roomCount: calcStats(roomCounts),
        pathLength: calcStats(pathLengths),
        enemyCount: calcStats(enemyCounts),
        itemCount: calcStats(roomCounts.map(() => 0)), // placeholder
      },
      constraintResults: {
        'min-rooms': { passRate: 1.0, violations: 0 },
        connected: { passRate: 1.0, violations: 0 },
      },
      warnings: [],
    };
  },

  async cancel_simulation(): Promise<void> {
    // No-op in mock
  },
};

// Check if we're in Tauri environment
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

// Mock invoke function
export async function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const handler = commands[cmd];
  if (!handler) {
    throw new Error(`Unknown command: ${cmd}`);
  }
  return handler(args ?? {}) as Promise<T>;
}
