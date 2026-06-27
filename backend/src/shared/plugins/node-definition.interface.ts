import { DataType, PortMap } from '../type-system';
import { ValidationResult } from '../errors';

/**
 * Result returned by a plugin's execute() method.
 * Every node in the graph produces exactly one result.
 */
export interface NodeResult {
  /** The primary output value. Type must match the single output port's type. */
  value: unknown;
  /** Human-readable explanation of how the value was computed. */
  explanation: string;
  /** Non-fatal warnings that do not prevent execution (e.g. division by zero handled). */
  warnings: string[];
  /** Execution time in milliseconds. */
  durationMs: number;
}

/**
 * The plugin contract. All node-type plugins must implement this interface.
 *
 * Lifecycle:
 *  - discover() is called once at boot to build the plugin registry.
 *  - validate(config) is called at graph-design time to validate node config.
 *  - execute(inputs, config) is called at execution time for every node in the graph.
 *  - explain(inputs, config, result) is called at trace-building time.
 */
export interface NodeDefinition {
  /** Unique identifier, e.g. "input", "normalize", "weighted_average" */
  readonly type: string;
  readonly version: string;

  readonly metadata: {
    displayName: string;
    description: string;
    /** math | logic | aggregate | io | ai */
    category: 'math' | 'logic' | 'aggregate' | 'io' | 'ai';
    icon: string;
  };

  /** Input ports. Key = port name. */
  readonly inputPorts: PortMap;
  /** Output ports. Key = port name. */
  readonly outputPorts: PortMap;

  /** JSON Schema (Draft-07) for validating node.config at design time. */
  readonly configSchema: Record<string, unknown>;

  readonly capability: {
    /** No side effects (can be cached, reordered safely) */
    pure: boolean;
    /** Result can be cached between executions */
    cacheable: boolean;
    /** execute() returns a Promise */
    async: boolean;
  };

  /**
   * Validates node.config against configSchema.
   * Called at graph-design time (before publish).
   */
  validate(config: unknown): ValidationResult;

  /**
   * Executes the node given input values and config.
   * Called at execution time for every node in the graph.
   *
   * @param inputs  Map of port name → value from upstream nodes
   * @param config  The node's config (JSONB from the database)
   * @returns NodeResult with value, explanation, warnings, durationMs
   */
  execute(inputs: Record<string, unknown>, config: Record<string, unknown>): NodeResult;

  /**
   * Produces a human-readable explanation of a past execution.
   * @param inputs    The inputs received during execution
   * @param config    The node's config
   * @param result    The result returned by execute()
   */
  explain(inputs: Record<string, unknown>, config: Record<string, unknown>, result: NodeResult): string;
}
