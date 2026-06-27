import { NodeDefinition } from '../../../shared/plugins';

const DEFINITION: NodeDefinition = {
  type: 'normalize',
  version: '1.0.0',
  metadata: {
    displayName: 'Normalize',
    description: 'Maps a numeric value from one range to another.',
    category: 'math',
    icon: '↔',
  },
  inputPorts: {
    value: {
      name: 'value',
      type: 'number',
      required: true,
      description: 'The value to normalize',
    },
  },
  outputPorts: {
    normalized: {
      name: 'normalized',
      type: 'number',
      required: true,
      description: 'The normalized value in [outMin, outMax]',
    },
  },
  configSchema: {
    type: 'object',
    properties: {
      min: { type: 'number', description: 'Input range minimum' },
      max: { type: 'number', description: 'Input range maximum' },
      outMin: { type: 'number', description: 'Output range minimum', default: 0 },
      outMax: { type: 'number', description: 'Output range maximum', default: 10 },
    },
    required: ['min', 'max'],
    additionalProperties: false,
  },
  capability: { pure: true, cacheable: true, async: false },

  validate(config) {
    const errors = [];
    const c = config as Record<string, unknown>;
    if (typeof c['min'] !== 'number') errors.push({ code: 'INVALID_MIN', message: '"min" must be a number' });
    if (typeof c['max'] !== 'number') errors.push({ code: 'INVALID_MAX', message: '"max" must be a number' });
    if (typeof c['min'] === 'number' && typeof c['max'] === 'number' && c['min'] >= c['max']) {
      errors.push({ code: 'INVALID_RANGE', message: '"min" must be less than "max"' });
    }
    return { valid: errors.length === 0, errors };
  },

  execute(inputs, config) {
    const c = config as { min: number; max: number; outMin?: number; outMax?: number };
    const inputValue = Number(inputs['value'] ?? 0);
    const { min, max, outMin = 0, outMax = 10 } = c;

    const range = max - min;
    if (range === 0) {
      return { value: outMin, explanation: `Range is 0; returned outMin (${outMin})`, warnings: ['min equals max — range is zero'], durationMs: 0 };
    }

    const normalized = outMin + ((inputValue - min) / range) * (outMax - outMin);
    return {
      value: Math.round(normalized * 100) / 100,
      explanation: `Mapped ${inputValue.toLocaleString()} from [${min}, ${max}] → [${outMin}, ${outMax}]`,
      warnings: [],
      durationMs: 0,
    };
  },

  explain(inputs, config, result) {
    const c = config as { min: number; max: number; outMin?: number; outMax?: number };
    const inputValue = Number(inputs['value'] ?? 0);
    return `Normalize(${inputValue.toLocaleString()}): mapped ${inputValue} from [${c.min}, ${c.max}] → ${result.value}`;
  },
};

export const NormalizePlugin = DEFINITION;
