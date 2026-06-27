import { NodeRegistry } from '../../shared/plugins';
import { EvaluationGraph } from '../graph/dag-builder';
import { ValidationResult, fail, combine } from '../../shared/errors';
import { ERROR_CODES } from '../../shared/errors/error-codes';
import { areTypesCompatible } from '../../shared/type-system';

/**
 * GraphValidator checks a graph for structural and type correctness.
 */
export class GraphValidator {
  constructor(private readonly registry: NodeRegistry) {}

  validate(graph: EvaluationGraph): ValidationResult {
    if (graph.nodes.size === 0) {
      return fail(ERROR_CODES.NO_OUTPUT_NODE, 'Graph has no nodes');
    }

    const results: ValidationResult[] = [];
    results.push(this.checkCycles(graph));
    results.push(this.checkOrphanNodes(graph));
    results.push(this.checkRequiredInputs(graph));
    results.push(this.checkTypeCompatibility(graph));
    results.push(this.checkOutputNode(graph));
    results.push(this.checkUnreachableOutput(graph));

    return combine(...results);
  }

  private checkCycles(graph: EvaluationGraph): ValidationResult {
    const visited = new Set<string>();
    const stack = new Set<string>();

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const cycle = this.findCycle(nodeId, graph, visited, stack, []);
        if (cycle.length > 0) {
          return fail(
            ERROR_CODES.CYCLE_DETECTED,
            `Cycle detected: ${cycle.join(' → ')} → ${cycle[0]}`,
            cycle[0],
          );
        }
      }
    }
    return { valid: true, errors: [] };
  }

  private findCycle(
    nodeId: string,
    graph: EvaluationGraph,
    visited: Set<string>,
    stack: Set<string>,
    path: string[],
  ): string[] {
    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);

    const outgoing = graph.outgoingEdges.get(nodeId) ?? [];
    for (const edge of outgoing) {
      if (!visited.has(edge.toNodeId)) {
        const cycle = this.findCycle(edge.toNodeId, graph, visited, stack, path);
        if (cycle.length > 0) return cycle;
      } else if (stack.has(edge.toNodeId)) {
        const cycleStart = path.indexOf(edge.toNodeId);
        return [...path.slice(cycleStart), edge.toNodeId];
      }
    }

    stack.delete(nodeId);
    path.pop();
    return [];
  }

  private checkOrphanNodes(graph: EvaluationGraph): ValidationResult {
    const errors: Array<{ nodeId: string; code: string; message: string }> = [];

    for (const [nodeId] of graph.nodes) {
      const hasIncoming = (graph.incomingEdges.get(nodeId) ?? []).length > 0;
      const hasOutgoing = (graph.outgoingEdges.get(nodeId) ?? []).length > 0;

      if (!hasIncoming && !hasOutgoing) {
        errors.push({
          nodeId,
          code: ERROR_CODES.ORPHAN_NODE,
          message: `Node "${nodeId}" is not connected to any edge`,
        });
      }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
  }

  private checkRequiredInputs(graph: EvaluationGraph): ValidationResult {
    const errors: Array<{ nodeId: string; code: string; message: string }> = [];

    for (const [nodeId, node] of graph.nodes) {
      const def = this.tryGetDefinition(node.nodeType);
      if (!def) continue;

      for (const [portName, port] of Object.entries(def.inputPorts)) {
        if (!port.required) continue;

        const hasIncoming = (graph.incomingEdges.get(nodeId) ?? []).some(
          (e: { toPort: string }) => e.toPort === portName,
        );
        if (!hasIncoming) {
          errors.push({
            nodeId,
            code: ERROR_CODES.UNCONNECTED_REQUIRED_INPUT,
            message: `Node "${node.label}" (${node.nodeType}) requires input port "${portName}" but it is not connected`,
          });
        }
      }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
  }

  private checkTypeCompatibility(graph: EvaluationGraph): ValidationResult {
    const errors: Array<{ edgeId?: string; nodeId?: string; code: string; message: string }> = [];

    for (const edge of graph.edges) {
      const sourceNode = graph.nodes.get(edge.fromNodeId);
      const targetNode = graph.nodes.get(edge.toNodeId);

      if (!sourceNode || !targetNode) {
        errors.push({
          edgeId: edge.id,
          code: ERROR_CODES.UNKNOWN_NODE_TYPE,
          message: `Edge ${edge.id} references unknown node`,
        });
        continue;
      }

      const sourceDef = this.tryGetDefinition(sourceNode.nodeType);
      const targetDef = this.tryGetDefinition(targetNode.nodeType);

      if (!sourceDef || !targetDef) {
        errors.push({
          edgeId: edge.id,
          code: ERROR_CODES.UNKNOWN_NODE_TYPE,
          message: `Edge ${edge.id} references unregistered node type`,
        });
        continue;
      }

      const sourcePort = sourceDef.outputPorts[edge.fromPort];
      const targetPort = targetDef.inputPorts[edge.toPort];

      if (!sourcePort) {
        errors.push({
          edgeId: edge.id,
          code: ERROR_CODES.TYPE_MISMATCH,
          message: `Source port "${edge.fromPort}" not found on node type "${sourceNode.nodeType}"`,
        });
        continue;
      }

      if (!targetPort) {
        errors.push({
          edgeId: edge.id,
          code: ERROR_CODES.TYPE_MISMATCH,
          message: `Target port "${edge.toPort}" not found on node type "${targetNode.nodeType}"`,
        });
        continue;
      }

      const typeCheck = areTypesCompatible(sourcePort.type, targetPort.type);
      if (!typeCheck.compatible) {
        errors.push({
          edgeId: edge.id,
          nodeId: edge.toNodeId,
          code: ERROR_CODES.TYPE_MISMATCH,
          message: typeCheck.reason ?? `Type mismatch on edge ${edge.id}`,
        });
      }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
  }

  private checkOutputNode(_graph: EvaluationGraph): ValidationResult {
    const hasOutput = [..._graph.nodes.values()].some(n => n.nodeType === 'output');
    if (!hasOutput) {
      return fail(ERROR_CODES.NO_OUTPUT_NODE, 'Graph must have at least one Output node');
    }
    return { valid: true, errors: [] };
  }

  private checkUnreachableOutput(graph: EvaluationGraph): ValidationResult {
    const errors: Array<{ nodeId: string; code: string; message: string }> = [];

    const sourceNodeIds = new Set<string>();
    for (const [nodeId] of graph.nodes) {
      if ((graph.incomingEdges.get(nodeId) ?? []).length === 0) {
        sourceNodeIds.add(nodeId);
      }
    }

    const reachable = new Set<string>();
    const queue = [...sourceNodeIds];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;
      reachable.add(nodeId);
      for (const edge of graph.outgoingEdges.get(nodeId) ?? []) {
        if (!reachable.has(edge.toNodeId)) {
          queue.push(edge.toNodeId);
        }
      }
    }

    for (const [nodeId, node] of graph.nodes) {
      if (node.nodeType === 'output' && !reachable.has(nodeId)) {
        errors.push({
          nodeId,
          code: ERROR_CODES.UNREACHABLE_OUTPUT,
          message: `Output node "${node.label}" (${nodeId}) is not reachable from any source node`,
        });
      }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true, errors: [] };
  }

  private tryGetDefinition(nodeType: string) {
    try {
      return this.registry.get(nodeType);
    } catch {
      return null;
    }
  }
}
