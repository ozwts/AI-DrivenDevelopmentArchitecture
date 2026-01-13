/**
 * CVA (class-variance-authority) 必須ルール
 *
 * バリアント（size, variant等）を持つUIコンポーネントはCVAを使用する。
 * 条件分岐でのクラス名組み立ては禁止。
 *
 * 参照: guardrails/policy/web/ui/40-variant-system.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce CVA usage for variant-based UI components",
      category: "UI",
      recommended: true,
    },
    schema: [],
    messages: {
      useCva:
        "バリアントを持つUIコンポーネントでは CVA (class-variance-authority) を使用してください。条件分岐でのクラス名組み立ては避けてください。",
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

    let hasCvaImport = false;
    let hasVariantProps = false;

    return {
      ImportDeclaration(node) {
        const source = node.source?.value;
        if (source === "class-variance-authority") {
          hasCvaImport = true;
        }
      },

      // Props型でvariant, size等を検出
      TSPropertySignature(node) {
        const propName = node.key?.name;
        if (
          propName === "variant" ||
          propName === "size" ||
          propName === "color"
        ) {
          hasVariantProps = true;
        }
      },

      "Program:exit"(node) {
        // バリアントPropsがあるがCVAをインポートしていない場合
        if (hasVariantProps && !hasCvaImport) {
          context.report({
            node,
            messageId: "useCva",
          });
        }
      },
    };
  },
};
