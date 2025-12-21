/**
 * Outlet context prop必須ルール
 *
 * <Outlet>を使用する際はcontext propを必須とする。
 * contextなしで使用すると親子間のデータ共有が行われない。
 *
 * 参照: guardrails/policy/web/route/20-colocation-patterns.md
 *       - 親ルートの責務: <Outlet context={...} /> で子にデータを渡す
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "<Outlet> must have context prop to share data with children",
      category: "Route",
      recommended: true,
    },
    schema: [],
    messages: {
      requireContextProp:
        "<Outlet> should have context prop to share data with child routes. Example: <Outlet context={{ data }} />. See: route/20-colocation-patterns.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // routes/ 内のファイルのみ対象
    if (!filename.includes("/routes/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.") || filename.includes(".spec.")) {
      return {};
    }

    // _layout/ ディレクトリは除外（レイアウトは子へのデータ共有が不要な場合が多い）
    if (filename.includes("/_layout/")) {
      return {};
    }

    return {
      JSXOpeningElement(node) {
        // <Outlet> を検出
        if (node.name.type === "JSXIdentifier" && node.name.name === "Outlet") {
          // context属性があるかチェック
          const hasContext = node.attributes.some(
            (attr) =>
              attr.type === "JSXAttribute" && attr.name?.name === "context"
          );

          if (!hasContext) {
            context.report({
              node,
              messageId: "requireContextProp",
            });
          }
        }
      },
    };
  },
};
