import { GraphValidator } from '../../../src/engine/validator';
import { NodeRegistry } from '../../../src/shared/plugins';
import { DagBuilder } from '../../../src/engine/graph';
import { ERROR_CODES } from '../../../src/shared/errors/error-codes';

const VID = 'v1';

function node(id: string, type: string) {
  return { id, evaluationVersionId: VID, nodeType: type, label: id, config: {}, positionX: 0, positionY: 0 };
}
function edge(id: string, from: string, to: string, fromPort = 'result', toPort = 'a', order = 1) {
  return { id, evaluationVersionId: VID, fromNodeId: from, toNodeId: to, fromPort, toPort, executionOrder: order };
}

function makeTypedRegistry(): NodeRegistry {
  const r = new NodeRegistry();

  r.register({
    type: 'input', version: '1.0.0',
    metadata: { displayName: 'Input', description: '', category: 'io', icon: 'i' },
    inputPorts: {},
    outputPorts: { value: { name: 'value', type: 'number', required: true, description: '' } },
    configSchema: {},
    capability: { pure: true, cacheable: true, async: false },
    validate: () => ({ valid: true, errors: [] }),
    execute: () => ({ value: 0, explanation: '', warnings: [], durationMs: 0 }),
    explain: () => '',
  });

  r.register({
    type: 'normalize', version: '1.0.0',
    metadata: { displayName: 'Normalize', description: '', category: 'math', icon: 'n' },
    inputPorts: { value: { name: 'value', type: 'number', required: true, description: '' } },
    outputPorts: { normalized: { name: 'normalized', type: 'number', required: true, description: '' } },
    configSchema: {},
    capability: { pure: true, cacheable: true, async: false },
    validate: () => ({ valid: true, errors: [] }),
    execute: () => ({ value: 0, explanation: '', warnings: [], durationMs: 0 }),
    explain: () => '',
  });

  r.register({
    type: 'threshold', version: '1.0.0',
    metadata: { displayName: 'Threshold', description: '', category: 'logic', icon: 't' },
    inputPorts: { value: { name: 'value', type: 'number', required: true, description: '' } },
    outputPorts: { result: { name: 'result', type: 'string', required: true, description: '' } },
    configSchema: {},
    capability: { pure: true, cacheable: true, async: false },
    validate: () => ({ valid: true, errors: [] }),
    execute: () => ({ value: 'OK', explanation: '', warnings: [], durationMs: 0 }),
    explain: () => '',
  });

  r.register({
    type: 'output', version: '1.0.0',
    metadata: { displayName: 'Output', description: '', category: 'io', icon: 'o' },
    inputPorts: { result: { name: 'result', type: 'string', required: true, description: '' } },
    outputPorts: {},
    configSchema: {},
    capability: { pure: true, cacheable: true, async: false },
    validate: () => ({ valid: true, errors: [] }),
    execute: () => ({ value: null, explanation: '', warnings: [], durationMs: 0 }),
    explain: () => '',
  });

  return r;
}

function buildGraph(registry: NodeRegistry, nodes: ReturnType<typeof node>[], edges: ReturnType<typeof edge>[]) {
  return new DagBuilder(registry).build(VID, nodes, edges);
}

describe('GraphValidator', () => {
  let registry: NodeRegistry;
  let validator: GraphValidator;

  beforeEach(() => {
    registry = makeTypedRegistry();
    validator = new GraphValidator(registry);
  });

  // ----------------------------------------------------------------
  // 1. Cycle detection
  // ----------------------------------------------------------------
  describe('cycle detection', () => {
    it('should pass for valid DAG', () => {
      const g = buildGraph(registry,
        [node('a', 'input'), node('b', 'normalize'), node('c', 'threshold')],
        [edge('e1', 'a', 'b', 'value', 'value'), edge('e2', 'b', 'c', 'normalized', 'value')],
      );
      const result = validator.validate(g);
      expect(result.valid).toBe(true);
      expect(result.errors.some(e => e.code === ERROR_CODES.CYCLE_DETECTED)).toBe(false);
    });

    it('should detect self-loop', () => {
      const g = buildGraph(registry,
        [node('a', 'normalize')],
        [edge('e1', 'a', 'a', 'normalized', 'value')],
      );
      const result = validator.validate(g);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ERROR_CODES.CYCLE_DETECTED)).toBe(true);
    });

    it('should detect two-node cycle', () => {
      const g = buildGraph(registry,
        [node('a', 'normalize'), node('b', 'normalize')],
        [edge('e1', 'a', 'b', 'normalized', 'value'), edge('e2', 'b', 'a', 'normalized', 'value')],
      );
      const result = validator.validate(g);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ERROR_CODES.CYCLE_DETECTED)).toBe(true);
    });

    it('should detect long cycle', () => {
      const g = buildGraph(registry,
        [node('a', 'input'), node('b', 'normalize'), node('c', 'normalize')],
        [
          edge('e1', 'a', 'b', 'value', 'value'),
          edge('e2', 'b', 'c', 'normalized', 'value'),
          edge('e3', 'c', 'b', 'normalized', 'value'), // back to b
        ],
      );
      const result = validator.validate(g);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === ERROR_CODES.CYCLE_DETECTED)).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // 2. Orphan nodes
  // ----------------------------------------------------------------
  describe('orphan nodes', () => {
    it('should pass when all nodes are connected', () => {
      const g = buildGraph(registry,
        [node('a', 'input'), node('b', 'normalize')],
        [edge('e1', 'a', 'b', 'value', 'value')],
      );
      const result = validator.validate(g);
      expect(result.errors.some(e => e.code === ERROR_CODES.ORPHAN_NODE)).toBe(false);
    });

    it('should detect disconnected node', () => {
      const g = buildGraph(registry,
        [node('a', 'input'), node('b', 'normalize'), node('c', 'threshold')],
        [edge('e1', 'a', 'b', 'value', 'value')],
      );
      const result = validator.validate(g);
      expect(result.errors.some(e => e.code === ERROR_CODES.ORPHAN_NODE && e.nodeId === 'c')).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // 3. Required inputs
  // ----------------------------------------------------------------
  describe('required inputs', () => {
    it('should detect missing required input', () => {
      // normalize requires 'value' port but it's not connected
      const g = buildGraph(registry,
        [node('a', 'input'), node('b', 'normalize')],
        [], // no edge connecting a → b
      );
      const result = validator.validate(g);
      expect(result.errors.some(e => e.code === ERROR_CODES.UNCONNECTED_REQUIRED_INPUT && e.nodeId === 'b')).toBe(true);
    });

    it('should pass when required input is connected', () => {
      const g = buildGraph(registry,
        [node('a', 'input'), node('b', 'normalize')],
        [edge('e1', 'a', 'b', 'value', 'value')],
      );
      const result = validator.validate(g);
      expect(result.errors.some(e => e.code === ERROR_CODES.UNCONNECTED_REQUIRED_INPUT)).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // 4. Output node
  // ----------------------------------------------------------------
  describe('output node', () => {
    it('should fail when no output node exists', () => {
      const g = buildGraph(registry,
        [node('a', 'input'), node('b', 'normalize')],
        [edge('e1', 'a', 'b', 'value', 'value')],
      );
      const result = validator.validate(g);
      expect(result.errors.some(e => e.code === ERROR_CODES.NO_OUTPUT_NODE)).toBe(true);
    });

    it('should pass when at least one output node exists', () => {
      const g = buildGraph(registry,
        [node('a', 'input'), node('b', 'normalize'), node('c', 'output')],
        [edge('e1', 'a', 'b', 'value', 'value'), edge('e2', 'b', 'c', 'normalized', 'result')],
      );
      const result = validator.validate(g);
      expect(result.errors.some(e => e.code === ERROR_CODES.NO_OUTPUT_NODE)).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // 5. Unreachable output
  // ----------------------------------------------------------------
  describe('unreachable output', () => {
    it('should detect unreachable output', () => {
      // 'c' has no incoming edges — unreachable
      const g = buildGraph(registry,
        [node('a', 'input'), node('b', 'normalize'), node('c', 'output')],
        [edge('e1', 'a', 'b', 'value', 'value')],
      );
      const result = validator.validate(g);
      expect(result.errors.some(e => e.code === ERROR_CODES.UNREACHABLE_OUTPUT && e.nodeId === 'c')).toBe(true);
    });

    it('should pass when all outputs are reachable', () => {
      const g = buildGraph(registry,
        [node('a', 'input'), node('b', 'output')],
        [edge('e1', 'a', 'b', 'value', 'result')],
      );
      const result = validator.validate(g);
      expect(result.errors.some(e => e.code === ERROR_CODES.UNREACHABLE_OUTPUT)).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  // 6. Unknown node type
  // ----------------------------------------------------------------
  describe('unknown node type', () => {
    it('should detect unknown node type', () => {
      // node type 'unknown' is not registered
      const g = new DagBuilder(registry).build(VID,
        [{ id: 'a', evaluationVersionId: VID, nodeType: 'unknown', label: 'a', config: {}, positionX: 0, positionY: 0 }],
        [],
      );
      const result = validator.validate(g);
      expect(result.errors.some(e => e.code === ERROR_CODES.UNKNOWN_NODE_TYPE)).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // Empty graph
  // ----------------------------------------------------------------
  describe('empty graph', () => {
    it('should fail with NO_OUTPUT_NODE', () => {
      const g = buildGraph(registry, [], []);
      const result = validator.validate(g);
      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe(ERROR_CODES.NO_OUTPUT_NODE);
    });
  });
});
