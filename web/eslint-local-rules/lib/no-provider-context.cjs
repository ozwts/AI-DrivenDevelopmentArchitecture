/**
 * lib/内でのProvider/Context禁止ルール
 *
 * lib/はビジネスロジックを持たない技術基盤を配置する場所。
 * Provider/Contextはfeaturesに配置すべき。
 *
 * 参照: guardrails/policy/web/lib/10-lib-overview.md
 *       - Provider/Contextの配置 → app/features/に配置
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Provider/Context must not be in lib/",
      category: "Architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      noProviderInLib:
        "Provider/Context must not be defined in lib/. Move to features/. See: lib/10-lib-overview.md",
      noCreateContextInLib:
        "createContext must not be used in lib/. Move to features/. See: lib/10-lib-overview.md",
      noUseContextInLib:
        "useContext must not be used in lib/. Move to features/. See: lib/10-lib-overview.md",
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
      // Provider で終わる関数/変数定義を検出
      VariableDeclarator(node) {
        const name = node.id?.name;
        if (name?.endsWith("Provider") || name?.endsWith("Context")) {
          context.report({
            node,
            messageId: "noProviderInLib",
          });
        }
      },

      FunctionDeclaration(node) {
        const name = node.id?.name;
        if (name?.endsWith("Provider")) {
          context.report({
            node,
            messageId: "noProviderInLib",
          });
        }
      },

      // createContext 呼び出しを検出
      CallExpression(node) {
        const callee = node.callee;

        // createContext() 直接呼び出し
        if (callee.type === "Identifier" && callee.name === "createContext") {
          context.report({
            node,
            messageId: "noCreateContextInLib",
          });
        }

        // React.createContext() 呼び出し
        if (
          callee.type === "MemberExpression" &&
          callee.object?.name === "React" &&
          callee.property?.name === "createContext"
        ) {
          context.report({
            node,
            messageId: "noCreateContextInLib",
          });
        }

        // useContext() 呼び出し
        if (callee.type === "Identifier" && callee.name === "useContext") {
          context.report({
            node,
            messageId: "noUseContextInLib",
          });
        }

        // React.useContext() 呼び出し
        if (
          callee.type === "MemberExpression" &&
          callee.object?.name === "React" &&
          callee.property?.name === "useContext"
        ) {
          context.report({
            node,
            messageId: "noUseContextInLib",
          });
        }
      },
    };
  },
};
