import { NodeDefinition } from '../../../shared/plugins';

const DEFINITION: NodeDefinition = {
  type: 'output',
  version: '1.0.0',
  metadata: {
    displayName: 'Output',
    description: 'Terminal node that defines the final result fields.',
    category: 'io',
    icon: '⬆',
  },
  inputPorts: {
    score: {
      name: 'score',
      type: 'number',
      required: false,
      description: 'The final numeric score',
    },
    decision: {
      name: 'decision',
      type: 'string',
      required: false,
      description: 'The final decision or classification',
    },
  },
  outputPorts: {},
  configSchema: {
    type: 'object',
    properties: {
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of output field names',
        default: ['score', 'decision'],
      },
    },
    additionalProperties: false,
  },
  capability: { pure: true, cacheable: false, async: false },

  validate() {
    return { valid: true, errors: [] };
  },

  execute(inputs, _config) {
    // Output node collects whatever input ports are connected and forms the result.
    // The result is stored as-is; the executor extracts it as finalResult.
    return {
      value: { ...inputs },
      explanation: `Output: ${Object.entries(inputs as Record<string, unknown>).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      warnings: [],
      durationMs: 0,
    };
  },

  explain(_inputs, _config, result) {
    return `Output: ${JSON.stringify(result.value)}`;
  },
};

export const OutputPlugin = DEFINITION;
