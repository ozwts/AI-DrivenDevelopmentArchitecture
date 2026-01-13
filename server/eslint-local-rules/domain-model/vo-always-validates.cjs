/**
 * Value Object常時バリデーションルール
 *
 * Value Object（.vo.ts）のfrom()メソッドがバリデーションを行っているか検証。
 * Result<T, never> のように常に成功する場合はVO化が不要（プリミティブで十分）。
 *
 * 参照: guardrails/policy/server/domain-model/26-value-object-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Value Object from() should have validation (Result<T, never> indicates VO is unnecessary)",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      voAlwaysSucceeds:
        "Value Object from() returns Result<{{typeName}}, never>, which means it always succeeds. Consider using primitive type instead of Value Object. See: 26-value-object-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // .vo.ts のみ（テスト・ダミー除外）
    if (
      !filename.endsWith(".vo.ts") ||
      filename.includes(".test.") ||
      filename.includes(".dummy.")
    ) {
      return {};
    }

    return {
      MethodDefinition(node) {
        // static from() のみ
        if (
          node.kind !== "method" ||
          !node.static ||
          node.key?.name !== "from"
        ) {
          return;
        }

        const returnType = node.value?.returnType?.typeAnnotation;
        if (!returnType) return;

        // Result<T, never> の検出
        if (returnType.type === "TSTypeReference") {
          const typeName = returnType.typeName?.name;
          if (typeName === "Result") {
            const typeParams = returnType.typeArguments?.params || [];
            if (typeParams.length >= 2) {
              const errorType = typeParams[1];
              // never型をチェック
              if (errorType?.type === "TSNeverKeyword") {
                const successTypeName =
                  typeParams[0]?.typeName?.name ||
                  typeParams[0]?.type ||
                  "unknown";
                context.report({
                  node,
                  messageId: "voAlwaysSucceeds",
                  data: { typeName: successTypeName },
                });
              }
            }
          }
        }
      },
    };
  },
};
