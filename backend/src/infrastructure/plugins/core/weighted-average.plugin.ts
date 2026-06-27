import { NodeDefinition } from '../../../shared/plugins';

const DEFINITION: NodeDefinition = {
  type: 'weighted_average',
  version: '1.0.0',
  metadata: {
    displayName: 'Weighted Average',
    description: 'Computes weighted sum of 2–10 inputs. Weights must sum to 1.',
    category: 'aggregate',
    icon: 'Σ',
  },
  inputPorts: {
    a: { name: 'a', type: 'number', required: true, description: 'First value' },
    b: { name: 'b', type: 'number', required: true, description: 'Second value' },
    c: { name: 'c', type: 'number', required: false, description: 'Third value (optional)' },
    d: { name: 'd', type: 'number', required: false, description: 'Fourth value (optional)' },
  },
  outputPorts: {
    result: { name: 'result', type: 'number', required: true, description: 'Weighted average' },
  },
  configSchema: {
    type: 'object',
    properties: {
      weights: {
        type: 'array',
        items: { type: 'number' },
        description: 'Weights for ports a, b, c, d. Must sum to 1.',
        minItems: 2,
        maxItems: 4,
      },
    },
    required: ['weights'],
    additionalProperties: false,
  },
  capability: { pure: true, cacheable: true, async: false },

  validate(config) {
    const errors = [];
    const c = config as Record<string, unknown>;
    if (!Array.isArray(c['weights'])) {
      errors.push({ code: 'INVALID_WEIGHTS', message: '"weights" must be an array' });
      return { valid: false, errors };
    }
    const weights = c['weights'] as number[];
    if (weights.length < 2) {
      errors.push({ code: 'TOO_FEW_WEIGHTS', message: 'At least 2 weights required' });
    }
    const sum = weights.reduce((acc, w) => acc + w, 0);
    if (Math.abs(sum - 1) > 0.0001) {
      errors.push({ code: 'WEIGHTS_MUST_SUM_TO_1', message: `Weights must sum to 1, got ${sum}` });
    }
    if (weights.some(w => typeof w !== 'number' || w < 0)) {
      errors.push({ code: 'INVALID_WEIGHT_VALUE', message: 'All weights must be non-negative numbers' });
    }
    return { valid: errors.length === 0, errors };
  },

  execute(inputs, config) {
    const c = config as { weights: number[] };
    const weights = c['weights'];
    const ports = ['a', 'b', 'c', 'd'];
    let sum = 0;
    const warnings: string[] = [];

    for (let i = 0; i < weights.length; i++) {
      const port = ports[i];
      const value = Number(inputs[port] ?? 0);
      if (inputs[port] === null || inputs[port] === undefined) {
        warnings.push(`Port "${port}" was null, treated as 0`);
      }
      sum += weights[i] * value;
    }

    const rounded = Math.round(sum * 100) / 100;
    return {
      value: rounded,
      explanation: `(${weights.map((w, i) => `(${Number(inputs[ports[i]] ?? 0)} × ${w})`).join(' + ')}) = ${rounded}`,
      warnings,
      durationMs: 0,
    };
  },

  explain(inputs, config, result) {
    const c = config as { weights: number[] };
    const ports = ['a', 'b', 'c', 'd'];
    const terms = c['weights'].map((w, i) => `(${Number(inputs[ports[i]] ?? 0)} × ${w})`).join(' + ');
    return `WeightedAverage: ${terms} = ${result.value}`;
  },
};

export const WeightedAveragePlugin = DEFINITION;
