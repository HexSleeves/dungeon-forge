import { create } from "zustand";
import { invoke } from "../lib/invoke";
import type {
  GenerationResult,
  SimulationConfig,
  SimulationResults,
  Generator,
} from "../types";

interface GenerationState {
  // Current generation
  currentSeed: number;
  lastResult: GenerationResult | null;
  isGenerating: boolean;
  error: string | null;

  // Simulation
  simulationConfig: SimulationConfig | null;
  simulationResults: SimulationResults | null;
  simulationProgress: number;
  isSimulating: boolean;

  // Actions
  setSeed: (seed: number) => void;
  randomizeSeed: () => void;
  generate: (generatorId: string, seed?: number, generator?: Generator) => Promise<void>;
  runSimulation: (config: SimulationConfig) => Promise<void>;
  cancelSimulation: () => void;
  clearResults: () => void;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  currentSeed: Math.floor(Math.random() * 2147483647),
  lastResult: null,
  isGenerating: false,
  error: null,
  simulationConfig: null,
  simulationResults: null,
  simulationProgress: 0,
  isSimulating: false,

  setSeed: (seed) => {
    set({ currentSeed: seed });
  },

  randomizeSeed: () => {
    set({ currentSeed: Math.floor(Math.random() * 2147483647) });
  },

  generate: async (generatorId, seed, generator) => {
    const actualSeed = seed ?? get().currentSeed;
    set({ isGenerating: true, error: null });

    try {
      const result = await invoke<GenerationResult>("generate_once", {
        request: {
          generatorId,
          seed: actualSeed,
          parameters: {},
          generator,
        },
      });

      set({
        lastResult: result,
        currentSeed: actualSeed,
        isGenerating: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        isGenerating: false,
      });
    }
  },

  runSimulation: async (config) => {
    set({
      isSimulating: true,
      simulationConfig: config,
      simulationProgress: 0,
      simulationResults: null,
      error: null,
    });

    try {
      const results = await invoke<SimulationResults>("run_simulation", {
        config,
      });
      set({
        simulationResults: results,
        isSimulating: false,
        simulationProgress: 100,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        isSimulating: false,
      });
    }
  },

  cancelSimulation: () => {
    invoke("cancel_simulation").catch(console.error);
    set({ isSimulating: false });
  },

  clearResults: () => {
    set({
      lastResult: null,
      simulationResults: null,
      error: null,
    });
  },
}));
