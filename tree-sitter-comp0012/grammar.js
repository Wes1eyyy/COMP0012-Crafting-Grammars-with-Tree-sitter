// EmojiLang Grammar - A token-efficient, structure-first language
// Using emoji as syntactic operators rather than keyword replacements

module.exports = grammar({
name: "EmojiLang",

extras: ($) => [
$.comment,
/\s|\\\r?\n/,
],

word: ($) => $.identifier,

rules: {
// ============================================================
// TOP-LEVEL: Source file is a sequence of statements
// ============================================================
source_file: ($) => repeat($._statement),

_statement: ($) =>
choice(
$.dataflow_definition,
$.block,
$._expression,
),

block: ($) => seq("{", repeat($._statement), "}"),

// ============================================================
// DATAFLOW DEFINITION: expr => identifier
// A key syntactic feature - reversed assignment flow
// ============================================================
dataflow_definition: ($) =>
seq(
field("value", $._expression),
"=>",
field("name", $.identifier),
),

// ============================================================
// EXPRESSIONS: Layered precedence structure
// ============================================================
_expression: ($) => $._conditional_expr,

// CONDITIONAL: condition ?? then_expr :: else_expr
// Ternary expression using emoji-style operators
_conditional_expr: ($) =>
choice(
$.conditional_expression,
$._logical_or_expr,
),

conditional_expression: ($) =>
prec.right(1, seq(
field("condition", $._logical_or_expr),
"??",
field("consequence", $._expression),
"::",
field("alternative", $._expression),
)),

// Logical OR
_logical_or_expr: ($) =>
choice(
$.logical_or_expression,
$._logical_and_expr,
),

logical_or_expression: ($) =>
prec.left(2, seq(
field("left", $._logical_or_expr),
"||",
field("right", $._logical_and_expr),
)),

// Logical AND
_logical_and_expr: ($) =>
choice(
$.logical_and_expression,
$._comparison_expr,
),

logical_and_expression: ($) =>
prec.left(3, seq(
field("left", $._logical_and_expr),
"&&",
field("right", $._comparison_expr),
)),

// Comparison
_comparison_expr: ($) =>
choice(
$.comparison_expression,
$._additive_expr,
),

comparison_expression: ($) =>
prec.left(4, seq(
field("left", $._comparison_expr),
field("operator", choice("==", "!=", "<", ">", "<=", ">=")),
field("right", $._additive_expr),
)),

// Additive
_additive_expr: ($) =>
choice(
$.additive_expression,
$._multiplicative_expr,
),

additive_expression: ($) =>
prec.left(5, seq(
field("left", $._additive_expr),
field("operator", choice("+", "-")),
field("right", $._multiplicative_expr),
)),

// Multiplicative
_multiplicative_expr: ($) =>
choice(
$.multiplicative_expression,
$._unary_expr,
),

multiplicative_expression: ($) =>
prec.left(6, seq(
field("left", $._multiplicative_expr),
field("operator", choice("*", "/", "%")),
field("right", $._unary_expr),
)),

// ============================================================
// UNARY EXPRESSIONS: Prefix operators
// ! = logical NOT
// - = arithmetic negation
// Strategy prefixes: ~~ (lazy), $$ (greedy), ## (random)
// ============================================================
_unary_expr: ($) =>
choice(
$.unary_expression,
$.strategy_expression,
$.iteration_expression,
$._postfix_expr,
),

unary_expression: ($) =>
prec.right(7, seq(
field("operator", choice("!", "-")),
field("operand", $._unary_expr),
)),

// Strategy annotations as prefixes (can be chained)
strategy_expression: ($) =>
prec.right(7, seq(
field("strategy", choice("~~", "$$", "##")),
field("operand", $._unary_expr),
)),

// ITERATION EXPRESSION: @@ collection >> transform
// Map/iterate over a collection with a transform expression
iteration_expression: ($) =>
prec.right(7, seq(
"@@",
field("collection", $._postfix_expr),
">>",
field("transform", $._unary_expr),
)),

// ============================================================
// POSTFIX EXPRESSIONS: Chainable suffixes
// Supports: function calls, indexing, slicing, member access
// Example: arr[0:5](x).method[1]
// ============================================================
_postfix_expr: ($) =>
choice(
$.call_expression,
$.index_expression,
$.slice_expression,
$.member_expression,
$._primary_expression,
),

call_expression: ($) =>
prec.left(8, seq(
field("function", $._postfix_expr),
"(",
optional($.argument_list),
")",
)),

argument_list: ($) =>
seq($._expression, repeat(seq(",", $._expression))),

index_expression: ($) =>
prec.left(8, seq(
field("object", $._postfix_expr),
"[",
field("index", $._expression),
"]",
)),

// Slice syntax: [start:end] or [start:end:step]
// All components are optional: [:], [::2], [1:], [:5], etc.
slice_expression: ($) =>
prec.left(8, seq(
field("object", $._postfix_expr),
"[",
field("start", optional($._slice_bound)),
":",
field("end", optional($._slice_bound)),
optional(seq(":", field("step", optional($._slice_bound)))),
"]",
)),

_slice_bound: ($) => $._primary_expression,

member_expression: ($) =>
prec.left(8, seq(
field("object", $._postfix_expr),
".",
field("member", $.identifier),
)),

// ============================================================
// PRIMARY EXPRESSIONS: Atoms and constructors
// ============================================================
_primary_expression: ($) =>
choice(
$.identifier,
$.number,
$.string,
$.boolean,
$.array_literal,
$.map_literal,
$.grouped_expression,
),

grouped_expression: ($) => seq("(", $._expression, ")"),

// ============================================================
// ARRAY LITERAL: #[elem1, elem2, ...]
// Constructor for arrays
// ============================================================
array_literal: ($) =>
seq(
"#[",
optional(seq(
$._expression,
repeat(seq(",", $._expression)),
optional(","),
)),
"]",
),

// ============================================================
// MAP LITERAL: #{key: value, ...}
// Constructor for key-value maps/records
// ============================================================
map_literal: ($) =>
seq(
"#{",
optional(seq(
$.map_entry,
repeat(seq(",", $.map_entry)),
optional(","),
)),
"}",
),

map_entry: ($) =>
seq(
field("key", choice($.identifier, $.string)),
":",
field("value", $._expression),
),

// ============================================================
// LITERALS: Standard value types
// ============================================================
identifier: (_$) => /[A-Za-z_][A-Za-z0-9_]*/,

number: (_$) => /[0-9]+(\.[0-9]+)?/,

string: (_$) => choice(
seq("\"", /[^"]*/, "\""),
seq("'", /[^']*/, "'"),
),

boolean: (_$) => choice("true", "false"),

// ============================================================
// COMMENTS: Standard C-style comments
// ============================================================
comment: (_$) =>
token(choice(
seq("//", /(\\(.|\r?\n)|[^\\\n])*/),
seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),
)),
},
});
