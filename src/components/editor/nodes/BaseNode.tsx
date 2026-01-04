import React, { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { NodeType, Port } from "../../../types";

interface BaseNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  inputs: Port[];
  outputs: Port[];
}

type BaseNodeType = Node<BaseNodeData>;

const NODE_COLORS: Record<string, string> = {
  start: "border-node-start",
  output: "border-node-output",
  room: "border-node-room",
  room_chain: "border-node-room",
  branch: "border-node-logic",
  merge: "border-node-logic",
  spawn_point: "border-node-spawn",
  loot_drop: "border-node-spawn",
  encounter: "border-node-spawn",
  random_select: "border-node-logic",
  distribution: "border-node-logic",
  default: "border-slate-500",
};

const NODE_ICONS: Record<string, string> = {
  start: "▶",
  output: "◼",
  room: "□",
  room_chain: "⬚",
  branch: "⑂",
  merge: "⑃",
  spawn_point: "◎",
  loot_drop: "✦",
  encounter: "⚔",
};

function BaseNodeComponent({
  data,
  selected,
}: NodeProps<BaseNodeType>): React.ReactElement {
  const nodeData = data as BaseNodeData;
  const borderColor = NODE_COLORS[nodeData.nodeType] || NODE_COLORS.default;
  const icon = NODE_ICONS[nodeData.nodeType] || "●";
  const inputs = nodeData.inputs || [];
  const outputs = nodeData.outputs || [];

  return (
    <div
      className={`
        min-w-[140px] rounded-lg border-2 shadow-lg
        bg-bg-secondary
        ${borderColor}
        ${selected ? "ring-2 ring-white/50" : ""}
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-sm font-medium text-text-primary truncate">
          {nodeData.label}
        </span>
      </div>

      {/* Content */}
      <div className="relative px-3 py-2">
        {/* Input handles */}
        {inputs.map((input: Port, idx: number) => (
          <Handle
            key={input.id}
            type="target"
            position={Position.Left}
            id={input.id}
            style={{
              top: `${((idx + 1) / (inputs.length + 1)) * 100}%`,
              background: "#3b82f6",
            }}
            className="!w-3 !h-3 !border-2 !border-bg-primary"
          />
        ))}

        {/* Port labels */}
        <div className="flex justify-between text-xs text-text-muted min-h-[24px]">
          <div className="flex flex-col gap-1">
            {inputs.map((input: Port) => (
              <span key={input.id}>{input.label || input.id}</span>
            ))}
          </div>
          <div className="flex flex-col gap-1 text-right">
            {outputs.map((output: Port) => (
              <span key={output.id}>{output.label || output.id}</span>
            ))}
          </div>
        </div>

        {/* Output handles */}
        {outputs.map((output: Port, idx: number) => (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            style={{
              top: `${((idx + 1) / (outputs.length + 1)) * 100}%`,
              background: "#3b82f6",
            }}
            className="!w-3 !h-3 !border-2 !border-bg-primary"
          />
        ))}
      </div>
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
