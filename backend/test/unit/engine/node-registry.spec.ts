import { NodeRegistry, UnknownNodeTypeError } from '../../../src/shared/plugins';

const makePlugin = (type: string) => ({
  type,
  version: '1.0.0',
  metadata: { displayName: type, description: '', category: 'math' as const, icon: 'x' },
  inputPorts: {},
  outputPorts: { result: { name: 'result', type: 'number' as const, required: true, description: '' } },
  configSchema: {},
  capability: { pure: true, cacheable: true, async: false },
  validate: () => ({ valid: true, errors: [] }),
  execute: () => ({ value: 42, explanation: 'test', warnings: [], durationMs: 1 }),
  explain: () => 'test',
});

describe('NodeRegistry', () => {
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
  });

  describe('register', () => {
    it('should register a plugin', () => {
      registry.register(makePlugin('test'));
      expect(registry.has('test')).toBe(true);
    });

    it('should throw when registering duplicate type', () => {
      registry.register(makePlugin('test'));
      expect(() => registry.register(makePlugin('test'))).toThrow(
        'Plugin "test" is already registered.',
      );
    });
  });

  describe('discover', () => {
    it('should return all registered plugins', () => {
      registry.register(makePlugin('a'));
      registry.register(makePlugin('b'));
      const discovered = registry.discover();
      expect(discovered.map(d => d.type).sort()).toEqual(['a', 'b']);
    });

    it('should return empty array when nothing registered', () => {
      expect(registry.discover()).toEqual([]);
    });
  });

  describe('get', () => {
    it('should return a registered plugin', () => {
      registry.register(makePlugin('test'));
      const def = registry.get('test');
      expect(def.type).toBe('test');
    });

    it('should throw UnknownNodeTypeError for unregistered type', () => {
      expect(() => registry.get('does-not-exist')).toThrow(UnknownNodeTypeError);
    });
  });

  describe('has', () => {
    it('should return true for registered type', () => {
      registry.register(makePlugin('test'));
      expect(registry.has('test')).toBe(true);
    });

    it('should return false for unregistered type', () => {
      expect(registry.has('unknown')).toBe(false);
    });
  });

  describe('execute', () => {
    it('should call execute on the plugin', () => {
      registry.register(makePlugin('test'));
      const result = registry.execute('test', { value: 1 }, { factor: 2 });
      expect(result.value).toBe(42);
    });

    it('should throw UnknownNodeTypeError', () => {
      expect(() => registry.execute('missing', {}, {})).toThrow(UnknownNodeTypeError);
    });
  });

  describe('size', () => {
    it('should return count of registered plugins', () => {
      expect(registry.size).toBe(0);
      registry.register(makePlugin('a'));
      expect(registry.size).toBe(1);
      registry.register(makePlugin('b'));
      expect(registry.size).toBe(2);
    });
  });
});
