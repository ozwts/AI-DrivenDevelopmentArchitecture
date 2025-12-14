/**
 * lib/内でのアプリケーション固有コードへの依存禁止ルール
 *
 * lib/は「アプリケーション固有の知識を持たない技術コード」を配置する場所。
 * features/、routes/、@/generated への依存は禁止。
 *
 * 参照: guardrails/policy/web/lib/10-lib-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "lib/ must not depend on application-specific code (features/, routes/, @/generated)",
      category: "Architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      noDomainDependency:
        "lib/ must not import from application-specific code. Found import from '{{source}}'. See: lib/10-lib-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // lib/ 内のファイルのみ対象
    if (!filename.includes("/lib/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.") || filename.includes(".spec.")) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        // features/ への依存を検出
        if (
          source.includes("/features/") ||
          source.startsWith("@/app/features")
        ) {
          context.report({
            node,
            messageId: "noDomainDependency",
            data: { source },
          });
        }

        // routes/ への依存を検出
        if (source.includes("/routes/") || source.startsWith("@/app/routes")) {
          context.report({
            node,
            messageId: "noDomainDependency",
            data: { source },
          });
        }

        // @/generated への依存を検出
        if (source.startsWith("@/generated")) {
          context.report({
            node,
            messageId: "noDomainDependency",
            data: { source },
          });
        }
      },
    };
  },
};
