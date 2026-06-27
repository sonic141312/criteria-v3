import { NodeRegistry } from '../../shared/plugins';

/**
 * In-memory representation of a Node from the graph.
 * Produced by DagBuilder from DB rows.
 */
export interface DagNode {
  readonly id: string;
  readonly nodeType: string;
  readonly label: string;
  readonly config: Record<string, unknown>;
  readonly positionX: number;
  readonly positionY: number;
}

/**
 * In-memory representation of an Edge from the graph.
 */
export interface DagEdge {
  readonly id: string;
  readonly fromNodeId: string;
  readonly fromPort: string;
  readonly toNodeId: string;
  readonly toPort: string;
  readonly executionOrder: number;
}

/**
 * The built graph — an in-memory DAG ready for execution and validation.
 * Nodes and edges are indexed for O(1) lookup.
 */
export interface EvaluationGraph {
  readonly versionId: string;
  readonly nodes: ReadonlyMap<string, DagNode>;
  readonly edges: ReadonlyArray<DagEdge>;
  /**
   * Outgoing edges from each node.
   * key = source node id, value = list of edges leaving that node.
   */
  readonly outgoingEdges: ReadonlyMap<string, readonly DagEdge[]>;
  /**
   * Incoming edges to each node.
   * key = target node id, value = list of edges arriving at that node.
   */
  readonly incomingEdges: ReadonlyMap<string, readonly DagEdge[]>;
  /** Execution order — node ids in topological order (left to right). */
  readonly executionOrder: readonly string[];
}

/**
 * Raw row shapes as they come from TypeORM repositories.
 * DagBuilder accepts these and produces an EvaluationGraph.
 */
export interface DagNodeRow {
  id: string;
  evaluationVersionId: string;
  nodeType: string;
  label: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

export interface DagEdgeRow {
  id: string;
  evaluationVersionId: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
  executionOrder: number;
}

/**
 * Builds an EvaluationGraph from DB rows.
 * Also computes topological sort for execution order.
 *
 * Kahn's algorithm is used for topological sort:
 * 1. Compute in-degree for each node.
 * 2. Start with nodes with in-degree 0.
 * 3. Remove node, reduce in-degree of its neighbors.
 * 4. Repeat. If not all nodes are processed → cycle detected.
 */
export class DagBuilder {
  constructor(private readonly registry: NodeRegistry) {}

  /**
   * Builds an EvaluationGraph from node and edge rows.
   * Returns null if the input is empty (no nodes).
   */
  build(versionId: string, nodeRows: readonly DagNodeRow[], edgeRows: readonly DagEdgeRow[]): EvaluationGraph {
    if (nodeRows.length === 0) {
      return emptyGraph(versionId);
    }

    // Index nodes by id
    const nodesMap = new Map<string, DagNode>();
    for (const row of nodeRows) {
      nodesMap.set(row.id, {
        id: row.id,
        nodeType: row.nodeType,
        label: row.label,
        config: row.config,
        positionX: row.positionX,
        positionY: row.positionY,
      });
    }

    // Index edges
    const outgoingEdges = new Map<string, DagEdge[]>();
    const incomingEdges = new Map<string, DagEdge[]>();

    for (const row of edgeRows) {
      const edge: DagEdge = {
        id: row.id,
        fromNodeId: row.fromNodeId,
        fromPort: row.fromPort,
        toNodeId: row.toNodeId,
        toPort: row.toPort,
        executionOrder: row.executionOrder,
      };

      if (!outgoingEdges.has(edge.fromNodeId)) {
        outgoingEdges.set(edge.fromNodeId, []);
      }
      outgoingEdges.get(edge.fromNodeId)!.push(edge);

      if (!incomingEdges.has(edge.toNodeId)) {
        incomingEdges.set(edge.toNodeId, []);
      }
      incomingEdges.get(edge.toNodeId)!.push(edge);
    }

    // Topological sort (Kahn's algorithm)
    const executionOrder = this.topologicalSort(nodeRows, outgoingEdges, incomingEdges);

    return {
      versionId,
      nodes: nodesMap,
      edges: Object.freeze([...edgeRows.map(r => ({
        id: r.id,
        fromNodeId: r.fromNodeId,
        fromPort: r.fromPort,
        toNodeId: r.toNodeId,
        toPort: r.toPort,
        executionOrder: r.executionOrder,
      }))]),
      outgoingEdges: freezeMap(outgoingEdges) as Map<string, readonly DagEdge[]>,
      incomingEdges: freezeMap(incomingEdges) as Map<string, readonly DagEdge[]>,
      executionOrder: Object.freeze(executionOrder),
    };
  }

  /**
   * Kahn's algorithm with cycle detection.
   * Returns node ids in execution order.
   * If a cycle exists, returns node ids in the order they were processed
   * (the cycle is detected separately by GraphValidator).
   */
  private topologicalSort(
    nodeRows: readonly DagNodeRow[],
    outgoingEdges: Map<string, DagEdge[]>,
    incomingEdges: Map<string, DagEdge[]>,
  ): string[] {
    // In-degree = number of incoming edges
    const inDegree = new Map<string, number>();
    for (const node of nodeRows) {
      const incoming = incomingEdges.get(node.id) ?? [];
      inDegree.set(node.id, incoming.length);
    }

    // Queue of nodes with in-degree 0
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    const sorted: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeId);

      const outgoing = outgoingEdges.get(nodeId) ?? [];
      for (const edge of outgoing) {
        const currentDegree = inDegree.get(edge.toNodeId) ?? 1;
        const newDegree = currentDegree - 1;
        inDegree.set(edge.toNodeId, newDegree);
        if (newDegree === 0) {
          queue.push(edge.toNodeId);
        }
      }
    }

    return sorted;
  }
}

function emptyGraph(versionId: string): EvaluationGraph {
  return {
    versionId,
    nodes: new Map(),
    edges: [],
    outgoingEdges: new Map(),
    incomingEdges: new Map(),
    executionOrder: [],
  };
}

function freezeMap<K, V>(m: Map<K, V[]>): ReadonlyMap<K, readonly V[]> {
  const frozen = new Map<K, readonly V[]>();
  for (const [k, arr] of m) {
    frozen.set(k, Object.freeze([...arr]));
  }
  return Object.freeze(frozen);
}
