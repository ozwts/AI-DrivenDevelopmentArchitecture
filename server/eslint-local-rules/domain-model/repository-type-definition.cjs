/**
 * Repository type定義必須ルール
 *
 * Repositoryインターフェースは`type`で定義する（`class`や`interface`ではない）。
 * 実装の詳細を含まない純粋な型として定義することで、
 * ドメイン層がインフラ層に依存しないことを保証する。
 *
 * 参照: guardrails/policy/server/domain-model/30-repository-interface-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Repository interface must be defined with 'type' keyword",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      useTypeNotInterface:
        "Repository '{{name}}' must be defined with 'type' keyword, not 'interface'. See: 30-repository-interface-overview.md",
      useTypeNotClass:
        "Repository '{{name}}' must be defined with 'type' keyword, not 'class'. See: 30-repository-interface-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // .repository.ts ファイルのみ
    if (!filename.endsWith(".repository.ts")) {
      return {};
    }

    // テスト・ダミー・実装ファイル除外
    if (
      filename.includes(".test.") ||
      filename.includes(".dummy.") ||
      filename.includes("/infrastructure/")
    ) {
      return {};
    }

    return {
      // interface定義を検出
      TSInterfaceDeclaration(node) {
        const name = node.id?.name || "Unknown";
        if (name.includes("Repository")) {
          context.report({
            node,
            messageId: "useTypeNotInterface",
            data: { name },
          });
        }
      },

      // class定義を検出
      ClassDeclaration(node) {
        const name = node.id?.name || "Unknown";
        if (name.includes("Repository")) {
          context.report({
            node,
            messageId: "useTypeNotClass",
            data: { name },
          });
        }
      },
    };
  },
};
