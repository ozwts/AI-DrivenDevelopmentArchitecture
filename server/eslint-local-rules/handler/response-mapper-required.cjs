/**
 * Handler層でのレスポンスマッパー必須ルール
 *
 * UseCaseの結果をそのまま返さず、適切にマッピングする。
 * ドメインモデルを直接HTTP層に露出させない。
 *
 * 参照: guardrails/policy/server/handler/21-http-handler-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce response mapping pattern in Handler - do not return domain models directly",
      category: "Handler",
      recommended: true,
    },
    schema: [],
    messages: {
      domainModelExposed:
        "ドメインモデル '{{ type }}' を直接レスポンスとして返しています。適切なDTOへのマッピングを行ってください。",
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

    // 既知のドメインモデル型（検出対象）
    const domainModelPatterns = [
      /^Todo$/,
      /^User$/,
      /^Project$/,
      /^Attachment$/,
      /Entity$/,
    ];

    return {
      // json({ ... }) の引数をチェック
      CallExpression(node) {
        if (node.callee?.name !== "json") {
          return;
        }

        // 型注釈があればチェック
        const args = node.arguments;
        if (args.length === 0) {
          return;
        }

        const arg = args[0];

        // 識別子の場合、型情報を確認
        if (arg.type === "Identifier") {
          // 変数名からドメインモデルっぽいものを検出
          const name = arg.name;
          for (const pattern of domainModelPatterns) {
            if (
              pattern.test(name) ||
              pattern.test(name.charAt(0).toUpperCase() + name.slice(1))
            ) {
              context.report({
                node: arg,
                messageId: "domainModelExposed",
                data: { type: name },
              });
              break;
            }
          }
        }
      },
    };
  },
};
