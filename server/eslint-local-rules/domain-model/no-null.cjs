/**
 * ドメインモデル内null禁止ルール
 *
 * domain/model 内ではnullを禁止し、undefinedを使用させる。
 *
 * 参照: guardrails/policy/server/domain-model/22-entity-implementation.md
 *       - nullを使用せずundefinedを使う
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Domain model must use undefined instead of null",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      noNullLiteral:
        "Domain model must use 'undefined' instead of 'null'. See: 22-entity-implementation.md",
      noNullType:
        "Domain model must use '| undefined' instead of '| null'. See: 22-entity-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    if (!filename.includes("/domain/model/")) {
      return {};
    }

    // テスト・ダミーは除外
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    return {
      Literal(node) {
        if (node.value === null) {
          context.report({ node, messageId: "noNullLiteral" });
        }
      },

      TSNullKeyword(node) {
        context.report({ node, messageId: "noNullType" });
      },
    };
  },
};
