/**
 * Value Object プライベートコンストラクタ必須ルール
 *
 * Value Objectはプライベートコンストラクタを持つ必要がある。
 * インスタンス生成は静的な`from()`メソッド経由で行う。
 *
 * 参照: guardrails/policy/server/domain-model/25-value-object-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Value Object must have private constructor",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      requirePrivateConstructor:
        "Value Object '{{className}}' must have a private constructor. Use static from() method for instantiation. See: 25-value-object-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // .vo.ts ファイルのみ
    if (!filename.endsWith(".vo.ts")) {
      return {};
    }

    // テスト・ダミー除外
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    return {
      ClassDeclaration(node) {
        const className = node.id?.name || "Unknown";
        const classBody = node.body?.body || [];

        // コンストラクタを探す
        const constructor = classBody.find(
          (member) =>
            member.type === "MethodDefinition" && member.kind === "constructor",
        );

        // コンストラクタがない場合もエラー（暗黙のpublicコンストラクタ）
        if (!constructor) {
          context.report({
            node,
            messageId: "requirePrivateConstructor",
            data: { className },
          });
          return;
        }

        // privateチェック
        if (constructor.accessibility !== "private") {
          context.report({
            node: constructor,
            messageId: "requirePrivateConstructor",
            data: { className },
          });
        }
      },
    };
  },
};
