import type { Connection, Edge } from '@xyflow/react';

type Endpoints = Pick<Connection, 'source' | 'target'>;

/**
 * 连线端口合法性校验（spec §4 A1「仅合法端口可连」）：
 * 起点与终点必须都存在，且不允许节点连接自身（自环）。
 */
export function isValidConnection(connection: Endpoints | null | undefined): boolean {
  if (!connection?.source || !connection.target) return false;
  return connection.source !== connection.target;
}

/**
 * 连线去重校验：同向或反向的连线已存在时，不应再次创建。
 */
export function hasEquivalentEdge(
  edges: ReadonlyArray<Pick<Edge, 'source' | 'target'>>,
  source: string,
  target: string,
): boolean {
  return edges.some(
    (e) =>
      (e.source === source && e.target === target) ||
      (e.source === target && e.target === source),
  );
}
