/**
 * モックデータ命名規則ルール
 *
 * モックデータはdummy{Entity}形式で命名する。
 * 例: dummyTodo, dummyUser, dummyProject
 *
 * 参照: guardrails/policy/web/mock/10-mock-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce naming convention for mock data",
      category: "Mock",
      recommended: true,
    },
    schema: [],
    messages: {
      useDummyPrefix:
        "モックデータは 'dummy{Entity}' 形式で命名してください。例: dummyTodo, dummyUser",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // mocks/data/ 配下のみ対象
    if (!filename.includes("/mocks/data/")) {
      return {};
    }

    return {
      ExportNamedDeclaration(node) {
        // 変数宣言のエクスポートを検出
        if (node.declaration?.type !== "VariableDeclaration") {
          return;
        }

        for (const declarator of node.declaration.declarations) {
          const name = declarator.id?.name;
          if (!name) {
            continue;
          }

          // dummyで始まらない場合は警告
          if (!name.startsWith("dummy") && !name.startsWith("create")) {
            context.report({
              node: declarator.id,
              messageId: "useDummyPrefix",
            });
          }
        }
      },
    };
  },
};
