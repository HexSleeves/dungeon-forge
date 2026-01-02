import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Settings,
  Map,
  Box,
  GitBranch,
  Target,
  Dice5,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { GeneratorType, NodeType } from '../../types';

const NODE_CATEGORIES = [
  {
    name: 'Structure',
    icon: Map,
    nodes: [
      { type: 'start' as NodeType, label: 'Start', icon: Target },
      { type: 'output' as NodeType, label: 'Output', icon: Target },
    ],
  },
  {
    name: 'Rooms',
    icon: Box,
    nodes: [
      { type: 'room' as NodeType, label: 'Room', icon: Box },
      { type: 'room_chain' as NodeType, label: 'Room Chain', icon: Box },
    ],
  },
  {
    name: 'Flow',
    icon: GitBranch,
    nodes: [
      { type: 'branch' as NodeType, label: 'Branch', icon: GitBranch },
      { type: 'merge' as NodeType, label: 'Merge', icon: GitBranch },
    ],
  },
  {
    name: 'Content',
    icon: Target,
    nodes: [
      { type: 'spawn_point' as NodeType, label: 'Spawn Point', icon: Target },
      { type: 'loot_drop' as NodeType, label: 'Loot Drop', icon: Dice5 },
      { type: 'encounter' as NodeType, label: 'Encounter', icon: Target },
    ],
  },
];

export function Sidebar(): React.ReactElement {
  const project = useProjectStore((state) => state.project);
  const generators = useProjectStore((state) => state.project?.generators ?? []);
  const activeGeneratorId = useProjectStore((state) => state.activeGeneratorId);
  const addGenerator = useProjectStore((state) => state.addGenerator);
  const removeGenerator = useProjectStore((state) => state.removeGenerator);
  const setActiveGenerator = useProjectStore((state) => state.setActiveGenerator);

  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Structure', 'Rooms']);
  const [showNewGeneratorDialog, setShowNewGeneratorDialog] = useState(false);
  const [newGeneratorName, setNewGeneratorName] = useState('');
  const [newGeneratorType, setNewGeneratorType] = useState<GeneratorType>('dungeon');

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const handleCreateGenerator = () => {
    if (newGeneratorName.trim()) {
      addGenerator(newGeneratorName.trim(), newGeneratorType);
      setNewGeneratorName('');
      setShowNewGeneratorDialog(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
    e.dataTransfer.setData('application/dungeon-forge-node', nodeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className="w-64 bg-bg-secondary border-r border-slate-700 flex flex-col h-full">
      {/* Project Section */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen size={18} className="text-accent-primary" />
          <span className="font-medium text-sm truncate">
            {project?.name || 'No Project'}
          </span>
        </div>
        
        {/* Generators List */}
        <div className="space-y-1">
          {generators.map((gen) => (
            <div
              key={gen.id}
              className={`
                group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer
                ${activeGeneratorId === gen.id
                  ? 'bg-accent-muted text-accent-primary'
                  : 'hover:bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }
              `}
              onClick={() => setActiveGenerator(gen.id)}
            >
              <span className="text-sm truncate">{gen.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeGenerator(gen.id);
                }}
                className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setShowNewGeneratorDialog(true)}
          >
            <Plus size={16} />
            New Generator
          </Button>
        </div>
      </div>

      {/* Node Palette */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Node Palette
        </h3>
        
        <div className="space-y-2">
          {NODE_CATEGORIES.map((category) => (
            <div key={category.name}>
              <button
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                onClick={() => toggleCategory(category.name)}
              >
                {expandedCategories.includes(category.name) ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                <category.icon size={14} />
                <span className="text-sm font-medium">{category.name}</span>
              </button>
              
              {expandedCategories.includes(category.name) && (
                <div className="ml-4 mt-1 space-y-1">
                  {category.nodes.map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, node.type)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors active:cursor-grabbing"
                    >
                      <node.icon size={14} />
                      <span className="text-sm">{node.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-slate-700">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
          <Settings size={16} />
          Settings
        </Button>
      </div>

      {/* New Generator Dialog */}
      <Dialog
        isOpen={showNewGeneratorDialog}
        onClose={() => setShowNewGeneratorDialog(false)}
        title="New Generator"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowNewGeneratorDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGenerator}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={newGeneratorName}
            onChange={(e) => setNewGeneratorName(e.target.value)}
            placeholder="Floor 1 Dungeon"
            autoFocus
          />
          <Select
            label="Type"
            value={newGeneratorType}
            onChange={(e) => setNewGeneratorType(e.target.value as GeneratorType)}
            options={[
              { value: 'dungeon', label: 'Dungeon' },
              { value: 'loot', label: 'Loot Table' },
              { value: 'encounter', label: 'Encounter' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
        </div>
      </Dialog>
    </aside>
  );
}
