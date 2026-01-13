/**
 * Domain層 ログ出力禁止ルール
 *
 * Domain層（domain/model/配下）ではログ出力を行わない。
 * ドメインモデルは純粋なビジネスロジックに集中し、
 * ログはアプリケーション層（UseCase、Handler）で行う。
 *
 * 参照: guardrails/policy/server/logger/10-logger-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Domain layer should not use logger",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      noLoggerInDomain:
        "Domain layer should not use logger. Logging should be done in application layer (UseCase, Handler). See: 10-logger-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // domain/model/ 配下のみ
    if (!filename.includes("/domain/model/")) {
      return {};
    }

    // テスト・ダミー除外
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    return {
      // logger.info(), logger.debug() などの呼び出しを検出
      CallExpression(node) {
        if (
          node.callee?.type === "MemberExpression" &&
          node.callee.object?.name === "logger"
        ) {
          context.report({
            node,
            messageId: "noLoggerInDomain",
          });
        }
      },

      // Logger型のインポートを検出
      ImportDeclaration(node) {
        if (
          node.source?.value?.includes("/logger") ||
          node.source?.value?.includes("logger/")
        ) {
          // Logger型のインポートをチェック
          const hasLoggerImport = node.specifiers?.some(
            (spec) =>
              spec.imported?.name === "Logger" ||
              spec.imported?.name === "logger",
          );
          if (hasLoggerImport) {
            context.report({
              node,
              messageId: "noLoggerInDomain",
            });
          }
        }
      },
    };
  },
};
