# ADR-0006: Formula nodes store AST, not raw expression strings

## Status
Accepted

## Context
The architecture doc (`docs/rule_engine_prompt.md` § Formula Node — AST) is explicit:

> "Formula Node must NOT store raw expression strings like `"a + b * c"`."
> "Parse to AST on save"

A `formula` node with raw expression `a + b * c` would require parsing on every execution, leave room for injection-style bugs, and make validation pre-save impossible.

## Decision
**The `formula` node stores an AST in its `config` JSONB column.** The shape:

```json
{
  "type": "BinaryOp",
  "op": "+",
  "left": { "type": "Variable", "name": "a" },
  "right": {
    "type": "BinaryOp",
    "op": "*",
    "left": { "type": "Variable", "name": "b" },
    "right": { "type": "Variable", "name": "c" }
  }
}
```

The `FormulaPlugin.validate(config)` walks the AST and rejects:
- Unknown node types
- Variables not in declared `inputs`
- Unknown operators
- Cycles in variable references (impossible by construction but check anyway)

The `FormulaPlugin.execute(inputs, config)` walks the AST recursively — no `eval`, no `new Function`.

## Consequences
### Positive
- **Validation pre-save.** A graph with a formula referencing `a` when no input port `a` exists fails validation before publish.
- **No code-injection surface.** No `eval`. The interpreter only knows the AST node types we defined.
- **Debuggable.** The AST can be pretty-printed in the UI; the explain trace can show "a + (b * c)".
- **Optimizable.** Future compiler passes (constant folding, dead-code elimination) operate on ASTs.

### Negative
- **More complex than a string.** Parsing must happen at save time (and again on every save — not cached).
- **Limited expressiveness.** v1 supports `BinaryOp`, `Variable`, `Literal`, `UnaryOp` only. No user-defined functions, no method calls.

### Neutral
- **The UI's formula editor emits AST.** The React component constructs the AST from form state and POSTs it as JSON.

## Alternatives Considered
1. **Raw string + `mathjs` parser** — Rejected. Still parses on every execution. Cannot validate before save. Risk of arbitrary code paths if `mathjs` parser is ever compromised.
2. **Raw string + `eval`** — Rejected. Direct code execution = arbitrary RCE.
3. **Compile to bytecode at save, store bytecode** — Rejected for v1. Premature optimization. AST is sufficient.

## AST Schema (v1)

```typescript
type FormulaNode =
  | { type: 'Literal'; value: number | string | boolean }
  | { type: 'Variable'; name: string }
  | { type: 'UnaryOp'; op: '-' | '!'; operand: FormulaNode }
  | { type: 'BinaryOp'; op: '+' | '-' | '*' | '/' | '%' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '&&' | '||'; left: FormulaNode; right: FormulaNode };
```

Operators beyond this set are out of scope. Adding a new operator = extending the union + extending the executor's switch (which is fine — operators are part of the `formula` plugin's contract, not the engine's).

## References
- `docs/rule_engine_prompt.md` § Formula Node — AST
