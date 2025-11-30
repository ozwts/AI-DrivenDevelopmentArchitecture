/**
 * UseCase層throw禁止ルール
 *
 * use-case/ 内ではthrowを禁止し、Result型を使用させる。
 *
 * 参照: guardrails/policy/server/use-case/10-use-case-overview.md
 *       - Result型パターン: 例外を投げず、Result型でエラーを表現
 *       guardrails/policy/server/use-case/11-use-case-implementation.md
 *       - Unit of Workパターン: UoW内でもResult型を使用（throwは使用しない）
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "UseCase must use Result type instead of throw",
      category: "UseCase",
      recommended: true,
    },
    schema: [],
    messages: {
      noThrowInUseCase:
        "UseCase must not use 'throw'. Use Result.err() instead. See: 10-use-case-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // use-case/ ディレクトリ内のファイルのみ
    if (!filename.includes("/use-case/")) {
      return {};
    }

    // テスト・ダミー・sharedは除外
    if (
      filename.includes(".test.") ||
      filename.includes(".dummy.") ||
      filename.includes("/shared/")
    ) {
      return {};
    }

    // interfaces.tsは除外
    if (filename.endsWith("interfaces.ts")) {
      return {};
    }

    return {
      ThrowStatement(node) {
        context.report({
          node,
          messageId: "noThrowInUseCase",
        });
      },
    };
  },
};
