import React from 'react';
import { X, RefreshCw, Shuffle } from 'lucide-react';
import { PreviewCanvas } from './PreviewCanvas';
import { useEditorStore } from '../../stores/editorStore';
import { useGenerationStore } from '../../stores/generationStore';
import { useProjectStore } from '../../stores/projectStore';
import { Button } from '../ui/Button';

export function PreviewPanel(): React.ReactElement | null {
  const previewPanelOpen = useEditorStore((state) => state.previewPanelOpen);
  const togglePreviewPanel = useEditorStore((state) => state.togglePreviewPanel);

  const currentSeed = useGenerationStore((state) => state.currentSeed);
  const randomizeSeed = useGenerationStore((state) => state.randomizeSeed);
  const generate = useGenerationStore((state) => state.generate);
  const isGenerating = useGenerationStore((state) => state.isGenerating);
  const lastResult = useGenerationStore((state) => state.lastResult);

  const activeGeneratorId = useProjectStore((state) => state.activeGeneratorId);

  if (!previewPanelOpen) return null;

  const handleGenerate = () => {
    if (activeGeneratorId) {
      generate(activeGeneratorId);
    }
  };

  return (
    <div className="w-96 bg-bg-secondary border-l border-slate-700 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="font-medium text-sm">Preview</h3>
        <button
          onClick={togglePreviewPanel}
          className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={!activeGeneratorId || isGenerating}
            className="flex-1"
          >
            <RefreshCw size={14} className={`mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
          <Button variant="secondary" size="sm" onClick={randomizeSeed}>
            <Shuffle size={14} />
          </Button>
        </div>

        {/* Seed display */}
        <div className="text-xs text-text-muted">
          Seed: <span className="font-mono text-text-secondary">{currentSeed}</span>
        </div>

        {/* Canvas */}
        <PreviewCanvas width={352} height={280} />

        {/* Result stats */}
        {lastResult && lastResult.success && lastResult.data && (
          <div className="bg-bg-tertiary rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Generation Stats
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-text-muted">Rooms:</span>{' '}
                <span className="text-text-primary">{lastResult.data.rooms.length}</span>
              </div>
              <div>
                <span className="text-text-muted">Connections:</span>{' '}
                <span className="text-text-primary">{lastResult.data.connections.length}</span>
              </div>
              <div>
                <span className="text-text-muted">Spawn Points:</span>{' '}
                <span className="text-text-primary">{lastResult.data.spawnPoints.length}</span>
              </div>
              <div>
                <span className="text-text-muted">Duration:</span>{' '}
                <span className="text-text-primary">{lastResult.durationMs}ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Constraints */}
        {lastResult && lastResult.constraintResults.length > 0 && (
          <div className="bg-bg-tertiary rounded-lg p-3 space-y-2">
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Constraints
            </h4>
            <div className="space-y-1">
              {lastResult.constraintResults.map((result) => (
                <div
                  key={result.constraintId}
                  className={`flex items-center gap-2 text-xs ${
                    result.passed ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  <span>{result.passed ? '✓' : '✗'}</span>
                  <span>{result.message || result.constraintId}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Errors */}
        {lastResult && !lastResult.success && lastResult.errors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">
              Errors
            </h4>
            <ul className="space-y-1 text-xs text-red-300">
              {lastResult.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
