/**
 * Handler層でのRepository直接インポート禁止ルール
 *
 * Handler層はUseCaseのみを使用し、Repositoryを直接利用してはならない。
 *
 * 参照: guardrails/policy/server/handler/21-http-handler-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct Repository imports in Handler layer",
      category: "Handler",
      recommended: true,
    },
    schema: [],
    messages: {
      noRepositoryImport:
        "Handler層でRepositoryを直接インポートすることは禁止されています。UseCaseを経由してください。",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // handler/ 配下のみ対象
    if (!filename.includes("/handler/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const source = node.source?.value;
        if (typeof source !== "string") {
          return;
        }

        // Repository関連のインポートを検出
        if (
          source.includes("/repository/") ||
          source.includes("-repository") ||
          source.endsWith("Repository")
        ) {
          context.report({
            node,
            messageId: "noRepositoryImport",
          });
        }
      },
    };
  },
};
