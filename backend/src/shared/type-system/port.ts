import { DataType } from './data-types';

/**
 * A port is a typed input or output on a NodeDefinition.
 * Ports are defined by the plugin; they are not persisted directly —
 * only their names and types are used in edge validation.
 */
export interface Port {
  /** Machine-readable name, e.g. "value", "result", "dividend" */
  name: string;
  /** Accepted data type for this port */
  type: DataType;
  /** Whether a connection is required at graph-design time */
  required: boolean;
  /** Human-readable description for the UI */
  description: string;
}

/**
 * A set of ports — either all inputs or all outputs of a NodeDefinition.
 */
export interface PortMap {
  [portName: string]: Port;
}
