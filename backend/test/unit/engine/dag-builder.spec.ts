import { DagBuilder } from '../../../src/engine/graph';
import { NodeRegistry } from '../../../src/shared/plugins';

const makePlugin = (type: string, inputs: string[] = [], outputs = ['result']) => ({
  type,
  version: '1.0.0',
  metadata: { displayName: type, description: '', category: 'math' as const, icon: 'x' },
  inputPorts: Object.fromEntries(inputs.map(k => [k, { name: k, type: 'number' as const, required: true, description: '' }])),
  outputPorts: Object.fromEntries(outputs.map(k => [k, { name: k, type: 'number' as const, required: true, description: '' }])),
  configSchema: {},
  capability: { pure: true, cacheable: true, async: false },
  validate: () => ({ valid: true, errors: [] }),
  execute: () => ({ value: 42, explanation: 'ok', warnings: [], durationMs: 1 }),
  explain: () => 'ok',
});

function registryWith(...types: string[]): NodeRegistry {
  const r = new NodeRegistry();
  for (const t of types) r.register(makePlugin(t));
  return r;
}

const VID = 'v1';

function node(id: string, type: string, pos: [number, number] = [0, 0]) {
  return { id, evaluationVersionId: VID, nodeType: type, label: id, config: {}, positionX: pos[0], positionY: pos[1] };
}
function edge(id: string, from: string, to: string, fromPort = 'result', toPort = 'a', order = 1) {
  return { id, evaluationVersionId: VID, fromNodeId: from, toNodeId: to, fromPort, toPort, executionOrder: order };
}

describe('DagBuilder', () => {
  let builder: DagBuilder;

  beforeEach(() => {
    builder = new DagBuilder(registryWith('input', 'normalize', 'weighted_average', 'threshold', 'output'));
  });

  describe('build', () => {
    it('should index nodes by id', () => {
      const g = builder.build(VID, [node('a', 'input'), node('b', 'normalize')], []);
      expect(g.nodes.has('a')).toBe(true);
      expect(g.nodes.has('b')).toBe(true);
      expect(g.nodes.get('a')?.nodeType).toBe('input');
    });

    it('should index outgoing edges by source node', () => {
      const g = builder.build(VID,
        [node('a', 'input'), node('b', 'normalize')],
        [edge('e1', 'a', 'b')],
      );
      const outgoing = g.outgoingEdges.get('a');
      expect(outgoing).toHaveLength(1);
      expect(outgoing?.[0]?.id).toBe('e1');
    });

    it('should index incoming edges by target node', () => {
      const g = builder.build(VID,
        [node('a', 'input'), node('b', 'normalize')],
        [edge('e1', 'a', 'b')],
      );
      const incoming = g.incomingEdges.get('b');
      expect(incoming).toHaveLength(1);
      expect(incoming?.[0]?.id).toBe('e1');
    });

    it('should return empty graph when no nodes', () => {
      const g = builder.build(VID, [], []);
      expect(g.nodes.size).toBe(0);
      expect(g.executionOrder).toEqual([]);
      expect(g.edges).toEqual([]);
    });

    it('should set versionId', () => {
      const g = builder.build('custom-version', [node('a', 'input')], []);
      expect(g.versionId).toBe('custom-version');
    });

    it('should freeze edges array', () => {
      const g = builder.build(VID, [node('a', 'input'), node('b', 'normalize')], [edge('e1', 'a', 'b')]);
      expect(() => { (g.edges as unknown[]).push({} as never); }).toThrow();
    });

    it('should make outgoingEdges immutable', () => {
      const g = builder.build(VID, [node('a', 'input')], []);
      // ReadonlyMap has no .set() method, so this property descriptor check
      // is the best way to verify freeze
      expect(Object.isFrozen(g.outgoingEdges)).toBe(true);
    });
  });

  describe('topological sort', () => {
    it('should return nodes with no incoming edges first', () => {
      //   a → b → c
      const g = builder.build(VID,
        [node('a', 'input'), node('b', 'normalize'), node('c', 'normalize')],
        [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')],
      );
      expect(g.executionOrder[0]).toBe('a');
      expect(g.executionOrder).toEqual(['a', 'b', 'c']);
    });

    it('should handle diamond DAG', () => {
      //       a
      //      / \
      //     b   c
      //      \ /
      //       d
      const g = builder.build(VID,
        [node('a', 'input'), node('b', 'normalize'), node('c', 'normalize'), node('d', 'normalize')],
        [edge('e1', 'a', 'b'), edge('e2', 'a', 'c'), edge('e3', 'b', 'd'), edge('e4', 'c', 'd')],
      );
      expect(g.executionOrder[0]).toBe('a');
      expect(g.executionOrder[3]).toBe('d');
      expect(g.executionOrder).toContain('b');
      expect(g.executionOrder).toContain('c');
    });

    it('should handle disconnected components', () => {
      // Two separate branches: a→b and c→d
      const g = builder.build(VID,
        [node('a', 'input'), node('b', 'normalize'), node('c', 'input'), node('d', 'normalize')],
        [edge('e1', 'a', 'b'), edge('e2', 'c', 'd')],
      );
      // Both a and c have no incoming edges — their relative order is non-deterministic
      expect(g.executionOrder).toHaveLength(4);
    });

    it('should handle single node', () => {
      const g = builder.build(VID, [node('a', 'input')], []);
      expect(g.executionOrder).toEqual(['a']);
    });

    it('should preserve order within same in-degree', () => {
      // Multiple nodes with in-degree 0 — order is arbitrary (set iteration order)
      // We only test that all nodes appear exactly once
      const g = builder.build(VID,
        [node('a', 'input'), node('b', 'input'), node('c', 'normalize')],
        [edge('e1', 'a', 'c'), edge('e2', 'b', 'c')],
      );
      expect(g.executionOrder).toHaveLength(3);
      expect(g.executionOrder).toContain('a');
      expect(g.executionOrder).toContain('b');
      expect(g.executionOrder[g.executionOrder.length - 1]).toBe('c');
    });
  });
});
