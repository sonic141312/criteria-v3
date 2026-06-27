import { NodeDefinition } from '../../../shared/plugins';

const DEFINITION: NodeDefinition = {
  type: 'threshold',
  version: '1.0.0',
  metadata: {
    displayName: 'Threshold',
    description: 'Outputs one of two values based on a comparison.',
    category: 'logic',
    icon: '⚖',
  },
  inputPorts: {
    value: {
      name: 'value',
      type: 'number',
      required: true,
      description: 'The value to compare',
    },
  },
  outputPorts: {
    result: {
      name: 'result',
      type: 'string',
      required: true,
      description: 'The selected output value',
    },
  },
  configSchema: {
    type: 'object',
    properties: {
      threshold: { type: 'number' },
      comparison: { type: 'string', enum: ['gte', 'gt', 'lt', 'lte', 'eq'], default: 'gte' },
      aboveOrEqualValue: { type: 'string', description: 'Value when comparison is true', default: 'APPROVE' },
      belowValue: { type: 'string', description: 'Value when comparison is false', default: 'REJECT' },
    },
    required: ['threshold'],
    additionalProperties: false,
  },
  capability: { pure: true, cacheable: true, async: false },

  validate(config) {
    const errors = [];
    const c = config as Record<string, unknown>;
    if (typeof c['threshold'] !== 'number') {
      errors.push({ code: 'INVALID_THRESHOLD', message: '"threshold" must be a number' });
    }
    const validComparisons = ['gte', 'gt', 'lt', 'lte', 'eq'];
    if (c['comparison'] && !validComparisons.includes(c['comparison'] as string)) {
      errors.push({ code: 'INVALID_COMPARISON', message: `"comparison" must be one of: ${validComparisons.join(', ')}` });
    }
    return { valid: errors.length === 0, errors };
  },

  execute(inputs, config) {
    const c = config as {
      threshold: number;
      comparison?: string;
      aboveOrEqualValue?: string;
      belowValue?: string;
    };
    const inputValue = Number(inputs['value'] ?? 0);
    const comparison = c['comparison'] ?? 'gte';
    const aboveValue = (c['aboveOrEqualValue'] ?? 'APPROVE') as string;
    const belowValue = (c['belowValue'] ?? 'REJECT') as string;

    let matches = false;
    switch (comparison) {
      case 'gte': matches = inputValue >= c['threshold']; break;
      case 'gt': matches = inputValue > c['threshold']; break;
      case 'lt': matches = inputValue < c['threshold']; break;
      case 'lte': matches = inputValue <= c['threshold']; break;
      case 'eq': matches = inputValue === c['threshold']; break;
    }

    const result = matches ? aboveValue : belowValue;
    return {
      value: result,
      explanation: `${inputValue} ${comparison} ${c['threshold']} → ${result}`,
      warnings: [],
      durationMs: 0,
    };
  },

  explain(inputs, config, result) {
    const c = config as { threshold: number; comparison?: string };
    const inputValue = Number(inputs['value'] ?? 0);
    return `Threshold(${inputValue} ${c['comparison'] ?? 'gte'} ${c['threshold']}): ${result.value}`;
  },
};

export const ThresholdPlugin = DEFINITION;
