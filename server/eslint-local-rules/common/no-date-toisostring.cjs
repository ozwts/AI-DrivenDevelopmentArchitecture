/**
 * Date.toISOString() 禁止ルール
 *
 * toISOString() はUTC固定のため、日本時間として統一的に扱うには不適切。
 * 代わりに @/util/date-util の toIsoString() を使用する。
 *
 * 理由:
 * - 日本時間 (Asia/Tokyo) として統一的に扱うため
 * - date-util.toIsoString() は日本時間でフォーマット
 *
 * 参照: guardrails/policy/server/domain-model/
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Date.toISOString() in favor of date-util.toIsoString()",
      category: "Common",
      recommended: true,
    },
    schema: [],
    messages: {
      noToISOString:
        "toISOString() の使用は禁止されています。代わりに @/util/date-util の toIsoString() を使用してください。toISOString() はUTC固定のため、日本時間として統一的に扱うには不適切です。",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // date-util.ts 自体は除外
    if (filename.endsWith("date-util.ts")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    return {
      // .toISOString() の検出
      CallExpression(node) {
        if (
          node.callee?.type === "MemberExpression" &&
          node.callee.property?.name === "toISOString"
        ) {
          context.report({
            node,
            messageId: "noToISOString",
          });
        }
      },
    };
  },
};
