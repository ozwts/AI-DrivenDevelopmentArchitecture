/**
 * Leaf/CompositeコンポーネントのProps型でclassName禁止ルール
 *
 * lib/ui/leaf/ および lib/ui/composite/ 内のコンポーネントは
 * Props型でclassNameを明示的に定義してはならない。
 *
 * 注: HTML属性型（ButtonHTMLAttributes等）からのclassName継承は
 *     TypeScriptの型チェックで検出されるため、このルールでは
 *     明示的なclassNameプロパティの定義のみをチェックする。
 *
 * NG: { className?: string }（明示的に定義）
 * OK: Omit<HTMLAttributes, "className">（classNameを除外）
 *
 * 参照: guardrails/policy/web/ui/10-ui-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow explicit className property in Props type for Leaf/Composite UI components",
      category: "UI",
      recommended: true,
    },
    schema: [],
    messages: {
      explicitClassNameProp:
        "{{category}} component should not accept className. Remove 'className' from Props or use Omit<..., \"className\">. See: ui/{{policyFile}}",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // lib/ui/leaf/ または lib/ui/composite/ 内のファイルのみ対象
    const isLeaf = filename.includes("/lib/ui/leaf/");
    const isComposite = filename.includes("/lib/ui/composite/");

    if (!isLeaf && !isComposite) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    const category = isLeaf ? "Leaf" : "Composite";
    const policyFile = isLeaf ? "20-leaf.md" : "40-composite.md";

    /**
     * 型リテラル内のclassNameプロパティをチェック
     */
    function checkTypeLiteralForClassName(node) {
      if (node.type !== "TSTypeLiteral") return;

      for (const member of node.members) {
        if (
          member.type === "TSPropertySignature" &&
          member.key?.name === "className"
        ) {
          context.report({
            node: member,
            messageId: "explicitClassNameProp",
            data: { category, policyFile },
          });
        }
      }
    }

    /**
     * 型を再帰的にチェック
     */
    function checkTypeNode(node) {
      if (!node) return;

      // 型リテラル: { className?: string }
      if (node.type === "TSTypeLiteral") {
        checkTypeLiteralForClassName(node);
      }

      // Intersection型: A & B
      if (node.type === "TSIntersectionType") {
        for (const t of node.types) {
          checkTypeNode(t);
        }
      }

      // Union型: A | B
      if (node.type === "TSUnionType") {
        for (const t of node.types) {
          checkTypeNode(t);
        }
      }
    }

    return {
      // Props型エイリアスをチェック
      TSTypeAliasDeclaration(node) {
        const typeName = node.id?.name;
        if (!typeName?.endsWith("Props")) {
          return;
        }

        checkTypeNode(node.typeAnnotation);
      },
    };
  },
};
