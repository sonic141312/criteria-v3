import { NodeDefinition } from '../../../shared/plugins';

const DEFINITION: NodeDefinition = {
  type: 'input',
  version: '1.0.0',
  metadata: {
    displayName: 'Input',
    description: 'Reads a field value from the execution input.',
    category: 'io',
    icon: '⬇',
  },
  inputPorts: {},
  outputPorts: {
    value: {
      name: 'value',
      type: 'number',
      required: true,
      description: 'The field value from inputValues',
    },
  },
  configSchema: {
    type: 'object',
    properties: {
      fieldKey: { type: 'string', description: 'The field key to read from inputValues' },
    },
    required: ['fieldKey'],
    additionalProperties: false,
  },
  capability: { pure: true, cacheable: false, async: false },

  validate(config) {
    const errors = [];
    if (!config || typeof config !== 'object') {
      errors.push({ code: 'INVALID_CONFIG', message: 'Config must be an object' });
      return { valid: false, errors };
    }
    const c = config as Record<string, unknown>;
    if (typeof c['fieldKey'] !== 'string' || !c['fieldKey']) {
      errors.push({ code: 'MISSING_FIELD_KEY', message: '"fieldKey" must be a non-empty string' });
    }
    return { valid: errors.length === 0, errors };
  },

  execute(_inputs, config) {
    const fieldKey = (config as Record<string, unknown>)['fieldKey'] as string;
    // Input node doesn't receive any upstream inputs — it reads from the execution's inputValues.
    // The inputValues are passed to the executor, not to the plugin directly.
    // We use a special marker to tell the executor to inject inputValues.
    return {
      value: fieldKey, // executor will look up inputValues[fieldKey]
      explanation: `Read field "${fieldKey}" from input`,
      warnings: [],
      durationMs: 0,
    };
  },

  explain(_inputs, config, result) {
    const fieldKey = (config as Record<string, unknown>)['fieldKey'] as string;
    return `Input(${fieldKey}): ${result.value ?? 'null'}`;
  },
};

export const InputPlugin = DEFINITION;
