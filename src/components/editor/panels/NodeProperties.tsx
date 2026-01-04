import React from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';

// Branch weights editor with visual sliders
function BranchWeightsEditor({
  weights,
  onChange,
}: {
  weights: number[];
  onChange: (weights: number[]) => void;
}): React.ReactElement {
  const addPath = () => {
    const newWeight = 1 / (weights.length + 1);
    const normalizedWeights = weights.map((w) => w * (1 - newWeight));
    onChange([...normalizedWeights, newWeight]);
  };

  const removePath = (index: number) => {
    if (weights.length <= 2) return;
    const newWeights = weights.filter((_, i) => i !== index);
    const sum = newWeights.reduce((a, b) => a + b, 0);
    onChange(newWeights.map((w) => w / sum));
  };

  const updateWeight = (index: number, value: number) => {
    const newWeights = [...weights];
    newWeights[index] = value / 100;
    // Normalize so they sum to 1
    const sum = newWeights.reduce((a, b) => a + b, 0);
    onChange(newWeights.map((w) => w / sum));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-secondary">Path Weights</label>
        <button
          onClick={addPath}
          className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary"
          title="Add path"
        >
          <Plus size={14} />
        </button>
      </div>
      <p className="text-xs text-text-muted">
        Probability of taking each path. Values are normalized to sum to 100%.
      </p>
      <div className="space-y-2">
        {weights.map((weight, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-xs text-text-muted w-12">Path {index + 1}</span>
            <input
              type="range"
              min="1"
              max="100"
              value={Math.round(weight * 100)}
              onChange={(e) => updateWeight(index, parseInt(e.target.value))}
              className="flex-1 accent-accent-primary"
            />
            <span className="text-xs text-text-secondary w-10 text-right">
              {Math.round(weight * 100)}%
            </span>
            {weights.length > 2 && (
              <button
                onClick={() => removePath(index)}
                className="p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400"
                title="Remove path"
              >
                <Minus size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      {/* Visual representation */}
      <div className="flex h-2 rounded-full overflow-hidden bg-bg-tertiary">
        {weights.map((weight, index) => {
          const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444'];
          return (
            <div
              key={index}
              style={{
                width: `${weight * 100}%`,
                backgroundColor: colors[index % colors.length],
              }}
              className="transition-all duration-200"
              title={`Path ${index + 1}: ${Math.round(weight * 100)}%`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function NodePropertiesPanel(): React.ReactElement | null {
  const selectedNodeIds = useEditorStore(useShallow((state) => state.selectedNodeIds));
  const propertiesPanelOpen = useEditorStore((state) => state.propertiesPanelOpen);
  const togglePropertiesPanel = useEditorStore((state) => state.togglePropertiesPanel);

  const activeGeneratorId = useProjectStore((state) => state.activeGeneratorId);
  const project = useProjectStore((state) => state.project);
  const updateNode = useProjectStore((state) => state.updateNode);
  const deleteNode = useProjectStore((state) => state.deleteNode);

  const activeGenerator = project?.generators.find(g => g.id === activeGeneratorId);

  if (!propertiesPanelOpen) return null;

  const selectedNode = activeGenerator?.graph.nodes.find(
    (n) => n.id === selectedNodeIds[0]
  );

  return (
    <aside className="w-72 bg-bg-secondary border-l border-slate-700 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="font-medium text-sm">Properties</h3>
        <button
          onClick={togglePropertiesPanel}
          className="p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>

      {selectedNode ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Node Type Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              {selectedNode.type.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Common Properties */}
          <Input
            label="Label"
            value={selectedNode.data.label}
            onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
          />

          {/* Type-specific Properties */}
          {selectedNode.type === 'room' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Min Width"
                  type="number"
                  value={(selectedNode.data.sizeRange as any)?.min?.w ?? 5}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      sizeRange: {
                        ...(selectedNode.data.sizeRange as any),
                        min: {
                          ...(selectedNode.data.sizeRange as any)?.min,
                          w: parseInt(e.target.value) || 5,
                        },
                      },
                    })
                  }
                />
                <Input
                  label="Min Height"
                  type="number"
                  value={(selectedNode.data.sizeRange as any)?.min?.h ?? 5}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      sizeRange: {
                        ...(selectedNode.data.sizeRange as any),
                        min: {
                          ...(selectedNode.data.sizeRange as any)?.min,
                          h: parseInt(e.target.value) || 5,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Max Width"
                  type="number"
                  value={(selectedNode.data.sizeRange as any)?.max?.w ?? 10}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      sizeRange: {
                        ...(selectedNode.data.sizeRange as any),
                        max: {
                          ...(selectedNode.data.sizeRange as any)?.max,
                          w: parseInt(e.target.value) || 10,
                        },
                      },
                    })
                  }
                />
                <Input
                  label="Max Height"
                  type="number"
                  value={(selectedNode.data.sizeRange as any)?.max?.h ?? 10}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      sizeRange: {
                        ...(selectedNode.data.sizeRange as any),
                        max: {
                          ...(selectedNode.data.sizeRange as any)?.max,
                          h: parseInt(e.target.value) || 10,
                        },
                      },
                    })
                  }
                />
              </div>
              <Select
                label="Shape"
                value={(selectedNode.data.shape as string) ?? 'rectangular'}
                onChange={(e) => updateNode(selectedNode.id, { shape: e.target.value })}
                options={[
                  { value: 'rectangular', label: 'Rectangular' },
                  { value: 'l-shaped', label: 'L-Shaped' },
                  { value: 'circular', label: 'Circular' },
                  { value: 'irregular', label: 'Irregular' },
                ]}
              />
            </>
          )}

          {selectedNode.type === 'room_chain' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Min Rooms"
                  type="number"
                  value={(selectedNode.data.countRange as any)?.min ?? 3}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      countRange: {
                        ...(selectedNode.data.countRange as any),
                        min: parseInt(e.target.value) || 3,
                      },
                    })
                  }
                />
                <Input
                  label="Max Rooms"
                  type="number"
                  value={(selectedNode.data.countRange as any)?.max ?? 5}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      countRange: {
                        ...(selectedNode.data.countRange as any),
                        max: parseInt(e.target.value) || 5,
                      },
                    })
                  }
                />
              </div>
              <Select
                label="Connection Style"
                value={(selectedNode.data.connectionStyle as string) ?? 'linear'}
                onChange={(e) =>
                  updateNode(selectedNode.id, { connectionStyle: e.target.value })
                }
                options={[
                  { value: 'linear', label: 'Linear' },
                  { value: 'branching', label: 'Branching' },
                ]}
              />
            </>
          )}

          {selectedNode.type === 'spawn_point' && (
            <>
              <Select
                label="Entity Type"
                value={(selectedNode.data.entityType as string) ?? 'enemy'}
                onChange={(e) =>
                  updateNode(selectedNode.id, { entityType: e.target.value })
                }
                options={[
                  { value: 'enemy', label: 'Enemy' },
                  { value: 'item', label: 'Item' },
                  { value: 'npc', label: 'NPC' },
                  { value: 'trap', label: 'Trap' },
                ]}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Min Count"
                  type="number"
                  value={(selectedNode.data.countRange as any)?.min ?? 1}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      countRange: {
                        ...(selectedNode.data.countRange as any),
                        min: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
                <Input
                  label="Max Count"
                  type="number"
                  value={(selectedNode.data.countRange as any)?.max ?? 3}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      countRange: {
                        ...(selectedNode.data.countRange as any),
                        max: parseInt(e.target.value) || 3,
                      },
                    })
                  }
                />
              </div>
              <Input
                label="Spawn Radius"
                type="number"
                value={(selectedNode.data.spawnRadius as number) ?? 2}
                onChange={(e) =>
                  updateNode(selectedNode.id, { spawnRadius: parseInt(e.target.value) || 2 })
                }
              />
            </>
          )}

          {/* Branch Node Properties */}
          {selectedNode.type === 'branch' && (
            <BranchWeightsEditor
              weights={(selectedNode.data.weights as number[]) ?? [0.5, 0.5]}
              onChange={(weights) => updateNode(selectedNode.id, { weights })}
            />
          )}

          {/* Merge Node Properties */}
          {selectedNode.type === 'merge' && (
            <>
              <Select
                label="Merge Strategy"
                value={(selectedNode.data.strategy as string) ?? 'all'}
                onChange={(e) =>
                  updateNode(selectedNode.id, { strategy: e.target.value })
                }
                options={[
                  { value: 'all', label: 'Wait for All' },
                  { value: 'any', label: 'Continue on Any' },
                  { value: 'first', label: 'First to Complete' },
                ]}
              />
              <p className="text-xs text-text-muted">
                Determines how paths are combined when multiple branches converge.
              </p>
            </>
          )}

          {/* Loot Drop Node Properties */}
          {selectedNode.type === 'loot_drop' && (
            <>
              <Select
                label="Loot Table"
                value={(selectedNode.data.lootTable as string) ?? 'default'}
                onChange={(e) =>
                  updateNode(selectedNode.id, { lootTable: e.target.value })
                }
                options={[
                  { value: 'default', label: 'Default' },
                  { value: 'common', label: 'Common' },
                  { value: 'uncommon', label: 'Uncommon' },
                  { value: 'rare', label: 'Rare' },
                  { value: 'legendary', label: 'Legendary' },
                  { value: 'boss', label: 'Boss Loot' },
                ]}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Drop Chance</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={((selectedNode.data.dropChance as number) ?? 1) * 100}
                    onChange={(e) =>
                      updateNode(selectedNode.id, { dropChance: parseInt(e.target.value) / 100 })
                    }
                    className="flex-1 accent-accent-primary"
                  />
                  <span className="text-sm text-text-secondary w-12 text-right">
                    {Math.round(((selectedNode.data.dropChance as number) ?? 1) * 100)}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Min Items"
                  type="number"
                  value={(selectedNode.data.itemCount as any)?.min ?? 1}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      itemCount: {
                        ...(selectedNode.data.itemCount as any),
                        min: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
                <Input
                  label="Max Items"
                  type="number"
                  value={(selectedNode.data.itemCount as any)?.max ?? 3}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      itemCount: {
                        ...(selectedNode.data.itemCount as any),
                        max: parseInt(e.target.value) || 3,
                      },
                    })
                  }
                />
              </div>
            </>
          )}

          {/* Encounter Node Properties */}
          {selectedNode.type === 'encounter' && (
            <>
              <Select
                label="Encounter Type"
                value={(selectedNode.data.encounterType as string) ?? 'combat'}
                onChange={(e) =>
                  updateNode(selectedNode.id, { encounterType: e.target.value })
                }
                options={[
                  { value: 'combat', label: 'Combat' },
                  { value: 'puzzle', label: 'Puzzle' },
                  { value: 'trap', label: 'Trap' },
                  { value: 'social', label: 'Social' },
                  { value: 'boss', label: 'Boss Fight' },
                ]}
              />
              <Select
                label="Difficulty"
                value={(selectedNode.data.difficulty as string) ?? 'medium'}
                onChange={(e) =>
                  updateNode(selectedNode.id, { difficulty: e.target.value })
                }
                options={[
                  { value: 'trivial', label: 'Trivial' },
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                  { value: 'deadly', label: 'Deadly' },
                ]}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Min Enemies"
                  type="number"
                  value={(selectedNode.data.enemyCount as any)?.min ?? 1}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      enemyCount: {
                        ...(selectedNode.data.enemyCount as any),
                        min: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                />
                <Input
                  label="Max Enemies"
                  type="number"
                  value={(selectedNode.data.enemyCount as any)?.max ?? 4}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      enemyCount: {
                        ...(selectedNode.data.enemyCount as any),
                        max: parseInt(e.target.value) || 4,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rewardOnComplete"
                  checked={(selectedNode.data.rewardOnComplete as boolean) ?? true}
                  onChange={(e) =>
                    updateNode(selectedNode.id, { rewardOnComplete: e.target.checked })
                  }
                  className="rounded border-slate-600 bg-bg-tertiary text-accent-primary focus:ring-accent-primary"
                />
                <label htmlFor="rewardOnComplete" className="text-sm text-text-secondary">
                  Reward on completion
                </label>
              </div>
            </>
          )}

          {/* Start Node Properties */}
          {selectedNode.type === 'start' && (
            <>
              <p className="text-xs text-text-muted">
                The entry point of the dungeon. Players spawn here.
              </p>
              <Select
                label="Spawn Area"
                value={(selectedNode.data.spawnArea as string) ?? 'center'}
                onChange={(e) =>
                  updateNode(selectedNode.id, { spawnArea: e.target.value })
                }
                options={[
                  { value: 'center', label: 'Room Center' },
                  { value: 'entrance', label: 'Near Entrance' },
                  { value: 'random', label: 'Random Position' },
                ]}
              />
            </>
          )}

          {/* Output Node Properties */}
          {selectedNode.type === 'output' && (
            <>
              <p className="text-xs text-text-muted">
                The exit point of the dungeon. Connects to the next level or ends the run.
              </p>
              <Select
                label="Exit Type"
                value={(selectedNode.data.exitType as string) ?? 'stairs'}
                onChange={(e) =>
                  updateNode(selectedNode.id, { exitType: e.target.value })
                }
                options={[
                  { value: 'stairs', label: 'Stairs Down' },
                  { value: 'portal', label: 'Portal' },
                  { value: 'door', label: 'Door' },
                  { value: 'elevator', label: 'Elevator' },
                ]}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresKey"
                  checked={(selectedNode.data.requiresKey as boolean) ?? false}
                  onChange={(e) =>
                    updateNode(selectedNode.id, { requiresKey: e.target.checked })
                  }
                  className="rounded border-slate-600 bg-bg-tertiary text-accent-primary focus:ring-accent-primary"
                />
                <label htmlFor="requiresKey" className="text-sm text-text-secondary">
                  Requires key to unlock
                </label>
              </div>
            </>
          )}

          {/* Delete Button */}
          <div className="pt-4 border-t border-slate-700">
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={() => deleteNode(selectedNode.id)}
            >
              Delete Node
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Select a node to edit its properties
        </div>
      )}
    </aside>
  );
}
