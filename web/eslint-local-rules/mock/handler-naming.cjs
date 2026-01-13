/**
 * MSWハンドラー命名規則ルール
 *
 * MSWハンドラーは{entity}Handlersまたは{action}{Entity}Handler形式で命名する。
 * 例: todoHandlers, createTodoHandler, getTodosHandler
 *
 * 参照: guardrails/policy/web/mock/20-msw-patterns.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce naming convention for MSW handlers",
      category: "Mock",
      recommended: true,
    },
    schema: [],
    messages: {
      useHandlerSuffix:
        "MSWハンドラーは '{entity}Handlers' または '{action}{Entity}Handler' 形式で命名してください。例: todoHandlers, createTodoHandler",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // mocks/handlers/ 配下のみ対象
    if (!filename.includes("/mocks/handlers/")) {
      return {};
    }

    // index.ts は除外
    if (filename.endsWith("index.ts")) {
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

          // Handlers または Handler で終わらない場合は警告
          if (!name.endsWith("Handlers") && !name.endsWith("Handler")) {
            context.report({
              node: declarator.id,
              messageId: "useHandlerSuffix",
            });
          }
        }
      },
    };
  },
};
