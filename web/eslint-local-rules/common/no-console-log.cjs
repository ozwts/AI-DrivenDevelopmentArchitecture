/**
 * console.log禁止ルール
 *
 * console.logの使用を禁止し、Loggerを使用する。
 * デバッグ用のconsole.logが本番に残ることを防止。
 *
 * 参照: guardrails/policy/web/logger/10-logger-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow console.log in favor of Logger",
      category: "Common",
      recommended: true,
    },
    schema: [],
    messages: {
      noConsoleLog:
        "console.log の使用は禁止されています。Loggerを使用してください。デバッグ用のconsole.logが本番に残ることを防止するためです。",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // モックファイルは除外
    if (filename.includes("/mocks/")) {
      return {};
    }

    // logger実装自体は除外
    if (filename.includes("/logger/")) {
      return {};
    }

    return {
      CallExpression(node) {
        if (
          node.callee?.type === "MemberExpression" &&
          node.callee.object?.name === "console" &&
          node.callee.property?.name === "log"
        ) {
          context.report({
            node,
            messageId: "noConsoleLog",
          });
        }
      },
    };
  },
};
