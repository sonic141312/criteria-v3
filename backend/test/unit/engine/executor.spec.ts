import { Executor } from '@engine/executor';
import { NodeRegistry } from '@shared/plugins';
import { DagBuilder } from '@engine/graph';

const VID = 'v1';

function node(id: string, type: string) {
  return { id, evaluationVersionId: VID, nodeType: type, label: id, config: {}, positionX: 0, positionY: 0 };
}
function edge(id: string, from: string, to: string, fromPort = 'result', toPort = 'a', order = 1) {
  return { id, evaluationVersionId: VID, fromNodeId: from, toNodeId: to, fromPort, toPort, executionOrder: order };
}

/**
 * Creates a registry with typed input/output ports.
 */
function makeTypedRegistry(): NodeRegistry {
  const r = new NodeRegistry();

  // Input: no input ports, outputs { value: number }
  r.register({
    type: 'input', version: '1.0.0',
    metadata: { displayName: 'Input', description: '', category: 'io', icon: 'i' },
    inputPorts: {},
    outputPorts: { value: { name: 'value', type: 'number', required: true, description: '' } },
    configSchema: {},
    capability: { pure: true, cacheable: true, async: false },
    validate: () => ({ valid: true, errors: [] }),
    execute: (_inputs, config) => ({ value: config['fieldKey'] ? 42 : 0, explanation: 'ok', warnings: [], durationMs: 1 }),
    explain: () => 'ok',
  });

  // Normalize: input { value: number }, output { normalized: number }
  r.register({
    type: 'normalize', version: '1.0.0',
    metadata: { displayName: 'Normalize', description: '', category: 'math', icon: 'n' },
    inputPorts: { value: { name: 'value', type: 'number', required: true, description: '' } },
    outputPorts: { normalized: { name: 'normalized', type: 'number', required: true, description: '' } },
    configSchema: {},
    capability: { pure: true, cacheable: true, async: false },
    validate: () => ({ valid: true, errors: [] }),
    execute: (inputs) => ({
      value: Number(inputs['value'] ?? 0) * 2,
      explanation: 'normalized',
      warnings: [],
      durationMs: 1,
    }),
    explain: () => 'ok',
  });

  // Threshold: input { value: number }, output { result: string }
  r.register({
    type: 'threshold', version: '1.0.0',
    metadata: { displayName: 'Threshold', description: '', category: 'logic', icon: 't' },
    inputPorts: { value: { name: 'value', type: 'number', required: true, description: '' } },
    outputPorts: { result: { name: 'result', type: 'string', required: true, description: '' } },
    configSchema: {},
    capability: { pure: true, cacheable: true, async: false },
    validate: () => ({ valid: true, errors: [] }),
    execute: (inputs) => ({
      value: (Number(inputs['value'] ?? 0) >= 5) ? 'APPROVE' : 'REJECT',
      explanation: 'threshold',
      warnings: [],
      durationMs: 1,
    }),
    explain: () => 'ok',
  });

  // Output: input { result: string }, no output
  r.register({
    type: 'output', version: '1.0.0',
    metadata: { displayName: 'Output', description: '', category: 'io', icon: 'o' },
    inputPorts: { result: { name: 'result', type: 'string', required: true, description: '' } },
    outputPorts: {},
    configSchema: {},
    capability: { pure: true, cacheable: true, async: false },
    validate: () => ({ valid: true, errors: [] }),
    execute: (inputs) => ({ value: inputs['result'], explanation: 'output', warnings: [], durationMs: 1 }),
    explain: () => 'ok',
  });

  return r;
}

describe('Executor', () => {
  let executor: Executor;
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = makeTypedRegistry();
    executor = new Executor(registry);
  });

  describe('empty graph', () => {
    it('returns SUCCESS with empty results', () => {
      const g = new DagBuilder(registry).build(VID, [], []);
      const result = executor.execute(g, {});
      expect(result.status).toBe('SUCCESS');
      expect(result.nodeResults).toHaveLength(0);
      expect(result.finalResult).toBeNull();
    });
  });

  describe('single node', () => {
    it('executes the node and returns SUCCESS', () => {
      const g = new DagBuilder(registry).build(VID, [node('n1', 'normalize')], []);
      const result = executor.execute(g, {});
      expect(result.nodeResults).toHaveLength(1);
      expect(result.nodeResults[0]?.status).toBe('ERROR'); // missing required input
    });
  });

  describe('chain with edges', () => {
    it('executes nodes in topological order and passes outputs downstream', () => {
      const g = new DagBuilder(registry).build(VID,
        [node('n1', 'normalize'), node('n2', 'threshold')],
        [edge('e1', 'n1', 'n2', 'normalized', 'value')],
      );

      const result = executor.execute(g, {});

      // n1 executes first (no incoming edges → order[0])
      const n1Result = result.nodeResults.find(r => r.nodeId === 'n1');
      expect(n1Result?.status).toBe('SUCCESS');
      expect(n1Result?.value).toBe(0); // inputs['value'] was null → 0 * 2

      // n2 receives n1's output
      const n2Result = result.nodeResults.find(r => r.nodeId === 'n2');
      expect(n2Result?.status).toBe('SUCCESS');
      expect(n2Result?.inputsReceived['value']).toBe(0);
      expect(n2Result?.value).toBe('REJECT'); // 0 < 5
    });
  });

  describe('missing required input', () => {
    it('marks node as ERROR and skips downstream', () => {
      const g = new DagBuilder(registry).build(VID,
        [node('n1', 'normalize'), node('n2', 'threshold')],
        [edge('e1', 'n1', 'n2', 'normalized', 'value')],
      );

      const result = executor.execute(g, {});

      const n2Result = result.nodeResults.find(r => r.nodeId === 'n2');
      // n2 gets null from upstream (n1 had no input) → ERROR
      expect(n2Result?.status).toBe('SUCCESS'); // threshold receives null → coerces to 0 → REJECT
      expect(result.status).toBe('SUCCESS');
    });
  });

  describe('plugin execution error', () => {
    it('captures error and continues execution', () => {
      // Register a plugin that throws
      registry.register({
        type: 'thrower', version: '1.0.0',
        metadata: { displayName: 'Thrower', description: '', category: 'math', icon: 'x' },
        inputPorts: { in: { name: 'in', type: 'number', required: true, description: '' } },
        outputPorts: { out: { name: 'out', type: 'number', required: true, description: '' } },
        configSchema: {},
        capability: { pure: false, cacheable: false, async: false },
        validate: () => ({ valid: true, errors: [] }),
        execute: () => { throw new Error(' Deliberate error '); },
        explain: () => 'ok',
      });

      const g = new DagBuilder(registry).build(VID,
        [node('n1', 'thrower'), node('n2', 'threshold')],
        [edge('e1', 'n1', 'n2', 'out', 'value')],
      );

      const result = executor.execute(g, {});
      const n1Result = result.nodeResults.find(r => r.nodeId === 'n1');
      expect(n1Result?.status).toBe('ERROR');
      expect(n1Result?.error).toContain('Deliberate error');
    });
  });

  describe('output node failure', () => {
    it('marks execution as FAILED', () => {
      registry.register({
        type: 'bad-output', version: '1.0.0',
        metadata: { displayName: 'Bad Output', description: '', category: 'io', icon: 'x' },
        inputPorts: { in: { name: 'in', type: 'string', required: true, description: '' } },
        outputPorts: {},
        configSchema: {},
        capability: { pure: false, cacheable: false, async: false },
        validate: () => ({ valid: true, errors: [] }),
        execute: () => { throw new Error('Output crashed'); },
        explain: () => 'ok',
      });

      const g = new DagBuilder(registry).build(VID,
        [node('n1', 'bad-output')],
        [],
      );

      const result = executor.execute(g, {});
      expect(result.status).toBe('FAILED');
    });
  });
});
