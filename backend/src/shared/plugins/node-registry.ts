import { Injectable } from '@nestjs/common';
import { NodeDefinition } from '@shared/plugins/node-definition.interface';
import { NodeResult } from '@shared/plugins/node-definition.interface';

/**
 * Unknown node type requested from the registry.
 */
export class UnknownNodeTypeError extends Error {
  constructor(nodeType: string) {
    super(`Unknown node type: "${nodeType}". Register it in the PluginModule.`);
    this.name = 'UnknownNodeTypeError';
  }
}

/**
 * NodeRegistry is the only component in the engine that knows which node types exist.
 * Engine code never imports a concrete plugin class.
 *
 * Plugins self-register via NestJS DI when the app boots.
 */
@Injectable()
export class NodeRegistry {
  private readonly definitions = new Map<string, NodeDefinition>();

  /**
   * Register a plugin. Call once per plugin at app boot.
   * Throws if a plugin with the same type is already registered.
   */
  register(definition: NodeDefinition): void {
    if (this.definitions.has(definition.type)) {
      throw new Error(`Plugin "${definition.type}" is already registered.`);
    }
    this.definitions.set(definition.type, definition);
  }

  /**
   * Returns all registered definitions (for the /plugins endpoint).
   */
  discover(): NodeDefinition[] {
    return [...this.definitions.values()];
  }

  /**
   * Returns a definition by type. Throws if not found.
   */
  get(type: string): NodeDefinition {
    const def = this.definitions.get(type);
    if (!def) {
      throw new UnknownNodeTypeError(type);
    }
    return def;
  }

  /**
   * Returns true if a type is registered.
   */
  has(type: string): boolean {
    return this.definitions.has(type);
  }

  /**
   * Executes a node by type. Shortcut for get(type).execute(...).
   * Use this in the executor when you already have the type string.
   */
  execute(type: string, inputs: Record<string, unknown>, config: Record<string, unknown>): NodeResult {
    return this.get(type).execute(inputs, config);
  }

  /**
   * Returns the count of registered plugins. Useful for tests.
   */
  get size(): number {
    return this.definitions.size;
  }
}
