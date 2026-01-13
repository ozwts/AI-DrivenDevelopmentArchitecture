/**
 * UseCase層 プライベートメソッド禁止ルール
 *
 * UseCase層のクラスはプライベートメソッドを持ってはならない。
 * すべてのロジックはexecuteメソッド内に書き切る。
 * 複雑になる場合はドメインモデルに移譲する。
 *
 * 参照: guardrails/policy/server/use-case/11-use-case-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "UseCase classes should not have private methods - logic should be in execute() or delegated to domain",
      category: "Use Case",
      recommended: true,
    },
    schema: [],
    messages: {
      noPrivateMethod:
        "UseCase '{{className}}' should not have private method '{{methodName}}'. Write all logic in execute() or delegate to domain model. See: 11-use-case-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // .use-case.ts ファイルのみ
    if (!filename.includes(".use-case.ts")) {
      return {};
    }

    // テスト除外
    if (filename.includes(".test.")) {
      return {};
    }

    return {
      ClassDeclaration(node) {
        const className = node.id?.name || "Unknown";
        const classBody = node.body?.body || [];

        classBody.forEach((member) => {
          // ES2022プライベートメソッド（#methodName）
          if (
            member.type === "MethodDefinition" &&
            member.key?.type === "PrivateIdentifier"
          ) {
            const methodName = `#${member.key.name}`;
            context.report({
              node: member,
              messageId: "noPrivateMethod",
              data: { className, methodName },
            });
          }

          // TypeScriptの private キーワード
          if (
            member.type === "MethodDefinition" &&
            member.accessibility === "private" &&
            member.kind !== "constructor"
          ) {
            const methodName = member.key?.name || "unknown";
            context.report({
              node: member,
              messageId: "noPrivateMethod",
              data: { className, methodName },
            });
          }
        });
      },
    };
  },
};
