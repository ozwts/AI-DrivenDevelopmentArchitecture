/**
 * Value Object from()メソッド必須ルール
 *
 * Value Objectは静的な`from()`メソッドを持つ必要がある。
 * このメソッドはバリデーションを行い、Result型を返す。
 *
 * 参照: guardrails/policy/server/domain-model/26-value-object-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Value Object must have static from() method",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      missingFromMethod:
        "Value Object '{{className}}' must have static from() method. See: 26-value-object-implementation.md",
      fromNotStatic:
        "Value Object '{{className}}' from() method must be static. See: 26-value-object-implementation.md",
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

    return {
      ClassDeclaration(node) {
        const className = node.id?.name || "Unknown";
        const classBody = node.body?.body || [];

        // from()メソッドを探す
        const fromMethod = classBody.find(
          (member) =>
            member.type === "MethodDefinition" && member.key?.name === "from",
        );

        if (!fromMethod) {
          context.report({
            node,
            messageId: "missingFromMethod",
            data: { className },
          });
          return;
        }

        // staticチェック
        if (!fromMethod.static) {
          context.report({
            node: fromMethod,
            messageId: "fromNotStatic",
            data: { className },
          });
        }
      },
    };
  },
};
