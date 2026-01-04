import type { NodeTypes } from "@xyflow/react";
import { BaseNode } from "./BaseNode";

export const nodeTypes: NodeTypes = {
  start: BaseNode,
  output: BaseNode,
  room: BaseNode,
  room_chain: BaseNode,
  branch: BaseNode,
  merge: BaseNode,
  spawn_point: BaseNode,
  loot_drop: BaseNode,
  encounter: BaseNode,
  prop: BaseNode,
  random_select: BaseNode,
  sequence: BaseNode,
  condition: BaseNode,
  loop: BaseNode,
  distribution: BaseNode,
  curve: BaseNode,
  table: BaseNode,
  subgraph: BaseNode,
};
