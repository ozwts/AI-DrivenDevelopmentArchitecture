/**
 * Value Object 必須メソッドルール
 *
 * Value Objectは以下のメソッドを持つ必要がある:
 * - equals(): 値の等価性を判定
 * - toString(): デバッグ・ログ用の文字列表現
 *
 * 参照: guardrails/policy/server/domain-model/26-value-object-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Value Object must have equals() and toString() methods",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      missingEqualsMethod:
        "Value Object '{{className}}' must have equals() method for value equality. See: 26-value-object-implementation.md",
      missingToStringMethod:
        "Value Object '{{className}}' must have toString() method for debugging/logging. See: 26-value-object-implementation.md",
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

        // メソッド名を収集
        const methodNames = classBody
          .filter((member) => member.type === "MethodDefinition")
          .map((member) => member.key?.name);

        // equalsチェック
        if (!methodNames.includes("equals")) {
          context.report({
            node,
            messageId: "missingEqualsMethod",
            data: { className },
          });
        }

        // toStringチェック
        if (!methodNames.includes("toString")) {
          context.report({
            node,
            messageId: "missingToStringMethod",
            data: { className },
          });
        }
      },
    };
  },
};
