/**
 * Props型のreadonly修飾子ルール
 *
 * コンポーネントのProps型は、すべてのプロパティにreadonly修飾子を付ける。
 *
 * 参照: guardrails/policy/web/component/10-component-overview.md
 *       - Props型の明示: `readonly`修飾子で不変性を表現
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Props type properties should have readonly modifier",
      category: "Component",
      recommended: true,
    },
    schema: [],
    messages: {
      missingReadonly:
        "Props property '{{propertyName}}' should have readonly modifier. See: component/10-component-overview.md",
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
      TSTypeAliasDeclaration(node) {
        // Props で終わる型エイリアスを検出
        const typeName = node.id?.name;
        if (!typeName?.endsWith("Props")) {
          return;
        }

        // 型リテラル（オブジェクト型）をチェック
        const typeAnnotation = node.typeAnnotation;
        if (typeAnnotation?.type !== "TSTypeLiteral") {
          return;
        }

        // 各プロパティをチェック
        for (const member of typeAnnotation.members) {
          if (member.type === "TSPropertySignature" && !member.readonly) {
            const propertyName =
              member.key?.name || member.key?.value || "unknown";
            context.report({
              node: member,
              messageId: "missingReadonly",
              data: { propertyName },
            });
          }
        }
      },
    };
  },
};
