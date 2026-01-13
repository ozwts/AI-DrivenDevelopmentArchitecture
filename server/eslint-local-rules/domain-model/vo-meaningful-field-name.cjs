/**
 * Value Object 意味のあるフィールド名必須ルール
 *
 * Value Objectのプライベートフィールドは意味のある名前を持つ必要がある。
 * `#value`のような汎用的な名前は禁止。
 *
 * 参照: guardrails/policy/server/domain-model/26-value-object-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Value Object private fields must have meaningful names, not generic names like #value",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      avoidGenericFieldName:
        "Value Object '{{className}}' should use a meaningful field name instead of '{{fieldName}}'. Use domain-specific names like #email, #amount, #status. See: 26-value-object-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // .vo.ts ファイルのみ
    if (!filename.endsWith(".vo.ts")) {
      return {};
    }

    // テスト・ダミー除外
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    // 禁止する汎用的なフィールド名
    const genericNames = ["#value", "#val", "#data", "#_value", "#_val"];

    return {
      ClassDeclaration(node) {
        const className = node.id?.name || "Unknown";
        const classBody = node.body?.body || [];

        // プライベートフィールドをチェック
        classBody.forEach((member) => {
          if (member.type === "PropertyDefinition" && member.key?.type === "PrivateIdentifier") {
            const fieldName = `#${member.key.name}`;

            if (genericNames.includes(fieldName.toLowerCase())) {
              context.report({
                node: member,
                messageId: "avoidGenericFieldName",
                data: { className, fieldName },
              });
            }
          }
        });
      },
    };
  },
};
