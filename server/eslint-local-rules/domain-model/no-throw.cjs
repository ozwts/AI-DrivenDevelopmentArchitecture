/**
 * ドメインモデル内throw禁止ルール
 *
 * domain/model 内ではthrowを禁止し、Result型を使用させる。
 * ダミーファイル内は例外（テスト用エラーハンドリング）。
 *
 * 参照: guardrails/policy/server/domain-model/10-domain-model-overview.md
 *       - Result型による明示的エラーハンドリング
 *       - 例外を使わず、Result<T, E>で成功/失敗を明示的に返す
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Domain model must use Result type instead of throw",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      noThrowInDomain:
        "Domain model must not use 'throw'. Use Result.err() instead. See: 10-domain-model-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    if (!filename.includes("/domain/model/")) {
      return {};
    }

    // ダミー・テストは除外
    if (filename.includes(".dummy.") || filename.includes(".test.")) {
      return {};
    }

    return {
      ThrowStatement(node) {
        context.report({ node, messageId: "noThrowInDomain" });
      },
    };
  },
};
