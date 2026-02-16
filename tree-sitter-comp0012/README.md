# COMP0012 Coursework 1: EmojiLang Grammar

## Motivation

Traditional programming languages prioritize human readability through verbose keywords like `if`, `while`, `return`. EmojiLang explores an alternative paradigm: what if we designed syntax for **structural clarity** and **token efficiency**?

This language targets developers building data transformation pipelines, where the flow of data is more important than imperative control flow. Consider a pipeline: `data → transform → filter → output`. EmojiLang's syntax makes this flow explicit through:

1. **Right-to-Left Dataflow** (`42 => x`): Unlike `x = 42`, the value appears before its binding, matching how we explain code: "take 42, store it in x." This mirrors functional pipeline operators (`|>` in F#, Elixir) but at the assignment level.

2. **Iteration as Transformation** (`@@ collection >> transform`): A dedicated "map over" construct that emphasizes transformation over mutation, unlike `for` loops that suggest side effects.

3. **Strategy Annotations** (`~~`, `$$`, `##`): First-class syntax for evaluation hints (lazy/greedy/random) allows explicit control over computation strategies—useful in search algorithms, AI, or resource-constrained environments.

4. **Conditional Expressions** (`cond ?? then :: else`): Replaces the cryptic C-style `?:` ternary with visually balanced double-symbol operators, reducing ambiguity.

These constructs work together to support declarative data processing: define sources with dataflow (`data => input`), transform with iteration (`@@ input >> process`), and control evaluation with strategies (`~~ expensive_computation`).

## Implementation

### Dataflow Definition (`value => name`)

The reversed assignment required careful precedence design. The `=>` operator must bind looser than all expressions but tighter than statement boundaries. I placed it at the statement level, parsing `value` as a full expression before consuming `=>` and the target identifier. Challenge: ensuring `a + b => x` parses as `(a + b) => x` not `a + (b => x)`.

### Conditional Expression (`cond ?? then :: else`)

The double-symbol operators `??` and `::` avoid conflicts with single `?` (nullish coalescing in JS) or `:` (slice separator). Right-associativity ensures `a ?? b ?? c :: d :: e` nests correctly. The grammar distinguishes the conditional separator `::` from slice colons by context: `::` only appears after `??`.

### Array Slicing (`arr[start:end:step]`)

Implementing Python-style slicing with all-optional components was challenging. The grammar must distinguish `arr[i]` (index) from `arr[i:]` (slice). I used the presence of `:` as the discriminator: brackets containing a colon trigger slice parsing. Edge cases like `[::]`, `[::2]`, and `[1:5:2]` required careful optional field handling.

### Strategy Annotations (`~~`, `$$`, `##`)

These prefix operators chain: `~~ $$ ## expr` applies three strategies. I implemented them as right-associative unary operators at the same precedence level, allowing arbitrary stacking while maintaining clear AST structure.

### Postfix Chains

Function calls, indexing, slicing, and member access can freely combine: `obj.method(x)[0:2].field`. All postfix operations share the same precedence with left associativity, enabling natural chaining without parentheses.

### Parsing Challenges

The layered precedence structure avoids conflicts by establishing a strict hierarchy from conditional (lowest) through logical, comparison, arithmetic, unary, to postfix (highest). Each layer explicitly delegates to the next, ensuring unambiguous parsing without GLR conflicts.

