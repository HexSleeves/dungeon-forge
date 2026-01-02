import React from 'react';
import { Circle, AlertCircle, CheckCircle } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useGenerationStore } from '../../stores/generationStore';

export function StatusBar(): React.ReactElement {
  const project = useProjectStore((state) => state.project);
  const isDirty = useProjectStore((state) => state.isDirty);
  const activeGeneratorId = useProjectStore((state) => state.activeGeneratorId);

  const lastResult = useGenerationStore((state) => state.lastResult);
  const isGenerating = useGenerationStore((state) => state.isGenerating);

  const activeGenerator = project?.generators.find((g) => g.id === activeGeneratorId);
  const nodeCount = activeGenerator?.graph.nodes.length ?? 0;
  const edgeCount = activeGenerator?.graph.edges.length ?? 0;

  return (
    <footer className="h-7 bg-bg-secondary border-t border-slate-700 flex items-center justify-between px-4 text-xs">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Circle
            size={8}
            className={isDirty ? 'text-amber-400 fill-amber-400' : 'text-green-400 fill-green-400'}
          />
          <span className="text-text-muted">
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </div>

        {activeGenerator && (
          <span className="text-text-muted">
            {nodeCount} nodes · {edgeCount} connections
          </span>
        )}
      </div>

      {/* Center section */}
      <div className="flex items-center gap-2">
        {isGenerating && (
          <span className="text-accent-primary">Generating...</span>
        )}
        {lastResult && !isGenerating && (
          <div className="flex items-center gap-1">
            {lastResult.success ? (
              <>
                <CheckCircle size={12} className="text-green-400" />
                <span className="text-text-muted">
                  Generated in {lastResult.durationMs}ms
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={12} className="text-red-400" />
                <span className="text-red-400">
                  Generation failed
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <span className="text-text-muted">
          Dungeon Forge v0.1.0
        </span>
      </div>
    </footer>
  );
}
