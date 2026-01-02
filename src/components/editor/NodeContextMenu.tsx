import React from 'react';
import { Copy, Trash2, Edit, Layers } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';

interface NodeContextMenuProps {
  nodeId: string;
  x: number;
  y: number;
  onClose: () => void;
}

export function NodeContextMenu({ nodeId, x, y, onClose }: NodeContextMenuProps): React.ReactElement {
  const deleteNode = useProjectStore((state) => state.deleteNode);

  const handleDelete = () => {
    deleteNode(nodeId);
    onClose();
  };

  const handleDuplicate = () => {
    // TODO: Implement node duplication
    console.log('Duplicate node:', nodeId);
    onClose();
  };

  const menuItems = [
    { icon: Edit, label: 'Edit Properties', shortcut: 'E', action: onClose },
    { icon: Copy, label: 'Duplicate', shortcut: 'Ctrl+D', action: handleDuplicate },
    { icon: Layers, label: 'Send to Back', shortcut: null, action: onClose },
    { type: 'separator' as const },
    { icon: Trash2, label: 'Delete', shortcut: 'Del', action: handleDelete, danger: true },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      
      {/* Menu */}
      <div
        className="fixed z-50 min-w-[180px] bg-bg-secondary border border-slate-700 rounded-lg shadow-xl py-1"
        style={{ left: x, top: y }}
      >
        {menuItems.map((item, index) =>
          item.type === 'separator' ? (
            <div key={index} className="border-t border-slate-700 my-1" />
          ) : (
            <button
              key={index}
              onClick={item.action}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-sm
                ${item.danger
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-text-primary hover:bg-bg-tertiary'
                }
              `}
            >
              <item.icon size={14} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-text-muted">{item.shortcut}</span>
              )}
            </button>
          )
        )}
      </div>
    </>
  );
}
