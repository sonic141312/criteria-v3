import { NodeRegistry } from '../../shared/plugins';
import { EvaluationGraph } from '../graph/dag-builder';
import { ExecutionNodeResult } from '../executor/executor';

/**
 * Builds a human-readable execution trace from graph + per-node results.
 */
export class Explainer {
  constructor(private readonly registry: NodeRegistry) {}

  build(
    executionId: string,
    graph: EvaluationGraph,
    nodeResults: readonly ExecutionNodeResult[],
  ): unknown {
    const resultByNodeId = new Map<string, ExecutionNodeResult>();
    for (const result of nodeResults) {
      resultByNodeId.set(result.nodeId, result);
    }

    const traceNodesById = new Map<string, unknown>();
    for (const [nodeId, node] of graph.nodes) {
      const result = resultByNodeId.get(nodeId);
      const definition = this.tryGetDefinition(node.nodeType);

      let explanation = result?.explanation ?? '';
      if (definition && result) {
        explanation = definition.explain(
          result.inputsReceived,
          node.config,
          { value: result.value, explanation: result.explanation, warnings: result.warnings, durationMs: result.durationMs },
        );
      }

      traceNodesById.set(nodeId, {
        nodeId,
        nodeType: node.nodeType,
        label: node.label,
        status: result?.status ?? 'SKIPPED',
        value: result?.value ?? null,
        explanation,
        warnings: result?.warnings ?? [],
        children: [],
        depth: 0,
      });
    }

    // Build tree by attaching children to parents
    const rootNodes: unknown[] = [];
    for (const [nodeId] of graph.nodes) {
      const incomingEdges = graph.incomingEdges.get(nodeId) ?? [];
      if (incomingEdges.length === 0) {
        rootNodes.push(traceNodesById.get(nodeId));
      } else {
        for (const edge of incomingEdges) {
          const parent = traceNodesById.get(edge.fromNodeId);
          if (parent) {
            const parentWithChildren = parent as { children: unknown[] };
            const child = traceNodesById.get(nodeId);
            if (child) {
              parentWithChildren.children.push({ ...child, depth: (parent as { depth: number }).depth + 1 });
            }
          }
        }
      }
    }

    return {
      executionId,
      status: nodeResults.length > 0 ? nodeResults[0]?.status ?? 'UNKNOWN' : 'SUCCESS',
      finalResult: null,
      nodes: [...traceNodesById.values()],
      rootNodes,
    };
  }

  private tryGetDefinition(nodeType: string) {
    try {
      return this.registry.get(nodeType);
    } catch {
      return null;
    }
  }
}
