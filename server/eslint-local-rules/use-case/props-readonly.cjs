/**
 * UseCase Props型 readonly必須ルール
 *
 * UseCase層のProps型はすべてのプロパティがreadonly修飾子を持つ必要がある。
 * 入力データの不変性を保証する。
 *
 * 参照: guardrails/policy/server/use-case/11-use-case-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "UseCase Props type properties must be readonly",
      category: "Use Case",
      recommended: true,
    },
    schema: [],
    messages: {
      propsPropertyNotReadonly:
        "UseCase Props property '{{propertyName}}' must be readonly. See: 11-use-case-implementation.md",
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
      // type XXXUseCaseProps = { ... } の形式をチェック
      TSTypeAliasDeclaration(node) {
        const typeName = node.id?.name || "";

        // Props型のみ対象
        if (!typeName.endsWith("Props")) {
          return;
        }

        const typeAnnotation = node.typeAnnotation;

        // オブジェクト型リテラルの場合
        if (typeAnnotation?.type === "TSTypeLiteral") {
          typeAnnotation.members.forEach((member) => {
            if (member.type === "TSPropertySignature") {
              if (!member.readonly) {
                const propertyName = member.key?.name || "unknown";
                context.report({
                  node: member,
                  messageId: "propsPropertyNotReadonly",
                  data: { propertyName },
                });
              }
            }
          });
        }
      },
    };
  },
};
