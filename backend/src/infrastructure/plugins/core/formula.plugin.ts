/**
 * Formula plugin — AST-based expression evaluator.
 * Per ADR-0006: formulas are stored as AST, never raw strings.
 *
 * AST shape:
 *   Literal  { type: 'Literal',  value: number | string | boolean }
 *   Variable { type: 'Variable',  name: string }
 *   UnaryOp  { type: 'UnaryOp',   op: string, operand: FormulaNode }
 *   BinaryOp { type: 'BinaryOp',  op: string, left: FormulaNode, right: FormulaNode }
 */
import { NodeDefinition } from '../../../shared/plugins';

/** Allowed AST node types */
export type FormulaNode =
  | { type: 'Literal'; value: number | string | boolean }
  | { type: 'Variable'; name: string }
  | { type: 'UnaryOp'; op: string; operand: FormulaNode }
  | { type: 'BinaryOp'; op: string; left: FormulaNode; right: FormulaNode };

const DEFINITION: NodeDefinition = {
  type: 'formula',
  version: '1.0.0',
  metadata: {
    displayName: 'Formula',
    description: 'Evaluates an AST expression against input variables.',
    category: 'math',
    icon: 'ƒ',
  },
  inputPorts: {},
  outputPorts: {
    result: { name: 'result', type: 'number', required: true, description: 'The computed value' },
  },
  configSchema: {
    type: 'object',
    properties: {
      ast: { type: 'object', description: 'The AST root node' },
    },
    required: ['ast'],
    additionalProperties: false,
  },
  capability: { pure: true, cacheable: true, async: false },

  validate(config) {
    const errors: Array<{ code: string; message: string }> = [];
    const c = config as Record<string, unknown>;

    if (!c['ast'] || typeof c['ast'] !== 'object') {
      errors.push({ code: 'MISSING_AST', message: '"ast" must be an AST object' });
      return { valid: false, errors };
    }

    const astErrors = validateAst(c['ast'] as object, []);
    return { valid: errors.length === 0 && astErrors.length === 0, errors: [...errors, ...astErrors] };
  },

  execute(inputs, config) {
    const c = config as { ast: FormulaNode };
    try {
      const result = evaluateAst(c['ast'], inputs as Record<string, unknown>);
      return {
        value: result,
        explanation: `Formula evaluated to ${result}`,
        warnings: [],
        durationMs: 0,
      };
    } catch (err) {
      return {
        value: null,
        explanation: '',
        warnings: [],
        error: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      };
    }
  },

  explain(inputs, config, result) {
    const c = config as { ast: FormulaNode };
    const expr = astToString(c['ast']);
    return `Formula(${expr}) = ${result.value}`;
  },
};

function validateAst(node: object, path: string[]): Array<{ code: string; message: string }> {
  const errors: Array<{ code: string; message: string }> = [];
  const n = node as Record<string, unknown>;
  const type = n['type'] as string | undefined;

  if (!type) {
    errors.push({ code: 'MISSING_TYPE', message: `Node at "${path.join('.')}" has no "type" field` });
    return errors;
  }

  if (type === 'Literal') {
    const vt = typeof n['value'];
    if (vt !== 'number' && vt !== 'string' && vt !== 'boolean') {
      errors.push({ code: 'INVALID_LITERAL', message: `Literal at "${path.join('.')}" must be number, string, or boolean` });
    }
  } else if (type === 'Variable') {
    if (typeof n['name'] !== 'string' || !(n['name'] as string)) {
      errors.push({ code: 'INVALID_VARIABLE', message: `Variable at "${path.join('.')}" must have a non-empty "name"` });
    }
  } else if (type === 'UnaryOp') {
    const validOps = ['-', '!'];
    if (!validOps.includes(n['op'] as string)) {
      errors.push({ code: 'INVALID_UNARY_OP', message: `UnaryOp at "${path.join('.')}" has invalid operator "${n['op']}"` });
    }
    if (!n['operand']) {
      errors.push({ code: 'MISSING_OPERAND', message: `UnaryOp at "${path.join('.')}" missing "operand"` });
    } else {
      errors.push(...validateAst(n['operand'] as object, [...path, 'operand']));
    }
  } else if (type === 'BinaryOp') {
    const validOps = ['+', '-', '*', '/', '%', '>', '<', '>=', '<=', '==', '!=', '&&', '||'];
    if (!validOps.includes(n['op'] as string)) {
      errors.push({ code: 'INVALID_BINARY_OP', message: `BinaryOp at "${path.join('.')}" has invalid operator "${n['op']}"` });
    }
    if (!n['left']) errors.push({ code: 'MISSING_LEFT', message: `BinaryOp at "${path.join('.')}" missing "left"` });
    else errors.push(...validateAst(n['left'] as object, [...path, 'left']));
    if (!n['right']) errors.push({ code: 'MISSING_RIGHT', message: `BinaryOp at "${path.join('.')}" missing "right"` });
    else errors.push(...validateAst(n['right'] as object, [...path, 'right']));
  } else {
    errors.push({ code: 'UNKNOWN_NODE_TYPE', message: `Unknown AST node type "${type}" at "${path.join('.')}"` });
  }

  return errors;
}

function evaluateAst(node: FormulaNode, context: Record<string, unknown>): number {
  const n = node as { type: string; [key: string]: unknown };

  if (n.type === 'Literal') {
    const lit = n as { type: 'Literal'; value: number | string | boolean };
    return lit.value as number;
  }
  if (n.type === 'Variable') {
    const v = n as { type: 'Variable'; name: string };
    const value = context[v.name];
    if (value === undefined || value === null) {
      throw new Error(`Variable "${v.name}" is not defined in input`);
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw new Error(`Variable "${v.name}" value "${value}" cannot be coerced to a number`);
    }
    return num;
  }
  if (n.type === 'UnaryOp') {
    const u = n as { type: 'UnaryOp'; op: string; operand: FormulaNode };
    const operandVal = evaluateAst(u.operand, context);
    if (u.op === '-') return -operandVal;
    if (u.op === '!') return operandVal === 0 ? 1 : 0;
    throw new Error(`Unknown unary operator: ${u.op}`);
  }
  if (n.type === 'BinaryOp') {
    const b = n as { type: 'BinaryOp'; op: string; left: FormulaNode; right: FormulaNode };
    const left = evaluateAst(b.left, context);
    const right = evaluateAst(b.right, context);
    switch (b.op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return right === 0 ? 0 : left / right;
      case '%': return right === 0 ? 0 : left % right;
      case '>':  return left > right ? 1 : 0;
      case '<':  return left < right ? 1 : 0;
      case '>=': return left >= right ? 1 : 0;
      case '<=': return left <= right ? 1 : 0;
      case '==': return left === right ? 1 : 0;
      case '!=': return left !== right ? 1 : 0;
      case '&&': return (left !== 0 && right !== 0) ? 1 : 0;
      case '||': return (left !== 0 || right !== 0) ? 1 : 0;
      default: throw new Error(`Unknown binary operator: ${b.op}`);
    }
  }

  throw new Error(`Unknown AST node type: ${n.type}`);
}

function astToString(node: FormulaNode): string {
  const n = node as { type: string; [key: string]: unknown };
  if (n.type === 'Literal') {
    const lit = n as { type: 'Literal'; value: unknown };
    return String(lit.value);
  }
  if (n.type === 'Variable') {
    const v = n as { type: 'Variable'; name: string };
    return v.name;
  }
  if (n.type === 'UnaryOp') {
    const u = n as { type: 'UnaryOp'; op: string; operand: FormulaNode };
    return `(${u.op}${astToString(u.operand)})`;
  }
  if (n.type === 'BinaryOp') {
    const b = n as { type: 'BinaryOp'; op: string; left: FormulaNode; right: FormulaNode };
    return `(${astToString(b.left)} ${b.op} ${astToString(b.right)})`;
  }
  return '?';
}

export const FormulaPlugin = DEFINITION;
