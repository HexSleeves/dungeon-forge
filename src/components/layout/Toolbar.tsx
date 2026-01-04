import React, { useState } from 'react';
import {
  Save,
  FolderOpen,
  Undo2,
  Redo2,
  Play,
  Shuffle,
  BarChart3,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer2,
  Move,
  FilePlus,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useEditorStore } from '../../stores/editorStore';
import { useGenerationStore } from '../../stores/generationStore';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';

export function Toolbar(): React.ReactElement {
  const project = useProjectStore((state) => state.project);
  const isDirty = useProjectStore((state) => state.isDirty);
  const canUndo = useProjectStore((state) => state.canUndo);
  const canRedo = useProjectStore((state) => state.canRedo);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const newProject = useProjectStore((state) => state.newProject);
  const saveProject = useProjectStore((state) => state.saveProject);
  const activeGeneratorId = useProjectStore((state) => state.activeGeneratorId);

  const zoom = useEditorStore((state) => state.zoom);
  const setZoom = useEditorStore((state) => state.setZoom);
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  
  const currentSeed = useGenerationStore((state) => state.currentSeed);
  const setSeed = useGenerationStore((state) => state.setSeed);
  const randomizeSeed = useGenerationStore((state) => state.randomizeSeed);
  const isGenerating = useGenerationStore((state) => state.isGenerating);
  const generate = useGenerationStore((state) => state.generate);
  
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleNewProject = () => {
    if (newProjectName.trim()) {
      newProject(newProjectName.trim());
      setNewProjectName('');
      setShowNewProjectDialog(false);
    }
  };

  const handleGenerate = () => {
    if (activeGeneratorId && project) {
      const generator = project.generators.find(g => g.id === activeGeneratorId);
      generate(activeGeneratorId, undefined, generator);
    }
  };

  return (
    <header className="h-14 bg-bg-secondary border-b border-slate-700 flex items-center justify-between px-4">
      {/* Left section - File operations */}
      <div className="flex items-center gap-1">
        <Tooltip content="New Project (Ctrl+N)">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewProjectDialog(true)}
          >
            <FilePlus size={18} />
          </Button>
        </Tooltip>
        
        <Tooltip content="Open Project (Ctrl+O)">
          <Button variant="ghost" size="sm">
            <FolderOpen size={18} />
          </Button>
        </Tooltip>
        
        <Tooltip content="Save (Ctrl+S)">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => saveProject()}
            disabled={!project || !isDirty}
          >
            <Save size={18} />
          </Button>
        </Tooltip>

        <div className="w-px h-6 bg-slate-700 mx-2" />

        <Tooltip content="Undo (Ctrl+Z)">
          <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}>
            <Undo2 size={18} />
          </Button>
        </Tooltip>
        
        <Tooltip content="Redo (Ctrl+Y)">
          <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}>
            <Redo2 size={18} />
          </Button>
        </Tooltip>
      </div>

      {/* Center section - Tools */}
      <div className="flex items-center gap-1 bg-bg-tertiary rounded-lg p-1">
        <Tooltip content="Select Tool (V)">
          <Button
            variant={activeTool === 'select' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTool('select')}
          >
            <MousePointer2 size={16} />
          </Button>
        </Tooltip>
        
        <Tooltip content="Pan Tool (Space)">
          <Button
            variant={activeTool === 'pan' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTool('pan')}
          >
            <Move size={16} />
          </Button>
        </Tooltip>
      </div>

      {/* Right section - Generation controls */}
      <div className="flex items-center gap-2">
        {/* Seed input */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">Seed:</span>
          <input
            type="number"
            value={currentSeed}
            onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
            className="w-28 px-2 py-1 text-sm bg-bg-tertiary border border-slate-600 rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
          <Tooltip content="Random Seed">
            <Button variant="ghost" size="sm" onClick={randomizeSeed}>
              <Shuffle size={16} />
            </Button>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        <Tooltip content="Generate (Ctrl+G)">
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={!activeGeneratorId || isGenerating}
          >
            <Play size={16} className="mr-1" />
            Generate
          </Button>
        </Tooltip>

        <Tooltip content="Run Simulation (Ctrl+R)">
          <Button variant="secondary" size="sm" disabled={!activeGeneratorId}>
            <BarChart3 size={16} />
          </Button>
        </Tooltip>

        <Tooltip content="Export">
          <Button variant="secondary" size="sm" disabled={!project}>
            <Download size={16} />
          </Button>
        </Tooltip>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Tooltip content="Zoom Out (Ctrl+-)">
            <Button variant="ghost" size="sm" onClick={() => setZoom(zoom - 0.1)}>
              <ZoomOut size={16} />
            </Button>
          </Tooltip>
          <span className="text-xs text-text-muted w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Tooltip content="Zoom In (Ctrl++)">
            <Button variant="ghost" size="sm" onClick={() => setZoom(zoom + 0.1)}>
              <ZoomIn size={16} />
            </Button>
          </Tooltip>
          <Tooltip content="Fit to View (Ctrl+1)">
            <Button variant="ghost" size="sm">
              <Maximize2 size={16} />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* New Project Dialog */}
      <Dialog
        isOpen={showNewProjectDialog}
        onClose={() => setShowNewProjectDialog(false)}
        title="New Project"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowNewProjectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleNewProject}>Create</Button>
          </>
        }
      >
        <Input
          label="Project Name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="My Dungeon Generator"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNewProject();
          }}
        />
      </Dialog>
    </header>
  );
}
