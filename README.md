# Dungeon Forge

A Tauri + React + Rust desktop application for procedural dungeon generation.

## Project Status

**Phase 1: Foundation** - In Progress

### Completed
- [x] Tauri + React + TypeScript project scaffolded with Vite
- [x] Basic app layout (sidebar, main content area, toolbar, status bar)
- [x] Rust backend with Tauri commands for project CRUD and generation
- [x] Project data model defined in both Rust and TypeScript
- [x] File save/load for projects (JSON serialization)
- [x] Zustand stores for project, editor, and generation state
- [x] ReactFlow integration for node editor
- [x] Custom node components with ports
- [x] Preview panel with canvas-based dungeon rendering
- [x] Generation engine in Rust (basic procedural dungeon generation)
- [x] Browser-compatible mock Tauri backend for development
- [x] Node context menu (right-click) with Edit, Duplicate, Delete options
- [x] Node selection updates Properties panel
- [x] Animated edge connections

### Known Issues
- React 19 + Zustand selector caching issues (use `useShallow` for array/object selectors)

## Tech Stack

- **Frontend**: React 19, TypeScript, ReactFlow, Zustand, Tailwind CSS 4
- **Backend**: Tauri 2, Rust
- **Build**: Vite, pnpm

## Development

```bash
# Install dependencies
pnpm install

# Run development server (browser-only with mock backend)
pnpm dev

# Build for production
pnpm build

# Run Tauri development (full desktop app with Rust backend)
pnpm tauri dev

# Build Tauri app
pnpm tauri build
```

### Browser Mode

When running `pnpm dev`, the app runs in browser mode with a mock Tauri backend.
This allows UI development without compiling the Rust backend. The mock backend:

- Generates procedural dungeons with rooms, connections, and spawn points
- Supports the same API as the real Tauri backend
- Uses localStorage for project persistence (limited)

To run the full Tauri app with the Rust backend, use `pnpm tauri dev`.

## Project Structure

```
dungeon-forge/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri entry point
│   │   ├── lib.rs                # Library root
│   │   ├── commands/             # Tauri command handlers
│   │   │   ├── project.rs        # Project CRUD
│   │   │   └── generation.rs     # Generation & simulation
│   │   └── models/               # Data types
│   │       ├── project.rs
│   │       ├── generator.rs
│   │       └── result.rs
│   └── Cargo.toml
│
├── src/                          # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── layout/               # App shell
│   │   ├── editor/               # Node editor
│   │   ├── preview/              # Preview panel
│   │   └── ui/                   # Shared UI primitives
│   ├── stores/                   # Zustand stores
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript types
│   └── styles/                   # CSS
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Features

### Node Types
- **Structure**: Start, Output
- **Rooms**: Room, Room Chain
- **Flow**: Branch, Merge
- **Content**: Spawn Point, Loot Drop, Encounter

### Generation
- Deterministic seeded RNG using ChaCha8
- Real-time preview with canvas rendering
- Constraint validation (connected rooms, etc.)
- Statistics tracking

## License

MIT
