/**
 * forwardRef必須ルール
 *
 * UIプリミティブコンポーネントはforwardRefでラップする。
 * 外部からrefを受け取れるようにする。
 *
 * 参照: guardrails/policy/web/ui/20-leaf.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce forwardRef for UI primitive components",
      category: "UI",
      recommended: true,
    },
    schema: [],
    messages: {
      useForwardRef:
        "UIプリミティブコンポーネントは forwardRef でラップしてください。外部からrefを受け取れるようにするためです。",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // lib/ui/ 配下のみ対象
    if (!filename.includes("/lib/ui/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // index.ts は除外
    if (filename.endsWith("index.ts")) {
      return {};
    }

    let hasForwardRef = false;
    let hasComponentExport = false;

    return {
      ImportDeclaration(node) {
        const source = node.source?.value;
        if (source === "react") {
          const hasForwardRefImport = node.specifiers?.some(
            (spec) =>
              spec.imported?.name === "forwardRef" ||
              spec.local?.name === "forwardRef",
          );
          if (hasForwardRefImport) {
            hasForwardRef = true;
          }
        }
      },

      // forwardRef呼び出しを検出
      CallExpression(node) {
        if (node.callee?.name === "forwardRef") {
          hasForwardRef = true;
        }
      },

      // コンポーネントのエクスポートを検出
      ExportNamedDeclaration(node) {
        if (
          node.declaration?.type === "VariableDeclaration" ||
          node.declaration?.type === "FunctionDeclaration"
        ) {
          hasComponentExport = true;
        }
      },

      "Program:exit"(node) {
        // コンポーネントをエクスポートしているがforwardRefを使っていない場合
        if (hasComponentExport && !hasForwardRef) {
          context.report({
            node,
            messageId: "useForwardRef",
          });
        }
      },
    };
  },
};
