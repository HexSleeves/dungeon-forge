import React from 'react';
import { X } from 'lucide-react';
import { useProjectStore } from '../../../stores/projectStore';
import { useEditorStore } from '../../../stores/editorStore';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';

export function NodePropertiesPanel(): React.ReactElement | null {
  const selectedNodeIds = useEditorStore((state) => state.selectedNodeIds);
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
