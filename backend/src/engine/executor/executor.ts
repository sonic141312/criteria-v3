import { NodeRegistry } from '../../shared/plugins';
import { EvaluationGraph, DagNode, DagEdge } from '../graph/dag-builder';

export type ExecutionStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';
export type NodeExecutionStatus = 'SUCCESS' | 'ERROR' | 'SKIPPED';

export interface ExecutionNodeResult {
  readonly nodeId: string;
  readonly status: NodeExecutionStatus;
  readonly value: unknown;
  readonly inputsReceived: Record<string, unknown>;
  readonly explanation: string;
  readonly warnings: string[];
  readonly error: string | null;
  readonly durationMs: number;
}

export interface ExecutionResult {
  readonly status: ExecutionStatus;
  readonly nodeResults: readonly ExecutionNodeResult[];
  readonly finalResult: Record<string, unknown> | null;
}

export class Executor {
  private executionInputValues: Record<string, unknown> = {};
  constructor(private readonly registry: NodeRegistry) {}

  getRegistry(): NodeRegistry {
    return this.registry;
  }

  execute(graph: EvaluationGraph, inputValues: Record<string, unknown>): ExecutionResult {
    this.executionInputValues = inputValues;

    if (graph.nodes.size === 0) {
      return { status: 'SUCCESS', nodeResults: [], finalResult: null };
    }

    const nodeOutputs = new Map<string, unknown>();
    const failedNodes = new Set<string>();
    const nodeResults: ExecutionNodeResult[] = [];

    for (const nodeId of graph.executionOrder) {
      const node = graph.nodes.get(nodeId);
      if (!node) continue;

      const incomingEdges = graph.incomingEdges.get(nodeId) ?? [];
      const inputsReceived: Record<string, unknown> = {};
      for (const edge of incomingEdges) {
        inputsReceived[edge.toPort] = nodeOutputs.get(edge.fromNodeId) ?? null;
      }

      const result = this.executeNode(node, inputsReceived, failedNodes, incomingEdges);
      nodeResults.push(result);

      if (result.status === 'SUCCESS') {
        nodeOutputs.set(nodeId, result.value);
      } else if (result.status === 'ERROR') {
        failedNodes.add(nodeId);
        if (node.nodeType === 'output') {
          return freezeResult(nodeResults, 'FAILED', null);
        }
      }
    }

    const status = this.computeStatus(failedNodes, nodeResults);
    const finalResult = this.extractFinalResult(graph, nodeResults);
    return freezeResult(nodeResults, status, finalResult);
  }

  private executeNode(
    node: DagNode,
    inputsReceived: Record<string, unknown>,
    failedNodes: ReadonlySet<string>,
    incomingEdges: readonly DagEdge[],
  ): ExecutionNodeResult {
    const startMs = Date.now();

    const hasUpstreamFailure = incomingEdges.some(e => failedNodes.has(e.fromNodeId));
    if (hasUpstreamFailure) {
      return mkResult(node.id, 'SKIPPED', null, inputsReceived, '', [], 'Skipped due to upstream node failure', startMs);
    }

    if (node.nodeType === 'input') {
      const fieldKey = (node.config as Record<string, unknown>)['fieldKey'] as string | undefined;
      if (fieldKey === undefined) {
        return mkResult(node.id, 'ERROR', null, inputsReceived, '', [], 'Input node missing "fieldKey" in config', startMs);
      }
      const rawValue = this.executionInputValues[fieldKey] ?? null;
      let outputValue: unknown = rawValue;
      try {
        const def = this.registry.get(node.nodeType);
        const outputPort = def.outputPorts['value'];
        if (outputPort && outputPort.type === 'number') {
          outputValue = rawValue !== null && rawValue !== undefined ? Number(rawValue) : null;
        }
      } catch {
        // registry might not have the plugin yet
      }
      return mkResult(node.id, 'SUCCESS', outputValue, inputsReceived, `Read "${fieldKey}" = ${outputValue}`, [], null, startMs);
    }

    const requiredPorts = this.requiredInputPorts(node.nodeType);
    for (const portName of requiredPorts) {
      if (!(portName in inputsReceived) || inputsReceived[portName] === null) {
        return mkResult(
          node.id, 'ERROR', null, inputsReceived, '', [],
          `Required input port "${portName}" is missing or null`, startMs,
        );
      }
    }

    try {
      const definition = this.registry.get(node.nodeType);
      const pluginResult = definition.execute(inputsReceived, node.config);
      return mkResult(
        node.id, 'SUCCESS', pluginResult.value, inputsReceived,
        pluginResult.explanation, pluginResult.warnings, null, startMs,
        pluginResult.durationMs,
      );
    } catch (err) {
      return mkResult(
        node.id, 'ERROR', null, inputsReceived, '', [],
        err instanceof Error ? err.message : String(err), startMs,
      );
    }
  }

  private requiredInputPorts(nodeType: string): string[] {
    const def = this.registry.get(nodeType);
    return Object.values(def.inputPorts)
      .filter((p) => p.required)
      .map((p) => p.name);
  }

  private computeStatus(failedNodes: ReadonlySet<string>, results: readonly ExecutionNodeResult[]): ExecutionStatus {
    if (failedNodes.size === 0) return 'SUCCESS';
    const hasSuccess = results.some((r) => r.status === 'SUCCESS');
    return hasSuccess ? 'PARTIAL' : 'FAILED';
  }

  private extractFinalResult(
    graph: EvaluationGraph,
    results: readonly ExecutionNodeResult[],
  ): Record<string, unknown> | null {
    const outputNodeIds = [...graph.nodes.values()]
      .filter((n) => n.nodeType === 'output')
      .map((n) => n.id);
    if (outputNodeIds.length === 0) return null;
    const successOutput = results.find(
      (r) => outputNodeIds.includes(r.nodeId) && r.status === 'SUCCESS',
    );
    return successOutput ? (successOutput.value as Record<string, unknown>) : null;
  }
}

function mkResult(
  nodeId: string,
  status: NodeExecutionStatus,
  value: unknown,
  inputsReceived: Record<string, unknown>,
  explanation: string,
  warnings: string[],
  error: string | null,
  startMs: number,
  explicitDurationMs?: number,
): ExecutionNodeResult {
  return {
    nodeId,
    status,
    value,
    inputsReceived,
    explanation,
    warnings,
    error,
    durationMs: explicitDurationMs ?? Math.max(1, Date.now() - startMs),
  };
}

function freezeResult(
  nodeResults: ExecutionNodeResult[],
  status: ExecutionStatus,
  finalResult: Record<string, unknown> | null,
): ExecutionResult {
  return {
    status,
    nodeResults: Object.freeze([...nodeResults]),
    finalResult,
  };
}
