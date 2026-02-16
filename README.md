# COMP0012 Coursework 1: EmojiLang Grammar

## Motivation

Traditional programming languages prioritize human readability through verbose keywords like `if`, `while`, `return`. EmojiLang explores an alternative paradigm: what if we designed syntax for **structural clarity** and **token efficiency**?

This language targets developers building data transformation pipelines, where the flow of data is more important than imperative control flow. Consider a pipeline: `data → transform → filter → output`. EmojiLang's syntax makes this flow explicit through:

1. **Right-to-Left Dataflow** (`42 => x`): Unlike `x = 42`, the value appears before its binding, matching how we explain code: "take 42, store it in x." This mirrors functional pipeline operators (`|>` in F#, Elixir) but at the assignment level. I chose `=>` over alternatives like `->` (used for lambdas in many languages) or `<-` (Haskell monadic bind, R assignment) to avoid overloading existing conventions while preserving a visual "flow into" metaphor.

2. **Iteration as Transformation** (`@@ collection >> transform`): A dedicated "map over" construct that emphasizes transformation over mutation, unlike `for` loops that suggest side effects. The `@@` symbol visually evokes "at each element" while `>>` suggests forward data flow, together reading as "at each element in collection, push through transform." This draws on the functional `map` tradition but elevates it to dedicated syntax rather than a library function.

3. **Strategy Annotations** (`~~`, `$$`, `##`): First-class syntax for evaluation hints (lazy/greedy/random) allows explicit control over computation strategies—useful in search algorithms, AI, or resource-constrained environments. I chose prefix position over postfix because the evaluation strategy is a property of *how* to compute, not *what* to compute—it should precede the expression conceptually, just as Haskell's `lazy` keyword modifies evaluation before the expression is reached. The mnemonics are: `~~` (wave = relaxed/lazy), `$$` (dollar = greedy/costly), `##` (dice = random).

4. **Conditional Expressions** (`cond ?? then :: else`): Replaces the cryptic C-style `?:` ternary with visually balanced double-symbol operators, reducing ambiguity. Unlike Rust's `if`/`else` expression or Kotlin's `when`, this syntax uses punctuation exclusively, keeping the language keyword-free. The `??` visually suggests a question while `::` serves as a balanced separator, distinct from the single `:` used in slicing and maps.

These constructs work together to support declarative data processing: define sources with dataflow (`data => input`), transform with iteration (`@@ input >> process`), and control evaluation with strategies (`~~ expensive_computation`).

## Implementation

### Dataflow Definition (`value => name`)

The reversed assignment required careful precedence design. The `=>` operator must bind looser than all expressions but tighter than statement boundaries. I placed it at the statement level as an alternative to bare expressions, parsing `value` as a full expression before consuming `=>` and the target identifier. This means `a + b => x` correctly parses as `(a + b) => x`—the entire left-hand expression is the value. If `=>` were an infix operator in the expression hierarchy instead, it would compete with arithmetic precedence, potentially parsing as `a + (b => x)`. By lifting dataflow out of the expression grammar entirely, I avoid this class of ambiguity.

### Conditional Expression (`cond ?? then :: else`)

The double-symbol operators `??` and `::` avoid conflicts with single `?` (nullish coalescing in JS) or `:` (slice separator, map entry delimiter). Right-associativity ensures nested conditionals like `a ?? b ?? c :: d :: e` parse naturally as `a ?? (b ?? c :: d) :: e`, matching the intuition that inner conditionals bind tighter. The grammar separates conditional from lower layers: the condition is a `_logical_or_expr` while both branches accept any `_expression`, enabling nesting without parentheses in the consequence branch.

### Array Slicing (`arr[start:end:step]`)

Implementing Python-style slicing with all-optional components was the most challenging parse ambiguity to resolve. The grammar must distinguish `arr[i]` (index expression) from `arr[i:]` (slice). I use the presence of `:` inside brackets as the discriminator: a `slice_expression` rule requires at least one `:`, while `index_expression` requires none. Both rules share the same left-recursive postfix precedence level, and tree-sitter's GLR capability resolves the initial ambiguity when it encounters (or does not encounter) the colon token. All three slice components—start, end, step—are independently optional, supporting eight valid combinations from `[:]` through `[1:5:2]`.

### Strategy Annotations (`~~`, `$$`, `##`)

These prefix operators chain arbitrarily: `~~ $$ ## expr` applies three strategies, producing a nested AST of `strategy_expression` nodes. I implemented them as right-associative unary operators at the same precedence level as negation (`-`) and logical NOT (`!`). Right-associativity is essential here—it ensures `~~ $$ expr` parses as `~~ ($$ expr)` rather than `(~~ $$) expr`, so each strategy wraps the next. This models the semantics correctly: the outermost strategy governs overall evaluation, while inner strategies refine it.

### Iteration Expression (`@@ collection >> transform`)

The `@@` prefix followed by a collection expression and `>>` followed by a transform creates a dedicated map construct. I placed it at the unary precedence level, allowing the collection to be any postfix expression (supporting `@@ arr[1:3] >> f`) while the transform accepts any unary expression (supporting `@@ items >> -x` or `@@ data >> ~~ process`). Grouping with parentheses enables complex transforms: `@@ items >> (x ?? x * 2 :: 0)`.

### Postfix Chains

Function calls, indexing, slicing, and member access all share left-associative precedence at the highest expression level. This enables chains like `obj.method(x)[0:2].field` to parse naturally left-to-right, each postfix operation consuming the result of the previous one. The uniformity of postfix precedence means no parentheses are needed for ordering—the chain reads and parses linearly.

### Parsing Architecture

The grammar uses a layered precedence structure with explicit delegation between levels, avoiding tree-sitter conflicts. Each layer is a choice between its own named node and the next-higher layer: `_conditional_expr` chooses between `conditional_expression` and `_logical_or_expr`, and so on. This "cascade of choices" pattern ensures exactly one parse for every input, with no ambiguity requiring GLR fallback. The complete hierarchy spans ten levels from conditional (precedence 1) to postfix (precedence 8), with primary expressions (literals, identifiers, containers) at the base.
