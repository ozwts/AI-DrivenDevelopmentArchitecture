/**
 * Entity JSDoc必須ルール
 *
 * Entityクラスにはビジネス上の意味を説明するJSDocが必須。
 * AIがコードを理解するために必要。
 *
 * 参照: guardrails/policy/server/domain-model/21-entity-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require JSDoc comments on Entity classes",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      missingJsDoc:
        "Entityクラスには /** ... */ 形式のJSDocコメントが必須です。ビジネス上の意味を説明してください。",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // domain/model/ 配下のみ対象
    if (!filename.includes("/domain/model/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // リポジトリインターフェースは除外
    if (filename.includes("-repository.ts")) {
      return {};
    }

    // index.ts は除外
    if (filename.endsWith("index.ts")) {
      return {};
    }

    const sourceCode = context.getSourceCode();

    return {
      ClassDeclaration(node) {
        // Entityパターンの検出: implements Entity<...> または implements SampleEntity
        const isEntity =
          node.implements?.some((impl) => {
            const implText = sourceCode.getText(impl);
            return implText.includes("Entity");
          }) ?? false;

        if (!isEntity) {
          return;
        }

        // JSDocコメントの確認
        const comments = sourceCode.getCommentsBefore(node);
        const hasJsDoc = comments.some(
          (comment) =>
            comment.type === "Block" && comment.value.startsWith("*"),
        );

        if (!hasJsDoc) {
          context.report({
            node: node.id ?? node,
            messageId: "missingJsDoc",
          });
        }
      },
    };
  },
};
