/**
 * Tailwind arbitrary values禁止ルール
 *
 * デザイントークンで定義された値のみ使用可能。
 * 任意の値（arbitrary values）は禁止。
 *
 * 参照: guardrails/policy/web/design/10-design-overview.md
 *       - 実施しないこと: 任意の値の使用 → arbitrary valuesは禁止
 *       guardrails/policy/web/design/20-token-management.md
 *       - Do/Don't: その場でarbitrary valueを使う → NG
 */

"use strict";

// arbitrary value パターン: w-[100px], text-[#ff0000], p-[13px] など
const ARBITRARY_VALUE_PATTERN = /\b[\w-]+\[[^\]]+\]/g;

// 許可されるパターン（例: group-[.is-active]:visible など）
const ALLOWED_PATTERNS = [
  /^group-\[/,      // group-[...] バリアント
  /^peer-\[/,       // peer-[...] バリアント
  /^data-\[/,       // data-[...] バリアント
  /^aria-\[/,       // aria-[...] バリアント
  /^supports-\[/,   // supports-[...] バリアント
];

/**
 * 許可されたパターンかどうか判定
 */
const isAllowedPattern = (className) => {
  return ALLOWED_PATTERNS.some((pattern) => pattern.test(className));
};

/**
 * 文字列からarbitrary valuesを抽出
 */
const extractArbitraryValues = (str) => {
  const matches = str.match(ARBITRARY_VALUE_PATTERN) || [];
  return matches.filter((match) => !isAllowedPattern(match));
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Tailwind arbitrary values, use design tokens instead",
      category: "Design",
      recommended: true,
    },
    schema: [],
    messages: {
      noArbitraryValues:
        "Arbitrary value '{{value}}' is not allowed. Use design tokens instead. See: design/20-token-management.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // .tsx ファイルのみ対象
    if (!filename.endsWith(".tsx")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.") || filename.includes(".ct.test.")) {
      return {};
    }

    return {
      // JSX属性の className をチェック
      JSXAttribute(node) {
        if (node.name?.name !== "className") return;

        // 文字列リテラルの場合
        if (node.value?.type === "Literal" && typeof node.value.value === "string") {
          const arbitraryValues = extractArbitraryValues(node.value.value);
          for (const value of arbitraryValues) {
            context.report({
              node,
              messageId: "noArbitraryValues",
              data: { value },
            });
          }
        }

        // テンプレートリテラルの場合
        if (node.value?.type === "JSXExpressionContainer") {
          const expr = node.value.expression;

          // `template literal`
          if (expr.type === "TemplateLiteral") {
            for (const quasi of expr.quasis) {
              const arbitraryValues = extractArbitraryValues(quasi.value.raw);
              for (const value of arbitraryValues) {
                context.report({
                  node,
                  messageId: "noArbitraryValues",
                  data: { value },
                });
              }
            }
          }

          // 文字列リテラル
          if (expr.type === "Literal" && typeof expr.value === "string") {
            const arbitraryValues = extractArbitraryValues(expr.value);
            for (const value of arbitraryValues) {
              context.report({
                node,
                messageId: "noArbitraryValues",
                data: { value },
              });
            }
          }
        }
      },
    };
  },
};
