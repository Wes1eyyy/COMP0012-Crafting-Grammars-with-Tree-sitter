# COMP0012 Coursework 1: EmojiLang Grammar

## Motivation

Traditional programming languages prioritize human readability through verbose keywords like `if`, `while`, `return`. EmojiLang explores an alternative paradigm: what if we designed syntax for **structural clarity** and **token efficiency**?

This language targets developers building data transformation pipelines. Consider classifying exam scores in Python versus EmojiLang:

**Python:**
```python
data = [85, 42, 91, 67, 38, 73, 95, 54]
top = data[0:4]
results = []
for score in top:
    if score >= 70:
        results.append("pass")
    else:
        results.append("fail")
config = {"threshold": 0.7, "mode": "greedy"}
```

**EmojiLang:**
```
#[85, 42, 91, 67, 38, 73, 95, 54] => data
@@ data[0:4] >> (x >= 70 ?? "pass" :: "fail") => results
$$ #{threshold: 0.7, mode: "greedy"} => config
```

EmojiLang collapses Python's 8-line loop into a single expression chain: the data flows left-to-right through slicing, iteration, and conditional classification, then binds to `results` via `=>`. The `$$` strategy annotation explicitly marks eager evaluation on the config map—information Python leaves implicit. This example exercises all core constructs simultaneously:

1. **Right-to-Left Dataflow** (`42 => x`): The value appears before its binding, matching how we explain code: "take 42, store it in x." I chose `=>` over `->` (lambdas) or `<-` (Haskell monadic bind) to avoid overloading existing conventions while preserving a visual "flow into" metaphor.

2. **Iteration as Transformation** (`@@ collection >> transform`): A dedicated "map over" construct emphasizing transformation over mutation. The `@@` evokes "at each element" while `>>` suggests forward data flow. This draws on the functional `map` tradition but elevates it to dedicated syntax.

3. **Strategy Annotations** (`~~`, `$$`, `##`): First-class syntax for evaluation hints (lazy/greedy/random). Prefix position was chosen because evaluation strategy is a property of *how* to compute, preceding the expression conceptually. Mnemonics: `~~` (wave = lazy), `$$` (dollar = greedy), `##` (dice = random).

4. **Conditional Expressions** (`cond ?? then :: else`): Replaces the cryptic C-style `?:` ternary with visually balanced double-symbol operators. The `??` suggests a question while `::` is a balanced separator, distinct from the single `:` used in slicing and maps.

## Implementation

### Dataflow Definition (`value => name`)

The `=>` operator must bind looser than all expressions but tighter than statement boundaries. I placed it at the statement level, parsing `value` as a full expression before consuming `=>` and the target identifier. This means `a + b => x` correctly parses as `(a + b) => x`. If `=>` were an infix operator in the expression hierarchy instead, it would compete with arithmetic precedence, potentially parsing as `a + (b => x)`. By lifting dataflow out of the expression grammar entirely, I avoid this class of ambiguity.

### Conditional Expression (`cond ?? then :: else`)

The double-symbol operators `??` and `::` avoid conflicts with single `?` (nullish coalescing in JS) or `:` (slice separator, map delimiter). Right-associativity ensures nested conditionals like `a ?? b ?? c :: d :: e` parse as `a ?? (b ?? c :: d) :: e`, matching the intuition that inner conditionals bind tighter. The condition is a `_logical_or_expr` while both branches accept any `_expression`, enabling nesting without parentheses.

### Array Slicing (`arr[start:end:step]`)

The grammar must distinguish `arr[i]` (index) from `arr[i:]` (slice). I use the presence of `:` inside brackets as the discriminator: `slice_expression` requires at least one `:`, while `index_expression` requires none. Both share the same postfix precedence level, and tree-sitter's GLR capability resolves the ambiguity upon encountering (or not) the colon. All three components—start, end, step—are independently optional, supporting eight valid combinations from `[:]` through `[1:5:2]`.

### Strategy Annotations (`~~`, `$$`, `##`)

These prefix operators chain arbitrarily: `~~ $$ ## expr` produces nested `strategy_expression` nodes. I implemented them as right-associative unary operators at the same precedence as negation and logical NOT. Right-associativity ensures `~~ $$ expr` parses as `~~ ($$ expr)` rather than `(~~ $$) expr`, so each strategy wraps the next—the outermost governs overall evaluation while inner strategies refine it.

### Iteration Expression (`@@ collection >> transform`)

I placed iteration at the unary precedence level, allowing the collection to be any postfix expression (supporting `@@ arr[1:3] >> f`) while the transform accepts any unary expression (supporting `@@ data >> ~~ process`). Parentheses enable complex transforms: `@@ items >> (x ?? x * 2 :: 0)`.

### Parsing Architecture

The grammar uses a layered precedence structure with explicit delegation. Each layer chooses between its own named node and the next-higher layer: `_conditional_expr` chooses between `conditional_expression` and `_logical_or_expr`, and so on. This "cascade of choices" pattern ensures exactly one parse for every input. Postfix operations (calls, indexing, slicing, member access) all share left-associative precedence at the highest level, enabling chains like `obj.method(x)[0:2].field` to parse linearly without parentheses. The complete hierarchy spans ten levels from conditional (precedence 1) to postfix (precedence 8).

