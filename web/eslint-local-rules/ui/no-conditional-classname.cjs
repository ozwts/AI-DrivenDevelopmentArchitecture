/**
 * 条件分岐によるclassName生成禁止ルール
 *
 * UIコンポーネントで条件分岐（if/else, 三項演算子）を使った
 * クラス名生成を禁止し、CVA（Class Variance Authority）の使用を促す。
 *
 * 理由:
 * - 条件分岐によるスタイル管理は可読性が低下
 * - バリアントの組み合わせが増えると複雑化
 * - CVAを使うことで型安全かつ宣言的なバリアント管理が可能
 *
 * 禁止パターン:
 * ```typescript
 * className={isActive ? "bg-blue-500" : "bg-gray-500"}
 * className={`base ${isLarge ? "text-lg" : "text-sm"}`}
 * ```
 *
 * 推奨パターン:
 * ```typescript
 * const buttonVariants = cva("base", {
 *   variants: { size: { sm: "text-sm", lg: "text-lg" } }
 * });
 * className={buttonVariants({ size })}
 * ```
 *
 * 参照: guardrails/policy/web/ui/40-variant-system.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Avoid conditional expressions in className, use CVA variants instead",
      category: "UI",
      recommended: true,
    },
    schema: [],
    messages: {
      noConditionalClassName:
        "Avoid conditional className. Use CVA variants instead. See: 40-variant-system.md",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // lib/ui/ 配下のみ（UIプリミティブ）
    if (!filename.includes("/lib/ui/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    return {
      // JSX属性のclassNameをチェック
      JSXAttribute(node) {
        if (node.name.name !== "className") {
          return;
        }

        // 値がJSXExpressionContainerでない場合はスキップ
        if (!node.value || node.value.type !== "JSXExpressionContainer") {
          return;
        }

        const expression = node.value.expression;

        // 三項演算子の検出
        if (expression.type === "ConditionalExpression") {
          context.report({
            node: expression,
            messageId: "noConditionalClassName",
          });
          return;
        }

        // テンプレートリテラル内の条件式の検出
        if (expression.type === "TemplateLiteral") {
          for (const expr of expression.expressions) {
            if (expr.type === "ConditionalExpression") {
              context.report({
                node: expr,
                messageId: "noConditionalClassName",
              });
            }
          }
          return;
        }

        // 論理演算子（&& ||）の検出
        if (
          expression.type === "LogicalExpression" &&
          (expression.operator === "&&" || expression.operator === "||")
        ) {
          // clsx/twMerge の中での && は許容（それ自体がバリアント管理の一形態）
          // ただし直接のclassName属性での使用は警告
          const parent = node.parent;
          if (parent && parent.type === "JSXOpeningElement") {
            context.report({
              node: expression,
              messageId: "noConditionalClassName",
            });
          }
        }
      },
    };
  },
};
